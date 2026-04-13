import { THREE, scene, mat } from './scene.js';

// ========== LIBRARY MAP ==========
// One big library hall with bookshelves, reading nook, computers, fish tank,
// checkout stations and a small restroom in the back.

const LIB_W = 28, LIB_D = 24, LIB_H = 4;
const floorMat = mat(0xC9A87C);   // warm wood
const wallMat = mat(0xEFE6D2);
const ceilingMat = mat(0xFAF8F2);

const walls = [];

// Floor
const floor = new THREE.Mesh(new THREE.BoxGeometry(LIB_W, 0.2, LIB_D), floorMat);
floor.position.set(0, -0.1, 0); floor.receiveShadow = true; scene.add(floor);

// Ceiling removed — open sky

function addWall(w, h, d, x, y, z) {
  const m = wallMat.clone(); m.transparent = true; m.opacity = 1;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  wall.position.set(x, y, z); wall.receiveShadow = true; wall.castShadow = true;
  scene.add(wall); walls.push(wall); return wall;
}

// Outer walls — east wall split for garden doorway (z=-2 to z=2)
addWall(LIB_W, LIB_H, 0.2, 0, LIB_H / 2, -LIB_D / 2);
addWall(LIB_W, LIB_H, 0.2, 0, LIB_H / 2, LIB_D / 2);
addWall(0.2, LIB_H, LIB_D, -LIB_W / 2, LIB_H / 2, 0);
// East wall split (opening x=LIB_W/2, z from -2 to 2)
addWall(0.2, LIB_H, 10, LIB_W / 2, LIB_H / 2, -7);
addWall(0.2, LIB_H, 10, LIB_W / 2, LIB_H / 2, 7);
addWall(0.2, 0.6, 4, LIB_W / 2, LIB_H - 0.3, 0);

// ======== GARDEN (east side) ========
const GARDEN_W = 14, GARDEN_D = 16;
const GARDEN_X = LIB_W / 2 + GARDEN_W / 2;
// Grass floor
const grassMat = mat(0x4caa3f);
const gardenFloor = new THREE.Mesh(new THREE.BoxGeometry(GARDEN_W, 0.2, GARDEN_D), grassMat);
gardenFloor.position.set(GARDEN_X, -0.1, 0); gardenFloor.receiveShadow = true; scene.add(gardenFloor);
// Garden walls (low stone — hip height, for boundaries)
const stoneMat = mat(0x9a8f7c);
function addGardenWall(w, h, d, x, y, z) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat);
  wall.position.set(x, y, z); wall.receiveShadow = true; wall.castShadow = true; scene.add(wall); return wall;
}
addGardenWall(GARDEN_W, 1.0, 0.2, GARDEN_X, 0.5, -GARDEN_D / 2);       // north
addGardenWall(GARDEN_W, 1.0, 0.2, GARDEN_X, 0.5, GARDEN_D / 2);        // south
addGardenWall(0.2, 1.0, GARDEN_D, GARDEN_X + GARDEN_W / 2, 0.5, 0);    // east

// Trees
function makeTree(cx, cz, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.25 * scale, 1.6 * scale, 8), mat(0x6B3A1E));
  trunk.position.y = 0.8 * scale; trunk.castShadow = true; g.add(trunk);
  const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(0.9 * scale, 10, 8), mat(0x2d7a2d));
  foliage1.position.y = 1.8 * scale; foliage1.castShadow = true; g.add(foliage1);
  const foliage2 = new THREE.Mesh(new THREE.SphereGeometry(0.7 * scale, 10, 8), mat(0x3a9a3a));
  foliage2.position.set(0.3 * scale, 2.3 * scale, -0.2 * scale); g.add(foliage2);
  const foliage3 = new THREE.Mesh(new THREE.SphereGeometry(0.6 * scale, 10, 8), mat(0x44aa44));
  foliage3.position.set(-0.3 * scale, 2.1 * scale, 0.2 * scale); g.add(foliage3);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const tree1 = makeTree(GARDEN_X - 4, -6, 1.1);
