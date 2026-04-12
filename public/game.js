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
// Front wall
addWall(ROOM_W, ROOM_H, 0.2, 0, ROOM_H / 2, ROOM_D / 2);
// Left wall
addWall(0.2, ROOM_H, ROOM_D, -ROOM_W / 2, ROOM_H / 2, 0);
// Right wall – split into two segments with a 4-unit opening
addWall(0.2, ROOM_H, 3, ROOM_W / 2, ROOM_H / 2, -3.5); // back segment z=-5 to z=-2
addWall(0.2, ROOM_H, 3, ROOM_W / 2, ROOM_H / 2, 3.5);  // front segment z=2 to z=5
// Arch/header above opening
addWall(0.2, 0.6, 4, ROOM_W / 2, ROOM_H - 0.3, 0);

// ========== DINING ROOM ==========
const DINING_W = 10;

// Dining room floor
const dFloor = new THREE.Mesh(new THREE.BoxGeometry(DINING_W, 0.2, ROOM_D), floorMat);
dFloor.position.set(ROOM_W / 2 + DINING_W / 2, -0.1, 0);
dFloor.receiveShadow = true;
scene.add(dFloor);

// Dining room ceiling
const dCeilingMat = ceilingMat.clone();
dCeilingMat.transparent = true;
dCeilingMat.opacity = 1;
const dCeiling = new THREE.Mesh(new THREE.BoxGeometry(DINING_W, 0.2, ROOM_D), dCeilingMat);
dCeiling.position.set(ROOM_W / 2 + DINING_W / 2, ROOM_H + 0.1, 0);
scene.add(dCeiling);
walls.push(dCeiling);

// Dining room walls
addWall(DINING_W, ROOM_H, 0.2, ROOM_W / 2 + DINING_W / 2, ROOM_H / 2, -ROOM_D / 2); // back
addWall(DINING_W, ROOM_H, 0.2, ROOM_W / 2 + DINING_W / 2, ROOM_H / 2, ROOM_D / 2);  // front
addWall(0.2, ROOM_H, ROOM_D, ROOM_W / 2 + DINING_W, ROOM_H / 2, 0);                  // far right

// Dining room light
const diningLight = new THREE.PointLight(0xfff5e0, 1.5, 10);
diningLight.position.set(ROOM_W / 2 + DINING_W / 2, 3.5, 0);
diningLight.castShadow = true;
scene.add(diningLight);

// ---- Dining Table ----
const tableMat = mat(0x6B3A2A);
const tableX = ROOM_W / 2 + DINING_W / 2; // center of dining room

// Table top
const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.15, 2.4), tableMat);
tableTop.position.set(tableX, 0.9, 0);
tableTop.castShadow = true;
scene.add(tableTop);

// Table legs
const tLegGeo = new THREE.BoxGeometry(0.15, 0.85, 0.15);
const tLegMat = mat(0x5C3020);
[[-2.0, 0.425, -1.0], [2.0, 0.425, -1.0], [-2.0, 0.425, 1.0], [2.0, 0.425, 1.0]].forEach(([lx, ly, lz]) => {
  const tLeg = new THREE.Mesh(tLegGeo, tLegMat);
  tLeg.position.set(tableX + lx, ly, lz);
  tLeg.castShadow = true;
  scene.add(tLeg);
});

// ---- 6 Dining Chairs ----
const dChairMat = mat(0x8B5E3C);
const dChairLegMat = mat(0x555555);
const chairColliders = [];
const chairGroups = [];

function addDiningChair(cx, cz, facingAngle) {
  const chairGrp = new THREE.Group();

  // Seat
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), dChairMat);
  cSeat.position.y = 0.55;
  cSeat.castShadow = true;
  chairGrp.add(cSeat);

  // Backrest
  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), dChairMat);
  cBack.position.set(0, 1.0, -0.36);
  cBack.castShadow = true;
  chairGrp.add(cBack);

  // 4 legs
  const cLegGeo = new THREE.BoxGeometry(0.07, 0.5, 0.07);
  [[-0.32, 0.25, -0.32], [0.32, 0.25, -0.32], [-0.32, 0.25, 0.32], [0.32, 0.25, 0.32]].forEach(([lx, ly, lz]) => {
    const cLeg = new THREE.Mesh(cLegGeo, dChairLegMat);
    cLeg.position.set(lx, ly, lz);
    cLeg.castShadow = true;
    chairGrp.add(cLeg);
  });

  chairGrp.position.set(cx, 0, cz);
  chairGrp.rotation.y = facingAngle;
  scene.add(chairGrp);

  // Add collision (axis-aligned box around chair position)
  chairColliders.push({
    min: new THREE.Vector3(cx - 0.5, 0, cz - 0.5),
    max: new THREE.Vector3(cx + 0.5, 1.4, cz + 0.5),
  });

  chairGroups.push(chairGrp);
}

