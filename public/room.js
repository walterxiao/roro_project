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

// Living room back wall
addWall(ROOM_W, ROOM_H, 0.2, 0, ROOM_H / 2, -ROOM_D / 2);
// Living room front wall — split for opening to middle-south room (x=-2 to x=2)
addWall(4, ROOM_H, 0.2, -4, ROOM_H / 2, ROOM_D / 2);
addWall(4, ROOM_H, 0.2, 4, ROOM_H / 2, ROOM_D / 2);
addWall(4, 0.6, 0.2, 0, ROOM_H - 0.3, ROOM_D / 2); // header
// Living room left wall — split for opening to play room (z=-1.5 to z=1.5)
addWall(0.2, ROOM_H, 3.5, -ROOM_W / 2, ROOM_H / 2, -3.25);
addWall(0.2, ROOM_H, 3.5, -ROOM_W / 2, ROOM_H / 2, 3.25);
addWall(0.2, 0.6, 3, -ROOM_W / 2, ROOM_H - 0.3, 0);
// Living-dining passage split (existing)
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
// Dining front wall — split for opening to bedroom (x=10 to x=13)
addWall(4, ROOM_H, 0.2, 8, ROOM_H / 2, ROOM_D / 2);
addWall(3, ROOM_H, 0.2, 14.5, ROOM_H / 2, ROOM_D / 2);
addWall(3, 0.6, 0.2, 11.5, ROOM_H - 0.3, ROOM_D / 2);
// Dining right wall
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

// ========== PLAY ROOM ==========
const PLAY_W = 10;
const PLAY_X = -ROOM_W / 2 - PLAY_W / 2;
const playFloor = new THREE.Mesh(new THREE.BoxGeometry(PLAY_W, 0.2, ROOM_D), mat(0xDDAA88));
playFloor.position.set(PLAY_X, -0.1, 0); playFloor.receiveShadow = true; scene.add(playFloor);
const playCeilMat = ceilingMat.clone(); playCeilMat.transparent = true; playCeilMat.opacity = 1;
const playCeil = new THREE.Mesh(new THREE.BoxGeometry(PLAY_W, 0.2, ROOM_D), playCeilMat);
playCeil.position.set(PLAY_X, ROOM_H + 0.1, 0); scene.add(playCeil); walls.push(playCeil);
// Play room walls (left, back, front with opening to office)
addWall(0.2, ROOM_H, ROOM_D, PLAY_X - PLAY_W / 2, ROOM_H / 2, 0); // far left
addWall(PLAY_W, ROOM_H, 0.2, PLAY_X, ROOM_H / 2, -ROOM_D / 2);    // back
// Front wall with opening to office (x=-14 to x=-11)
addWall(3, ROOM_H, 0.2, PLAY_X - PLAY_W / 2 + 1.5, ROOM_H / 2, ROOM_D / 2);
addWall(4, ROOM_H, 0.2, PLAY_X + PLAY_W / 2 - 2, ROOM_H / 2, ROOM_D / 2);
addWall(3, 0.6, 0.2, PLAY_X - 1, ROOM_H - 0.3, ROOM_D / 2);

const playLight = new THREE.PointLight(0xffeecc, 1.3, 12);
playLight.position.set(PLAY_X, 3.5, 0); scene.add(playLight);

// Toy car tracks (2 ovals on floor)
function makeTrack(cx, cz, rot) {
  const g = new THREE.Group();
  const trackMat = mat(0x333344);
  const outer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 1.6), trackMat);
  outer.position.y = 0.025; g.add(outer);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.8), mat(0xDDAA88));
  inner.position.y = 0.026; g.add(inner);
  // Racing stripes
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 1.4), mat(0xffff00));
  stripe.position.set(0, 0.027, 0); g.add(stripe);
  g.position.set(cx, 0, cz); g.rotation.y = rot; scene.add(g);
  return g;
}
const track1 = makeTrack(PLAY_X - 2.5, -2, 0);
const track2 = makeTrack(PLAY_X + 2, -2, 0);

