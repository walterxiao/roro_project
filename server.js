const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 1030;

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

// ========== STATE ==========
let nextId = 1;
let nextGameId = 1;
const players = new Map(); // id -> player (may have gameId)
const games = new Map();   // gameId -> game

const HIDE_TIME = 30;
const SEEK_TIME = 120;
const SEEK_TIME_BY_MAP = {
  home: 120,
  library: 120,
  cruise: 180,
};

const SPAWNS_BY_MAP = {
  home: [
    { x: -2, z: 3 }, { x: 2, z: -2 }, { x: 11, z: 2 }, { x: 13, z: -2 },
    { x: 12, z: -9 }, { x: -11, z: 2 }, { x: -13, z: -2 },
    { x: -11, z: 10 }, { x: -13, z: 8 }, { x: 0, z: 10 },
    { x: 11, z: 10 }, { x: 13, z: 8 },
  ],
  library: [
    { x: -10, z: -9 }, { x: 4, z: -9 }, { x: -6, z: -3 }, { x: 1, z: -3 },
    { x: -6, z: 1 }, { x: 1, z: 1 }, { x: -6, z: 5 }, { x: 1, z: 5 },
    { x: 10, z: -9 }, { x: 10, z: 5 }, { x: -10, z: 5 }, { x: 10, z: 0 },
    { x: 17, z: -5 }, { x: 24, z: 4 }, { x: 21, z: 0 },
  ],
  cruise: [
    // All on lower floor (y=0) — ship footprint x=[-15,15], z=[-18,18]
    // Restaurant (west half)
    { x: -9, z: -8 }, { x: -5, z: 5 }, { x: -10, z: 15 },
    { x: -12, z: -2 }, { x: -8, z: -14 },
    // Game room (east half)
    { x: 8, z: -6 }, { x: 5, z: 6 }, { x: 12, z: 14 },
    { x: 12, z: -2 }, { x: 8, z: -14 },
    // Center
    { x: 0, z: -10 }, { x: 0, z: 15 }, { x: -6, z: 0 }, { x: 6, z: 0 },
    // Stair area
    { x: 0, z: -2 },
  ],
};
function randomSpawn(map) {
  const list = SPAWNS_BY_MAP[map] || SPAWNS_BY_MAP.home;
  return list[Math.floor(Math.random() * list.length)];
}

// ========== HELPERS ==========
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function pubPlayer(p) {
  return { id: p.id, name: p.name, role: p.role, pos: p.pos, rot: p.rot, isHiding: p.isHiding, isFound: p.isFound, ready: !!p.ready };
}
function gamePlayers(game) {
  return [...game.playerIds].map(pid => players.get(pid)).filter(Boolean);
}
function broadcastToGame(game, msg, excludeId) {
  const data = JSON.stringify(msg);
  for (const pid of game.playerIds) {
    if (pid === excludeId) continue;
    const p = players.get(pid);
    if (p && p.ws.readyState === 1) p.ws.send(data);
  }
}
function gameInfo(game) {
  return {
    id: game.id,
    hostId: game.hostId,
    players: gamePlayers(game).map(pubPlayer),
    phase: game.phase,
    seekerChances: game.seekerChances,
    hideCountdown: game.hideCountdown,
    map: game.selectedMap,
  };
}
function broadcastPlayers(game) {
  broadcastToGame(game, { type: 'allPlayers', players: gameInfo(game).players, hostId: game.hostId });
}
function gameListForBrowsing() {
  return [...games.values()]
    .filter(g => g.phase === 'lobby')
    .map(g => ({
      id: g.id,
      hostName: (players.get(g.hostId) || {}).name || 'Host',
      playerCount: g.playerIds.size,
      map: g.selectedMap,
    }));
}
function broadcastGameList() {
  const list = gameListForBrowsing();
  for (const [, p] of players) {
    if (!p.gameId) send(p.ws, { type: 'gameList', games: list });
  }
}

