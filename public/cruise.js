import { THREE, scene, mat } from './scene.js';

// ========== CRUISE SHIP MAP ==========
// Two areas: pool deck (upper/outdoor, z negative) and indoor rooms (z positive)
// Connected by a stair passage around z=0

const SHIP_W = 30, SHIP_H = 4;
const DECK_D = 24;  // pool deck depth
const ROOMS_D = 20; // indoor depth
const STAIR_D = 4;  // stair passage depth
// z bounds:
//   Pool deck: z = -28 to -4
//   Stairs:    z = -4 to  0
//   Indoor:    z =  0 to 20
const DECK_Z = -16;  // center of pool deck
const ROOMS_Z = 10;  // center of indoor
const TOTAL_D = DECK_D + STAIR_D + ROOMS_D; // 48

// Materials
const deckMat = mat(0xd4b895);  // wood deck
const indoorFloorMat = mat(0x8B5E3C);
const wallMat = mat(0xfafafa);
const hullMat = mat(0x003366);  // navy blue cruise ship hull
const railingMat = mat(0xffffff);

const walls = [];

// ========== FLOORS ==========
// Pool deck floor (outdoor)
const deckFloor = new THREE.Mesh(new THREE.BoxGeometry(SHIP_W, 0.2, DECK_D), deckMat);
deckFloor.position.set(0, -0.1, DECK_Z);
deckFloor.receiveShadow = true; scene.add(deckFloor);

// Stair area floor (visual stairs)
const stairFloor = new THREE.Mesh(new THREE.BoxGeometry(SHIP_W, 0.2, STAIR_D), indoorFloorMat);
stairFloor.position.set(0, -0.1, -2);
stairFloor.receiveShadow = true; scene.add(stairFloor);

// Indoor floor
const indoorFloor = new THREE.Mesh(new THREE.BoxGeometry(SHIP_W, 0.2, ROOMS_D), indoorFloorMat);
indoorFloor.position.set(0, -0.1, ROOMS_Z);
indoorFloor.receiveShadow = true; scene.add(indoorFloor);

// Hull (visible outside, adds ship character) — a blue strip around the outside
function addHullStrip(w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hullMat);
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true; scene.add(m);
}
addHullStrip(SHIP_W + 1, 0.6, 0.3, 0, 0.3, -28.5);
addHullStrip(SHIP_W + 1, 0.6, 0.3, 0, 0.3, 20.5);
addHullStrip(0.3, 0.6, TOTAL_D + 1, -15.5, 0.3, -4);
addHullStrip(0.3, 0.6, TOTAL_D + 1, 15.5, 0.3, -4);

// ========== WALLS ==========
function addWall(w, h, d, x, y, z) {
  const m = wallMat.clone(); m.transparent = true; m.opacity = 1;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  wall.position.set(x, y, z); wall.receiveShadow = true; wall.castShadow = true;
  scene.add(wall); walls.push(wall); return wall;
}

// Outer perimeter (indoor + stair areas need walls; pool deck uses low railings)
// South wall (end of indoor)
addWall(SHIP_W, SHIP_H, 0.2, 0, SHIP_H / 2, 20);
// Left wall of indoor + stair
addWall(0.2, SHIP_H, 24, -15, SHIP_H / 2, 8);
// Right wall of indoor + stair
addWall(0.2, SHIP_H, 24, 15, SHIP_H / 2, 8);
// Indoor splitter wall: separates restaurant (left) and game room (right)
// with a doorway from z=9 to z=11
addWall(0.2, SHIP_H, 9, 0, SHIP_H / 2, 4.5);
addWall(0.2, SHIP_H, 9, 0, SHIP_H / 2, 15.5);
addWall(0.2, 0.6, 2, 0, SHIP_H - 0.3, 10);

// Wall between stair area and pool deck (with a wide doorway)
// Doorway x = -4 to x = 4 open, solid outside
addWall(11, SHIP_H, 0.2, -9.5, SHIP_H / 2, -4);
addWall(11, SHIP_H, 0.2, 9.5, SHIP_H / 2, -4);
addWall(8, 0.6, 0.2, 0, SHIP_H - 0.3, -4);

