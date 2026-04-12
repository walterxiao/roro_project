import * as THREE from 'three';

// ========== SCENE SETUP ==========
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========== LIGHTING ==========
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(2, 8, 4);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 30;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
scene.add(dirLight);

// Warm fireplace point light
const fireLight = new THREE.PointLight(0xff6622, 2, 8);
fireLight.position.set(0, 1.2, -4.5);
scene.add(fireLight);

// ========== MATERIALS ==========
function mat(color) {
  return new THREE.MeshStandardMaterial({ color });
}

const floorMat = mat(0x8B5E3C);   // wood
const wallMat = mat(0xF5F0E6);    // warm white
const ceilingMat = mat(0xFAF8F2);

// ========== ROOM ==========
const ROOM_W = 12;
const ROOM_D = 10;
const ROOM_H = 4;

// Floor
const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), floorMat);
floor.position.set(0, -0.1, 0);
floor.receiveShadow = true;
scene.add(floor);

// Ceiling
const ceilingMatInstance = ceilingMat.clone();
ceilingMatInstance.transparent = true;
ceilingMatInstance.opacity = 1;
const ceiling = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), ceilingMatInstance);
ceiling.position.set(0, ROOM_H + 0.1, 0);
scene.add(ceiling);

// Walls (and ceiling — anything that can block camera view)
const walls = [ceiling];
function addWall(w, h, d, x, y, z) {
  const wallMatInstance = wallMat.clone();
  wallMatInstance.transparent = true;
  wallMatInstance.opacity = 1;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMatInstance);
  wall.position.set(x, y, z);
  wall.receiveShadow = true;
  wall.castShadow = true;
  scene.add(wall);
  walls.push(wall);
  return wall;
}

// Back wall (fireplace wall)
addWall(ROOM_W, ROOM_H, 0.2, 0, ROOM_H / 2, -ROOM_D / 2);
// Front wall (has opening feel – but we close it for containment)
addWall(ROOM_W, ROOM_H, 0.2, 0, ROOM_H / 2, ROOM_D / 2);
// Left wall
addWall(0.2, ROOM_H, ROOM_D, -ROOM_W / 2, ROOM_H / 2, 0);
// Right wall
addWall(0.2, ROOM_H, ROOM_D, ROOM_W / 2, ROOM_H / 2, 0);

// ========== FIREPLACE ==========
const brickMat = mat(0x8B3A2A);
const darkMat = mat(0x1a1a1a);

// Fireplace back
const fpBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.15), brickMat);
fpBack.position.set(0, 1.1, -4.85);
fpBack.castShadow = true;
scene.add(fpBack);

// Fireplace opening (dark inside)
const fpInside = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.2), darkMat);
fpInside.position.set(0, 0.7, -4.75);
scene.add(fpInside);

// Left pillar
const fpPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), brickMat);
fpPillarL.position.set(-1.05, 1.1, -4.7);
fpPillarL.castShadow = true;
scene.add(fpPillarL);

// Right pillar
const fpPillarR = fpPillarL.clone();
fpPillarR.position.set(1.05, 1.1, -4.7);
scene.add(fpPillarR);

// Mantel
const mantelMat = mat(0x5C3A1E);
const mantel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 0.45), mantelMat);
mantel.position.set(0, 2.25, -4.7);
mantel.castShadow = true;
scene.add(mantel);

// Fire (animated planes)
const fireParts = [];
const fireMat1 = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.9 });
const fireMat2 = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.8 });
const fireMat3 = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.7 });
const fireMats = [fireMat1, fireMat2, fireMat3];

for (let i = 0; i < 6; i++) {
  const m = fireMats[i % 3];
  const flame = new THREE.Mesh(new THREE.BoxGeometry(0.2 + Math.random() * 0.3, 0.4 + Math.random() * 0.5, 0.1), m);
  flame.position.set(-0.4 + Math.random() * 0.8, 0.3 + Math.random() * 0.4, -4.65);
  scene.add(flame);
  fireParts.push({ mesh: flame, baseY: flame.position.y, speed: 1 + Math.random() * 2, offset: Math.random() * Math.PI * 2 });
}

// ========== TV ==========
// TV stand
const tvStandMat = mat(0x2C2C2C);
const tvStand = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.5), tvStandMat);
tvStand.position.set(4.5, 0.3, -3.5);
tvStand.castShadow = true;
scene.add(tvStand);

// TV screen
const tvScreenMat = mat(0x111111);
const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.08), tvScreenMat);
tvScreen.position.set(4.5, 1.5, -3.5);
tvScreen.castShadow = true;
scene.add(tvScreen);