// ========== GAME LIFECYCLE ==========
function createGame(host) {
  const id = String(nextGameId++);
  const game = {
    id,
    hostId: host.id,
    playerIds: new Set([host.id]),
    phase: 'lobby',
    selectedMap: 'home',
    seekerChances: 3,
    hideCountdown: 0,
    seekCountdown: 0,
    hideTimer: null,
    seekTimer: null,
    dingTimer: null,
  };
  games.set(id, game);
  host.gameId = id;
  return game;
}

function leaveGame(player) {
  if (!player.gameId) return;
  const game = games.get(player.gameId);
  player.gameId = null;
  player.ready = false;
  player.role = null;
  player.isHiding = false;
  player.hiddenFurniture = -1;
  player.isFound = false;
  send(player.ws, { type: 'gameLeft' });
  if (!game) return;
  game.playerIds.delete(player.id);
  if (game.playerIds.size === 0) {
    teardownGame(game);
    games.delete(game.id);
  } else {
    if (game.hostId === player.id) game.hostId = [...game.playerIds][0];
    const seekerStillIn = gamePlayers(game).some(p => p.role === 'seeker');
    if ((game.phase === 'hiding' || game.phase === 'seeking') && !seekerStillIn) {
      endGame(game, 'hiders', 'seeker-left');
    } else {
      broadcastPlayers(game);
      checkGameOver(game);
    }
  }
  broadcastGameList();
}

function teardownGame(game) {
  if (game.hideTimer) { clearInterval(game.hideTimer); game.hideTimer = null; }
  if (game.seekTimer) { clearInterval(game.seekTimer); game.seekTimer = null; }
  if (game.dingTimer) { clearInterval(game.dingTimer); game.dingTimer = null; }
}

function endGame(game, winner, reason) {
  game.phase = 'gameover';
  teardownGame(game);
  broadcastToGame(game, { type: 'gameOver', winner, reason });
  setTimeout(() => { if (game.phase === 'gameover') resetGame(game); }, 3000);
}

function resetGame(game) {
  game.phase = 'lobby';
  game.seekerChances = 3;
  game.hideCountdown = 0;
  game.seekCountdown = 0;
  teardownGame(game);
  for (const p of gamePlayers(game)) {
    p.role = null; p.isHiding = false; p.hiddenFurniture = -1; p.isFound = false; p.ready = false;
    p.pos = { x: 0, z: 2 }; p.rot = 0;
  }
  broadcastToGame(game, { type: 'reset', players: gamePlayers(game).map(pubPlayer) });
  broadcastGameList();
}

function checkGameOver(game) {
  const hiders = gamePlayers(game).filter(p => p.role === 'hider');
  const alive = hiders.filter(p => !p.isFound);
  if (alive.length === 0 && hiders.length > 0) { endGame(game, 'seeker'); return true; }
  if (game.seekerChances <= 0 && alive.length > 0) { endGame(game, 'hiders'); return true; }
  return false;
}

function startDingTimer(game) {
  if (game.dingTimer) return;
  game.dingTimer = setInterval(() => {
    if (game.phase !== 'seeking') return;
    const hiders = gamePlayers(game).filter(p => p.role === 'hider' && !p.isFound);
    hiders.forEach((hider, i) => {
      setTimeout(() => {
        if (game.phase !== 'seeking' || hider.isFound) return;
        broadcastToGame(game, { type: 'ding', pos: hider.pos, name: hider.name });
      }, i * 500);
    });
  }, 15000);
}