// Pool deck low railings (white pipe style) on 3 sides
const RAIL_H = 1.0;
function addRailing(w, d, x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, RAIL_H, d), railingMat);
  m.position.set(x, RAIL_H / 2, z); m.castShadow = true;
  scene.add(m);
}
addRailing(SHIP_W, 0.15, 0, -28);       // back of deck
addRailing(0.15, DECK_D, -15, DECK_Z);  // left of deck
addRailing(0.15, DECK_D, 15, DECK_Z);   // right of deck

// ========== STAIR VISUAL (decorative steps in the passage) ==========
const stairStepMat = mat(0xaa8866);
for (let i = 0; i < 4; i++) {
  const step = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 0.6), stairStepMat);
  step.position.set(0, 0.05 + i * 0.02, -3.5 + i * 0.6);
  step.castShadow = true; scene.add(step);
}
const railL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 2.5), stairStepMat);
railL.position.set(-3, 0.35, -2.3); scene.add(railL);
const railR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 2.5), stairStepMat);
railR.position.set(3, 0.35, -2.3); scene.add(railR);

// ========== LIGHTING ==========
const sun = new THREE.AmbientLight(0xffffff, 0.55); scene.add(sun);
for (const [x, z] of [[-8, -15], [8, -15], [-8, 10], [8, 10]]) {
  const l = new THREE.PointLight(0xffeec8, 1.1, 16);
  l.position.set(x, 3.5, z); scene.add(l);
}

// ========== POOL DECK FURNITURE ==========
// Pool — large rectangular basin with translucent water
const pool = new THREE.Group();
const poolRim = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 5.5), mat(0xdddddd));
poolRim.position.y = 0.15; poolRim.castShadow = true; pool.add(poolRim);
const poolWater = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, 4.9),
  new THREE.MeshStandardMaterial({ color: 0x3899dd, transparent: true, opacity: 0.7, emissive: 0x225588, emissiveIntensity: 0.15 }));
poolWater.position.y = 0.16; pool.add(poolWater);
pool.position.set(0, 0, -20);
scene.add(pool);

// Hot tub — round with warm water
const hotTub = new THREE.Group();
const tubBody = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.6, 14), mat(0xcccccc));
tubBody.position.y = 0.3; tubBody.castShadow = true; hotTub.add(tubBody);
const tubWater = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.1, 14),
  new THREE.MeshStandardMaterial({ color: 0x66bbdd, transparent: true, opacity: 0.6, emissive: 0x3388aa, emissiveIntensity: 0.3 }));
tubWater.position.y = 0.62; hotTub.add(tubWater);
// Steam particles (tiny white boxes floating above)
for (let i = 0; i < 4; i++) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  s.position.set((Math.random() - 0.5) * 1.5, 0.9 + Math.random() * 0.3, (Math.random() - 0.5) * 1.5);
  hotTub.add(s);
}
hotTub.position.set(10, 0, -10);
scene.add(hotTub);

// Water slide — tilted slide structure
const slide = new THREE.Group();
const slideTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 5), mat(0x33aaff));
slideTop.position.set(0, 2.5, 0); slideTop.rotation.x = 0.4; slideTop.castShadow = true; slide.add(slideTop);
const slideSideL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 5), mat(0x44bbff));
slideSideL.position.set(-0.7, 2.7, 0); slideSideL.rotation.x = 0.4; slide.add(slideSideL);
const slideSideR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 5), mat(0x44bbff));
slideSideR.position.set(0.7, 2.7, 0); slideSideR.rotation.x = 0.4; slide.add(slideSideR);
// Support tower
const slideTower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.5, 1.4), mat(0xcccccc));
slideTower.position.set(0, 1.75, 1.7); slideTower.castShadow = true; slide.add(slideTower);
// Ladder
const slideLadder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.1), mat(0x888888));
slideLadder.position.set(0, 1.5, 2.4); slide.add(slideLadder);
slide.position.set(-11, 0, -23);
scene.add(slide);

