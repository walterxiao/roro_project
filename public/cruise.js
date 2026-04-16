import { THREE, scene, mat } from './scene.js';

// ========== CRUISE SHIP MAP — TWO STACKED FLOORS ==========
// Both floors share the same X/Z footprint. Player walks up a grand
// glass staircase to transition between floors. The inactive floor is
// hidden from view.

const SHIP_W = 30, SHIP_D = 36, SHIP_H = 4;
const DECK_Y = 4; // upper floor height

const deckMat = mat(0xd4b895);
const indoorFloorMat = mat(0x8B5E3C);
const wallMat = mat(0xfafafa);
const hullMat = mat(0x003366);
const railingMat = mat(0xffffff);

const walls = [];
const lowerFloor = new THREE.Group(); scene.add(lowerFloor);
const upperFloor = new THREE.Group(); scene.add(upperFloor);

// Helper: add wall to a group + walls array
function addWall(w, h, d, x, y, z, group) {
  const m = wallMat.clone(); m.transparent = true; m.opacity = 1;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  wall.position.set(x, y, z); wall.receiveShadow = true; wall.castShadow = true;
  (group || scene).add(wall); walls.push(wall); return wall;
}

// ========== LOWER FLOOR (y=0) — Restaurant + Game Room ==========
// Floor (with hole for staircase at x=[-3.5,3.5], z=[6,12])
const lFloor = new THREE.Mesh(new THREE.BoxGeometry(SHIP_W, 0.2, SHIP_D), indoorFloorMat);
lFloor.position.set(0, -0.1, 0); lFloor.receiveShadow = true; lowerFloor.add(lFloor);

// Lower walls (perimeter)
addWall(SHIP_W, SHIP_H, 0.2, 0, 2, -SHIP_D / 2, lowerFloor);
addWall(SHIP_W, SHIP_H, 0.2, 0, 2, SHIP_D / 2, lowerFloor);
addWall(0.2, SHIP_H, SHIP_D, -SHIP_W / 2, 2, 0, lowerFloor);
addWall(0.2, SHIP_H, SHIP_D, SHIP_W / 2, 2, 0, lowerFloor);
// Ceiling (serves as upper floor's base — visible from below)
const lCeiling = new THREE.Mesh(new THREE.BoxGeometry(SHIP_W, 0.15, SHIP_D), mat(0xeeeeee));
lCeiling.position.set(0, SHIP_H, 0); lowerFloor.add(lCeiling);

// ========== UPPER FLOOR (y=4) — Pool Deck ==========
const uFloor = new THREE.Mesh(new THREE.BoxGeometry(SHIP_W, 0.2, SHIP_D), deckMat);
uFloor.position.set(0, DECK_Y - 0.1, 0); uFloor.receiveShadow = true; upperFloor.add(uFloor);

// Upper deck railings (low, open air)
const RAIL_H = 1.0;
function addRail(w, d, x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, RAIL_H, d), railingMat);
  m.position.set(x, DECK_Y + RAIL_H / 2, z); m.castShadow = true; upperFloor.add(m);
}
addRail(SHIP_W, 0.15, 0, -SHIP_D / 2);
addRail(SHIP_W, 0.15, 0, SHIP_D / 2);
addRail(0.15, SHIP_D, -SHIP_W / 2, 0);
addRail(0.15, SHIP_D, SHIP_W / 2, 0);

// Hull trim (visible from outside)
function hull(w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hullMat);
  m.position.set(x, y, z); scene.add(m);
}
hull(SHIP_W + 1, 0.6, 0.3, 0, 0.3, -SHIP_D / 2 - 0.5);
hull(SHIP_W + 1, 0.6, 0.3, 0, 0.3, SHIP_D / 2 + 0.5);
hull(0.3, 0.6, SHIP_D + 1, -SHIP_W / 2 - 0.5, 0.3, 0);
hull(0.3, 0.6, SHIP_D + 1, SHIP_W / 2 + 0.5, 0.3, 0);

// ========== GRAND GLASS STAIRCASE (green LED) ==========
// Located at center: x=[-3.5, 3.5], z=[6, 12], rising from y=0 to y=4
const STAIR_X = 0, STAIR_Z = 9;
const STAIR_W = 7, STAIR_D = 6;
const NUM_STEPS = 12;

