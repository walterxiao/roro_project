import { THREE, scene, mat } from './scene.js';

const floorMat = mat(0x8B5E3C);
const wallMat = mat(0xF5F0E6);
const ceilingMat = mat(0xFAF8F2);

const ROOM_W = 12, ROOM_D = 10, ROOM_H = 4, DINING_W = 10;

// Floor
const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), floorMat);
floor.position.set(0, -0.1, 0); floor.receiveShadow = true; scene.add(floor);

// Ceiling
const ceilingMatI = ceilingMat.clone(); ceilingMatI.transparent = true; ceilingMatI.opacity = 1;
const ceiling = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), ceilingMatI);
ceiling.position.set(0, ROOM_H + 0.1, 0); scene.add(ceiling);

// Walls array (for camera occlusion)
const walls = [ceiling];
function addWall(w, h, d, x, y, z) {
  const m = wallMat.clone(); m.transparent = true; m.opacity = 1;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  wall.position.set(x, y, z); wall.receiveShadow = true; wall.castShadow = true;
  scene.add(wall); walls.push(wall); return wall;
}

addWall(ROOM_W, ROOM_H, 0.2, 0, ROOM_H / 2, -ROOM_D / 2);
addWall(ROOM_W, ROOM_H, 0.2, 0, ROOM_H / 2, ROOM_D / 2);
addWall(0.2, ROOM_H, ROOM_D, -ROOM_W / 2, ROOM_H / 2, 0);
addWall(0.2, ROOM_H, 3, ROOM_W / 2, ROOM_H / 2, -3.5);
addWall(0.2, ROOM_H, 3, ROOM_W / 2, ROOM_H / 2, 3.5);
addWall(0.2, 0.6, 4, ROOM_W / 2, ROOM_H - 0.3, 0);

// Dining room
const dFloor = new THREE.Mesh(new THREE.BoxGeometry(DINING_W, 0.2, ROOM_D), floorMat);
dFloor.position.set(ROOM_W / 2 + DINING_W / 2, -0.1, 0); dFloor.receiveShadow = true; scene.add(dFloor);
const dCeilMat = ceilingMat.clone(); dCeilMat.transparent = true; dCeilMat.opacity = 1;
const dCeiling = new THREE.Mesh(new THREE.BoxGeometry(DINING_W, 0.2, ROOM_D), dCeilMat);
dCeiling.position.set(ROOM_W / 2 + DINING_W / 2, ROOM_H + 0.1, 0); scene.add(dCeiling); walls.push(dCeiling);
// Dining back wall split to create a doorway into the garage (opening x=11 to x=14)
addWall(5, ROOM_H, 0.2, 8.5, ROOM_H / 2, -ROOM_D / 2);      // left segment x=6 to 11
addWall(2, ROOM_H, 0.2, 15, ROOM_H / 2, -ROOM_D / 2);       // right segment x=14 to 16
addWall(3, 0.6, 0.2, 12.5, ROOM_H - 0.3, -ROOM_D / 2);      // header above doorway
addWall(DINING_W, ROOM_H, 0.2, ROOM_W / 2 + DINING_W / 2, ROOM_H / 2, ROOM_D / 2);
addWall(0.2, ROOM_H, ROOM_D, ROOM_W / 2 + DINING_W, ROOM_H / 2, 0);

const diningLight = new THREE.PointLight(0xfff5e0, 1.5, 10);
diningLight.position.set(ROOM_W / 2 + DINING_W / 2, 3.5, 0); diningLight.castShadow = true; scene.add(diningLight);

// Dining table
const tableX = ROOM_W / 2 + DINING_W / 2;
const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.15, 2.4), mat(0x6B3A2A));
tableTop.position.set(tableX, 0.9, 0); tableTop.castShadow = true; scene.add(tableTop);
const tLegGeo = new THREE.BoxGeometry(0.15, 0.85, 0.15);
const tLegMat = mat(0x5C3020);
[[-2, .425, -1], [2, .425, -1], [-2, .425, 1], [2, .425, 1]].forEach(([x, y, z]) => {
  const l = new THREE.Mesh(tLegGeo, tLegMat); l.position.set(tableX + x, y, z); l.castShadow = true; scene.add(l);
});