// TV bezel
const tvBezelMat = mat(0x1a1a1a);
const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 0.06), tvBezelMat);
tvBezel.position.set(4.5, 1.5, -3.55);
scene.add(tvBezel);

// TV glow
const tvGlow = new THREE.PointLight(0x4488ff, 0.5, 4);
tvGlow.position.set(4.5, 1.5, -3.0);
scene.add(tvGlow);

// ========== THREE-PERSON SOFA ==========
const sofaMat = mat(0x3366AA);
const sofaLegMat = mat(0x888888);

// Seat cushion
const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.3, 1.0), sofaMat);
sofaSeat.position.set(-3.5, 0.5, -1);
sofaSeat.castShadow = true;
scene.add(sofaSeat);

// Back rest
const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 0.2), sofaMat);
sofaBack.position.set(-3.5, 1.15, -1.5);
sofaBack.castShadow = true;
scene.add(sofaBack);

// Left armrest
const sofaArmL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1.0), sofaMat);
sofaArmL.position.set(-5.1, 0.65, -1);
sofaArmL.castShadow = true;
scene.add(sofaArmL);

// Right armrest
const sofaArmR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1.0), sofaMat);
sofaArmR.position.set(-1.9, 0.65, -1);
sofaArmR.castShadow = true;
scene.add(sofaArmR);

// Cushion dividers (two lines on the seat)
const dividerMat = mat(0x2B5699);
const divider1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.9), dividerMat);
divider1.position.set(-4.0, 0.68, -1);
scene.add(divider1);
const divider2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.9), dividerMat);
divider2.position.set(-3.0, 0.68, -1);
scene.add(divider2);

// Legs
const sofaLegGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
const sofaLegPositions = [
  [-4.9, 0.175, -0.55],
  [-2.1, 0.175, -0.55],
  [-4.9, 0.175, -1.4],
  [-2.1, 0.175, -1.4],
];
sofaLegPositions.forEach(([x, y, z]) => {
  const leg = new THREE.Mesh(sofaLegGeo, sofaLegMat);
  leg.position.set(x, y, z);
  leg.castShadow = true;
  scene.add(leg);
});

// ========== RUG ==========
const rugMat = mat(0xCC4444);
const rug = new THREE.Mesh(new THREE.BoxGeometry(3, 0.02, 2), rugMat);
rug.position.set(0, 0.01, -2);
scene.add(rug);

// ========== COLLISION BOXES ==========
const colliders = [
  // Walls (inner bounds)
  { min: new THREE.Vector3(-ROOM_W / 2, 0, -ROOM_D / 2), max: new THREE.Vector3(-ROOM_W / 2 + 0.3, ROOM_H, ROOM_D / 2) },
  { min: new THREE.Vector3(ROOM_W / 2 - 0.3, 0, -ROOM_D / 2), max: new THREE.Vector3(ROOM_W / 2, ROOM_H, ROOM_D / 2) },
  { min: new THREE.Vector3(-ROOM_W / 2, 0, -ROOM_D / 2), max: new THREE.Vector3(ROOM_W / 2, ROOM_H, -ROOM_D / 2 + 0.3) },
  { min: new THREE.Vector3(-ROOM_W / 2, 0, ROOM_D / 2 - 0.3), max: new THREE.Vector3(ROOM_W / 2, ROOM_H, ROOM_D / 2) },
  // Fireplace
  { min: new THREE.Vector3(-1.3, 0, -5.0), max: new THREE.Vector3(1.3, 2.4, -4.5) },
  // TV stand + TV
  { min: new THREE.Vector3(3.3, 0, -3.8), max: new THREE.Vector3(5.7, 2.3, -3.2) },
  // Sofa
  { min: new THREE.Vector3(-5.3, 0, -1.7), max: new THREE.Vector3(-1.7, 1.2, -0.4) },
];

// ========== ROBLOX CHARACTER ==========
const charGroup = new THREE.Group();
scene.add(charGroup);

const skinColor = 0xF5C6A0;
const shirtColor = 0x2288DD;
const pantsColor = 0x334466;

// Head
const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat(skinColor));
head.position.y = 1.85;
head.castShadow = true;
charGroup.add(head);