const glassMat = new THREE.MeshStandardMaterial({
  color: 0x88ffaa, transparent: true, opacity: 0.65,
  emissive: 0x22ff66, emissiveIntensity: 0.4,
  side: THREE.DoubleSide,
});
const glassRailMat = new THREE.MeshStandardMaterial({
  color: 0xaaffcc, transparent: true, opacity: 0.3,
  side: THREE.DoubleSide,
});
const woodRailMat = mat(0xbb8844);

// Steps (glass with green glow)
for (let i = 0; i < NUM_STEPS; i++) {
  const stepY = (i + 1) * (DECK_Y / NUM_STEPS);
  const stepZ = STAIR_Z - STAIR_D / 2 + (i + 0.5) * (STAIR_D / NUM_STEPS);
  const step = new THREE.Mesh(new THREE.BoxGeometry(STAIR_W - 0.4, 0.12, STAIR_D / NUM_STEPS - 0.02), glassMat);
  step.position.set(STAIR_X, stepY, stepZ);
  step.castShadow = true;
  scene.add(step);
}
// Semi-circular bottom step
const bottomStep = new THREE.Mesh(new THREE.CylinderGeometry(STAIR_W / 2, STAIR_W / 2, 0.12, 16, 1, false, 0, Math.PI), glassMat);
bottomStep.position.set(STAIR_X, 0.06, STAIR_Z - STAIR_D / 2);
bottomStep.rotation.y = Math.PI;
scene.add(bottomStep);

// Glass side panels
const panelH = DECK_Y + 0.5;
const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, panelH, STAIR_D), glassRailMat);
panelL.position.set(STAIR_X - STAIR_W / 2 + 0.15, DECK_Y / 2, STAIR_Z);
scene.add(panelL);
const panelR = new THREE.Mesh(new THREE.BoxGeometry(0.08, panelH, STAIR_D), glassRailMat);
panelR.position.set(STAIR_X + STAIR_W / 2 - 0.15, DECK_Y / 2, STAIR_Z);
scene.add(panelR);

// Wooden handrails on top of glass panels
const railGeo = new THREE.BoxGeometry(0.12, 0.12, STAIR_D + 0.5);
const hRailL = new THREE.Mesh(railGeo, woodRailMat);
hRailL.position.set(STAIR_X - STAIR_W / 2 + 0.15, DECK_Y + 0.35, STAIR_Z);
hRailL.rotation.x = Math.atan2(DECK_Y, STAIR_D);
scene.add(hRailL);
const hRailR = new THREE.Mesh(railGeo, woodRailMat);
hRailR.position.set(STAIR_X + STAIR_W / 2 - 0.15, DECK_Y + 0.35, STAIR_Z);
hRailR.rotation.x = Math.atan2(DECK_Y, STAIR_D);
scene.add(hRailR);

// Green LED strip lights under each step
const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff55 });
for (let i = 0; i < NUM_STEPS; i++) {
  const stepY = (i + 1) * (DECK_Y / NUM_STEPS) - 0.08;
  const stepZ = STAIR_Z - STAIR_D / 2 + (i + 0.5) * (STAIR_D / NUM_STEPS);
  const led = new THREE.Mesh(new THREE.BoxGeometry(STAIR_W - 0.6, 0.03, 0.06), ledMat);
  led.position.set(STAIR_X, stepY, stepZ);
  scene.add(led);
}
// Green point light to illuminate the staircase
const stairLight = new THREE.PointLight(0x44ff88, 1.5, 12);
stairLight.position.set(STAIR_X, 2, STAIR_Z);
scene.add(stairLight);

// ========== LOWER FLOOR FURNITURE ==========
// --- Restaurant (west half, x < -1) ---
// Divider wall between restaurant and game room (with doorway z=-2 to 2)
addWall(0.2, SHIP_H, 14, 0, 2, -11, lowerFloor);
addWall(0.2, SHIP_H, 14, 0, 2, 11, lowerFloor);
addWall(0.2, 0.6, 4, 0, SHIP_H - 0.3, 0, lowerFloor);