// Dining chairs
const dChairMat = mat(0x8B5E3C), dChairLegMat = mat(0x555555);
const chairColliders = [], chairGroups = [];
function addChair(cx, cz, angle) {
  const g = new THREE.Group();
  const cm = dChairMat.clone(), lm = dChairLegMat.clone();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.8, .1, .8), cm); seat.position.y = .55; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .08), cm); back.position.set(0, 1, -.36); back.castShadow = true; g.add(back);
  const lg = new THREE.BoxGeometry(.07, .5, .07);
  [[-.32,.25,-.32],[.32,.25,-.32],[-.32,.25,.32],[.32,.25,.32]].forEach(([x,y,z]) => { const l = new THREE.Mesh(lg, lm); l.position.set(x,y,z); l.castShadow = true; g.add(l); });
  g.position.set(cx, 0, cz); g.rotation.y = angle; scene.add(g);
  chairColliders.push({ min: new THREE.Vector3(cx-.5, 0, cz-.5), max: new THREE.Vector3(cx+.5, 1.4, cz+.5) });
  chairGroups.push(g);
}
addChair(tableX-1.2, -1.8, 0); addChair(tableX+1.2, -1.8, 0);
addChair(tableX-1.2, 1.8, Math.PI); addChair(tableX+1.2, 1.8, Math.PI);
addChair(tableX-2.9, 0, Math.PI/2); addChair(tableX+2.9, 0, -Math.PI/2);

// ========== GARAGE ==========
// Behind the dining room (north/negative z). Garage spans x=[8, 16], z=[-13, -5]
const GARAGE_W = 8, GARAGE_D = 8;
const GARAGE_X = 12, GARAGE_Z = -9; // center
const concreteMat = mat(0x6a6a6a);

// Garage floor (darker, concrete-like)
const gFloor = new THREE.Mesh(new THREE.BoxGeometry(GARAGE_W, 0.2, GARAGE_D), concreteMat);
gFloor.position.set(GARAGE_X, -0.1, GARAGE_Z); gFloor.receiveShadow = true; scene.add(gFloor);

// Garage ceiling
const gCeilMat = ceilingMat.clone(); gCeilMat.transparent = true; gCeilMat.opacity = 1;
const gCeiling = new THREE.Mesh(new THREE.BoxGeometry(GARAGE_W, 0.2, GARAGE_D), gCeilMat);
gCeiling.position.set(GARAGE_X, ROOM_H + 0.1, GARAGE_Z); scene.add(gCeiling); walls.push(gCeiling);

// Garage walls
addWall(GARAGE_W, ROOM_H, 0.2, GARAGE_X, ROOM_H / 2, -13); // back
addWall(0.2, ROOM_H, GARAGE_D, 8, ROOM_H / 2, GARAGE_Z);   // left
addWall(0.2, ROOM_H, GARAGE_D, 16, ROOM_H / 2, GARAGE_Z);  // right
// Front wall (shared with dining room back) — segments outside the opening (x=11 to 14)
// The dining-back wall handles it; no additional front wall needed here.

// Garage light
const garageLight = new THREE.PointLight(0xffffff, 1.2, 12);
garageLight.position.set(GARAGE_X, 3.5, GARAGE_Z); garageLight.castShadow = true; scene.add(garageLight);