// 2 chairs on each long side, 1 at each short end
addDiningChair(tableX - 1.2, -1.8, 0);          // back-left
addDiningChair(tableX + 1.2, -1.8, 0);          // back-right
addDiningChair(tableX - 1.2, 1.8, Math.PI);     // front-left
addDiningChair(tableX + 1.2, 1.8, Math.PI);     // front-right
addDiningChair(tableX - 2.9, 0, Math.PI / 2);   // left end
addDiningChair(tableX + 2.9, 0, -Math.PI / 2);  // right end

// ========== FIREPLACE ==========
const brickMat = mat(0x8B3A2A);
const darkMat = mat(0x1a1a1a);
const fpGroup = new THREE.Group();
fpGroup.position.set(0, 0, -4.7);

// Fireplace back
const fpBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.15), brickMat);
fpBack.position.set(0, 1.1, -0.15);
fpBack.castShadow = true;
fpGroup.add(fpBack);

// Fireplace opening (dark inside)
const fpInside = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.2), darkMat);
fpInside.position.set(0, 0.7, -0.05);
fpGroup.add(fpInside);

// Left pillar
const fpPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), brickMat);
fpPillarL.position.set(-1.05, 1.1, 0);
fpPillarL.castShadow = true;
fpGroup.add(fpPillarL);

// Right pillar
const fpPillarR = fpPillarL.clone();
fpPillarR.position.set(1.05, 1.1, 0);
fpGroup.add(fpPillarR);

// Mantel
const mantelMat = mat(0x5C3A1E);
const mantel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 0.45), mantelMat);
mantel.position.set(0, 2.25, 0);
mantel.castShadow = true;
fpGroup.add(mantel);

scene.add(fpGroup);

// Fire (animated planes) — kept in scene (not group) so they don't shake
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
const tvGroup = new THREE.Group();
tvGroup.position.set(4.5, 0, -3.5);

// TV stand
const tvStandMat = mat(0x2C2C2C);
const tvStand = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.5), tvStandMat);
tvStand.position.set(0, 0.3, 0);
tvStand.castShadow = true;
tvGroup.add(tvStand);

// TV screen
const tvScreenMat = mat(0x111111);
const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.08), tvScreenMat);
tvScreen.position.set(0, 1.5, 0);
tvScreen.castShadow = true;
tvGroup.add(tvScreen);

// TV bezel
const tvBezelMat = mat(0x1a1a1a);
const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 0.06), tvBezelMat);
tvBezel.position.set(0, 1.5, -0.05);
tvGroup.add(tvBezel);

// TV glow
const tvGlow = new THREE.PointLight(0x4488ff, 0.5, 4);
tvGlow.position.set(0, 1.5, 0.5);
tvGroup.add(tvGlow);

scene.add(tvGroup);

// ========== THREE-PERSON SOFA ==========
const sofaMat = mat(0x3366AA);
const sofaLegMat = mat(0x888888);
const sofaGroup = new THREE.Group();

// Seat cushion (built at origin, group moves it)
const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.3, 1.0), sofaMat);
sofaSeat.position.set(0, 0.5, 0);
sofaSeat.castShadow = true;
sofaGroup.add(sofaSeat);

// Back rest
const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 0.2), sofaMat);
sofaBack.position.set(0, 1.15, -0.5);
sofaBack.castShadow = true;
sofaGroup.add(sofaBack);

// Left armrest
const sofaArmL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1.0), sofaMat);
sofaArmL.position.set(-1.6, 0.65, 0);
sofaArmL.castShadow = true;
sofaGroup.add(sofaArmL);

// Right armrest
const sofaArmR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1.0), sofaMat);
sofaArmR.position.set(1.6, 0.65, 0);
sofaArmR.castShadow = true;
sofaGroup.add(sofaArmR);

// Cushion dividers
const dividerMat = mat(0x2B5699);
const divider1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.9), dividerMat);
divider1.position.set(-0.5, 0.68, 0);
sofaGroup.add(divider1);
const divider2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.9), dividerMat);
divider2.position.set(0.5, 0.68, 0);
sofaGroup.add(divider2);