function makeDinerTable(cx, cz, group) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 16), mat(0xffffff));
  top.position.y = 0.8; top.castShadow = true; g.add(top);
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.04, 16), mat(0xeeccaa));
  cloth.position.y = 0.85; g.add(cloth);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), mat(0x333333));
  post.position.y = 0.4; g.add(post);
  g.position.set(cx, 0, cz); group.add(g); return g;
}
function makeChair(cx, cz, angle, group) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat(0x882222));
  seat.position.y = 0.45; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), mat(0x882222));
  back.position.set(0, 0.78, -0.22); back.castShadow = true; g.add(back);
  for (const [x, z] of [[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), mat(0x333333));
    l.position.set(x, 0.2, z); g.add(l);
  }
  g.position.set(cx, 0, cz); g.rotation.y = angle; group.add(g); return g;
}

const restTables = [], restChairs = [];
[{ x: -9, z: -8 }, { x: -9, z: 5 }].forEach(({ x, z }) => {
  restTables.push(makeDinerTable(x, z, lowerFloor));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    restChairs.push(makeChair(x + Math.sin(a) * 1.7, z + Math.cos(a) * 1.7, a + Math.PI, lowerFloor));
  }
});
// Bar counter
const bar = new THREE.Group();
const barBody = new THREE.Mesh(new THREE.BoxGeometry(5, 1.0, 0.8), mat(0x5c3a1e));
barBody.position.y = 0.5; barBody.castShadow = true; bar.add(barBody);
const barTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.1, 1.0), mat(0x333333));
barTop.position.y = 1.05; bar.add(barTop);
bar.position.set(-10, 0, 16); lowerFloor.add(bar);

// --- Game Room (east half, x > 1) ---
// Pool table
const billiards = new THREE.Group();
const felt = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.4), mat(0x2a8a3a));
felt.position.y = 0.85; felt.castShadow = true; billiards.add(felt);
const frame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.15, 1.7), mat(0x5c3a1e));
frame.position.y = 0.78; billiards.add(frame);
for (const [x, z] of [[-1.15,-0.6],[1.15,-0.6],[-1.15,0.6],[1.15,0.6]]) {
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.72, 0.15), mat(0x4c2a10));
  l.position.set(x, 0.36, z); billiards.add(l);
}
billiards.position.set(8, 0, -6); lowerFloor.add(billiards);

// Foosball
const foosball = new THREE.Group();
const fFelt = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.2), mat(0x1a6a2a));
fFelt.position.y = 0.85; fFelt.castShadow = true; foosball.add(fFelt);
const fFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.4), mat(0x222222));
fFrame.position.y = 0.75; foosball.add(fFrame);
for (let i = 0; i < 4; i++) {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), mat(0xcccccc));
  rod.rotation.z = Math.PI / 2; rod.position.set(0, 1.0, -0.45 + i * 0.3); foosball.add(rod);
}
for (const [x, z] of [[-1.05,-0.6],[1.05,-0.6],[-1.05,0.6],[1.05,0.6]]) {
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), mat(0x111111));
  l.position.set(x, 0.32, z); foosball.add(l);
}
foosball.position.set(8, 0, 6); lowerFloor.add(foosball);

// Arcade
const arcade = new THREE.Group();
const aBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.7), mat(0x222244));
aBody.position.y = 1.0; aBody.castShadow = true; arcade.add(aBody);
const aScr = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.05),
  new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2255ff, emissiveIntensity: 0.4 }));
aScr.position.set(0, 1.6, 0.38); arcade.add(aScr);
arcade.position.set(12, 0, 14); lowerFloor.add(arcade);
for (const [x, z] of [[-8, -10], [8, -10], [-8, 10], [8, 10]]) {
  const l = new THREE.PointLight(0xffeec8, 0.9, 16);
  l.position.set(x, 3.5, z); lowerFloor.add(l);
}
for (const [x, z] of [[-8, -10], [8, -10], [-8, 10], [8, 10]]) {
  const l = new THREE.PointLight(0xffeec8, 1.1, 16);
  l.position.set(x, DECK_Y + 3, z); upperFloor.add(l);
}

// ========== UPPER FLOOR FURNITURE (pool deck) ==========
const pool = new THREE.Group();
const poolRim = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 5.5), mat(0xdddddd));
poolRim.position.y = 0.15; poolRim.castShadow = true; pool.add(poolRim);
const poolWater = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, 4.9),
  new THREE.MeshStandardMaterial({ color: 0x3899dd, transparent: true, opacity: 0.7, emissive: 0x225588, emissiveIntensity: 0.15 }));