function startGame(game, soloRole) {
  const list = gamePlayers(game);
  if (list.length < 1) return;
  const soloMode = list.length === 1;
  if (soloMode && !soloRole) return;

  const seekerId = soloMode
    ? (soloRole === 'seeker' ? list[0].id : -1)
    : list[Math.floor(Math.random() * list.length)].id;

  for (const p of list) {
    p.role = (p.id === seekerId) ? 'seeker' : 'hider';
    p.isHiding = false; p.hiddenFurniture = -1; p.isFound = false; p.ready = false;
    if (p.role === 'hider') {
      const s = randomSpawn(game.selectedMap);
      p.pos = { x: s.x, z: s.z }; p.rot = Math.random() * Math.PI * 2;
    } else {
      p.pos = { x: 0, z: 0 }; p.rot = 0;
    }
  }

  game.phase = 'spinning';
  broadcastToGame(game, { type: 'wheelSpin', seekerId, players: list.map(pubPlayer), duration: 3000 });
  broadcastGameList();

  setTimeout(() => {
    if (game.phase !== 'spinning') return;
    game.phase = 'hiding'; game.seekerChances = 3; game.hideCountdown = HIDE_TIME;
    broadcastPlayers(game);
    broadcastToGame(game, { type: 'phaseChange', phase: 'hiding', hideCountdown: game.hideCountdown, seekerChances: game.seekerChances });
    game.hideTimer = setInterval(() => {
      game.hideCountdown--;
      broadcastToGame(game, { type: 'countdown', hideCountdown: game.hideCountdown });
      if (game.hideCountdown <= 0) {
        clearInterval(game.hideTimer); game.hideTimer = null;
        game.phase = 'seeking'; game.seekCountdown = SEEK_TIME_BY_MAP[game.selectedMap] || SEEK_TIME;
        broadcastToGame(game, { type: 'phaseChange', phase: 'seeking', seekerChances: game.seekerChances, seekCountdown: game.seekCountdown });
        startDingTimer(game);
        game.seekTimer = setInterval(() => {
          game.seekCountdown--;
          broadcastToGame(game, { type: 'seekCountdown', seekCountdown: game.seekCountdown });
          if (game.seekCountdown <= 0) {
            clearInterval(game.seekTimer); game.seekTimer = null;
            const anyAlive = gamePlayers(game).some(p => p.role === 'hider' && !p.isFound);
            if (anyAlive && game.phase === 'seeking') endGame(game, 'hiders', 'time');
          }
        }, 1000);
      }
    }, 1000);
  }, 3000);
}