// Poker table (round-ish)
const pokerGroup = new THREE.Group();
const pokerTop = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 16), mat(0x2a6a3a));
pokerTop.position.y = 0.75; pokerTop.castShadow = true; pokerGroup.add(pokerTop);
const pokerRim = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16), mat(0x5C3020));
pokerRim.position.y = 0.8; pokerGroup.add(pokerRim);
const pokerPost = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.75, 8), mat(0x444444));
pokerPost.position.y = 0.375; pokerGroup.add(pokerPost);
const pokerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 16), mat(0x444444));
pokerBase.position.y = 0.04; pokerGroup.add(pokerBase);
pokerGroup.position.set(PLAY_X, 0, 2.5);
scene.add(pokerGroup);

// ========== OFFICE ==========
const OFFICE_Z = ROOM_D / 2 + 5; // center at z=10
const officeFloor = new THREE.Mesh(new THREE.BoxGeometry(PLAY_W, 0.2, ROOM_D), mat(0xA88870));
officeFloor.position.set(PLAY_X, -0.1, OFFICE_Z); officeFloor.receiveShadow = true; scene.add(officeFloor);
const officeCeilMat = ceilingMat.clone(); officeCeilMat.transparent = true; officeCeilMat.opacity = 1;
const officeCeil = new THREE.Mesh(new THREE.BoxGeometry(PLAY_W, 0.2, ROOM_D), officeCeilMat);
officeCeil.position.set(PLAY_X, ROOM_H + 0.1, OFFICE_Z); scene.add(officeCeil); walls.push(officeCeil);
addWall(0.2, ROOM_H, ROOM_D, PLAY_X - PLAY_W / 2, ROOM_H / 2, OFFICE_Z);
addWall(PLAY_W, ROOM_H, 0.2, PLAY_X, ROOM_H / 2, OFFICE_Z + ROOM_D / 2);
// Right wall of office — split for opening to middle-south (z=8 to z=12)
addWall(0.2, ROOM_H, 3, PLAY_X + PLAY_W / 2, ROOM_H / 2, 6.5);
addWall(0.2, ROOM_H, 3, PLAY_X + PLAY_W / 2, ROOM_H / 2, 13.5);
addWall(0.2, 0.6, 4, PLAY_X + PLAY_W / 2, ROOM_H - 0.3, 10);

const officeLight = new THREE.PointLight(0xffffff, 1.2, 12);
officeLight.position.set(PLAY_X, 3.5, OFFICE_Z); scene.add(officeLight);

// Office desks (2) with chairs
function makeDesk(cx, cz, angle) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.9), mat(0x6B3A2A));
  top.position.y = 0.8; top.castShadow = true; g.add(top);
  const legGeo = new THREE.BoxGeometry(0.1, 0.75, 0.1);
  [[-0.8, 0.375, -0.4], [0.8, 0.375, -0.4], [-0.8, 0.375, 0.4], [0.8, 0.375, 0.4]].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(legGeo, mat(0x444444)); l.position.set(x, y, z); g.add(l);
  });
  g.position.set(cx, 0, cz); g.rotation.y = angle; scene.add(g);
  return g;
}
const desk1 = makeDesk(PLAY_X - 2.5, OFFICE_Z, 0);
const desk2 = makeDesk(PLAY_X + 2.5, OFFICE_Z + 2, Math.PI / 2);

// Office chairs (simple swivel-style)
function makeOfficeChair(cx, cz) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12), mat(0x222222));
  seat.position.y = 0.55; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.1), mat(0x222222));
  back.position.set(0, 0.85, -0.25); g.add(back);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), mat(0x555555));
  post.position.y = 0.3; g.add(post);
  const baseC = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 8), mat(0x555555));
  baseC.position.y = 0.07; g.add(baseC);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const officeChair1 = makeOfficeChair(PLAY_X - 2.5, OFFICE_Z + 0.9);
