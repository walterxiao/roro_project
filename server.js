const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 1030;

// Disable caching so browsers always get the latest JS/HTML
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
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
let selectedMap = 'home';

function getHostId() {
  const ids = [...players.keys()];
  return ids.length ? Math.min(...ids) : null;
}

// Random spawn points per map (for hiders)
const SPAWNS_BY_MAP = {
  home: [
    { x: -2, z: 3 }, { x: 2, z: -2 },
    { x: 11, z: 2 }, { x: 13, z: -2 },
    { x: 12, z: -9 },
    { x: -11, z: 2 }, { x: -13, z: -2 },
    { x: -11, z: 10 }, { x: -13, z: 8 },
    { x: 0, z: 10 },
    { x: 11, z: 10 }, { x: 13, z: 8 },
  ],
  library: [
    { x: -10, z: -9 }, { x: 4, z: -9 }, { x: -6, z: -3 }, { x: 1, z: -3 },
    { x: -6, z: 1 }, { x: 1, z: 1 }, { x: -6, z: 5 }, { x: 1, z: 5 },
    { x: 10, z: -9 }, { x: 10, z: 5 }, { x: -10, z: 5 }, { x: 10, z: 0 },
  ],
};

function randomSpawn() {
  const list = SPAWNS_BY_MAP[selectedMap] || SPAWNS_BY_MAP.home;
  return list[Math.floor(Math.random() * list.length)];
}

let hideTimer = null;
let seekTimer = null;
let dingTimer = null;
let seekCountdown = 0;
const HIDE_TIME = 30;
const SEEK_TIME = 120; // 2 minutes

function broadcast(msg, excludeId) {
  const data = JSON.stringify(msg);
  for (const [id, p] of players) {
    if (id !== excludeId && p.ws.readyState === 1) p.ws.send(data);
  }
}
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }

function pub(p) {
  return { id: p.id, name: p.name, role: p.role, pos: p.pos, rot: p.rot, isHiding: p.isHiding, isFound: p.isFound, ready: !!p.ready };
}
function allPub() { return [...players.values()].map(pub); }

function broadcastPlayers() {
  broadcast({ type: 'allPlayers', players: allPub(), hostId: getHostId() });
}

function endGame(winner, reason) {
  phase = 'gameover';
  if (hideTimer) { clearInterval(hideTimer); hideTimer = null; }
  if (seekTimer) { clearInterval(seekTimer); seekTimer = null; }
  if (dingTimer) { clearInterval(dingTimer); dingTimer = null; }
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
  if (seekTimer) { clearInterval(seekTimer); seekTimer = null; }
  if (dingTimer) { clearInterval(dingTimer); dingTimer = null; }
  for (const p of players.values()) {
    p.role = null; p.isHiding = false; p.hiddenFurniture = -1; p.isFound = false;
    p.pos = { x: 0, z: 2 }; p.rot = 0;
  }
  broadcast({ type: 'reset', players: allPub() });
}

function startDingTimer() {
  if (dingTimer) return;
  dingTimer = setInterval(() => {
    if (phase !== 'seeking') return;
    const hiders = [...players.values()].filter(p => p.role === 'hider' && !p.isFound);
    // Each round: ding every hider in sequence with a 0.5s gap
    hiders.forEach((hider, i) => {
      setTimeout(() => {
        if (phase !== 'seeking' || hider.isFound) return;
        broadcast({ type: 'ding', pos: hider.pos });
      }, i * 500);
    });
  }, 15000);
}