// Beach chairs (loungers)
function makeBeachChair(cx, cz, rot = 0) {
  const g = new THREE.Group();
  const colors = [0xffffff, 0xff9944, 0x44ccff, 0xffdd55];
  const towel = colors[Math.floor(Math.random() * colors.length)];
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 2.0), mat(0xaaaaaa));
  frame.position.y = 0.3; frame.castShadow = true; g.add(frame);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 1.9), mat(towel));
  cushion.position.y = 0.37; g.add(cushion);
  // Raised backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.8), mat(towel));
  back.position.set(0, 0.55, -0.8); back.rotation.x = -0.4; g.add(back);
  // Legs
  for (const lx of [-0.3, 0.3]) {
    for (const lz of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), mat(0x666666));
      leg.position.set(lx, 0.15, lz); g.add(leg);
    }
  }
  g.position.set(cx, 0, cz); g.rotation.y = rot;
  scene.add(g);
  return g;
}
const chair1 = makeBeachChair(-7, -13);
const chair2 = makeBeachChair(-3, -13);
const chair3 = makeBeachChair(4, -13);
const chair4 = makeBeachChair(8, -13);

// Outdoor lounge — couch + coffee table
const lounge = new THREE.Group();
const loungeCushion = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.9), mat(0x2b5a8b));
loungeCushion.position.set(0, 0.4, 0); loungeCushion.castShadow = true; lounge.add(loungeCushion);
const loungeBack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.2), mat(0x2b5a8b));
loungeBack.position.set(0, 0.85, -0.4); loungeBack.castShadow = true; lounge.add(loungeBack);
const loungeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 12), mat(0xffffff));
loungeTable.position.set(0, 0.45, 1.3); loungeTable.castShadow = true; lounge.add(loungeTable);
const loungeTableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), mat(0xaaaaaa));
loungeTableLeg.position.set(0, 0.2, 1.3); lounge.add(loungeTableLeg);
lounge.position.set(-8, 0, -8);
scene.add(lounge);

// ========== RESTAURANT (lower floor, left half) ==========
// Two round tables with 5 chairs each
function makeDinerTable(cx, cz) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 16), mat(0xffffff));
  top.position.y = 0.8; top.castShadow = true; g.add(top);
  const tablecloth = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.04, 16), mat(0xeeccaa));
  tablecloth.position.y = 0.85; g.add(tablecloth);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), mat(0x333333));
  post.position.y = 0.4; g.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12), mat(0x333333));
  base.position.y = 0.04; g.add(base);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
function makeRestChair(cx, cz, angle) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat(0x882222));
  seat.position.y = 0.45; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), mat(0x882222));
  back.position.set(0, 0.78, -0.22); back.castShadow = true; g.add(back);
  for (const [x, z] of [[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), mat(0x333333));
    l.position.set(x, 0.2, z); g.add(l);
  }
  g.position.set(cx, 0, cz); g.rotation.y = angle; scene.add(g);
  return g;
}

const restTables = [];
const restChairs = [];
[{ x: -10, z: 5 }, { x: -10, z: 14 }].forEach(({ x, z }) => {
  restTables.push(makeDinerTable(x, z));
  // 5 chairs arranged around the circumference
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const cx = x + Math.sin(angle) * 1.7;
    const cz = z + Math.cos(angle) * 1.7;
    restChairs.push(makeRestChair(cx, cz, angle + Math.PI));
  }
});

// Bar counter along back of restaurant
const barCounter = new THREE.Group();
const barBody = new THREE.Mesh(new THREE.BoxGeometry(5, 1.0, 0.8), mat(0x5c3a1e));
barBody.position.y = 0.5; barBody.castShadow = true; barCounter.add(barBody);
const barTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.1, 1.0), mat(0x333333));
barTop.position.y = 1.05; barCounter.add(barTop);
barCounter.position.set(-12, 0, 18.5);
scene.add(barCounter);

// ========== GAME ROOM (lower floor, right half) ==========
// Pool/billiards table
const billiards = new THREE.Group();
const billiardsFelt = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.4), mat(0x2a8a3a));
billiardsFelt.position.y = 0.85; billiardsFelt.castShadow = true; billiards.add(billiardsFelt);
const billiardsFrame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.15, 1.7), mat(0x5c3a1e));
billiardsFrame.position.y = 0.78; billiards.add(billiardsFrame);
for (const [lx, lz] of [[-1.15,-0.6],[1.15,-0.6],[-1.15,0.6],[1.15,0.6]]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.72, 0.15), mat(0x4c2a10));
  leg.position.set(lx, 0.36, lz); billiards.add(leg);
}
// Balls
const ballColors = [0xffff00, 0xff2222, 0x2222ff, 0x22cc22, 0xdd44aa];
ballColors.forEach((c, i) => {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(c));
  ball.position.set(-0.6 + i * 0.18, 0.95, 0);
  billiards.add(ball);
});
const cueBall = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(0xffffff));
cueBall.position.set(0.5, 0.95, 0.3); billiards.add(cueBall);
billiards.position.set(7, 0, 6);
scene.add(billiards);