const officeChair2 = makeOfficeChair(PLAY_X + 1.6, OFFICE_Z + 2);

// ========== MIDDLE-SOUTH ROOM (between living and office, fish tank) ==========
const midSouthFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), mat(0x8B5E3C));
midSouthFloor.position.set(0, -0.1, OFFICE_Z); midSouthFloor.receiveShadow = true; scene.add(midSouthFloor);
const midSouthCeilMat = ceilingMat.clone(); midSouthCeilMat.transparent = true; midSouthCeilMat.opacity = 1;
const midSouthCeil = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), midSouthCeilMat);
midSouthCeil.position.set(0, ROOM_H + 0.1, OFFICE_Z); scene.add(midSouthCeil); walls.push(midSouthCeil);
addWall(ROOM_W, ROOM_H, 0.2, 0, ROOM_H / 2, OFFICE_Z + ROOM_D / 2); // front (south)
// Right wall of middle-south — split for opening to bedroom (z=8 to z=12)
addWall(0.2, ROOM_H, 3, ROOM_W / 2, ROOM_H / 2, 6.5);
addWall(0.2, ROOM_H, 3, ROOM_W / 2, ROOM_H / 2, 13.5);
addWall(0.2, 0.6, 4, ROOM_W / 2, ROOM_H - 0.3, 10);

const midLight = new THREE.PointLight(0xffffff, 1.2, 12);
midLight.position.set(0, 3.5, OFFICE_Z); scene.add(midLight);

// Mid-south table (as group)
const midTableGroup = new THREE.Group();
const mtTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), mat(0x6B3A2A));
mtTop.position.y = 0.75; mtTop.castShadow = true; midTableGroup.add(mtTop);
[[-.5, .375, -.3], [.5, .375, -.3], [-.5, .375, .3], [.5, .375, .3]].forEach(([x, y, z]) => {
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), mat(0x444444));
  l.position.set(x, y, z); midTableGroup.add(l);
});
midTableGroup.position.set(-2, 0, OFFICE_Z - 2);
scene.add(midTableGroup);

// Mid-south chair (proper chair with legs + backrest)
const midChairGroup = new THREE.Group();
const mcSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), mat(0x8B5E3C));
mcSeat.position.y = 0.45; mcSeat.castShadow = true; midChairGroup.add(mcSeat);
const mcBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.06), mat(0x8B5E3C));
mcBack.position.set(0, 0.78, -0.25); mcBack.castShadow = true; midChairGroup.add(mcBack);
[[-.22, .2, -.22], [.22, .2, -.22], [-.22, .2, .22], [.22, .2, .22]].forEach(([x, y, z]) => {
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), mat(0x555555));
  l.position.set(x, y, z); midChairGroup.add(l);
});
midChairGroup.position.set(-2, 0, OFFICE_Z - 1.0);
midChairGroup.rotation.y = Math.PI; // face the table
scene.add(midChairGroup);

// Hideable plant in the fish tank room
function makePlant(cx, cz) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.4, 10), mat(0x884422));
  pot.position.y = 0.2; g.add(pot);
  const leaves1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mat(0x44AA44));
  leaves1.position.y = 0.7; g.add(leaves1);
  const leaves2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), mat(0x55CC55));
  leaves2.position.y = 1.05; g.add(leaves2);
  const leaves3 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), mat(0x66DD66));
  leaves3.position.y = 1.3; g.add(leaves3);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const midPlant = makePlant(4, OFFICE_Z - 2.5);