const tree2 = makeTree(GARDEN_X + 4, -5, 1.0);
const tree3 = makeTree(GARDEN_X + 4, 5, 1.2);
const tree4 = makeTree(GARDEN_X - 4, 6, 0.95);

// Bushes
function makeBush(cx, cz) {
  const g = new THREE.Group();
  const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat(0x3a8a3a));
  b1.position.y = 0.4; b1.castShadow = true; g.add(b1);
  const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat(0x48a048));
  b2.position.set(0.4, 0.3, 0.1); g.add(b2);
  const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), mat(0x55b855));
  b3.position.set(-0.35, 0.28, 0.2); g.add(b3);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const bush1 = makeBush(GARDEN_X - 2, -1);
const bush2 = makeBush(GARDEN_X + 2, 1);
const bush3 = makeBush(GARDEN_X + 5, -2);

// Flower beds (colorful tufts)
function makeFlowerBed(cx, cz) {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.8), mat(0x5a3a22));
  soil.position.y = 0.075; g.add(soil);
  const colors = [0xff4477, 0xffdd22, 0xff8833, 0xdd44cc, 0xffffff];
  for (let i = 0; i < 10; i++) {
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), mat(0x338833));
    stem.position.set(-0.5 + Math.random() * 1.0, 0.28, -0.3 + Math.random() * 0.6);
    g.add(stem);
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat(colors[Math.floor(Math.random() * colors.length)]));
    flower.position.set(stem.position.x, 0.45, stem.position.z);
    g.add(flower);
  }
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const flowerBed1 = makeFlowerBed(GARDEN_X - 3, 3);
const flowerBed2 = makeFlowerBed(GARDEN_X + 3, -3);

// Bench
const bench = new THREE.Group();
const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), mat(0x6B3A1E));
benchSeat.position.y = 0.5; benchSeat.castShadow = true; bench.add(benchSeat);
const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.1), mat(0x6B3A1E));
benchBack.position.set(0, 0.8, -0.2); benchBack.castShadow = true; bench.add(benchBack);
for (const [x, y, z] of [[-0.8, 0.25, -0.2], [0.8, 0.25, -0.2], [-0.8, 0.25, 0.2], [0.8, 0.25, 0.2]]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), mat(0x333333));
  leg.position.set(x, y, z); bench.add(leg);
}
bench.position.set(GARDEN_X, 0, 6);
bench.rotation.y = Math.PI;
scene.add(bench);

// Fountain
const fountain = new THREE.Group();
const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.3, 16), mat(0xaaaaaa));
fountainBase.position.y = 0.15; fountainBase.castShadow = true; fountain.add(fountainBase);
const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16),
  new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.7, emissive: 0x224466, emissiveIntensity: 0.2 }));
fountainWater.position.y = 0.32; fountain.add(fountainWater);
const fountainPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8), mat(0xbbbbbb));
fountainPillar.position.y = 0.7; fountainPillar.castShadow = true; fountain.add(fountainPillar);
const fountainTop = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12), mat(0xaaaaaa));
fountainTop.position.y = 1.15; fountainTop.castShadow = true; fountain.add(fountainTop);
fountain.position.set(GARDEN_X, 0, 0);
scene.add(fountain);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.4); scene.add(ambient);
for (const [x, z] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) {
  const l = new THREE.PointLight(0xffeec8, 1.2, 18);
  l.position.set(x, 3.8, z); scene.add(l);
}

