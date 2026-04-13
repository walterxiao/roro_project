import { THREE, renderer, scene, camera, fireLight } from './scene.js';
import { createCharacter, animateWalk } from './character.js';
import { getInput, getLook, decayLook, consumeDragYaw } from './controls.js';
import { send, getMyId, getMyRole, setOnMessage, showToast } from './network.js';

// Dynamically load the chosen map
const mapName = window.__roro?.getMap?.() || 'home';
const mapFile = mapName === 'library' ? './library.js' : './room.js';
const mapMod = await import(mapFile);
const { ROOM_W, ROOM_D, ROOM_H, DINING_W, walls, hideables, hideableBounds, colliders, fireParts, tvGlow, roomAt: mapRoomAt, birdsEyeRoom } = mapMod;

// ========== STATE ==========
const MOVE_SPEED = 4, TURN_SPEED = 3, HIDE_RANGE = 2.5, CATCH_RANGE = 1.5;

let myChar = null;
const charPos = new THREE.Vector3(0, 0, 2);
let charRotY = 0;
let phase = 'lobby';
let isHiding = false, hiddenIn = null;
let nearestHideable = null;

// Hit / bounce / dizzy state
let hitTimer = 0;      // seconds remaining for hit animation
let bounceVel = null;  // {x, z} velocity to push us back
let bounceTime = 0;    // seconds remaining for bounce
let dizzyTime = 0;     // seconds remaining for dizzy effect
let dizzyStars = null; // THREE.Group for dizzy stars around head

// Remote seeker effects: id -> { hitTimer, bounceVel, bounceTime, dizzyTime, dizzyStars }
const remoteFx = new Map();

// Shake state: { furnitureIndex -> remaining seconds }
const shaking = new Map();

// Hider tracking for room-detection sound
const hiddenHiderFurniture = new Map(); // playerId -> furnitureIndex
let lastSeekerRoom = null;

// Room detection based on position
const roomAt = mapRoomAt;

// Ding-dong sound with distance-based volume
let audioCtx = null;
function playDingDong(volume) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    // Two chime notes: E5 then C5 — classic "ding dong"
    const notes = [659.25, 523.25];
    const v = Math.max(0.0, Math.min(1.0, volume));
    for (let i = 0; i < 2; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.35;
      osc.frequency.setValueAtTime(notes[i], start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(v * 0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    }
  } catch (e) {}
}

// Remote players
const remotePlayers = new Map(); // id -> { char, pos, rot, targetPos, targetRot, hiddenFi }

// UI elements
const hideBtn = document.getElementById('hideBtn');
const hideZone = document.getElementById('hideZone');
const blindfold = document.getElementById('blindfold');

// ========== COLLISION ==========
// ========== HIT / DIZZY FX ==========
function createDizzyStars() {
  const g = new THREE.Group();
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), starMat);
    const angle = (i / 5) * Math.PI * 2;
    s.position.set(Math.cos(angle) * 0.5, 2.3, Math.sin(angle) * 0.5);
    s.userData.baseAngle = angle;
    g.add(s);
  }
  scene.add(g);
  return g;
}

function triggerMissFor(charGroupRef, charRot) {
  // Push character backward for ~0.3s and set dizzy for ~2s
  const back = { x: -Math.sin(charRot) * 4, z: -Math.cos(charRot) * 4 };
  return { hitTimer: 0.5, bounceVel: back, bounceTime: 0.3, dizzyTime: 2.0, dizzyStars: createDizzyStars() };
}

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
      // Unhide (allowed in both phases)
      isHiding = false;
      myChar.group.visible = true;
      hiddenIn.group.position.copy(hiddenIn.pos);
      hiddenIn.group.rotation.z = 0;
      charPos.copy(hiddenIn.pos); charPos.y = 0;
      hiddenIn = null;
      hideBtn.textContent = 'HIDE';
      hideZone.classList.remove('visible');
      send({ type: 'unhide' });
    } else if (nearestHideable) {
      // Hide (allowed in both hiding and seeking phases)
      clearHighlight(nearestHideable);
      isHiding = true;
      hiddenIn = nearestHideable;
      myChar.group.visible = false;
      hideBtn.textContent = 'UNHIDE';
      hideZone.classList.add('visible');
      const fi = hideables.indexOf(nearestHideable);
      send({ type: 'hide', furnitureIndex: fi, bounds: hideableBounds[fi] });
    }
  } else if (role === 'seeker' && phase === 'seeking' && nearestHideable) {
    // Search
    const fi = hideables.indexOf(nearestHideable);
    send({ type: 'search', furnitureIndex: fi, bounds: hideableBounds[fi] });
    clearHighlight(nearestHideable);
    nearestHideable = null;
    hideZone.classList.remove('visible');
  }
}