// Fish tank in middle-south room
function makeFishTank(cx, cz) {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.5), mat(0x5C3020));
  stand.position.y = 0.35; stand.castShadow = true; g.add(stand);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.45), new THREE.MeshStandardMaterial({ color: 0x88CCEE, transparent: true, opacity: 0.6 }));
  glass.position.y = 1.05; g.add(glass);
  const water = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x3388CC, transparent: true, opacity: 0.5 }));
  water.position.y = 0.95; g.add(water);
  // Fish (small orange boxes)
  const fish1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), mat(0xff8822));
  fish1.position.set(-0.2, 1.0, 0); g.add(fish1);
  const fish2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), mat(0xffdd44));
  fish2.position.set(0.2, 0.9, 0); g.add(fish2);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const fishTank1 = makeFishTank(2, OFFICE_Z + 3.5);

// ========== BEDROOM ==========
const BED_X = ROOM_W / 2 + DINING_W / 2;
const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(DINING_W, 0.2, ROOM_D), mat(0xBB9977));
bedFloor.position.set(BED_X, -0.1, OFFICE_Z); bedFloor.receiveShadow = true; scene.add(bedFloor);
const bedCeilMat = ceilingMat.clone(); bedCeilMat.transparent = true; bedCeilMat.opacity = 1;
const bedCeil = new THREE.Mesh(new THREE.BoxGeometry(DINING_W, 0.2, ROOM_D), bedCeilMat);
bedCeil.position.set(BED_X, ROOM_H + 0.1, OFFICE_Z); scene.add(bedCeil); walls.push(bedCeil);
addWall(DINING_W, ROOM_H, 0.2, BED_X, ROOM_H / 2, OFFICE_Z + ROOM_D / 2);
addWall(0.2, ROOM_H, ROOM_D, BED_X + DINING_W / 2, ROOM_H / 2, OFFICE_Z);

const bedLight = new THREE.PointLight(0xfff5e0, 1.3, 12);
bedLight.position.set(BED_X, 3.5, OFFICE_Z); scene.add(bedLight);

// Beds
function makeBed(cx, cz, angle) {
  const g = new THREE.Group();
  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 2.2), mat(0x5C3A1E));
  frame.position.y = 0.25; frame.castShadow = true; g.add(frame);
  // Mattress
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 2.05), mat(0xF8F4EE));
  mattress.position.y = 0.525; g.add(mattress);
  // Blanket
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 1.3), mat(0x4466CC));
  blanket.position.set(0, 0.67, -0.3); g.add(blanket);
  // Pillow
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 0.4), mat(0xffffff));
  pillow.position.set(0, 0.72, 0.75); g.add(pillow);
  // Headboard
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.1), mat(0x5C3A1E));
  head.position.set(0, 0.8, 1.1); head.castShadow = true; g.add(head);
  g.position.set(cx, 0, cz); g.rotation.y = angle; scene.add(g);
  return g;
}
const bed1 = makeBed(BED_X - 3, OFFICE_Z + 2.5, 0);
const bed2 = makeBed(BED_X, OFFICE_Z + 2.5, 0);
const bed3 = makeBed(BED_X + 3, OFFICE_Z + 2.5, 0);

// Nightstand between beds
function makeNightstand(cx, cz) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat(0x6B3A2A));
  top.position.y = 0.3; top.castShadow = true; g.add(top);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), mat(0xaaaaaa));
  handle.position.set(0, 0.35, 0.31); g.add(handle);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.18), mat(0xffdd88));
  lamp.position.set(0, 0.75, 0); g.add(lamp);
  g.position.set(cx, 0, cz); scene.add(g);
  return g;
}
const stand1 = makeNightstand(BED_X - 1.5, OFFICE_Z + 2);

// Plant
const plantGroup = new THREE.Group();
const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.4, 10), mat(0x884422));
pot.position.y = 0.2; plantGroup.add(pot);
const leaves1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mat(0x44AA44));
leaves1.position.y = 0.7; plantGroup.add(leaves1);
const leaves2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), mat(0x55CC55));
leaves2.position.y = 1.05; plantGroup.add(leaves2);
const leaves3 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), mat(0x66DD66));
leaves3.position.y = 1.3; plantGroup.add(leaves3);
plantGroup.position.set(BED_X + 4, 0, OFFICE_Z + 2);
scene.add(plantGroup);