function startGame(opts = {}) {
  if (players.size < 1) return;
  const soloMode = players.size === 1;
  if (soloMode && !opts.soloRole) return; // solo only allowed in debug
  // Pick a random seeker (or force role in solo debug)
  const ids = [...players.keys()];
  const seekerId = soloMode
    ? (opts.soloRole === 'seeker' ? ids[0] : -1)
    : ids[Math.floor(Math.random() * ids.length)];
  for (const p of players.values()) {
    p.role = (p.id === seekerId) ? 'seeker' : 'hider';
    p.isHiding = false; p.hiddenFurniture = -1; p.isFound = false;
    p.ready = false; // clear ready state for next round
    if (p.role === 'hider') {
      const s = randomSpawn();
      p.pos = { x: s.x, z: s.z };
      p.rot = Math.random() * Math.PI * 2;
    } else {
      p.pos = { x: 0, z: 0 };
      p.rot = 0;
    }
  }
  phase = 'spinning';
  broadcast({ type: 'wheelSpin', seekerId, players: allPub(), duration: 3000 });
  setTimeout(() => {
    if (phase !== 'spinning') return;
    phase = 'hiding'; seekerChances = 3; hideCountdown = HIDE_TIME;
    broadcastPlayers();
    broadcast({ type: 'phaseChange', phase: 'hiding', hideCountdown, seekerChances });
    hideTimer = setInterval(() => {
      hideCountdown--;
      broadcast({ type: 'countdown', hideCountdown });
      if (hideCountdown <= 0) {
        clearInterval(hideTimer); hideTimer = null;
        phase = 'seeking';
        seekCountdown = SEEK_TIME;
        broadcast({ type: 'phaseChange', phase: 'seeking', seekerChances, seekCountdown });
        startDingTimer();
        seekTimer = setInterval(() => {
          seekCountdown--;
          broadcast({ type: 'seekCountdown', seekCountdown });
          if (seekCountdown <= 0) {
            clearInterval(seekTimer); seekTimer = null;
            const anyAlive = [...players.values()].some(p => p.role === 'hider' && !p.isFound);
            if (anyAlive && phase === 'seeking') endGame('hiders', 'time');
          }
        }, 1000);
      }
    }, 1000);
  }, 3000);
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const player = {
    id, name: 'Player ' + id, role: null,
    pos: { x: 0, z: 2 }, rot: 0,
    isHiding: false, hiddenFurniture: -1, isFound: false, ready: false, ws
  };
  players.set(id, player);
  send(ws, { type: 'welcome', id, players: allPub(), phase, seekerChances, hideCountdown, map: selectedMap, hostId: getHostId() });
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
    if (msg.type === 'setMap' && phase === 'lobby' && id === getHostId()) {
      if (msg.map === 'home' || msg.map === 'library') {
        selectedMap = msg.map;
        // Reset all ready states when map changes
        for (const p of players.values()) p.ready = false;
        broadcast({ type: 'mapChanged', map: selectedMap });
        broadcastPlayers();
      }
    }
    if (msg.type === 'ready' && phase === 'lobby') {
      player.ready = !player.ready;
      player.debug = !!msg.debug;
      player.debugRole = msg.debugRole === 'hider' ? 'hider' : 'seeker';
      broadcastPlayers();
      const all = [...players.values()];
      // Debug: allow a single ready player to start solo
      if (all.length === 1 && all[0].ready && all[0].debug) {
        startGame({ soloRole: all[0].debugRole });
      } else if (all.length >= 2 && all.every(p => p.ready)) {
        startGame();
      }
    }
    if (msg.type === 'move' && (phase === 'hiding' || phase === 'seeking')) {
      player.pos = msg.pos; player.rot = msg.rot;
      broadcast({ type: 'playerMoved', id, pos: msg.pos, rot: msg.rot }, id);
    }
    // Hide and unhide allowed in both hiding and seeking phases
    if (msg.type === 'hide' && player.role === 'hider' && (phase === 'hiding' || phase === 'seeking') && !player.isFound) {
      player.isHiding = true; player.hiddenFurniture = msg.furnitureIndex; player.hiddenBounds = msg.bounds || null;
      // Assign a random constant shake amplitude in [0.005, 0.02] for this hide session
      const amplitude = 0.005 + Math.random() * 0.015;
      player.shakeAmp = amplitude;
      broadcast({ type: 'playerHid', id, furnitureIndex: msg.furnitureIndex, amplitude });
    }
    if (msg.type === 'unhide' && player.role === 'hider' && (phase === 'hiding' || phase === 'seeking') && !player.isFound) {
      player.isHiding = false; player.hiddenFurniture = -1;
      broadcast({ type: 'playerUnhid', id, pos: player.pos });
    }
    if (msg.type === 'search' && player.role === 'seeker' && phase === 'seeking') {
      const fi = msg.furnitureIndex;
      const searchBounds = msg.bounds;
      // Primary match: same furniture index
      let found = [...players.values()].find(p => p.role === 'hider' && !p.isFound && p.isHiding && p.hiddenFurniture === fi);
      // Fallback: match by bounds overlap (in case indices drift between clients)
      if (!found && searchBounds) {
        found = [...players.values()].find(p => {
          if (p.role !== 'hider' || p.isFound || !p.isHiding || !p.hiddenBounds) return false;
          const b = p.hiddenBounds;
          const overlap = !(searchBounds.maxX < b.minX || searchBounds.minX > b.maxX ||
                            searchBounds.maxZ < b.minZ || searchBounds.minZ > b.maxZ);
          return overlap;
        });
      }
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
