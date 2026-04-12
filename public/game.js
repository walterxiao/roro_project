import { THREE, renderer, scene, camera, fireLight } from './scene.js';
import { ROOM_W, ROOM_D, ROOM_H, DINING_W, walls, hideables, colliders, fireParts, tvGlow } from './room.js';
import { createCharacter, animateWalk } from './character.js';
import { getInput } from './controls.js';
import { send, getMyId, getMyRole, setOnMessage, showToast } from './network.js';

// ========== STATE ==========
const MOVE_SPEED = 4, TURN_SPEED = 3, HIDE_RANGE = 2.5;
const SHAKE_INTERVAL = 10, SHAKE_DURATION = 1;

let myChar = null;
const charPos = new THREE.Vector3(0, 0, 2);
let charRotY = 0;
let phase = 'lobby';
let isHiding = false, hiddenIn = null, hideTimer = 0;
let nearestHideable = null;

// Remote players
const remotePlayers = new Map(); // id -> { char, pos, rot, targetPos, targetRot }

// UI elements
const hideBtn = document.getElementById('hideBtn');
const hideZone = document.getElementById('hideZone');
const blindfold = document.getElementById('blindfold');

// ========== COLLISION ==========
function resolveCollision(pos, radius) {
  for (let i = 0; i < 4; i++) {
    let hit = null;
    for (const box of colliders) {
      const cx = Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const cz = Math.max(box.min.z, Math.min(pos.z, box.max.z));
      const dx = pos.x - cx, dz = pos.z - cz;
      if (dx * dx + dz * dz < radius * radius) { hit = { cx, cz }; break; }
    }
    if (!hit) break;
    const dx = pos.x - hit.cx, dz = pos.z - hit.cz;
    const dist = Math.sqrt(dx * dx + dz * dz) || .001;
    pos.x += dx / dist * (radius - dist);
    pos.z += dz / dist * (radius - dist);
  }
}

// ========== HIDE/SEARCH BUTTON ==========
hideBtn.addEventListener('touchstart', (e) => { e.preventDefault(); onActionBtn(); }, { passive: false });
hideBtn.addEventListener('mousedown', (e) => { e.preventDefault(); onActionBtn(); });

function onActionBtn() {
  const role = getMyRole();
  if (role === 'hider') {
    if (isHiding) {
      // Unhide (only during hiding phase)
      if (phase !== 'hiding') return;
      isHiding = false;
      myChar.group.visible = true;
      hiddenIn.group.position.copy(hiddenIn.pos);
      hiddenIn.group.rotation.z = 0;
      charPos.copy(hiddenIn.pos); charPos.y = 0;
      hiddenIn = null;
      hideBtn.textContent = 'HIDE';
      hideZone.classList.remove('visible');
      send({ type: 'unhide' });
    } else if (nearestHideable && phase === 'hiding') {
      // Hide
      clearHighlight(nearestHideable);
      isHiding = true;
      hiddenIn = nearestHideable;
      hideTimer = 0;
      myChar.group.visible = false;
      hideBtn.textContent = 'UNHIDE';
      hideZone.classList.add('visible');
      const fi = hideables.indexOf(nearestHideable);
      send({ type: 'hide', furnitureIndex: fi });
    }
  } else if (role === 'seeker' && phase === 'seeking' && nearestHideable) {
    // Search
    const fi = hideables.indexOf(nearestHideable);
    send({ type: 'search', furnitureIndex: fi });
    clearHighlight(nearestHideable);
    nearestHideable = null;
    hideZone.classList.remove('visible');
  }
}

function clearHighlight(h) {
  if (!h) return;
  h.group.traverse((c) => { if (c.isMesh) c.material.emissive?.setHex(0x000000); });
}

// ========== NETWORK MESSAGES ==========
let colorIdx = 0;