// ---- CAR FACTORY ----
function createCar(bodyColor) {
  const g = new THREE.Group();
  const bodyMat = mat(bodyColor);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.5, roughness: 0.2 });
  const tireMat = mat(0x111111);
  const rimMat = mat(0xaaaaaa);
  const silver = mat(0xbbbbbb);
  const red = mat(0xdd2222);
  const white = mat(0xffffdd);

  // Lower body (chassis)
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 4.0), bodyMat);
  lower.position.y = 0.35; lower.castShadow = true; g.add(lower);

  // Hood (lower than cabin)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.2, 1.3), bodyMat);
  hood.position.set(0, 0.6, 1.15); hood.castShadow = true; g.add(hood);

  // Trunk
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.2, 1.2), bodyMat);
  trunk.position.set(0, 0.6, -1.2); trunk.castShadow = true; g.add(trunk);

  // Cabin (raised section)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 1.8), bodyMat);
  cabin.position.set(0, 0.95, -0.05); cabin.castShadow = true; g.add(cabin);

  // Roof (slightly smaller and flat on top)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.55), mat(bodyColor));
  roof.position.set(0, 1.25, -0.05); g.add(roof);

  // Windshield (slanted front)
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 0.04), winMat);
  ws.position.set(0, 1.0, 0.88); ws.rotation.x = -0.25; g.add(ws);
  // Rear window (slanted back)
  const rw = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.5, 0.04), winMat);
  rw.position.set(0, 1.0, -0.98); rw.rotation.x = 0.25; g.add(rw);
  // Side windows
  const sL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 1.5), winMat);
  sL.position.set(-0.88, 1.05, -0.05); g.add(sL);
  const sR = sL.clone(); sR.position.x = 0.88; g.add(sR);

  // Wheels (with rim detail)
  [[-0.95, 0.3, 1.25], [0.95, 0.3, 1.25], [-0.95, 0.3, -1.25], [0.95, 0.3, -1.25]].forEach(([x, y, z]) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, y, z); tire.castShadow = true; g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z); g.add(rim);
  });

  // Front bumper
  const fb = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.12, 0.25), silver);
  fb.position.set(0, 0.35, 2.0); g.add(fb);
  // Rear bumper
  const bb = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.12, 0.25), silver);
  bb.position.set(0, 0.35, -2.0); g.add(bb);

  // Grille (dark mesh at front)
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.05), mat(0x222222));
  grille.position.set(0, 0.5, 2.02); g.add(grille);

  // Headlights
  const hL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.05), white);
  hL.position.set(-0.6, 0.55, 2.02); g.add(hL);
  const hR = hL.clone(); hR.position.x = 0.6; g.add(hR);

  // Tail lights
  const tL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.05), red);
  tL.position.set(-0.6, 0.58, -2.02); g.add(tL);
  const tR = tL.clone(); tR.position.x = 0.6; g.add(tR);

  // Side mirrors
  const mirGeo = new THREE.BoxGeometry(0.1, 0.12, 0.18);
  const mL = new THREE.Mesh(mirGeo, bodyMat); mL.position.set(-0.98, 1.0, 0.55); g.add(mL);
  const mR = new THREE.Mesh(mirGeo, bodyMat); mR.position.set(0.98, 1.0, 0.55); g.add(mR);

  return g;
}

// Red car (right side of garage)
const carGroup = createCar(0xCC2222);
carGroup.position.set(14, 0, -9);
carGroup.rotation.y = Math.PI; // face door
scene.add(carGroup);

// Blue car (left side of garage)
const carGroup2 = createCar(0x2244CC);
carGroup2.position.set(10, 0, -9);
carGroup2.rotation.y = Math.PI;
scene.add(carGroup2);

// ---- BIKE ----
const bikeGroup = new THREE.Group();
const bikeFrameMat = mat(0x22AA66);
const bikeTireMat = mat(0x1a1a1a);
const bikeAccentMat = mat(0x222222);

// Wheels (cylinders, facing sideways)
const bwGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16);
const bwFront = new THREE.Mesh(bwGeo, bikeTireMat);
bwFront.rotation.z = Math.PI / 2;
bwFront.position.set(0, 0.3, 0.7); bwFront.castShadow = true; bikeGroup.add(bwFront);
const bwRear = new THREE.Mesh(bwGeo, bikeTireMat);
bwRear.rotation.z = Math.PI / 2;
bwRear.position.set(0, 0.3, -0.7); bwRear.castShadow = true; bikeGroup.add(bwRear);

// Top tube
const topTube = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), bikeFrameMat);
topTube.position.set(0, 0.7, 0); bikeGroup.add(topTube);
// Down tube (diagonal)
const downTube = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), bikeFrameMat);
downTube.position.set(0, 0.5, 0.15); downTube.rotation.x = -0.5; bikeGroup.add(downTube);
// Seat tube
const seatTube = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), bikeFrameMat);
seatTube.position.set(0, 0.5, -0.5); bikeGroup.add(seatTube);
// Chain stay
const chainStay = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.55), bikeFrameMat);
chainStay.position.set(0, 0.3, -0.35); bikeGroup.add(chainStay);

// Seat
const seat = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.4), bikeAccentMat);
seat.position.set(0, 0.82, -0.5); seat.castShadow = true; bikeGroup.add(seat);

// Handlebar post
const hPost = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), bikeFrameMat);
hPost.position.set(0, 0.85, 0.55); bikeGroup.add(hPost);
// Handlebar
const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), bikeAccentMat);
hBar.position.set(0, 1.05, 0.55); bikeGroup.add(hBar);

// Pedal crank
const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.05), bikeAccentMat);
pedal.position.set(0, 0.3, -0.15); bikeGroup.add(pedal);

bikeGroup.position.set(9, 0, -12);
bikeGroup.rotation.y = Math.PI / 2; // turned sideways
scene.add(bikeGroup);