// Foosball table
const foosball = new THREE.Group();
const foosFelt = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.2), mat(0x1a6a2a));
foosFelt.position.y = 0.85; foosFelt.castShadow = true; foosball.add(foosFelt);
const foosFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.4), mat(0x222222));
foosFrame.position.y = 0.75; foosball.add(foosFrame);
// Rods (horizontal)
for (let i = 0; i < 4; i++) {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), mat(0xcccccc));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 1.0, -0.45 + i * 0.3);
  foosball.add(rod);
  // Players
  for (let j = 0; j < 3; j++) {
    const player = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), mat(i % 2 === 0 ? 0xff3333 : 0x3333ff));
    player.position.set(-0.7 + j * 0.7, 0.95, -0.45 + i * 0.3);
    foosball.add(player);
  }
}
for (const [lx, lz] of [[-1.05,-0.6],[1.05,-0.6],[-1.05,0.6],[1.05,0.6]]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), mat(0x111111));
  leg.position.set(lx, 0.32, lz); foosball.add(leg);
}
foosball.position.set(11, 0, 15);
scene.add(foosball);

// Dartboard on wall (east wall, near x=15)
const dartboard = new THREE.Group();
const dartBack = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 16), mat(0x333333));
dartBack.rotation.z = Math.PI / 2; dartBack.position.x = 0.05; dartboard.add(dartBack);
const dartFace = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16), mat(0xeeeeee));
dartFace.rotation.z = Math.PI / 2; dartFace.position.x = 0.10; dartboard.add(dartFace);
const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), mat(0xcc2222));
bullseye.rotation.z = Math.PI / 2; bullseye.position.x = 0.13; dartboard.add(bullseye);
dartboard.position.set(14.8, 2, 5);
scene.add(dartboard);

// Arcade cabinet
const arcade = new THREE.Group();
const arcadeBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.7), mat(0x222244));
arcadeBody.position.y = 1.0; arcadeBody.castShadow = true; arcade.add(arcadeBody);
const arcadeScreen = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2255ff, emissiveIntensity: 0.4 }));
arcadeScreen.position.set(0, 1.6, 0.38); arcade.add(arcadeScreen);
const arcadeControls = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.25), mat(0x111111));
arcadeControls.position.set(0, 1.2, 0.38); arcade.add(arcadeControls);
const joystick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.15, 8), mat(0xff2244));
joystick.position.set(-0.15, 1.3, 0.38); arcade.add(joystick);
arcade.position.set(13, 0, 17);
scene.add(arcade);

// ========== HIDEABLES ==========
const hideables = [
  { group: pool, pos: pool.position.clone(), name: 'Pool' },
  { group: hotTub, pos: hotTub.position.clone(), name: 'Hot Tub' },
  { group: slide, pos: slide.position.clone(), name: 'Water Slide' },
  { group: chair1, pos: chair1.position.clone(), name: 'Beach Chair 1' },
  { group: chair2, pos: chair2.position.clone(), name: 'Beach Chair 2' },
  { group: chair3, pos: chair3.position.clone(), name: 'Beach Chair 3' },
  { group: chair4, pos: chair4.position.clone(), name: 'Beach Chair 4' },
  { group: lounge, pos: lounge.position.clone(), name: 'Lounge' },
  { group: barCounter, pos: barCounter.position.clone(), name: 'Bar' },
  { group: billiards, pos: billiards.position.clone(), name: 'Pool Table' },
  { group: foosball, pos: foosball.position.clone(), name: 'Foosball' },
  { group: arcade, pos: arcade.position.clone(), name: 'Arcade' },
];
restTables.forEach((t, i) => hideables.push({ group: t, pos: t.position.clone(), name: 'Diner Table ' + (i + 1) }));
restChairs.forEach((c, i) => hideables.push({ group: c, pos: c.position.clone(), name: 'Diner Chair ' + (i + 1) }));

