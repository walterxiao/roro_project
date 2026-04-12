const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 1030;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ========== GAME STATE ==========
let nextId = 1;
const players = new Map();
let phase = 'lobby';
let seekerChances = 3;
let hideCountdown = 0;
// Random spawn points across all rooms (for hiders)
const SPAWN_POINTS = [
  { x: -2, z: 3 },     // living room
  { x: 2, z: -2 },     // living room
  { x: 11, z: 2 },     // dining room
  { x: 13, z: -2 },    // dining room
  { x: 12, z: -9 },    // garage
  { x: -11, z: 2 },    // play room
  { x: -13, z: -2 },   // play room
  { x: -11, z: 10 },   // office
  { x: -13, z: 8 },    // office
  { x: 0, z: 10 },     // middle-south
  { x: 11, z: 10 },    // bedroom
  { x: 13, z: 8 },     // bedroom
];

function randomSpawn() {
  return SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
}

let hideTimer = null;
let shakeTimer = null;
let proxShakeTimer = null;
let seekTimer = null;
let seekCountdown = 0;
const HIDE_TIME = 30;
const SEEK_TIME = 180; // 3 minutes
const SHAKE_INTERVAL = 30000; // ms

function broadcast(msg, excludeId) {
  const data = JSON.stringify(msg);
  for (const [id, p] of players) {
    if (id !== excludeId && p.ws.readyState === 1) p.ws.send(data);
  }
}
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }

function pub(p) {
  return { id: p.id, name: p.name, role: p.role, pos: p.pos, rot: p.rot, isHiding: p.isHiding, isFound: p.isFound };
}
function allPub() { return [...players.values()].map(pub); }

function broadcastPlayers() {
  broadcast({ type: 'allPlayers', players: allPub() });
}

function endGame(winner, reason) {
  phase = 'gameover';
  if (hideTimer) { clearInterval(hideTimer); hideTimer = null; }
  if (shakeTimer) { clearInterval(shakeTimer); shakeTimer = null; }
  if (proxShakeTimer) { clearInterval(proxShakeTimer); proxShakeTimer = null; }
  if (seekTimer) { clearInterval(seekTimer); seekTimer = null; }
  broadcast({ type: 'gameOver', winner, reason });
  // Auto-reset to lobby after 3 seconds
  setTimeout(() => {
    if (phase === 'gameover') resetGame();
  }, 3000);
}

function checkGameOver() {
  const hiders = [...players.values()].filter(p => p.role === 'hider');
  const alive = hiders.filter(p => !p.isFound);
  if (alive.length === 0 && hiders.length > 0) { endGame('seeker'); return true; }
  if (seekerChances <= 0 && alive.length > 0) { endGame('hiders'); return true; }
  return false;
}

function resetGame() {
  phase = 'lobby'; seekerChances = 3; hideCountdown = 0; seekCountdown = 0;
  if (hideTimer) { clearInterval(hideTimer); hideTimer = null; }
  if (shakeTimer) { clearInterval(shakeTimer); shakeTimer = null; }
  if (proxShakeTimer) { clearInterval(proxShakeTimer); proxShakeTimer = null; }
  if (seekTimer) { clearInterval(seekTimer); seekTimer = null; }
  for (const p of players.values()) {
    p.role = null; p.isHiding = false; p.hiddenFurniture = -1; p.isFound = false;
    p.pos = { x: 0, z: 2 }; p.rot = 0;
  }
  broadcast({ type: 'reset', players: allPub() });
}

function startProxShakeTimer() {
  if (proxShakeTimer) return;
  // Every 2s, check seeker distance to each hiding hider; closer = higher shake chance
  const PROX_RANGE = 3.5;
  proxShakeTimer = setInterval(() => {
    if (phase !== 'seeking') return;
    const seeker = [...players.values()].find(p => p.role === 'seeker');
    if (!seeker) return;
    const occupied = new Set();
    for (const p of players.values()) {
      if (p.role !== 'hider' || !p.isHiding || p.isFound) continue;
      const dx = seeker.pos.x - p.pos.x, dz = seeker.pos.z - p.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < PROX_RANGE) {
        const chance = 0.9 * (1 - dist / PROX_RANGE);
        if (Math.random() < chance) occupied.add(p.hiddenFurniture);
      }
    }
    if (occupied.size > 0) {
      broadcast({ type: 'shake', furnitureIndices: [...occupied], duration: 0.3 });
    }
  }, 2000);
}