setOnMessage((msg) => {
  if (msg.type === 'welcome') {
    colorIdx = msg.id % 6;
    phase = msg.phase;
    // Don't create character yet — wait for game to start
    for (const p of msg.players) {
      if (p.id !== msg.id) addRemotePlayer(p);
    }
  }

  if (msg.type === 'playerJoined') addRemotePlayer(msg.player);

  if (msg.type === 'playerLeft') {
    const rp = remotePlayers.get(msg.id);
    if (rp) { scene.remove(rp.char.group); remotePlayers.delete(msg.id); }
  }

  if (msg.type === 'playerMoved') {
    const rp = remotePlayers.get(msg.id);
    if (rp) { rp.targetPos.set(msg.pos.x, 0, msg.pos.z); rp.targetRot = msg.rot; }
  }

  if (msg.type === 'playerHid') {
    const rp = remotePlayers.get(msg.id);
    if (rp) rp.char.group.visible = false;
  }

  if (msg.type === 'playerUnhid') {
    const rp = remotePlayers.get(msg.id);
    if (rp) { rp.char.group.visible = true; }
  }

  if (msg.type === 'phaseChange') {
    phase = msg.phase;
    if (phase === 'hiding') {
      isHiding = false; hiddenIn = null;
      charPos.set(0, 0, 2); charRotY = 0;
      if (!myChar) myChar = createCharacter(colorIdx);
      myChar.group.visible = true;
      myChar.group.position.copy(charPos);
    }
    if (phase === 'seeking' && getMyRole() === 'hider' && isHiding) {
      // Stay hidden, switch to bird's-eye
      hideZone.classList.remove('visible');
    }
  }

  if (msg.type === 'searchResult') {
    if (msg.found) {
      // Show found hider briefly
      const fi = msg.furnitureIndex;
      const h = hideables[fi];
      if (h) {
        h.group.traverse((c) => { if (c.isMesh) c.material.emissive?.setHex(0x004400); });
        setTimeout(() => clearHighlight(h), 1500);
      }
      const rp = remotePlayers.get(msg.hiderId);
      if (rp) { rp.char.group.visible = true; rp.char.group.position.copy(h.pos); }
    } else {
      // Miss — flash red
      const fi = msg.furnitureIndex;
      const h = hideables[fi];
      if (h) {
        h.group.traverse((c) => { if (c.isMesh) c.material.emissive?.setHex(0x440000); });
        setTimeout(() => clearHighlight(h), 1000);
      }
    }
  }

  if (msg.type === 'youWereFound') {
    isHiding = false;
    if (myChar) myChar.group.visible = true;
    if (hiddenIn) { hiddenIn.group.position.copy(hiddenIn.pos); hiddenIn.group.rotation.z = 0; }
    hiddenIn = null;
    hideZone.classList.remove('visible');
  }

  if (msg.type === 'gameOver') { phase = 'gameover'; }

  if (msg.type === 'reset') {
    phase = 'lobby'; isHiding = false; hiddenIn = null;
    hideZone.classList.remove('visible');
    // Reset all furniture positions
    for (const h of hideables) { h.group.position.copy(h.pos); h.group.rotation.z = 0; clearHighlight(h); }
    // Remove remote players
    for (const [id, rp] of remotePlayers) scene.remove(rp.char.group);
    remotePlayers.clear();
    if (myChar) { scene.remove(myChar.group); myChar = null; }
  }
});

function addRemotePlayer(p) {
  if (p.id === getMyId() || remotePlayers.has(p.id)) return;
  const char = createCharacter(p.id % 6);
  char.group.position.set(p.pos.x, 0, p.pos.z);
  char.group.rotation.y = p.rot;
  if (p.isHiding || p.isFound) char.group.visible = false;
  const rp = { char, targetPos: new THREE.Vector3(p.pos.x, 0, p.pos.z), targetRot: p.rot };
  remotePlayers.set(p.id, rp);
}

// ========== POSITION BROADCAST ==========
let sendTimer = 0;

