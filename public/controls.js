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

// ======= Drag-to-look (camera orbit) =======
let lookYaw = 0, lookPitch = 0;
let dragActive = false, dragTouchId = null, lastX = 0, lastY = 0;

function inZone(el, x, y) {
  if (!el || el.style.display === 'none') return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

const hideZoneEl = document.getElementById('hideZone');
const canvas = document.getElementById('gameCanvas');

function dragStart(id, x, y) {
  if (inZone(joystickZone, x, y) || inZone(hideZoneEl, x, y)) return;
  dragActive = true; dragTouchId = id; lastX = x; lastY = y;
}
function dragMove(x, y) {
  if (!dragActive) return;
  const dx = x - lastX, dy = y - lastY;
  lastX = x; lastY = y;
  lookYaw += dx * 0.006;
  lookPitch += dy * 0.005;
  lookPitch = Math.max(-0.5, Math.min(0.8, lookPitch));
}
function dragEnd() { dragActive = false; dragTouchId = null; }

canvas.addEventListener('touchstart', (e) => {
  for (const t of e.changedTouches) {
    if (dragTouchId == null) dragStart(t.identifier, t.clientX, t.clientY);
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === dragTouchId) { e.preventDefault(); dragMove(t.clientX, t.clientY); }
  }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  for (const t of e.changedTouches) if (t.identifier === dragTouchId) dragEnd();
});

canvas.addEventListener('mousedown', (e) => dragStart('mouse', e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => { if (dragActive) dragMove(e.clientX, e.clientY); });
window.addEventListener('mouseup', () => dragEnd());

export function getInput() {
  let x = joyX, z = joyY;
  if (keys['w'] || keys['arrowup']) z = -1;
  if (keys['s'] || keys['arrowdown']) z = 1;
  if (keys['a'] || keys['arrowleft']) x = -1;
  if (keys['d'] || keys['arrowright']) x = 1;
  return { x, z };
}

export function getLook() {
  return { yaw: lookYaw, pitch: lookPitch };
}
