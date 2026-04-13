import { THREE, scene, mat } from './scene.js';

const PLAYER_COLORS = [
  { shirt: 0x2288DD, pants: 0x334466 },
  { shirt: 0xDD4422, pants: 0x442222 },
  { shirt: 0x22BB44, pants: 0x224422 },
  { shirt: 0xBB44BB, pants: 0x442244 },
  { shirt: 0xDDAA22, pants: 0x443322 },
  { shirt: 0x22CCCC, pants: 0x224444 },
];

const FAIRY_COLORS = [
  { dress: 0xff88cc, hat: 0xcc2288, wing: 0xaadfff },
  { dress: 0xaaddff, hat: 0x4477cc, wing: 0xffddaa },
  { dress: 0xffdd88, hat: 0xcc9922, wing: 0xddffdd },
  { dress: 0xbbffbb, hat: 0x229944, wing: 0xffccff },
  { dress: 0xffaaaa, hat: 0xcc3355, wing: 0xccddff },
  { dress: 0xddccff, hat: 0x7744cc, wing: 0xffffff },
];

// ---- Person (seekers) ----
function createPerson(colorIndex) {
  const colors = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  const group = new THREE.Group();

  const head = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5), mat(0xF5C6A0));
  head.position.y = 1.85; head.castShadow = true; group.add(head);

  const eyeW = mat(0xffffff), eyeB = mat(0x111111);
  const ewL = new THREE.Mesh(new THREE.BoxGeometry(.12, .1, .02), eyeW); ewL.position.set(-.1, 1.88, .26); group.add(ewL);
  const eL = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .02), eyeB); eL.position.set(-.1, 1.88, .27); group.add(eL);
  const ewR = new THREE.Mesh(new THREE.BoxGeometry(.12, .1, .02), eyeW); ewR.position.set(.1, 1.88, .26); group.add(ewR);
  const eR = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .02), eyeB); eR.position.set(.1, 1.88, .27); group.add(eR);
  const smile = new THREE.Mesh(new THREE.BoxGeometry(.15, .04, .02), eyeB); smile.position.set(0, 1.78, .26); group.add(smile);

  const shirtMat = mat(colors.shirt);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(.6, .7, .4), shirtMat); torso.position.y = 1.25; torso.castShadow = true; group.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(.25, .7, .3), shirtMat); armL.position.set(-.425, 1.25, 0); armL.castShadow = true; group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(.25, .7, .3), shirtMat); armR.position.set(.425, 1.25, 0); armR.castShadow = true; group.add(armR);

  const pantsMat = mat(colors.pants);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(.28, .7, .35), pantsMat); legL.position.set(-.16, .55, 0); legL.castShadow = true; group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(.28, .7, .35), pantsMat); legR.position.set(.16, .55, 0); legR.castShadow = true; group.add(legR);

  scene.add(group);
  return { group, armL, armR, legL, legR, walkTime: 0, type: 'person' };
}

