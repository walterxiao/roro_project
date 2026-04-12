const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');
const joystickZone = document.getElementById('joystickZone');

let joyX = 0, joyY = 0, joyTouchId = null;

function getCenter() {
  const r = joystickBase.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function update(cx, cy) {
  const c = getCenter();
  let dx = cx - c.x, dy = cy - c.y;
  const maxR = 40, dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joyX = dx / maxR; joyY = dy / maxR;
}

function reset() {
  joystickKnob.style.transform = 'translate(0px, 0px)';
  joyX = 0; joyY = 0; joyTouchId = null;
}

joystickZone.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; joyTouchId = t.identifier; update(t.clientX, t.clientY); }, { passive: false });
joystickZone.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joyTouchId) update(t.clientX, t.clientY); }, { passive: false });
joystickZone.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === joyTouchId) reset(); });
joystickZone.addEventListener('touchcancel', reset);
joystickZone.addEventListener('mousedown', (e) => {
  update(e.clientX, e.clientY);
  const onMove = (ev) => update(ev.clientX, ev.clientY);
  const onUp = () => { reset(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
});

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

export function getInput() {
  let x = joyX, z = joyY;
  if (keys['w'] || keys['arrowup']) z = -1;
  if (keys['s'] || keys['arrowdown']) z = 1;
  if (keys['a'] || keys['arrowleft']) x = -1;
  if (keys['d'] || keys['arrowright']) x = 1;
  return { x, z };
}