// Fireplace
const brickMat = mat(0x8B3A2A), darkMat = mat(0x1a1a1a);
const fpGroup = new THREE.Group(); fpGroup.position.set(0, 0, -4.7);
const fpBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, .15), brickMat); fpBack.position.set(0, 1.1, -.15); fpBack.castShadow = true; fpGroup.add(fpBack);
const fpInside = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, .2), darkMat); fpInside.position.set(0, .7, -.05); fpGroup.add(fpInside);
const fpPillarL = new THREE.Mesh(new THREE.BoxGeometry(.3, 2.2, .3), brickMat); fpPillarL.position.set(-1.05, 1.1, 0); fpPillarL.castShadow = true; fpGroup.add(fpPillarL);
const fpPillarR = fpPillarL.clone(); fpPillarR.position.set(1.05, 1.1, 0); fpGroup.add(fpPillarR);
const mantel = new THREE.Mesh(new THREE.BoxGeometry(2.8, .15, .45), mat(0x5C3A1E)); mantel.position.set(0, 2.25, 0); mantel.castShadow = true; fpGroup.add(mantel);
scene.add(fpGroup);

// Fire particles
const fireParts = [];
const fireMats = [
  new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: .9 }),
  new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: .8 }),
  new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: .7 }),
];
for (let i = 0; i < 6; i++) {
  const f = new THREE.Mesh(new THREE.BoxGeometry(.2+Math.random()*.3, .4+Math.random()*.5, .1), fireMats[i%3]);
  f.position.set(-.4+Math.random()*.8, .3+Math.random()*.4, -4.65); scene.add(f);
  fireParts.push({ mesh: f, baseY: f.position.y, speed: 1+Math.random()*2, offset: Math.random()*Math.PI*2 });
}

// TV
const tvGroup = new THREE.Group(); tvGroup.position.set(4.5, 0, -3.5);
const tvStand = new THREE.Mesh(new THREE.BoxGeometry(1.8, .6, .5), mat(0x2C2C2C)); tvStand.position.set(0, .3, 0); tvStand.castShadow = true; tvGroup.add(tvStand);
const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, .08), mat(0x111111)); tvScreen.position.set(0, 1.5, 0); tvScreen.castShadow = true; tvGroup.add(tvScreen);
const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, .06), mat(0x1a1a1a)); tvBezel.position.set(0, 1.5, -.05); tvGroup.add(tvBezel);
const tvGlow = new THREE.PointLight(0x4488ff, .5, 4); tvGlow.position.set(0, 1.5, .5); tvGroup.add(tvGlow);
scene.add(tvGroup);

// Sofa
const sofaGroup = new THREE.Group();
const sofaMat = mat(0x3366AA), sofaLegMat = mat(0x888888);
const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(3, .3, 1), sofaMat); sofaSeat.position.set(0, .5, 0); sofaSeat.castShadow = true; sofaGroup.add(sofaSeat);
const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3, 1, .2), sofaMat); sofaBack.position.set(0, 1.15, -.5); sofaBack.castShadow = true; sofaGroup.add(sofaBack);
const sofaArmL = new THREE.Mesh(new THREE.BoxGeometry(.2, .6, 1), sofaMat); sofaArmL.position.set(-1.6, .65, 0); sofaArmL.castShadow = true; sofaGroup.add(sofaArmL);
const sofaArmR = new THREE.Mesh(new THREE.BoxGeometry(.2, .6, 1), sofaMat); sofaArmR.position.set(1.6, .65, 0); sofaArmR.castShadow = true; sofaGroup.add(sofaArmR);
const divMat = mat(0x2B5699);
const d1 = new THREE.Mesh(new THREE.BoxGeometry(.04, .05, .9), divMat); d1.position.set(-.5, .68, 0); sofaGroup.add(d1);
const d2 = new THREE.Mesh(new THREE.BoxGeometry(.04, .05, .9), divMat); d2.position.set(.5, .68, 0); sofaGroup.add(d2);
const sLegGeo = new THREE.BoxGeometry(.1, .35, .1);
[[-1.4,.175,.45],[1.4,.175,.45],[-1.4,.175,-.4],[1.4,.175,-.4]].forEach(([x,y,z]) => {
  const l = new THREE.Mesh(sLegGeo, sofaLegMat); l.position.set(x,y,z); l.castShadow = true; sofaGroup.add(l);
});
sofaGroup.position.set(1, 0, 1); sofaGroup.rotation.y = Math.PI - 0.4; scene.add(sofaGroup);