poolWater.position.y = 0.16; pool.add(poolWater);
pool.position.set(0, DECK_Y, -8); upperFloor.add(pool);

const hotTub = new THREE.Group();
const tubBody = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.6, 14), mat(0xcccccc));
tubBody.position.y = 0.3; tubBody.castShadow = true; hotTub.add(tubBody);
const tubWater = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.1, 14),
  new THREE.MeshStandardMaterial({ color: 0x66bbdd, transparent: true, opacity: 0.6, emissive: 0x3388aa, emissiveIntensity: 0.3 }));
tubWater.position.y = 0.62; hotTub.add(tubWater);
hotTub.position.set(10, DECK_Y, 6); upperFloor.add(hotTub);

const slide = new THREE.Group();
const slideChute = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 5), mat(0x33aaff));
slideChute.position.set(0, 2.5, 0); slideChute.rotation.x = 0.4; slideChute.castShadow = true; slide.add(slideChute);
const slideTower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.5, 1.4), mat(0xcccccc));
slideTower.position.set(0, 1.75, 1.7); slideTower.castShadow = true; slide.add(slideTower);
slide.position.set(-11, DECK_Y, -12); upperFloor.add(slide);

function makeBeachChair(cx, cz) {
  const g = new THREE.Group();
  const fr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 2.0), mat(0xaaaaaa));
  fr.position.y = 0.3; fr.castShadow = true; g.add(fr);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 1.9), mat([0xffffff, 0xff9944, 0x44ccff, 0xffdd55][Math.floor(Math.random() * 4)]));
  cushion.position.y = 0.37; g.add(cushion);
  g.position.set(cx, DECK_Y, cz); upperFloor.add(g); return g;
}
const chair1 = makeBeachChair(-10, 10);
const chair2 = makeBeachChair(-6, 10);
const chair3 = makeBeachChair(6, 10);
const chair4 = makeBeachChair(10, 10);

const lounge = new THREE.Group();
const lSeat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.9), mat(0x2b5a8b));
lSeat.position.set(0, 0.4, 0); lSeat.castShadow = true; lounge.add(lSeat);
const lBack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.2), mat(0x2b5a8b));
lBack.position.set(0, 0.85, -0.4); lBack.castShadow = true; lounge.add(lBack);
lounge.position.set(-10, DECK_Y, 6); upperFloor.add(lounge);

// ========== HIDEABLES, COLLIDERS, EXPORTS ==========
const hideables = [
  { group: pool, pos: pool.position.clone(), name: 'Pool' },
  { group: hotTub, pos: hotTub.position.clone(), name: 'Hot Tub' },
  { group: slide, pos: slide.position.clone(), name: 'Water Slide' },
  { group: chair1, pos: chair1.position.clone(), name: 'Beach Chair 1' },
  { group: chair2, pos: chair2.position.clone(), name: 'Beach Chair 2' },
  { group: chair3, pos: chair3.position.clone(), name: 'Beach Chair 3' },
  { group: chair4, pos: chair4.position.clone(), name: 'Beach Chair 4' },
  { group: lounge, pos: lounge.position.clone(), name: 'Lounge' },
  { group: bar, pos: bar.position.clone(), name: 'Bar' },
  { group: billiards, pos: billiards.position.clone(), name: 'Pool Table' },
  { group: foosball, pos: foosball.position.clone(), name: 'Foosball' },
  { group: arcade, pos: arcade.position.clone(), name: 'Arcade' },
];
restTables.forEach((t, i) => hideables.push({ group: t, pos: t.position.clone(), name: 'Diner Table ' + (i+1) }));
restChairs.forEach((c, i) => hideables.push({ group: c, pos: c.position.clone(), name: 'Diner Chair ' + (i+1) }));

const hideableBounds = hideables.map(h => {
  const box = new THREE.Box3().setFromObject(h.group);
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
});

// Stair zone: x=[-3.5, 3.5], z=[6, 12]
const STAIR_MIN_Z = 6, STAIR_MAX_Z = 12;