// ======== BOOKSHELVES ========
// 7 shelves total: 1 long top shelf + 6 shelves arranged in 3 rows of 2
function makeBookshelf(w, d) {
  const g = new THREE.Group();
  const frameMat = mat(0x5C3A1E);
  // Frame
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, 0.12), frameMat);
  back.position.set(0, 1.2, -d/2 + 0.06); back.castShadow = true; g.add(back);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, d), frameMat);
  sideL.position.set(-w/2 + 0.06, 1.2, 0); sideL.castShadow = true; g.add(sideL);
  const sideR = sideL.clone(); sideR.position.x = w/2 - 0.06; g.add(sideR);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), frameMat);
  top.position.set(0, 2.36, 0); top.castShadow = true; g.add(top);
  const bottom = top.clone(); bottom.position.y = 0.04; g.add(bottom);
  // 3 middle shelves
  for (let i = 1; i <= 3; i++) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.24, 0.05, d - 0.1), frameMat);
    sh.position.y = i * 0.6; g.add(sh);
  }
  // Books on each shelf (colored boxes of varied widths)
  const colors = [0xcc3344, 0x3366aa, 0x44aa55, 0xddbb33, 0x883377, 0x2d6c8c, 0xaa5522];
  for (let shelfY = 0.3; shelfY < 2.3; shelfY += 0.6) {
    let x = -w/2 + 0.18;
    while (x < w/2 - 0.2) {
      const bw = 0.08 + Math.random() * 0.12;
      const bh = 0.35 + Math.random() * 0.15;
      const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, d * 0.6), mat(colors[Math.floor(Math.random() * colors.length)]));
      book.position.set(x + bw/2, shelfY + bh/2, 0);
      g.add(book);
      x += bw + 0.02;
    }
  }
  return g;
}

const shelves = [];
function placeShelf(x, z, w, d, rot = 0) {
  const g = makeBookshelf(w, d);
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  shelves.push(g);
  return g;
}

// Top long shelf (spans most of top area)
const topShelf = placeShelf(-3, -LIB_D/2 + 2, 16, 1.2);
// 3 rows x 2 shelves in the middle/lower area
for (let row = 0; row < 3; row++) {
  const z = -5 + row * 4;
  placeShelf(-6, z, 5, 1.2);
  placeShelf(1, z, 5, 1.2);
}

// ======== READING NOOK (top-right corner) ========
// Pillows (stacked)
const pillowGroup = new THREE.Group();
const pillowColors = [0xEE7799, 0x99CCDD, 0xFFDD88];
for (let i = 0; i < 3; i++) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.9), mat(pillowColors[i]));
  p.position.y = 0.1 + i * 0.22; p.rotation.y = Math.random() * 0.4;
  p.castShadow = true; pillowGroup.add(p);
}
pillowGroup.position.set(LIB_W/2 - 2, 0, -LIB_D/2 + 2);
scene.add(pillowGroup);

// Bean bag chairs
function makeBeanBag(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), mat(color));
  body.scale.set(1, 0.65, 1); body.position.y = 0.4; body.castShadow = true; g.add(body);
  return g;
}
const beanBag1 = makeBeanBag(0xCC4444);
beanBag1.position.set(LIB_W/2 - 2, 0, -LIB_D/2 + 4.5);
scene.add(beanBag1);
const beanBag2 = makeBeanBag(0x4488CC);
beanBag2.position.set(LIB_W/2 - 2, 0, -LIB_D/2 + 7);
scene.add(beanBag2);

// ======== COMPUTERS + DESKS ========
function makeComputerDesk() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.8), mat(0x5C3A1E));
  top.position.y = 0.8; top.castShadow = true; g.add(top);
  // Legs
  const legGeo = new THREE.BoxGeometry(0.1, 0.75, 0.1);
  [[-.7,.375,-.35],[.7,.375,-.35],[-.7,.375,.35],[.7,.375,.35]].forEach(([x,y,z]) => {
    const l = new THREE.Mesh(legGeo, mat(0x444444)); l.position.set(x,y,z); g.add(l);
  });
  // Monitor
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.06), mat(0x111122));
  screen.position.set(0, 1.3, -0.25); g.add(screen);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.1), mat(0x222222));
  stand.position.set(0, 0.92, -0.25); g.add(stand);
  // Keyboard
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.2), mat(0x222222));
  kb.position.set(0, 0.87, 0.15); g.add(kb);
  return g;
}

