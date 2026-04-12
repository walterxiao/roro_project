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
let hideTimer = null;
let shakeTimer = null;
const HIDE_TIME = 20;
const SHAKE_INTERVAL = 10000; // ms

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

function checkGameOver() {
  const hiders = [...players.values()].filter(p => p.role === 'hider');
  const alive = hiders.filter(p => !p.isFound);
  if (alive.length === 0 && hiders.length > 0) {
    phase = 'gameover';
    broadcast({ type: 'gameOver', winner: 'seeker' });
    return true;
  }
  if (seekerChances <= 0 && alive.length > 0) {
    phase = 'gameover';
    broadcast({ type: 'gameOver', winner: 'hiders' });
    return true;
  }
  return false;
}

function resetGame() {
  phase = 'lobby'; seekerChances = 3; hideCountdown = 0;
  if (hideTimer) { clearInterval(hideTimer); hideTimer = null; }
  if (shakeTimer) { clearInterval(shakeTimer); shakeTimer = null; }
  for (const p of players.values()) {
    p.role = null; p.isHiding = false; p.hiddenFurniture = -1; p.isFound = false;
    p.pos = { x: 0, z: 2 }; p.rot = 0;
  }
  broadcast({ type: 'reset', players: allPub() });
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
  broadcast({ type: 'playerJoined', player: pub(player) }, id);

  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'setName') {
      player.name = (msg.name || '').slice(0, 16) || player.name;
      broadcast({ type: 'allPlayers', players: allPub() });
    }
    if (msg.type === 'setRole' && phase === 'lobby') {
      if (msg.role === 'seeker') {
        for (const p of players.values()) if (p.role === 'seeker') p.role = null;
        player.role = 'seeker';
      } else if (msg.role === 'hider') {
        player.role = 'hider';
      }
      broadcast({ type: 'allPlayers', players: allPub() });
    }
    if (msg.type === 'startGame' && phase === 'lobby') {
      if (![...players.values()].some(p => p.role === 'seeker')) return;
      if (![...players.values()].some(p => p.role === 'hider')) return;
      phase = 'hiding'; seekerChances = 3; hideCountdown = HIDE_TIME;
      for (const p of players.values()) { p.isHiding = false; p.hiddenFurniture = -1; p.isFound = false; }
      broadcast({ type: 'phaseChange', phase: 'hiding', hideCountdown, seekerChances });
      startShakeTimer();
      hideTimer = setInterval(() => {
        hideCountdown--;
        broadcast({ type: 'countdown', hideCountdown });
        if (hideCountdown <= 0) {
          clearInterval(hideTimer); hideTimer = null;
          phase = 'seeking';
          broadcast({ type: 'phaseChange', phase: 'seeking', seekerChances });
        }
      }, 1000);
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
        broadcast({ type: 'searchResult', furnitureIndex: fi, found: true, hiderId: found.id, hiderName: found.name, seekerChances });
      } else {
        seekerChances--;
        broadcast({ type: 'searchResult', furnitureIndex: fi, found: false, seekerChances });
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
    if (players.size === 0) { resetGame(); return; }
    if ((phase === 'hiding' || phase === 'seeking') && wasSeeker) {
      phase = 'gameover';
      if (hideTimer) { clearInterval(hideTimer); hideTimer = null; }
      broadcast({ type: 'gameOver', winner: 'hiders' });
    } else if (phase === 'seeking' || phase === 'hiding') { checkGameOver(); }
  });
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