// Legs
const sofaLegGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
[[-1.4, 0.175, 0.45], [1.4, 0.175, 0.45], [-1.4, 0.175, -0.4], [1.4, 0.175, -0.4]].forEach(([x, y, z]) => {
  const leg = new THREE.Mesh(sofaLegGeo, sofaLegMat);
  leg.position.set(x, y, z);
  leg.castShadow = true;
  sofaGroup.add(leg);
});

// Position sofa in room center, angled to face both fireplace and TV
sofaGroup.position.set(1, 0, 1);
sofaGroup.rotation.y = Math.PI - 0.4; // backrest faces room entrance, seats face fireplace + TV
scene.add(sofaGroup);

// ========== HIDEABLE FURNITURE ==========
// Each entry: { group, pos (world center), name }
const hideables = [];

// Register sofa
hideables.push({ group: sofaGroup, pos: sofaGroup.position.clone(), name: 'Sofa' });

// Register TV
hideables.push({ group: tvGroup, pos: tvGroup.position.clone(), name: 'TV' });

// Register fireplace
hideables.push({ group: fpGroup, pos: fpGroup.position.clone(), name: 'Fireplace' });

// Register dining chairs
chairGroups.forEach((grp, i) => {
  hideables.push({ group: grp, pos: grp.position.clone(), name: `Chair ${i + 1}` });
});

// ========== RUG ==========
const rugMat = mat(0xCC4444);
const rug = new THREE.Mesh(new THREE.BoxGeometry(3, 0.02, 2), rugMat);
rug.position.set(0, 0.01, -2);
scene.add(rug);

// ========== COLLISION BOXES ==========
const colliders = [
  // Living room walls
  { min: new THREE.Vector3(-ROOM_W / 2, 0, -ROOM_D / 2), max: new THREE.Vector3(-ROOM_W / 2 + 0.3, ROOM_H, ROOM_D / 2) },  // left
  { min: new THREE.Vector3(-ROOM_W / 2, 0, -ROOM_D / 2), max: new THREE.Vector3(ROOM_W / 2 + DINING_W, ROOM_H, -ROOM_D / 2 + 0.3) }, // back (spans both rooms)
  { min: new THREE.Vector3(-ROOM_W / 2, 0, ROOM_D / 2 - 0.3), max: new THREE.Vector3(ROOM_W / 2 + DINING_W, ROOM_H, ROOM_D / 2) },   // front (spans both rooms)
  // Right wall segments (with opening from z=-2 to z=2)
  { min: new THREE.Vector3(ROOM_W / 2 - 0.3, 0, -ROOM_D / 2), max: new THREE.Vector3(ROOM_W / 2, ROOM_H, -2) },  // back segment
  { min: new THREE.Vector3(ROOM_W / 2 - 0.3, 0, 2), max: new THREE.Vector3(ROOM_W / 2, ROOM_H, ROOM_D / 2) },     // front segment
  // Dining room far right wall
  { min: new THREE.Vector3(ROOM_W / 2 + DINING_W - 0.3, 0, -ROOM_D / 2), max: new THREE.Vector3(ROOM_W / 2 + DINING_W, ROOM_H, ROOM_D / 2) },
  // Fireplace
  { min: new THREE.Vector3(-1.3, 0, -5.0), max: new THREE.Vector3(1.3, 2.4, -4.5) },
  // TV stand + TV
  { min: new THREE.Vector3(3.3, 0, -3.8), max: new THREE.Vector3(5.7, 2.3, -3.2) },
  // Sofa
  { min: new THREE.Vector3(-0.8, 0, -0.2), max: new THREE.Vector3(2.8, 1.2, 2.0) },
  // Dining table
  { min: new THREE.Vector3(tableX - 2.4, 0, -1.3), max: new THREE.Vector3(tableX + 2.4, 1.0, 1.3) },
  // Chair colliders added dynamically
  ...chairColliders,
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

// ========== HIDE & SEEK ==========
const hideBtn = document.getElementById('hideBtn');
const hideZone = document.getElementById('hideZone');
const HIDE_RANGE = 2.5;

let isHiding = false;
let hiddenIn = null;        // the hideable object we're hiding in
let hideTimer = 0;          // time since last shake
const SHAKE_INTERVAL = 10;  // seconds between shakes
const SHAKE_DURATION = 1;   // seconds of shaking
let nearestHideable = null;

hideBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleHide(); }, { passive: false });
hideBtn.addEventListener('mousedown', (e) => { e.preventDefault(); toggleHide(); });