// Right-side computer desks (near entrance area)
const compDesk1 = makeComputerDesk();
compDesk1.position.set(LIB_W/2 - 1.2, 0, -2);
compDesk1.rotation.y = -Math.PI / 2;
scene.add(compDesk1);
const compDesk2 = makeComputerDesk();
compDesk2.position.set(LIB_W/2 - 1.2, 0, 1);
compDesk2.rotation.y = -Math.PI / 2;
scene.add(compDesk2);
// Bottom computer desks
const compDesk3 = makeComputerDesk();
compDesk3.position.set(LIB_W/2 - 4, 0, LIB_D/2 - 2);
compDesk3.rotation.y = Math.PI;
scene.add(compDesk3);
const compDesk4 = makeComputerDesk();
compDesk4.position.set(LIB_W/2 - 7, 0, LIB_D/2 - 2);
compDesk4.rotation.y = Math.PI;
scene.add(compDesk4);

// ======== FISH TANK ========
function makeFishTank(cx, cz) {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.6), mat(0x5C3020));
  stand.position.y = 0.35; stand.castShadow = true; g.add(stand);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x88CCEE, transparent: true, opacity: 0.6 }));
  glass.position.y = 1.1; g.add(glass);
  const water = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3388CC, transparent: true, opacity: 0.5 }));
  water.position.y = 1.0; g.add(water);
  const fish1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), mat(0xff8822));
  fish1.position.set(-0.3, 1.05, 0); g.add(fish1);
  const fish2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), mat(0xffdd44));
  fish2.position.set(0.3, 0.9, 0); g.add(fish2);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const fishTank = makeFishTank(LIB_W/2 - 1.2, 5);

// ======== SELF-CHECKOUT + BASKET ========
function makeCheckout(cx, cz) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.7), mat(0x666677));
  body.position.y = 0.6; body.castShadow = true; g.add(body);
  const scr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.04), mat(0x1a2233));
  scr.position.set(0, 1.3, 0.36); scr.rotation.x = -0.3; g.add(scr);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const checkout1 = makeCheckout(-1, LIB_D/2 - 1.5);
const checkout2 = makeCheckout(2.5, LIB_D/2 - 1.5);

// Basket between checkouts
const basketGroup = new THREE.Group();
const basketBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), mat(0x888855));
basketBody.position.y = 0.25; basketBody.castShadow = true; basketGroup.add(basketBody);
const basketHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), mat(0x555522));
basketHandle.position.set(-0.3, 0.6, 0); basketGroup.add(basketHandle);
const basketHandle2 = basketHandle.clone(); basketHandle2.position.x = 0.3; basketGroup.add(basketHandle2);
basketGroup.position.set(0.7, 0, LIB_D/2 - 1.5);
scene.add(basketGroup);

// ======== RESTROOM (bottom-left partition) ========
// Top partition split for a 1.5u wide door opening (centered)
// Left segment: x=[-14, -12.75], width=1.25
addWall(1.25, LIB_H, 0.2, -LIB_W/2 + 0.625, LIB_H/2, LIB_D/2 - 4);
// Right segment: x=[-11.25, -10], width=1.25
addWall(1.25, LIB_H, 0.2, -LIB_W/2 + 3.375, LIB_H/2, LIB_D/2 - 4);
// Header above the doorway
addWall(1.5, 0.6, 0.2, -LIB_W/2 + 2, LIB_H - 0.3, LIB_D/2 - 4);
// Right (east) partition unchanged
addWall(0.2, LIB_H, 4, -LIB_W/2 + 4, LIB_H/2, LIB_D/2 - 2);

// Door (open, leaning on the frame)
const doorGroup = new THREE.Group();
const doorMat = mat(0x6B3A2A);
const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.08), doorMat);
doorPanel.position.set(0, 1.1, 0); doorPanel.castShadow = true; doorGroup.add(doorPanel);
// Door handle
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), mat(0xccaa44));
handle.position.set(0.55, 1.05, 0.08); doorGroup.add(handle);
// Hinge at left edge of doorway
doorGroup.position.set(-LIB_W/2 + 2.75, 0, LIB_D/2 - 4);
doorGroup.rotation.y = -Math.PI / 3; // door open at ~60 degrees
scene.add(doorGroup);