const hideableBounds = hideables.map(h => {
  const box = new THREE.Box3().setFromObject(h.group);
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
});

// ========== COLLIDERS ==========
const colliders = [
  // South wall
  { min: new THREE.Vector3(-15, 0, 20 - 0.1), max: new THREE.Vector3(15, SHIP_H, 20 + 0.1) },
  // Left wall (indoor+stair)
  { min: new THREE.Vector3(-15 - 0.1, 0, -4), max: new THREE.Vector3(-15 + 0.1, SHIP_H, 20) },
  // Right wall (indoor+stair)
  { min: new THREE.Vector3(15 - 0.1, 0, -4), max: new THREE.Vector3(15 + 0.1, SHIP_H, 20) },
  // Middle splitter (restaurant vs game room) — split around z=9 to 11 doorway
  { min: new THREE.Vector3(-0.1, 0, 0), max: new THREE.Vector3(0.1, SHIP_H, 9) },
  { min: new THREE.Vector3(-0.1, 0, 11), max: new THREE.Vector3(0.1, SHIP_H, 20) },
  // Wall between stair and pool deck — opening x=-4 to x=4
  { min: new THREE.Vector3(-15, 0, -4 - 0.1), max: new THREE.Vector3(-4, SHIP_H, -4 + 0.1) },
  { min: new THREE.Vector3(4, 0, -4 - 0.1), max: new THREE.Vector3(15, SHIP_H, -4 + 0.1) },
  // Pool deck railings
  { min: new THREE.Vector3(-15, 0, -28 - 0.1), max: new THREE.Vector3(15, RAIL_H, -28 + 0.1) },
  { min: new THREE.Vector3(-15 - 0.1, 0, -28), max: new THREE.Vector3(-15 + 0.1, RAIL_H, -4) },
  { min: new THREE.Vector3(15 - 0.1, 0, -28), max: new THREE.Vector3(15 + 0.1, RAIL_H, -4) },
];
// Furniture colliders from bounding boxes
for (const b of hideableBounds) {
  colliders.push({
    min: new THREE.Vector3(b.minX, 0, b.minZ),
    max: new THREE.Vector3(b.maxX, 1.5, b.maxZ),
  });
}

// ========== ROOM DETECTION ==========
function roomAt(x, z) {
  if (z < -4) return 'pool-deck';
  if (z < 0) return 'stairs';
  if (x < 0) return 'restaurant';
  return 'game-room';
}

function birdsEyeRoom(x, z) {
  const r = roomAt(x, z);
  if (r === 'pool-deck') return { cx: 0, cz: DECK_Z, w: SHIP_W, d: DECK_D };
  if (r === 'stairs') return { cx: 0, cz: -2, w: SHIP_W, d: STAIR_D + 4 };
  if (r === 'restaurant') return { cx: -7.5, cz: ROOMS_Z, w: 15, d: ROOMS_D };
  return { cx: 7.5, cz: ROOMS_Z, w: 15, d: ROOMS_D };
}

// ========== SPAWN POINTS ==========
const spawnPoints = [
  { x: -10, z: -22 }, { x: 0, z: -20 }, { x: 10, z: -22 },
  { x: -8, z: -15 }, { x: 8, z: -15 }, { x: 0, z: -10 },
  { x: -12, z: -8 }, { x: 12, z: -8 },
  { x: -10, z: 5 }, { x: -5, z: 10 }, { x: -10, z: 15 },
  { x: 8, z: 5 }, { x: 5, z: 12 }, { x: 12, z: 16 },
  { x: 0, z: -2 },
];

// Required exports (same shape as other maps)
const fireParts = [];
const tvGlow = { intensity: 0 };
const ROOM_W = SHIP_W;
const ROOM_D = TOTAL_D;
const ROOM_H = SHIP_H;
const DINING_W = 0;

export {
  ROOM_W, ROOM_D, ROOM_H, DINING_W,
  walls, hideables, hideableBounds, colliders,
  fireParts, tvGlow,
  spawnPoints, roomAt, birdsEyeRoom,
};