function toggleHide() {
  if (isHiding) {
    // Unhide
    isHiding = false;
    charGroup.visible = true;
    hiddenIn.group.position.copy(hiddenIn.pos); // reset position
    hiddenIn.group.rotation.x = 0;
    hiddenIn.group.rotation.z = 0;
    // Move character slightly away from the furniture
    charPos.copy(hiddenIn.pos);
    charPos.y = 0;
    hiddenIn = null;
    hideBtn.textContent = 'HIDE';
    hideZone.classList.remove('visible');
  } else if (nearestHideable) {
    // Hide — clear highlight
    nearestHideable.group.traverse((child) => {
      if (child.isMesh) child.material.emissive?.setHex(0x000000);
    });
    isHiding = true;
    hiddenIn = nearestHideable;
    hideTimer = 0;
    charGroup.visible = false;
    hideBtn.textContent = 'UNHIDE';
    hideZone.classList.add('visible');
  }
}

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

  // --- HIDING STATE ---
  if (isHiding) {
    // Shake the furniture 1 second every 10 seconds
    hideTimer += dt;
    const cycleTime = hideTimer % SHAKE_INTERVAL;
    if (cycleTime < SHAKE_DURATION) {
      const shakeIntensity = 0.04;
      const shakeSpeed = 30;
      hiddenIn.group.position.x = hiddenIn.pos.x + Math.sin(hideTimer * shakeSpeed) * shakeIntensity;
      hiddenIn.group.position.z = hiddenIn.pos.z + Math.cos(hideTimer * shakeSpeed * 1.3) * shakeIntensity;
      hiddenIn.group.rotation.z = Math.sin(hideTimer * shakeSpeed * 0.7) * 0.02;
    } else {
      // Reset to rest position
      hiddenIn.group.position.x = hiddenIn.pos.x;
      hiddenIn.group.position.z = hiddenIn.pos.z;
      hiddenIn.group.rotation.z = 0;
    }

    // Bird's-eye camera centered on the room the player is hiding in
    const inDining = hiddenIn.pos.x > ROOM_W / 2;
    const roomW = inDining ? DINING_W : ROOM_W;
    const roomCenterX = inDining ? ROOM_W / 2 + DINING_W / 2 : 0;
    // Calculate height needed to fit the full room in view
    const aspect = camera.aspect;
    const fovRad = (camera.fov / 2) * Math.PI / 180;
    const needH = (ROOM_D / 2) / Math.tan(fovRad);          // fit depth
    const needW = (roomW / 2) / (Math.tan(fovRad) * aspect); // fit width
    const camY = Math.max(needH, needW) + 2; // +2 padding
    const targetCamPos = new THREE.Vector3(roomCenterX, camY, 0);
    camera.position.lerp(targetCamPos, 3 * dt);
    camera.lookAt(roomCenterX, 0, 0);
  }

  // --- NORMAL MOVEMENT (only when not hiding) ---
  let isMoving = false;
  if (!isHiding) {
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
    if (Math.abs(inputX) > 0.15) {
      charRotY -= inputX * TURN_SPEED * dt;
    }
    if (Math.abs(inputZ) > 0.15) {
      const forward = -inputZ;
      charPos.x += Math.sin(charRotY) * forward * MOVE_SPEED * dt;
      charPos.z += Math.cos(charRotY) * forward * MOVE_SPEED * dt;
    }

    isMoving = Math.abs(inputX) > 0.15 || Math.abs(inputZ) > 0.15;

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

    // --- Proximity to hideable furniture ---
    let prevNearest = nearestHideable;
    nearestHideable = null;
    let nearestDist = HIDE_RANGE;
    for (const h of hideables) {
      const dx = charPos.x - h.pos.x;
      const dz = charPos.z - h.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestHideable = h;
      }
    }

    // Remove highlight from previous
    if (prevNearest && prevNearest !== nearestHideable) {
      prevNearest.group.traverse((child) => {
        if (child.isMesh) {
          child.material.emissive?.setHex(0x000000);
        }
      });
    }

    // Add highlight to current
    if (nearestHideable) {
      nearestHideable.group.traverse((child) => {
        if (child.isMesh) {
          child.material.emissive?.setHex(0x444400);
        }
      });
      hideZone.classList.add('visible');
      hideBtn.textContent = 'HIDE';
    } else {
      hideZone.classList.remove('visible');
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
  }

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