function startShakeTimer() {
  if (shakeTimer) return;
  shakeTimer = setInterval(() => {
    // Find all furniture currently hiding someone
    const occupied = new Set();
    for (const p of players.values()) {
      if (p.role === 'hider' && p.isHiding && !p.isFound) occupied.add(p.hiddenFurniture);
    }
    if (occupied.size > 0) {
      broadcast({ type: 'shake', furnitureIndices: [...occupied] });
    }
  }, SHAKE_INTERVAL);
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const player = {
    id, name: 'Player ' + id, role: null,
    pos: { x: 0, z: 2 }, rot: 0,
    isHiding: false, hiddenFurniture: -1, isFound: false, ws
  };
  players.set(id, player);
  send(ws, { type: 'welcome', id, players: allPub(), phase, seekerChances, hideCountdown });
  broadcastPlayers();

  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'setName') {
      player.name = (msg.name || '').slice(0, 16) || player.name;
      broadcastPlayers();
    }
    // setRole is no longer used — roles are auto-assigned at game start (kept for safety)
    if (false && msg.type === 'setRole' && phase === 'lobby') {
      if (msg.role === 'seeker') {
        for (const p of players.values()) if (p.role === 'seeker') p.role = null;
        player.role = 'seeker';
      } else if (msg.role === 'hider') {
        player.role = 'hider';
      }
      broadcast({ type: 'allPlayers', players: allPub() });
    }
    if (msg.type === 'startGame' && phase === 'lobby') {
      if (players.size < 2) return;
      // Pick a random seeker
      const ids = [...players.keys()];
      const seekerId = ids[Math.floor(Math.random() * ids.length)];
      for (const p of players.values()) {
        p.role = (p.id === seekerId) ? 'seeker' : 'hider';
        p.isHiding = false; p.hiddenFurniture = -1; p.isFound = false;
        if (p.role === 'hider') {
          const s = randomSpawn();
          p.pos = { x: s.x, z: s.z };
          p.rot = Math.random() * Math.PI * 2;
        } else {
          // Seeker spawns in the living room center
          p.pos = { x: 0, z: 0 };
          p.rot = 0;
        }
      }
      phase = 'spinning';
      // Tell everyone to show the wheel animation first
      broadcast({ type: 'wheelSpin', seekerId, players: allPub(), duration: 3000 });
      // After the spin animation, start the hiding phase
      setTimeout(() => {
        if (phase !== 'spinning') return; // game was reset
        phase = 'hiding'; seekerChances = 3; hideCountdown = HIDE_TIME;
        broadcastPlayers();
        broadcast({ type: 'phaseChange', phase: 'hiding', hideCountdown, seekerChances });
        startShakeTimer();
        hideTimer = setInterval(() => {
          hideCountdown--;
          broadcast({ type: 'countdown', hideCountdown });
          if (hideCountdown <= 0) {
            clearInterval(hideTimer); hideTimer = null;
            phase = 'seeking';
            seekCountdown = SEEK_TIME;
            broadcast({ type: 'phaseChange', phase: 'seeking', seekerChances, seekCountdown });
            startProxShakeTimer();
            seekTimer = setInterval(() => {
              seekCountdown--;
              broadcast({ type: 'seekCountdown', seekCountdown });
              // In the final 30 seconds, send continuous minor shakes for every hidden hider
              if (seekCountdown <= 30 && seekCountdown > 0) {
                const occupied = [];
                for (const p of players.values()) {
                  if (p.role === 'hider' && p.isHiding && !p.isFound) occupied.push(p.hiddenFurniture);
                }
                if (occupied.length > 0) {
                  broadcast({ type: 'shake', furnitureIndices: occupied, duration: 1.2, amplitude: 0.25 });
                }
              }
              if (seekCountdown <= 0) {
                clearInterval(seekTimer); seekTimer = null;
                const anyAlive = [...players.values()].some(p => p.role === 'hider' && !p.isFound);
                if (anyAlive && phase === 'seeking') endGame('hiders', 'time');
              }
            }, 1000);
          }
        }, 1000);
      }, 3000); // end of setTimeout for wheel spin
    }
    if (msg.type === 'move' && (phase === 'hiding' || phase === 'seeking')) {
      player.pos = msg.pos; player.rot = msg.rot;
      broadcast({ type: 'playerMoved', id, pos: msg.pos, rot: msg.rot }, id);
    }
    // Hide and unhide allowed in both hiding and seeking phases
    if (msg.type === 'hide' && player.role === 'hider' && (phase === 'hiding' || phase === 'seeking') && !player.isFound) {
      player.isHiding = true; player.hiddenFurniture = msg.furnitureIndex;
      broadcast({ type: 'playerHid', id, furnitureIndex: msg.furnitureIndex });
    }
    if (msg.type === 'unhide' && player.role === 'hider' && (phase === 'hiding' || phase === 'seeking') && !player.isFound) {
      player.isHiding = false; player.hiddenFurniture = -1;
      broadcast({ type: 'playerUnhid', id, pos: player.pos });
    }
    if (msg.type === 'search' && player.role === 'seeker' && phase === 'seeking') {
      const fi = msg.furnitureIndex;
      const found = [...players.values()].find(p => p.role === 'hider' && !p.isFound && p.isHiding && p.hiddenFurniture === fi);
      if (found) {
        found.isFound = true; found.isHiding = false;
        broadcast({ type: 'searchResult', seekerId: player.id, furnitureIndex: fi, found: true, hiderId: found.id, hiderName: found.name, seekerChances });
      } else {
        seekerChances--;
        broadcast({ type: 'searchResult', seekerId: player.id, furnitureIndex: fi, found: false, seekerChances });
      }
      checkGameOver();
    }
    // Catch a visible hider by touching (proximity-based, validated on server)
    if (msg.type === 'catch' && player.role === 'seeker' && phase === 'seeking') {
      const target = players.get(msg.hiderId);
      if (target && target.role === 'hider' && !target.isFound && !target.isHiding) {
        const dx = target.pos.x - player.pos.x;
        const dz = target.pos.z - player.pos.z;
        if (dx*dx + dz*dz < 1.5*1.5) {
          target.isFound = true;
          broadcast({ type: 'hiderCaught', hiderId: target.id, hiderName: target.name });
          checkGameOver();
        }
      }
    }
    if (msg.type === 'resetGame') resetGame();
  });

  ws.on('close', () => {
    const wasSeeker = player.role === 'seeker';
    players.delete(id);
    broadcast({ type: 'playerLeft', id });
    broadcastPlayers();
    if (players.size === 0) { resetGame(); return; }
    if ((phase === 'hiding' || phase === 'seeking') && wasSeeker) {
      endGame('hiders', 'seeker-left');
    } else if (phase === 'seeking' || phase === 'hiding') { checkGameOver(); }
  });
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