const colliders = [
  // Lower walls
  { min: new THREE.Vector3(-SHIP_W/2, 0, -SHIP_D/2), max: new THREE.Vector3(SHIP_W/2, SHIP_H, -SHIP_D/2+.3) },
  { min: new THREE.Vector3(-SHIP_W/2, 0, SHIP_D/2-.3), max: new THREE.Vector3(SHIP_W/2, SHIP_H, SHIP_D/2) },
  { min: new THREE.Vector3(-SHIP_W/2, 0, -SHIP_D/2), max: new THREE.Vector3(-SHIP_W/2+.3, SHIP_H, SHIP_D/2) },
  { min: new THREE.Vector3(SHIP_W/2-.3, 0, -SHIP_D/2), max: new THREE.Vector3(SHIP_W/2, SHIP_H, SHIP_D/2) },
  // Restaurant / game room divider (z<-2 and z>2 with doorway)
  { min: new THREE.Vector3(-.1, 0, -SHIP_D/2), max: new THREE.Vector3(.1, SHIP_H, -2) },
  { min: new THREE.Vector3(-.1, 0, 2), max: new THREE.Vector3(.1, SHIP_H, 6) },
  // Upper deck railings
  { min: new THREE.Vector3(-SHIP_W/2, DECK_Y, -SHIP_D/2), max: new THREE.Vector3(SHIP_W/2, DECK_Y+1, -SHIP_D/2+.3) },
  { min: new THREE.Vector3(-SHIP_W/2, DECK_Y, SHIP_D/2-.3), max: new THREE.Vector3(SHIP_W/2, DECK_Y+1, SHIP_D/2) },
  { min: new THREE.Vector3(-SHIP_W/2, DECK_Y, -SHIP_D/2), max: new THREE.Vector3(-SHIP_W/2+.3, DECK_Y+1, SHIP_D/2) },
  { min: new THREE.Vector3(SHIP_W/2-.3, DECK_Y, -SHIP_D/2), max: new THREE.Vector3(SHIP_W/2, DECK_Y+1, SHIP_D/2) },
];
for (const b of hideableBounds) {
  colliders.push({ min: new THREE.Vector3(b.minX, 0, b.minZ), max: new THREE.Vector3(b.maxX, 1.5, b.maxZ) });
}

function getFloorY(x, z) {
  // Stair zone: x=[-3.5, 3.5], z=[6, 12] — interpolate from 0 to DECK_Y
  if (Math.abs(x) <= 3.5 && z >= STAIR_MIN_Z && z <= STAIR_MAX_Z) {
    const t = (z - STAIR_MIN_Z) / (STAIR_MAX_Z - STAIR_MIN_Z);
    return t * DECK_Y;
  }
  // Outside stair zone: return -1 to signal "keep current floor Y"
  return -1;
}

// Determine which floor the player is on based on their actual Y
function getPlayerFloor(y) {
  return y > DECK_Y / 2 ? 'upper' : 'lower';
}

function roomAt(x, z) {
  if (Math.abs(x) <= 3.5 && z >= STAIR_MIN_Z && z <= STAIR_MAX_Z) return 'stairs';
  if (x < 0) return 'restaurant';
  return 'game-room';
}

function birdsEyeRoom(x, z) {
  return { cx: 0, cz: 0, w: SHIP_W, d: SHIP_D, y: getFloorY(x, z) };
}

const spawnPoints = [
  { x: -9, z: -8 }, { x: -5, z: 5 }, { x: -10, z: 15 },
  { x: 8, z: -6 }, { x: 5, z: 6 }, { x: 12, z: 14 },
  { x: -12, z: -2 }, { x: 12, z: -2 }, { x: 0, z: -10 },
  { x: 0, z: 15 }, { x: -6, z: 0 }, { x: 6, z: 0 },
];

const fireParts = [];
const tvGlow = { intensity: 0 };
const ROOM_W = SHIP_W, ROOM_D = SHIP_D, ROOM_H = SHIP_H, DINING_W = 0;

export {
  ROOM_W, ROOM_D, ROOM_H, DINING_W,
  walls, hideables, hideableBounds, colliders,
  fireParts, tvGlow,
  spawnPoints, roomAt, birdsEyeRoom, getFloorY,
  lowerFloor, upperFloor, getPlayerFloor,
};