function clearHighlight(h) {
  if (!h) return;
  h.group.traverse((c) => { if (c.isMesh) c.material.emissive?.setHex(0x000000); });
}

// ========== INIT (game module loaded after lobby start) ==========
const myId = getMyId();
const colorIdx = myId ? myId % 6 : 0;
const existingPlayers = window.__roro?.getPlayers?.() || [];
const me = existingPlayers.find(p => p.id === myId);
myChar = createCharacter(colorIdx, me?.role || 'seeker');
if (me && me.pos) {
  charPos.set(me.pos.x, 0, me.pos.z);
  charRotY = me.rot || 0;
}
myChar.group.position.copy(charPos);
myChar.group.rotation.y = charRotY;
phase = 'hiding';

for (const p of existingPlayers) {
  if (p.id !== myId) addRemotePlayer(p);
}

// ========== NETWORK MESSAGES ==========
setOnMessage((msg) => {

  if (msg.type === 'playerJoined') addRemotePlayer(msg.player);

  if (msg.type === 'allPlayers') reconcileRemotePlayers(msg.players);

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
    if (rp) { rp.char.group.visible = false; rp.hiddenFi = msg.furnitureIndex; }
    hiddenHiderFurniture.set(msg.id, msg.furnitureIndex);
  }

  if (msg.type === 'playerUnhid') {
    const rp = remotePlayers.get(msg.id);
    if (rp) {
      rp.char.group.visible = true; rp.hiddenFi = -1;
      if (msg.pos) { rp.targetPos.set(msg.pos.x, 0, msg.pos.z); rp.char.group.position.copy(rp.targetPos); }
    }
    hiddenHiderFurniture.delete(msg.id);
  }

  if (msg.type === 'ding' && msg.pos) {
    // Only seekers hear the ding-dong
    if (getMyRole() !== 'seeker') return;
    // Compute distance-based volume relative to my character's position
    const dx = charPos.x - msg.pos.x;
    const dz = charPos.z - msg.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    // Inverse falloff — full volume at distance 0, quieter far away, floor at 0.08
    const volume = Math.max(0.08, 1 / (1 + dist * 0.15));
    playDingDong(volume);
  }

  if (msg.type === 'shake') {
    const duration = msg.duration || 1.0;
    const amp = msg.amplitude != null ? msg.amplitude : 1.0;
    for (const fi of msg.furnitureIndices) {
      const current = shaking.get(fi) || { duration: 0, amp: 0 };
      // Keep the larger effect (longer or more intense)
      shaking.set(fi, {
        duration: Math.max(current.duration, duration),
        amp: Math.max(current.amp, amp),
      });
    }
  }

  if (msg.type === 'hiderCaught') {
    hiddenHiderFurniture.delete(msg.hiderId);
    const rp = remotePlayers.get(msg.hiderId);
    if (rp) rp.char.group.visible = false;
    if (msg.hiderId === getMyId()) {
      // We were caught
      isHiding = false;
      if (myChar) myChar.group.visible = false;
      if (hiddenIn) { hiddenIn.group.position.copy(hiddenIn.pos); hiddenIn.group.rotation.z = 0; }
      hiddenIn = null;
      hideZone.classList.remove('visible');
    }
  }

  if (msg.type === 'phaseChange') {
    phase = msg.phase;
    if (phase === 'hiding') {
      isHiding = false; hiddenIn = null;
      // Server assigns each player a random spawn — read it from current player list
      const players = window.__roro?.getPlayers?.() || [];
      const me = players.find(p => p.id === myId);
      if (me && me.pos) { charPos.set(me.pos.x, 0, me.pos.z); charRotY = me.rot || 0; }
      if (myChar) { myChar.group.visible = true; myChar.group.position.copy(charPos); myChar.group.rotation.y = charRotY; }
    }
    // If hider is hiding when phase changes, keep UNHIDE button visible
    if (phase === 'seeking' && getMyRole() === 'hider' && isHiding) {
      hideZone.classList.add('visible');
      hideBtn.textContent = 'UNHIDE';
    }
  }

  if (msg.type === 'searchResult') {
    const fi = msg.furnitureIndex;
    const h = hideables[fi];
    const isMe = msg.seekerId === getMyId();

    // Always do hit animation for the seeker (local or remote)
    if (isMe) {
      hitTimer = 0.5;
    } else {
      const rp = remotePlayers.get(msg.seekerId);
      if (rp) {
        if (!remoteFx.has(msg.seekerId)) remoteFx.set(msg.seekerId, {});
        remoteFx.get(msg.seekerId).hitTimer = 0.5;
      }
    }

    if (msg.found) {
      hiddenHiderFurniture.delete(msg.hiderId);
      if (h) {
        h.group.traverse((c) => { if (c.isMesh) c.material.emissive?.setHex(0x004400); });
        setTimeout(() => clearHighlight(h), 1500);
      }
      const rp = remotePlayers.get(msg.hiderId);
      if (rp) { rp.char.group.visible = true; rp.char.group.position.copy(h.pos); }
    } else {
      // Miss: flash red, bounce seeker back, make them dizzy
      if (h) {
        h.group.traverse((c) => { if (c.isMesh) c.material.emissive?.setHex(0x440000); });
        setTimeout(() => clearHighlight(h), 1000);
      }
      if (isMe) {
        const fx = triggerMissFor(myChar.group, charRotY);
        hitTimer = fx.hitTimer;
        bounceVel = fx.bounceVel;
        bounceTime = fx.bounceTime;
        dizzyTime = fx.dizzyTime;
        if (dizzyStars) scene.remove(dizzyStars);
        dizzyStars = fx.dizzyStars;
      } else {
        const rp = remotePlayers.get(msg.seekerId);
        if (rp) {
          const rot = rp.char.group.rotation.y;
          const fx = triggerMissFor(rp.char.group, rot);
          remoteFx.set(msg.seekerId, fx);
        }
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
    nearestHideable = null;
    shaking.clear();
    hitTimer = 0; bounceTime = 0; dizzyTime = 0; bounceVel = null;
    if (dizzyStars) { scene.remove(dizzyStars); dizzyStars = null; }
    for (const [id, fx] of remoteFx) { if (fx.dizzyStars) scene.remove(fx.dizzyStars); }
    remoteFx.clear();
    hiddenHiderFurniture.clear();
    lastSeekerRoom = null;
    charPos.set(0, 0, 2); charRotY = 0;
    hideZone.classList.remove('visible');
    hideBtn.textContent = 'HIDE';
    hideBtn.classList.remove('search-mode');
    // Reset all furniture positions + highlights
    for (const h of hideables) { h.group.position.copy(h.pos); h.group.rotation.z = 0; clearHighlight(h); }
    // Remove remote players
    for (const [id, rp] of remotePlayers) scene.remove(rp.char.group);
    remotePlayers.clear();
    if (myChar) { scene.remove(myChar.group); myChar = null; }
  }
});

function addRemotePlayer(p) {
  if (p.id === getMyId() || remotePlayers.has(p.id)) return;
  const role = p.role || 'seeker';
  const char = createCharacter(p.id % 6, role);
  const px = (p.pos && typeof p.pos.x === 'number') ? p.pos.x : 0;
  const pz = (p.pos && typeof p.pos.z === 'number') ? p.pos.z : 0;
  const pr = typeof p.rot === 'number' ? p.rot : 0;
  char.group.position.set(px, 0, pz);
  char.group.rotation.y = pr;
  char.group.visible = !(p.isHiding || p.isFound);
  const rp = { char, targetPos: new THREE.Vector3(px, 0, pz), targetRot: pr, role };
  remotePlayers.set(p.id, rp);
}

// Reconcile remote players from a full player list (handles missed joins / role changes)
function reconcileRemotePlayers(list) {
  const seen = new Set();
  for (const p of list) {
    if (p.id === getMyId()) continue;
    seen.add(p.id);
    const existing = remotePlayers.get(p.id);
    if (!existing) {
      addRemotePlayer(p);
    } else if (existing.role !== (p.role || 'seeker')) {
      // Role changed — recreate character
      scene.remove(existing.char.group);
      remotePlayers.delete(p.id);
      addRemotePlayer(p);
    }
  }
  // Remove players that are no longer in the list
  for (const id of [...remotePlayers.keys()]) {
    if (!seen.has(id)) {
      scene.remove(remotePlayers.get(id).char.group);
      remotePlayers.delete(id);
    }
  }
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
  // Seeker is fully blindfolded during hiding phase — no movement, no rendering
  const seekerBlind = phase === 'hiding' && role === 'seeker';
  // Hiders can move during both hiding and seeking phases (if not hidden)
  // Seekers can move during seeking phase
  const canMove = (role === 'hider' && (phase === 'hiding' || phase === 'seeking')) ||
                  (role === 'seeker' && phase === 'seeking');

  // --- SHAKING FURNITURE (server-driven) ---
  const t = clock.elapsedTime;
  for (const h of hideables) {
    const fi = hideables.indexOf(h);
    const state = shaking.get(fi);
    if (state && state.duration > 0) {
      const a = state.amp * .04;
      h.group.position.x = h.pos.x + Math.sin(t * 30) * a;
      h.group.position.z = h.pos.z + Math.cos(t * 39) * a;
      h.group.rotation.z = Math.sin(t * 21) * .02 * state.amp;
      state.duration -= dt;
    } else if (shaking.has(fi)) {
      h.group.position.x = h.pos.x;
      h.group.position.z = h.pos.z;
      h.group.rotation.z = 0;
      shaking.delete(fi);
    }
  }

  // --- MOVEMENT ---
  let isMoving = false;
  // Dizzy/bouncing seekers can't move
  const disabled = dizzyTime > 0 || bounceTime > 0;
  if (canMove && !seekerBlind && !isHiding && !disabled) {
    const input = getInput();
    if (Math.abs(input.x) > .15) charRotY -= input.x * TURN_SPEED * dt;
    // Drag horizontal also turns the character
    charRotY -= consumeDragYaw();
    if (Math.abs(input.z) > .15) {
      const fwd = -input.z;
      charPos.x += Math.sin(charRotY) * fwd * MOVE_SPEED * dt;
      charPos.z += Math.cos(charRotY) * fwd * MOVE_SPEED * dt;
    }
    isMoving = Math.abs(input.x) > .15 || Math.abs(input.z) > .15;
    if (isMoving) decayLook(dt, 6);
    resolveCollision(charPos, .4);

    myChar.group.position.copy(charPos);
    myChar.group.rotation.y = charRotY;

    // Broadcast position
    sendTimer += dt;
    if (sendTimer > .05) { sendTimer = 0; send({ type: 'move', pos: { x: charPos.x, z: charPos.z }, rot: charRotY }); }

    // --- CATCH-BY-TOUCH (seeker only, seeking phase) ---
    if (role === 'seeker' && phase === 'seeking') {
      for (const [id, rp] of remotePlayers) {
        if (!rp.char.group.visible) continue;
        const dx = charPos.x - rp.char.group.position.x;
        const dz = charPos.z - rp.char.group.position.z;
        if (dx * dx + dz * dz < CATCH_RANGE * CATCH_RANGE) {
          send({ type: 'catch', hiderId: id });
          break;
        }
      }
    }
  }
  animateWalk(myChar, dt, isMoving);

  // --- LOCAL SEEKER HIT / BOUNCE / DIZZY ---
  if (hitTimer > 0) {
    // Swing right arm forward like a punch
    const t = 1 - (hitTimer / 0.5);
    const swing = Math.sin(t * Math.PI) * 1.7;
    myChar.armR.rotation.x = -swing;
    myChar.armL.rotation.x = swing * 0.3;
    hitTimer -= dt;
    if (hitTimer <= 0) { myChar.armR.rotation.x = 0; myChar.armL.rotation.x = 0; }
  }
  if (bounceTime > 0 && bounceVel) {
    const newPos = charPos.clone();
    newPos.x += bounceVel.x * dt;
    newPos.z += bounceVel.z * dt;
    resolveCollision(newPos, 0.4);
    charPos.copy(newPos);
    myChar.group.position.copy(charPos);
    bounceTime -= dt;
    if (bounceTime <= 0) { bounceVel = null; }
  }
  if (dizzyTime > 0) {
    dizzyTime -= dt;
    // Wobble the character
    myChar.group.rotation.z = Math.sin(clock.elapsedTime * 8) * 0.15;
    myChar.group.rotation.y = charRotY + Math.sin(clock.elapsedTime * 6) * 0.3;
    // Animate stars orbiting the head
    if (dizzyStars) {
      dizzyStars.position.set(charPos.x, 0, charPos.z);
      dizzyStars.children.forEach((s) => {
        const a = s.userData.baseAngle + clock.elapsedTime * 4;
        s.position.x = Math.cos(a) * 0.5;
        s.position.z = Math.sin(a) * 0.5;
      });
    }
    if (dizzyTime <= 0) {
      myChar.group.rotation.z = 0;
      myChar.group.rotation.y = charRotY;
      if (dizzyStars) { scene.remove(dizzyStars); dizzyStars = null; }
    }
  }

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

    // Hiders can hide in BOTH phases, seekers can search in seeking phase (but not while dizzy)
    const showBtn = !disabled && ((role === 'hider' && nearestHideable) ||
                    (role === 'seeker' && phase === 'seeking' && nearestHideable));
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
    const r = birdsEyeRoom(hiddenIn.pos.x, hiddenIn.pos.z);
    const fov = camera.fov / 2 * Math.PI / 180;
    const nH = (r.d / 2) / Math.tan(fov);
    const nW = (r.w / 2) / (Math.tan(fov) * camera.aspect);
    const camY = Math.max(nH, nW) + 2;
    camera.position.lerp(new THREE.Vector3(r.cx, camY, r.cz), 3 * dt);
    camera.lookAt(r.cx, 0, r.cz);
  } else if (!seekerBlind) {
    const cd = 6, ch = 3.5;
    const look = getLook();
    const yaw = charRotY + look.yaw;
    const camH = ch + look.pitch * 3;
    const tp = new THREE.Vector3(
      charPos.x + Math.sin(yaw) * -cd,
      charPos.y + camH,
      charPos.z + Math.cos(yaw) * -cd
    );
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

    // Remote seeker hit / dizzy effects
    const fx = remoteFx.get(id);
    if (fx) {
      if (fx.hitTimer > 0) {
        const tt = 1 - (fx.hitTimer / 0.5);
        const swing = Math.sin(tt * Math.PI) * 1.7;
        rp.char.armR.rotation.x = -swing;
        rp.char.armL.rotation.x = swing * 0.3;
        fx.hitTimer -= dt;
      }
      if (fx.bounceTime > 0 && fx.bounceVel) {
        rp.char.group.position.x += fx.bounceVel.x * dt;
        rp.char.group.position.z += fx.bounceVel.z * dt;
        fx.bounceTime -= dt;
      }
      if (fx.dizzyTime > 0) {
        fx.dizzyTime -= dt;
        rp.char.group.rotation.z = Math.sin(clock.elapsedTime * 8) * 0.15;
        if (fx.dizzyStars) {
          fx.dizzyStars.position.set(rp.char.group.position.x, 0, rp.char.group.position.z);
          fx.dizzyStars.children.forEach((s) => {
            const a = s.userData.baseAngle + clock.elapsedTime * 4;
            s.position.x = Math.cos(a) * 0.5;
            s.position.z = Math.sin(a) * 0.5;
          });
        }
        if (fx.dizzyTime <= 0) {
          rp.char.group.rotation.z = 0;
          if (fx.dizzyStars) scene.remove(fx.dizzyStars);
          remoteFx.delete(id);
        }
      } else if (fx.hitTimer <= 0 && fx.bounceTime <= 0) {
        remoteFx.delete(id);
      }
    }
  }

  // --- FIRE + TV ---
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