// ========== GAME LOOP ==========
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  if (!myChar) { renderer.render(scene, camera); return; }

  const role = getMyRole();
  const canMove = (phase === 'hiding' && role === 'hider') ||
                  (phase === 'hiding' && role === 'seeker') ||
                  (phase === 'seeking' && role === 'seeker');
  // Seeker is blindfolded during hiding phase — no movement
  const seekerBlind = phase === 'hiding' && role === 'seeker';

  // --- HIDING SHAKE ---
  if (isHiding && hiddenIn) {
    hideTimer += dt;
    const cycle = hideTimer % SHAKE_INTERVAL;
    if (cycle < SHAKE_DURATION) {
      hiddenIn.group.position.x = hiddenIn.pos.x + Math.sin(hideTimer * 30) * .04;
      hiddenIn.group.position.z = hiddenIn.pos.z + Math.cos(hideTimer * 39) * .04;
      hiddenIn.group.rotation.z = Math.sin(hideTimer * 21) * .02;
    } else {
      hiddenIn.group.position.x = hiddenIn.pos.x;
      hiddenIn.group.position.z = hiddenIn.pos.z;
      hiddenIn.group.rotation.z = 0;
    }
  }

  // --- MOVEMENT ---
  let isMoving = false;
  if (canMove && !seekerBlind && !isHiding) {
    const input = getInput();
    if (Math.abs(input.x) > .15) charRotY -= input.x * TURN_SPEED * dt;
    if (Math.abs(input.z) > .15) {
      const fwd = -input.z;
      charPos.x += Math.sin(charRotY) * fwd * MOVE_SPEED * dt;
      charPos.z += Math.cos(charRotY) * fwd * MOVE_SPEED * dt;
    }
    isMoving = Math.abs(input.x) > .15 || Math.abs(input.z) > .15;
    resolveCollision(charPos, .4);
    myChar.group.position.copy(charPos);
    myChar.group.rotation.y = charRotY;

    // Broadcast position
    sendTimer += dt;
    if (sendTimer > .05) { sendTimer = 0; send({ type: 'move', pos: { x: charPos.x, z: charPos.z }, rot: charRotY }); }
  }
  animateWalk(myChar, dt, isMoving);

  // --- PROXIMITY / ACTION BUTTON ---
  if (!isHiding && canMove && !seekerBlind) {
    const prev = nearestHideable;
    nearestHideable = null;
    let best = HIDE_RANGE;
    for (const h of hideables) {
      const dx = charPos.x - h.pos.x, dz = charPos.z - h.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < best) { best = d; nearestHideable = h; }
    }
    if (prev && prev !== nearestHideable) clearHighlight(prev);

    const showBtn = (role === 'hider' && phase === 'hiding' && nearestHideable) ||
                    (role === 'seeker' && phase === 'seeking' && nearestHideable);
    if (nearestHideable && showBtn) {
      nearestHideable.group.traverse((c) => { if (c.isMesh) c.material.emissive?.setHex(0x444400); });
      hideZone.classList.add('visible');
      if (role === 'seeker') {
        hideBtn.textContent = 'SEARCH';
        hideBtn.classList.add('search-mode');
      } else {
        hideBtn.textContent = 'HIDE';
        hideBtn.classList.remove('search-mode');
      }
    } else {
      hideZone.classList.remove('visible');
      hideBtn.classList.remove('search-mode');
    }
  }

  // --- CAMERA ---
  if (isHiding && hiddenIn) {
    // Bird's-eye
    const inD = hiddenIn.pos.x > ROOM_W / 2;
    const rw = inD ? DINING_W : ROOM_W;
    const rcx = inD ? ROOM_W / 2 + DINING_W / 2 : 0;
    const fov = camera.fov / 2 * Math.PI / 180;
    const nH = (ROOM_D / 2) / Math.tan(fov);
    const nW = (rw / 2) / (Math.tan(fov) * camera.aspect);
    const camY = Math.max(nH, nW) + 2;
    camera.position.lerp(new THREE.Vector3(rcx, camY, 0), 3 * dt);
    camera.lookAt(rcx, 0, 0);
  } else if (!seekerBlind) {
    const cd = 6, ch = 3.5;
    const tp = new THREE.Vector3(charPos.x + Math.sin(charRotY) * -cd, charPos.y + ch, charPos.z + Math.cos(charRotY) * -cd);
    camera.position.lerp(tp, 4 * dt);
    camera.lookAt(charPos.x, charPos.y + 1.5, charPos.z);
  }

  // --- WALL OCCLUSION ---
  const cc = new THREE.Vector3(charPos.x, charPos.y + 1, charPos.z);
  const rd = new THREE.Vector3().subVectors(cc, camera.position).normalize();
  const rDist = camera.position.distanceTo(cc);
  const ray = new THREE.Raycaster(camera.position, rd, 0, rDist);
  const hits = ray.intersectObjects(walls);
  const blockers = new Set(hits.map(h => h.object));
  for (const w of walls) {
    const t = blockers.has(w) ? .15 : 1;
    w.material.opacity += (t - w.material.opacity) * Math.min(10 * dt, 1);
  }

  // --- REMOTE PLAYERS ---
  for (const [id, rp] of remotePlayers) {
    rp.char.group.position.lerp(rp.targetPos, 8 * dt);
    const diff = rp.targetRot - rp.char.group.rotation.y;
    rp.char.group.rotation.y += diff * 8 * dt;
    const moving = rp.char.group.position.distanceTo(rp.targetPos) > .05;
    animateWalk(rp.char, dt, moving);
  }

  // --- FIRE + TV ---
  const t = clock.elapsedTime;
  fireParts.forEach((fp) => {
    fp.mesh.position.y = fp.baseY + Math.sin(t * fp.speed + fp.offset) * .15;
    fp.mesh.scale.x = .8 + Math.sin(t * fp.speed * 1.3 + fp.offset) * .3;
    fp.mesh.scale.y = .8 + Math.cos(t * fp.speed + fp.offset) * .2;
  });
  fireLight.intensity = 1.5 + Math.sin(t * 3) * .5 + Math.sin(t * 7) * .3;
  tvGlow.intensity = .4 + Math.sin(t * 2) * .1;

  renderer.render(scene, camera);
}

animate();