// Hideables
const hideables = [
  { group: sofaGroup, pos: sofaGroup.position.clone(), name: 'Sofa' },
  { group: tvGroup, pos: tvGroup.position.clone(), name: 'TV' },
  { group: fpGroup, pos: fpGroup.position.clone(), name: 'Fireplace' },
  { group: carGroup, pos: carGroup.position.clone(), name: 'Red Car' },
  { group: carGroup2, pos: carGroup2.position.clone(), name: 'Blue Car' },
  { group: bikeGroup, pos: bikeGroup.position.clone(), name: 'Bike' },
  { group: pokerGroup, pos: pokerGroup.position.clone(), name: 'Poker Table' },
  { group: track1, pos: track1.position.clone(), name: 'Toy Track 1' },
  { group: track2, pos: track2.position.clone(), name: 'Toy Track 2' },
  { group: desk1, pos: desk1.position.clone(), name: 'Desk 1' },
  { group: desk2, pos: desk2.position.clone(), name: 'Desk 2' },
  { group: officeChair1, pos: officeChair1.position.clone(), name: 'Office Chair 1' },
  { group: officeChair2, pos: officeChair2.position.clone(), name: 'Office Chair 2' },
  { group: midTableGroup, pos: midTableGroup.position.clone(), name: 'Mid Table' },
  { group: midChairGroup, pos: midChairGroup.position.clone(), name: 'Mid Chair' },
  { group: midPlant, pos: midPlant.position.clone(), name: 'Mid Plant' },
  { group: fishTank1, pos: fishTank1.position.clone(), name: 'Fish Tank' },
  { group: bed1, pos: bed1.position.clone(), name: 'Bed 1' },
  { group: bed2, pos: bed2.position.clone(), name: 'Bed 2' },
  { group: bed3, pos: bed3.position.clone(), name: 'Bed 3' },
  { group: plantGroup, pos: plantGroup.position.clone(), name: 'Plant' },
];
chairGroups.forEach((g, i) => hideables.push({ group: g, pos: g.position.clone(), name: 'Chair ' + (i+1) }));