// ---- Fairy (hiders) — flying, smaller, with wings ----
function createFairy(colorIndex) {
  const colors = FAIRY_COLORS[colorIndex % FAIRY_COLORS.length];
  const group = new THREE.Group();
  // Inner body group — we bob this up/down for the hover effect
  const body = new THREE.Group();
  body.position.y = 0.6; // hover height
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), mat(0xFFE0D0));
  head.position.y = 1.0; head.castShadow = true; body.add(head);

  // Eyes (bigger, cute)
  const eyeW = mat(0xffffff), eyeB = mat(0x111111);
  const ewL = new THREE.Mesh(new THREE.BoxGeometry(.08, .1, .02), eyeW); ewL.position.set(-.07, 1.02, .16); body.add(ewL);
  const eL = new THREE.Mesh(new THREE.BoxGeometry(.05, .07, .02), eyeB); eL.position.set(-.07, 1.02, .17); body.add(eL);
  const ewR = new THREE.Mesh(new THREE.BoxGeometry(.08, .1, .02), eyeW); ewR.position.set(.07, 1.02, .16); body.add(ewR);
  const eR = new THREE.Mesh(new THREE.BoxGeometry(.05, .07, .02), eyeB); eR.position.set(.07, 1.02, .17); body.add(eR);
  const smile = new THREE.Mesh(new THREE.BoxGeometry(.08, .02, .02), eyeB); smile.position.set(0, .95, .16); body.add(smile);

  // Pointy hat
  const hat = new THREE.Mesh(new THREE.ConeGeometry(.2, .35, 8), mat(colors.hat));
  hat.position.y = 1.3; hat.castShadow = true; body.add(hat);

  // Dress/torso (cone shape — wider at the bottom)
  const dressMat = mat(colors.dress);
  const dress = new THREE.Mesh(new THREE.ConeGeometry(.3, .55, 8), dressMat);
  dress.position.y = .55; dress.castShadow = true; body.add(dress);

  // Arms (small, skin-toned)
  const armMat = mat(0xFFE0D0);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(.08, .35, .08), armMat);
  armL.position.set(-.2, .75, 0); armL.castShadow = true; body.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(.08, .35, .08), armMat);
  armR.position.set(.2, .75, 0); armR.castShadow = true; body.add(armR);

  // Dangling legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(.08, .3, .08), armMat);
  legL.position.set(-.08, .15, 0); legL.castShadow = true; body.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(.08, .3, .08), armMat);
  legR.position.set(.08, .15, 0); legR.castShadow = true; body.add(legR);

  // Wings (transparent, shimmery)
  const wingMat = new THREE.MeshStandardMaterial({
    color: colors.wing,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    emissive: colors.wing,
    emissiveIntensity: 0.2,
  });
  const wingGeo = new THREE.PlaneGeometry(0.5, 0.55);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.25, .85, -0.1);
  wingL.rotation.y = Math.PI / 6;
  body.add(wingL);
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.25, .85, -0.1);
  wingR.rotation.y = -Math.PI / 6;
  body.add(wingR);

  scene.add(group);
  return { group, body, armL, armR, legL, legR, wingL, wingR, walkTime: 0, hoverTime: Math.random() * 10, type: 'fairy' };
}

export function createCharacter(colorIndex = 0, role = 'seeker') {
  return role === 'hider' ? createFairy(colorIndex) : createPerson(colorIndex);
}

export function animateWalk(char, dt, moving) {
  if (char.type === 'fairy') {
    // Wings always flap
    char.hoverTime += dt;
    const flap = Math.sin(char.hoverTime * 22);
    char.wingL.rotation.y = Math.PI / 6 + flap * 0.5;
    char.wingR.rotation.y = -Math.PI / 6 - flap * 0.5;
    // Bob the body up and down
    char.body.position.y = 0.6 + Math.sin(char.hoverTime * 3) * 0.08;
    // Legs sway when moving
    if (moving) {
      char.walkTime += dt * 6;
      const s = Math.sin(char.walkTime) * .25;
      char.armL.rotation.x = s; char.armR.rotation.x = -s;
      char.legL.rotation.x = -s * .6; char.legR.rotation.x = s * .6;
    } else {
      char.walkTime = 0;
      char.armL.rotation.x = 0; char.armR.rotation.x = 0;
      char.legL.rotation.x = 0; char.legR.rotation.x = 0;
    }
    return;
  }
  // Person walk
  if (moving) {
    char.walkTime += dt * 8;
    const s = Math.sin(char.walkTime) * .4;
    char.armL.rotation.x = s; char.armR.rotation.x = -s;
    char.legL.rotation.x = -s; char.legR.rotation.x = s;
  } else {
    char.walkTime = 0;
    char.armL.rotation.x = 0; char.armR.rotation.x = 0;
    char.legL.rotation.x = 0; char.legR.rotation.x = 0;
  }
}