// Sinks
function makeSink(cx, cz) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.4), mat(0xcccccc));
  base.position.y = 0.425; base.castShadow = true; g.add(base);
  const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.35), mat(0xffffff));
  bowl.position.y = 0.88; g.add(bowl);
  const faucet = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), mat(0x888888));
  faucet.position.set(0, 1.0, -0.12); g.add(faucet);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const sink1 = makeSink(-LIB_W/2 + 0.5, LIB_D/2 - 3);
const sink2 = makeSink(-LIB_W/2 + 0.5, LIB_D/2 - 2);
const sink3 = makeSink(-LIB_W/2 + 0.5, LIB_D/2 - 1);

// Toilets
function makeToilet(cx, cz) {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.55), mat(0xffffff));
  bowl.position.y = 0.225; bowl.castShadow = true; g.add(bowl);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.2), mat(0xffffff));
  tank.position.set(0, 0.5, -0.3); g.add(tank);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const toilet1 = makeToilet(-LIB_W/2 + 2.5, LIB_D/2 - 3);
const toilet2 = makeToilet(-LIB_W/2 + 2.5, LIB_D/2 - 2);
const toilet3 = makeToilet(-LIB_W/2 + 2.5, LIB_D/2 - 1);

// Hideables
const hideables = [
  { group: topShelf, pos: topShelf.position.clone(), name: 'Top Shelf' },
  { group: pillowGroup, pos: pillowGroup.position.clone(), name: 'Pillows' },
  { group: beanBag1, pos: beanBag1.position.clone(), name: 'Red Bean Bag' },
  { group: beanBag2, pos: beanBag2.position.clone(), name: 'Blue Bean Bag' },
  { group: compDesk1, pos: compDesk1.position.clone(), name: 'Computer Desk 1' },
  { group: compDesk2, pos: compDesk2.position.clone(), name: 'Computer Desk 2' },
  { group: compDesk3, pos: compDesk3.position.clone(), name: 'Computer Desk 3' },
  { group: compDesk4, pos: compDesk4.position.clone(), name: 'Computer Desk 4' },
  { group: fishTank, pos: fishTank.position.clone(), name: 'Fish Tank' },
  { group: checkout1, pos: checkout1.position.clone(), name: 'Self-Checkout 1' },
  { group: checkout2, pos: checkout2.position.clone(), name: 'Self-Checkout 2' },
  { group: basketGroup, pos: basketGroup.position.clone(), name: 'Basket' },
  { group: toilet1, pos: toilet1.position.clone(), name: 'Toilet 1' },
  { group: toilet2, pos: toilet2.position.clone(), name: 'Toilet 2' },
  { group: toilet3, pos: toilet3.position.clone(), name: 'Toilet 3' },
  { group: tree1, pos: tree1.position.clone(), name: 'Tree 1' },
  { group: tree2, pos: tree2.position.clone(), name: 'Tree 2' },
  { group: tree3, pos: tree3.position.clone(), name: 'Tree 3' },
  { group: tree4, pos: tree4.position.clone(), name: 'Tree 4' },
  { group: bush1, pos: bush1.position.clone(), name: 'Bush 1' },
  { group: bush2, pos: bush2.position.clone(), name: 'Bush 2' },
  { group: bush3, pos: bush3.position.clone(), name: 'Bush 3' },
  { group: flowerBed1, pos: flowerBed1.position.clone(), name: 'Flower Bed 1' },
  { group: flowerBed2, pos: flowerBed2.position.clone(), name: 'Flower Bed 2' },
  { group: bench, pos: bench.position.clone(), name: 'Bench' },
  { group: fountain, pos: fountain.position.clone(), name: 'Fountain' },
];
// Add the 6 middle shelves to hideables
shelves.slice(1).forEach((s, i) => hideables.push({ group: s, pos: s.position.clone(), name: 'Shelf ' + (i+1) }));

const hideableBounds = hideables.map(h => {
  const box = new THREE.Box3().setFromObject(h.group);
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
});

