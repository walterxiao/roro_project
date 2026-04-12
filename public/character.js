import { THREE, scene, mat } from './scene.js';

const PLAYER_COLORS = [
  { shirt: 0x2288DD, pants: 0x334466 },
  { shirt: 0xDD4422, pants: 0x442222 },
  { shirt: 0x22BB44, pants: 0x224422 },
  { shirt: 0xBB44BB, pants: 0x442244 },
  { shirt: 0xDDAA22, pants: 0x443322 },
  { shirt: 0x22CCCC, pants: 0x224444 },
];

export function createCharacter(colorIndex = 0) {
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

  return { group, armL, armR, legL, legR, walkTime: 0 };
}

export function animateWalk(char, dt, moving) {
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