// Eyes
const eyeMat = mat(0x111111);
const eyeWhiteMat = mat(0xffffff);
// Left eye
const eyeWhiteL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.02), eyeWhiteMat);
eyeWhiteL.position.set(-0.1, 1.88, 0.26);
charGroup.add(eyeWhiteL);
const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), eyeMat);
eyeL.position.set(-0.1, 1.88, 0.27);
charGroup.add(eyeL);
// Right eye
const eyeWhiteR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.02), eyeWhiteMat);
eyeWhiteR.position.set(0.1, 1.88, 0.26);
charGroup.add(eyeWhiteR);
const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), eyeMat);
eyeR.position.set(0.1, 1.88, 0.27);
charGroup.add(eyeR);

// Smile
const smileMat = mat(0x111111);
const smile = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.02), smileMat);
smile.position.set(0, 1.78, 0.26);
charGroup.add(smile);

// Torso
const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), mat(shirtColor));
torso.position.y = 1.25;
torso.castShadow = true;
charGroup.add(torso);

// Left arm
const armMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.3), mat(shirtColor));
armMeshL.position.set(-0.425, 1.25, 0);
armMeshL.castShadow = true;
charGroup.add(armMeshL);

// Right arm
const armMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.3), mat(shirtColor));
armMeshR.position.set(0.425, 1.25, 0);
armMeshR.castShadow = true;
charGroup.add(armMeshR);

// Left leg
const legMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.35), mat(pantsColor));
legMeshL.position.set(-0.16, 0.55, 0);
legMeshL.castShadow = true;
charGroup.add(legMeshL);

// Right leg
const legMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.35), mat(pantsColor));
legMeshR.position.set(0.16, 0.55, 0);
legMeshR.castShadow = true;
charGroup.add(legMeshR);

// Character state
const charPos = new THREE.Vector3(0, 0, 2);
let charRotY = 0;
let velY = 0;
const GRAVITY = -15;
const JUMP_VEL = 6;
const MOVE_SPEED = 4;
const TURN_SPEED = 3;
let isGrounded = true;
let walkTime = 0;

charGroup.position.copy(charPos);

// ========== CAMERA ==========
const CAM_OFFSET = new THREE.Vector3(0, 3.5, 6);
camera.position.copy(charPos).add(CAM_OFFSET);
camera.lookAt(charPos.x, 1.5, charPos.z);

// ========== JOYSTICK ==========
const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');
let joyActive = false;
let joyX = 0;
let joyY = 0;
let joyTouchId = null;

function getJoyCenter() {
  const rect = joystickBase.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function updateJoy(clientX, clientY) {
  const center = getJoyCenter();
  let dx = clientX - center.x;
  let dy = clientY - center.y;
  const maxR = 40;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }
  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joyX = dx / maxR;
  joyY = dy / maxR;
}

function resetJoy() {
  joystickKnob.style.transform = 'translate(0px, 0px)';
  joyX = 0;
  joyY = 0;
  joyActive = false;
  joyTouchId = null;
}

// Touch events for joystick
const joystickZone = document.getElementById('joystickZone');
joystickZone.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joyTouchId = t.identifier;
  joyActive = true;
  updateJoy(t.clientX, t.clientY);
}, { passive: false });

joystickZone.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) {
      updateJoy(t.clientX, t.clientY);
    }
  }
}, { passive: false });

joystickZone.addEventListener('touchend', (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) resetJoy();
  }
});
joystickZone.addEventListener('touchcancel', () => resetJoy());

// Mouse fallback for desktop
joystickZone.addEventListener('mousedown', (e) => {
  joyActive = true;
  updateJoy(e.clientX, e.clientY);
  const onMove = (ev) => updateJoy(ev.clientX, ev.clientY);
  const onUp = () => {
    resetJoy();
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
});

// ========== JUMP BUTTON ==========
const jumpBtn = document.getElementById('jumpBtn');
let jumpPressed = false;

jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); jumpPressed = true; }, { passive: false });
jumpBtn.addEventListener('touchend', () => { jumpPressed = false; });
jumpBtn.addEventListener('mousedown', (e) => { e.preventDefault(); jumpPressed = true; });
jumpBtn.addEventListener('mouseup', () => { jumpPressed = false; });

// ========== KEYBOARD SUPPORT ==========
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// ========== COLLISION ==========
function checkCollision(pos, radius) {
  for (const box of colliders) {
    const closestX = Math.max(box.min.x, Math.min(pos.x, box.max.x));
    const closestZ = Math.max(box.min.z, Math.min(pos.z, box.max.z));
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    if (dx * dx + dz * dz < radius * radius) {
      return { box, closestX, closestZ };
    }
  }
  return null;
}