// Rug
const rug = new THREE.Mesh(new THREE.BoxGeometry(3, .02, 2), mat(0xCC4444)); rug.position.set(0, .01, -2); scene.add(rug);

// Hideables
const hideables = [
  { group: sofaGroup, pos: sofaGroup.position.clone(), name: 'Sofa' },
  { group: tvGroup, pos: tvGroup.position.clone(), name: 'TV' },
  { group: fpGroup, pos: fpGroup.position.clone(), name: 'Fireplace' },
  { group: carGroup, pos: carGroup.position.clone(), name: 'Red Car' },
  { group: carGroup2, pos: carGroup2.position.clone(), name: 'Blue Car' },
  { group: bikeGroup, pos: bikeGroup.position.clone(), name: 'Bike' },
];
chairGroups.forEach((g, i) => hideables.push({ group: g, pos: g.position.clone(), name: 'Chair ' + (i+1) }));

// Colliders
const colliders = [
  // Living room walls (left, front)
  { min: new THREE.Vector3(-ROOM_W/2, 0, -ROOM_D/2), max: new THREE.Vector3(-ROOM_W/2+.3, ROOM_H, ROOM_D/2) },
  { min: new THREE.Vector3(-ROOM_W/2, 0, ROOM_D/2-.3), max: new THREE.Vector3(ROOM_W/2+DINING_W, ROOM_H, ROOM_D/2) },
  // Living room back wall only
  { min: new THREE.Vector3(-ROOM_W/2, 0, -ROOM_D/2), max: new THREE.Vector3(ROOM_W/2, ROOM_H, -ROOM_D/2+.3) },
  // Dining back wall segments (opening to garage at x=11 to 14)
  { min: new THREE.Vector3(ROOM_W/2, 0, -ROOM_D/2), max: new THREE.Vector3(11, ROOM_H, -ROOM_D/2+.3) },
  { min: new THREE.Vector3(14, 0, -ROOM_D/2), max: new THREE.Vector3(ROOM_W/2+DINING_W, ROOM_H, -ROOM_D/2+.3) },
  // Living-dining passage walls
  { min: new THREE.Vector3(ROOM_W/2-.3, 0, -ROOM_D/2), max: new THREE.Vector3(ROOM_W/2, ROOM_H, -2) },
  { min: new THREE.Vector3(ROOM_W/2-.3, 0, 2), max: new THREE.Vector3(ROOM_W/2, ROOM_H, ROOM_D/2) },
  { min: new THREE.Vector3(ROOM_W/2+DINING_W-.3, 0, -ROOM_D/2), max: new THREE.Vector3(ROOM_W/2+DINING_W, ROOM_H, ROOM_D/2) },
  // Garage walls
  { min: new THREE.Vector3(8, 0, -13), max: new THREE.Vector3(16, ROOM_H, -13+.3) },          // back
  { min: new THREE.Vector3(8, 0, -13), max: new THREE.Vector3(8+.3, ROOM_H, -5) },             // left
  { min: new THREE.Vector3(16-.3, 0, -13), max: new THREE.Vector3(16, ROOM_H, -5) },           // right
  // Fireplace, TV, sofa, table
  { min: new THREE.Vector3(-1.3, 0, -5), max: new THREE.Vector3(1.3, 2.4, -4.5) },
  { min: new THREE.Vector3(3.3, 0, -3.8), max: new THREE.Vector3(5.7, 2.3, -3.2) },
  { min: new THREE.Vector3(-.8, 0, -.2), max: new THREE.Vector3(2.8, 1.2, 2) },
  { min: new THREE.Vector3(tableX-2.4, 0, -1.3), max: new THREE.Vector3(tableX+2.4, 1, 1.3) },
  // Red car
  { min: new THREE.Vector3(13.0, 0, -11.0), max: new THREE.Vector3(15.0, 1.3, -7.0) },
  // Blue car
  { min: new THREE.Vector3(9.0, 0, -11.0), max: new THREE.Vector3(11.0, 1.3, -7.0) },
  // Bike
  { min: new THREE.Vector3(8.5, 0, -12.7), max: new THREE.Vector3(9.5, 1.1, -11.3) },
  ...chairColliders,
];

export { ROOM_W, ROOM_D, ROOM_H, DINING_W, walls, hideables, colliders, fireParts, tvGlow };