// Colliders
const colliders = [
  // Back wall of living room
  { min: new THREE.Vector3(-ROOM_W/2, 0, -ROOM_D/2), max: new THREE.Vector3(ROOM_W/2, ROOM_H, -ROOM_D/2+.3) },
  // Dining back wall segments (opening to garage at x=11 to 14)
  { min: new THREE.Vector3(ROOM_W/2, 0, -ROOM_D/2), max: new THREE.Vector3(11, ROOM_H, -ROOM_D/2+.3) },
  { min: new THREE.Vector3(14, 0, -ROOM_D/2), max: new THREE.Vector3(ROOM_W/2+DINING_W, ROOM_H, -ROOM_D/2+.3) },
  // Living front wall segments (opening at x=-2 to x=2 to middle-south)
  { min: new THREE.Vector3(-ROOM_W/2, 0, ROOM_D/2-.3), max: new THREE.Vector3(-2, ROOM_H, ROOM_D/2) },
  { min: new THREE.Vector3(2, 0, ROOM_D/2-.3), max: new THREE.Vector3(ROOM_W/2, ROOM_H, ROOM_D/2) },
  // Dining front wall segments (opening at x=10 to x=13 to bedroom)
  { min: new THREE.Vector3(ROOM_W/2, 0, ROOM_D/2-.3), max: new THREE.Vector3(10, ROOM_H, ROOM_D/2) },
  { min: new THREE.Vector3(13, 0, ROOM_D/2-.3), max: new THREE.Vector3(ROOM_W/2+DINING_W, ROOM_H, ROOM_D/2) },
  // Living room left wall segments (opening at z=-1.5 to z=1.5 to play room)
  { min: new THREE.Vector3(-ROOM_W/2, 0, -ROOM_D/2), max: new THREE.Vector3(-ROOM_W/2+.3, ROOM_H, -1.5) },
  { min: new THREE.Vector3(-ROOM_W/2, 0, 1.5), max: new THREE.Vector3(-ROOM_W/2+.3, ROOM_H, ROOM_D/2) },
  // Living-dining passage walls
  { min: new THREE.Vector3(ROOM_W/2-.3, 0, -ROOM_D/2), max: new THREE.Vector3(ROOM_W/2, ROOM_H, -2) },
  { min: new THREE.Vector3(ROOM_W/2-.3, 0, 2), max: new THREE.Vector3(ROOM_W/2, ROOM_H, ROOM_D/2) },
  { min: new THREE.Vector3(ROOM_W/2+DINING_W-.3, 0, -ROOM_D/2), max: new THREE.Vector3(ROOM_W/2+DINING_W, ROOM_H, ROOM_D/2) },
  // Garage walls
  { min: new THREE.Vector3(8, 0, -13), max: new THREE.Vector3(16, ROOM_H, -13+.3) },
  { min: new THREE.Vector3(8, 0, -13), max: new THREE.Vector3(8+.3, ROOM_H, -5) },
  { min: new THREE.Vector3(16-.3, 0, -13), max: new THREE.Vector3(16, ROOM_H, -5) },
  // Play room walls
  { min: new THREE.Vector3(PLAY_X-PLAY_W/2, 0, -ROOM_D/2), max: new THREE.Vector3(PLAY_X-PLAY_W/2+.3, ROOM_H, ROOM_D/2) }, // far left
  { min: new THREE.Vector3(PLAY_X-PLAY_W/2, 0, -ROOM_D/2), max: new THREE.Vector3(PLAY_X+PLAY_W/2, ROOM_H, -ROOM_D/2+.3) }, // back
  // Play room front wall segments (opening to office at x=-14 to x=-11)
  { min: new THREE.Vector3(PLAY_X-PLAY_W/2, 0, ROOM_D/2-.3), max: new THREE.Vector3(-14, ROOM_H, ROOM_D/2) },
  { min: new THREE.Vector3(-11, 0, ROOM_D/2-.3), max: new THREE.Vector3(PLAY_X+PLAY_W/2, ROOM_H, ROOM_D/2) },
  // Office walls
  { min: new THREE.Vector3(PLAY_X-PLAY_W/2, 0, OFFICE_Z-ROOM_D/2), max: new THREE.Vector3(PLAY_X-PLAY_W/2+.3, ROOM_H, OFFICE_Z+ROOM_D/2) }, // far left
  { min: new THREE.Vector3(PLAY_X-PLAY_W/2, 0, OFFICE_Z+ROOM_D/2-.3), max: new THREE.Vector3(PLAY_X+PLAY_W/2, ROOM_H, OFFICE_Z+ROOM_D/2) }, // front
  // Office right wall — split for opening to middle-south (z=8 to 12)
  { min: new THREE.Vector3(PLAY_X+PLAY_W/2-.3, 0, OFFICE_Z-ROOM_D/2), max: new THREE.Vector3(PLAY_X+PLAY_W/2, ROOM_H, 8) },
  { min: new THREE.Vector3(PLAY_X+PLAY_W/2-.3, 0, 12), max: new THREE.Vector3(PLAY_X+PLAY_W/2, ROOM_H, OFFICE_Z+ROOM_D/2) },
  // Middle-south front wall
  { min: new THREE.Vector3(-ROOM_W/2, 0, OFFICE_Z+ROOM_D/2-.3), max: new THREE.Vector3(ROOM_W/2, ROOM_H, OFFICE_Z+ROOM_D/2) },
  // Middle-south right wall — split for opening to bedroom (z=8 to 12)
  { min: new THREE.Vector3(ROOM_W/2-.3, 0, OFFICE_Z-ROOM_D/2), max: new THREE.Vector3(ROOM_W/2, ROOM_H, 8) },
  { min: new THREE.Vector3(ROOM_W/2-.3, 0, 12), max: new THREE.Vector3(ROOM_W/2, ROOM_H, OFFICE_Z+ROOM_D/2) },
  // Bedroom front + right walls
  { min: new THREE.Vector3(ROOM_W/2, 0, OFFICE_Z+ROOM_D/2-.3), max: new THREE.Vector3(ROOM_W/2+DINING_W, ROOM_H, OFFICE_Z+ROOM_D/2) },
  { min: new THREE.Vector3(ROOM_W/2+DINING_W-.3, 0, OFFICE_Z-ROOM_D/2), max: new THREE.Vector3(ROOM_W/2+DINING_W, ROOM_H, OFFICE_Z+ROOM_D/2) },
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
  // Poker table
  { min: new THREE.Vector3(PLAY_X-1.0, 0, 1.5), max: new THREE.Vector3(PLAY_X+1.0, 1.0, 3.5) },
  // Office desks
  { min: new THREE.Vector3(desk1.position.x-1.0, 0, desk1.position.z-0.5), max: new THREE.Vector3(desk1.position.x+1.0, 1.0, desk1.position.z+0.5) },
  { min: new THREE.Vector3(desk2.position.x-0.5, 0, desk2.position.z-1.0), max: new THREE.Vector3(desk2.position.x+0.5, 1.0, desk2.position.z+1.0) },
  // Office chairs
  { min: new THREE.Vector3(officeChair1.position.x-0.35, 0, officeChair1.position.z-0.35), max: new THREE.Vector3(officeChair1.position.x+0.35, 1.2, officeChair1.position.z+0.35) },
  { min: new THREE.Vector3(officeChair2.position.x-0.35, 0, officeChair2.position.z-0.35), max: new THREE.Vector3(officeChair2.position.x+0.35, 1.2, officeChair2.position.z+0.35) },
  // Mid-south table + chair + plant
  { min: new THREE.Vector3(midTableGroup.position.x-0.7, 0, midTableGroup.position.z-0.5), max: new THREE.Vector3(midTableGroup.position.x+0.7, 1.0, midTableGroup.position.z+0.5) },
  { min: new THREE.Vector3(midChairGroup.position.x-0.35, 0, midChairGroup.position.z-0.35), max: new THREE.Vector3(midChairGroup.position.x+0.35, 1.1, midChairGroup.position.z+0.35) },
  { min: new THREE.Vector3(midPlant.position.x-0.4, 0, midPlant.position.z-0.4), max: new THREE.Vector3(midPlant.position.x+0.4, 1.5, midPlant.position.z+0.4) },
  // Fish tank
  { min: new THREE.Vector3(fishTank1.position.x-0.7, 0, fishTank1.position.z-0.3), max: new THREE.Vector3(fishTank1.position.x+0.7, 1.4, fishTank1.position.z+0.3) },
  // Beds
  { min: new THREE.Vector3(bed1.position.x-0.8, 0, bed1.position.z-1.2), max: new THREE.Vector3(bed1.position.x+0.8, 1.2, bed1.position.z+1.2) },
  { min: new THREE.Vector3(bed2.position.x-0.8, 0, bed2.position.z-1.2), max: new THREE.Vector3(bed2.position.x+0.8, 1.2, bed2.position.z+1.2) },
  { min: new THREE.Vector3(bed3.position.x-0.8, 0, bed3.position.z-1.2), max: new THREE.Vector3(bed3.position.x+0.8, 1.2, bed3.position.z+1.2) },
  // Plant
  { min: new THREE.Vector3(plantGroup.position.x-0.4, 0, plantGroup.position.z-0.4), max: new THREE.Vector3(plantGroup.position.x+0.4, 1.5, plantGroup.position.z+0.4) },
  ...chairColliders,
];

export { ROOM_W, ROOM_D, ROOM_H, DINING_W, walls, hideables, colliders, fireParts, tvGlow };