function resolveCollision(pos, radius) {
  for (let i = 0; i < 4; i++) {
    const hit = checkCollision(pos, radius);
    if (!hit) break;
    const dx = pos.x - hit.closestX;
    const dz = pos.z - hit.closestZ;
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const overlap = radius - dist;
    pos.x += (dx / dist) * overlap;
    pos.z += (dz / dist) * overlap;
  }
}

// ========== GAME LOOP ==========
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // --- Input ---
  let inputX = joyX;
  let inputZ = joyY;

  // Keyboard WASD / arrows
  if (keys['w'] || keys['arrowup']) inputZ = -1;
  if (keys['s'] || keys['arrowdown']) inputZ = 1;
  if (keys['a'] || keys['arrowleft']) inputX = -1;
  if (keys['d'] || keys['arrowright']) inputX = 1;
  if (keys[' ']) jumpPressed = true;

  // --- Jump ---
  if (jumpPressed && isGrounded) {
    velY = JUMP_VEL;
    isGrounded = false;
  }
  if (!keys[' ']) jumpPressed = false;

  // --- Gravity ---
  velY += GRAVITY * dt;
  charPos.y += velY * dt;
  if (charPos.y <= 0) {
    charPos.y = 0;
    velY = 0;
    isGrounded = true;
  }

  // --- Movement (tank-style: left/right turns, up/down moves forward/back) ---
  // Turn
  if (Math.abs(inputX) > 0.15) {
    charRotY -= inputX * TURN_SPEED * dt;
  }

  // Move forward/backward relative to facing direction
  if (Math.abs(inputZ) > 0.15) {
    const forward = -inputZ; // joystick up (negative Y) = forward
    charPos.x += Math.sin(charRotY) * forward * MOVE_SPEED * dt;
    charPos.z += Math.cos(charRotY) * forward * MOVE_SPEED * dt;
  }

  const isMoving = Math.abs(inputX) > 0.15 || Math.abs(inputZ) > 0.15;

  // Collision
  resolveCollision(charPos, 0.4);

  // --- Update character ---
  charGroup.position.copy(charPos);
  charGroup.rotation.y = charRotY;

  // Walk animation
  if (isMoving && isGrounded) {
    walkTime += dt * 8;
    const swing = Math.sin(walkTime) * 0.4;
    armMeshL.rotation.x = swing;
    armMeshR.rotation.x = -swing;
    legMeshL.rotation.x = -swing;
    legMeshR.rotation.x = swing;
  } else {
    walkTime = 0;
    armMeshL.rotation.x = 0;
    armMeshR.rotation.x = 0;
    legMeshL.rotation.x = 0;
    legMeshR.rotation.x = 0;
  }

  // --- Camera follow (behind character) ---
  const camDist = 6;
  const camHeight = 3.5;
  const targetCamPos = new THREE.Vector3(
    charPos.x + Math.sin(charRotY) * -camDist,
    charPos.y + camHeight,
    charPos.z + Math.cos(charRotY) * -camDist
  );
  camera.position.lerp(targetCamPos, 4 * dt);
  const lookTarget = new THREE.Vector3(charPos.x, charPos.y + 1.5, charPos.z);
  camera.lookAt(lookTarget);

  // --- Hide walls blocking the view ---
  const charCenter = new THREE.Vector3(charPos.x, charPos.y + 1.0, charPos.z);
  const rayDir = new THREE.Vector3().subVectors(charCenter, camera.position).normalize();
  const rayDist = camera.position.distanceTo(charCenter);
  const raycaster = new THREE.Raycaster(camera.position, rayDir, 0, rayDist);
  const hits = raycaster.intersectObjects(walls);
  const blockers = new Set(hits.map(h => h.object));

  for (const wall of walls) {
    const targetOpacity = blockers.has(wall) ? 0.15 : 1;
    wall.material.opacity += (targetOpacity - wall.material.opacity) * Math.min(10 * dt, 1);
  }

  // --- Fire animation ---
  const t = clock.elapsedTime;
  fireParts.forEach((fp) => {
    fp.mesh.position.y = fp.baseY + Math.sin(t * fp.speed + fp.offset) * 0.15;
    fp.mesh.scale.x = 0.8 + Math.sin(t * fp.speed * 1.3 + fp.offset) * 0.3;
    fp.mesh.scale.y = 0.8 + Math.cos(t * fp.speed + fp.offset) * 0.2;
  });
  fireLight.intensity = 1.5 + Math.sin(t * 3) * 0.5 + Math.sin(t * 7) * 0.3;

  // TV flicker
  tvGlow.intensity = 0.4 + Math.sin(t * 2) * 0.1;

  renderer.render(scene, camera);
}

animate();