// ========== WEBSOCKET ==========
wss.on('connection', (ws) => {
  const id = nextId++;
  const player = {
    id, name: 'Player ' + id, role: null, gameId: null,
    pos: { x: 0, z: 2 }, rot: 0,
    isHiding: false, hiddenFurniture: -1, isFound: false, ready: false, ws,
    debug: false, debugRole: 'seeker',
  };
  players.set(id, player);
  send(ws, { type: 'welcome', id, games: gameListForBrowsing() });

  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'setName') {
      player.name = (msg.name || '').slice(0, 16) || player.name;
      if (player.gameId) {
        const game = games.get(player.gameId);
        if (game) broadcastPlayers(game);
      }
      broadcastGameList();
    }

    if (msg.type === 'createGame' && !player.gameId) {
      const game = createGame(player);
      send(ws, { type: 'gameJoined', game: gameInfo(game) });
      broadcastGameList();
    }

    if (msg.type === 'joinGame' && !player.gameId) {
      const game = games.get(msg.gameId);
      if (!game || game.phase !== 'lobby') {
        send(ws, { type: 'joinFailed', reason: 'Game not available' });
        return;
      }
      game.playerIds.add(player.id);
      player.gameId = game.id;
      send(ws, { type: 'gameJoined', game: gameInfo(game) });
      broadcastPlayers(game);
      broadcastGameList();
    }

    if (msg.type === 'leaveGame' && player.gameId) {
      leaveGame(player);
    }

    if (msg.type === 'listGames' && !player.gameId) {
      send(ws, { type: 'gameList', games: gameListForBrowsing() });
    }

    if (msg.type === 'setMap' && player.gameId) {
      const game = games.get(player.gameId);
      if (game && game.phase === 'lobby' && game.hostId === id) {
        if (msg.map === 'home' || msg.map === 'library' || msg.map === 'cruise') {
          game.selectedMap = msg.map;
          for (const p of gamePlayers(game)) p.ready = false;
          broadcastToGame(game, { type: 'mapChanged', map: game.selectedMap });
          broadcastPlayers(game);
          broadcastGameList();
        }
      }
    }

    if (msg.type === 'ready' && player.gameId) {
      const game = games.get(player.gameId);
      if (!game || game.phase !== 'lobby') return;
      player.ready = !player.ready;
      player.debug = !!msg.debug;
      player.debugRole = msg.debugRole === 'hider' ? 'hider' : 'seeker';
      broadcastPlayers(game);
      const all = gamePlayers(game);
      if (all.length === 1 && all[0].ready && all[0].debug) {
        startGame(game, all[0].debugRole);
      } else if (all.length >= 2 && all.every(p => p.ready)) {
        startGame(game);
      }
    }

    if (msg.type === 'move' && player.gameId) {
      const game = games.get(player.gameId);
      if (game && (game.phase === 'hiding' || game.phase === 'seeking')) {
        player.pos = msg.pos; player.rot = msg.rot;
        broadcastToGame(game, { type: 'playerMoved', id, pos: msg.pos, rot: msg.rot }, id);
      }
    }

    if (msg.type === 'hide' && player.gameId) {
      const game = games.get(player.gameId);
      if (game && player.role === 'hider' && (game.phase === 'hiding' || game.phase === 'seeking') && !player.isFound) {
        player.isHiding = true; player.hiddenFurniture = msg.furnitureIndex; player.hiddenBounds = msg.bounds || null;
        const amplitude = 0.005 + Math.random() * 0.015;
        player.shakeAmp = amplitude;
        broadcastToGame(game, { type: 'playerHid', id, furnitureIndex: msg.furnitureIndex, amplitude });
      }
    }

    if (msg.type === 'unhide' && player.gameId) {
      const game = games.get(player.gameId);
      if (game && player.role === 'hider' && (game.phase === 'hiding' || game.phase === 'seeking') && !player.isFound) {
        player.isHiding = false; player.hiddenFurniture = -1;
        broadcastToGame(game, { type: 'playerUnhid', id, pos: player.pos });
      }
    }

    if (msg.type === 'search' && player.gameId) {
      const game = games.get(player.gameId);
      if (!game || player.role !== 'seeker' || game.phase !== 'seeking') return;
      const fi = msg.furnitureIndex;
      const searchBounds = msg.bounds;
      const list = gamePlayers(game);
      let found = list.find(p => p.role === 'hider' && !p.isFound && p.isHiding && p.hiddenFurniture === fi);
      if (!found && searchBounds) {
        found = list.find(p => {
          if (p.role !== 'hider' || p.isFound || !p.isHiding || !p.hiddenBounds) return false;
          const b = p.hiddenBounds;
          return !(searchBounds.maxX < b.minX || searchBounds.minX > b.maxX ||
                   searchBounds.maxZ < b.minZ || searchBounds.minZ > b.maxZ);
        });
      }
      if (found) {
        found.isFound = true; found.isHiding = false;
        broadcastToGame(game, { type: 'searchResult', seekerId: player.id, furnitureIndex: fi, found: true, hiderId: found.id, hiderName: found.name, seekerChances: game.seekerChances });
      } else {
        game.seekerChances--;
        broadcastToGame(game, { type: 'searchResult', seekerId: player.id, furnitureIndex: fi, found: false, seekerChances: game.seekerChances });
      }
      checkGameOver(game);
    }

    if (msg.type === 'catch' && player.gameId) {
      const game = games.get(player.gameId);
      if (!game || player.role !== 'seeker' || game.phase !== 'seeking') return;
      const target = players.get(msg.hiderId);
      if (target && target.gameId === game.id && target.role === 'hider' && !target.isFound && !target.isHiding) {
        const dx = target.pos.x - player.pos.x;
        const dz = target.pos.z - player.pos.z;
        if (dx * dx + dz * dz < 1.5 * 1.5) {
          target.isFound = true;
          broadcastToGame(game, { type: 'hiderCaught', hiderId: target.id, hiderName: target.name });
          checkGameOver(game);
        }
      }
    }
  });

  ws.on('close', () => {
    if (player.gameId) leaveGame(player);
    players.delete(id);
  });
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