// Colliders — walls + furniture AABBs
const colliders = [
  // Outer walls
  { min: new THREE.Vector3(-LIB_W/2, 0, -LIB_D/2), max: new THREE.Vector3(-LIB_W/2+.3, LIB_H, LIB_D/2) },
  // East wall split for garden doorway (z=-2 to z=2)
  { min: new THREE.Vector3(LIB_W/2-.3, 0, -LIB_D/2), max: new THREE.Vector3(LIB_W/2, LIB_H, -2) },
  { min: new THREE.Vector3(LIB_W/2-.3, 0, 2), max: new THREE.Vector3(LIB_W/2, LIB_H, LIB_D/2) },
  { min: new THREE.Vector3(-LIB_W/2, 0, -LIB_D/2), max: new THREE.Vector3(LIB_W/2, LIB_H, -LIB_D/2+.3) },
  { min: new THREE.Vector3(-LIB_W/2, 0, LIB_D/2-.3), max: new THREE.Vector3(LIB_W/2, LIB_H, LIB_D/2) },
  // Restroom top partition — split to leave a doorway from x=-12.75 to x=-11.25
  { min: new THREE.Vector3(-LIB_W/2, 0, LIB_D/2-4), max: new THREE.Vector3(-LIB_W/2+1.25, LIB_H, LIB_D/2-4+.3) },
  { min: new THREE.Vector3(-LIB_W/2+2.75, 0, LIB_D/2-4), max: new THREE.Vector3(-LIB_W/2+4, LIB_H, LIB_D/2-4+.3) },
  // Restroom east partition
  { min: new THREE.Vector3(-LIB_W/2+4-.3, 0, LIB_D/2-4), max: new THREE.Vector3(-LIB_W/2+4, LIB_H, LIB_D/2) },
  // Garden boundary walls (low stone, but still block movement)
  { min: new THREE.Vector3(LIB_W/2, 0, -GARDEN_D/2), max: new THREE.Vector3(LIB_W/2 + GARDEN_W, 1.0, -GARDEN_D/2+.3) }, // north
  { min: new THREE.Vector3(LIB_W/2, 0, GARDEN_D/2-.3), max: new THREE.Vector3(LIB_W/2 + GARDEN_W, 1.0, GARDEN_D/2) },    // south
  { min: new THREE.Vector3(LIB_W/2 + GARDEN_W - .3, 0, -GARDEN_D/2), max: new THREE.Vector3(LIB_W/2 + GARDEN_W, 1.0, GARDEN_D/2) }, // east
];

// Add furniture colliders from their bounding boxes
for (const b of hideableBounds) {
  colliders.push({
    min: new THREE.Vector3(b.minX, 0, b.minZ),
    max: new THREE.Vector3(b.maxX, 1.5, b.maxZ),
  });
}

// Spawn points for hiders
const spawnPoints = [
  { x: -10, z: -9 }, { x: 4, z: -9 }, { x: -6, z: -3 }, { x: 1, z: -3 },
  { x: -6, z: 1 }, { x: 1, z: 1 }, { x: -6, z: 5 }, { x: 1, z: 5 },
  { x: 10, z: -9 }, { x: 10, z: 5 }, { x: -10, z: 5 }, { x: 10, z: 0 },
  // Garden spawns
  { x: LIB_W/2 + 3, z: -5 }, { x: LIB_W/2 + 10, z: 4 }, { x: LIB_W/2 + 7, z: 0 },
];

// Empty/not applicable in this map
const fireParts = [];
const tvGlow = { intensity: 0 };

// Room detection: single large room
function roomAt(x, z) {
  if (x > LIB_W / 2) return 'garden';
  return 'library';
}

// Bird's-eye parameters per room
function birdsEyeRoom(x, z) {
  if (x > LIB_W / 2) {
    // Garden
    return { cx: GARDEN_X, cz: 0, w: GARDEN_W, d: GARDEN_D };
  }
  return { cx: 0, cz: 0, w: LIB_W, d: LIB_D };
}

export {
  LIB_W as ROOM_W, LIB_D as ROOM_D, LIB_H as ROOM_H,
  walls, hideables, hideableBounds, colliders, fireParts, tvGlow,
  spawnPoints, roomAt, birdsEyeRoom
};
// Provide DINING_W for game.js compatibility (not used in library)
export const DINING_W = 0;
