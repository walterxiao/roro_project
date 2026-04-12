let ws, myId = null, myRole = null;
let onMessage = () => {};

const lobby = document.getElementById('lobby');
const hud = document.getElementById('hud');
const nameInput = document.getElementById('nameInput');
const btnSeeker = document.getElementById('btnSeeker');
const btnHider = document.getElementById('btnHider');
const btnStart = document.getElementById('btnStart');
const playerList = document.getElementById('playerList');
const phaseText = document.getElementById('phaseText');
const chancesText = document.getElementById('chancesText');
const blindfold = document.getElementById('blindfold');
const bfTimer = document.getElementById('bfTimer');
const gameOverScreen = document.getElementById('gameOverScreen');
const winnerText = document.getElementById('winnerText');
const btnAgain = document.getElementById('btnAgain');
const toast = document.getElementById('toast');

let toastTimeout = null;
function showToast(msg) {
  toast.textContent = msg; toast.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}`);

  ws.onopen = () => {
    const name = nameInput.value.trim();
    if (name) send({ type: 'setName', name });
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === 'welcome') {
      myId = msg.id;
      updatePlayerList(msg.players);
      if (msg.phase !== 'lobby') {
        lobby.classList.add('hidden');
        hud.classList.remove('hidden');
      }
    }
    if (msg.type === 'allPlayers' || msg.type === 'reset') updatePlayerList(msg.players);
    if (msg.type === 'playerJoined' || msg.type === 'playerLeft') {} // handled via allPlayers

    if (msg.type === 'phaseChange') {
      if (msg.phase === 'hiding') {
        lobby.classList.add('hidden');
        hud.classList.remove('hidden');
        gameOverScreen.classList.add('hidden');
        phaseText.textContent = 'Hiding phase';
        chancesText.textContent = 'Chances: ' + msg.seekerChances;
        if (myRole === 'seeker') blindfold.classList.remove('hidden');
        else blindfold.classList.add('hidden');
      }
      if (msg.phase === 'seeking') {
        blindfold.classList.add('hidden');
        phaseText.textContent = 'Seeking phase';
        chancesText.textContent = 'Chances: ' + msg.seekerChances;
      }
    }

    if (msg.type === 'countdown') {
      bfTimer.textContent = msg.hideCountdown;
      if (myRole !== 'seeker') phaseText.textContent = 'Hide! ' + msg.hideCountdown + 's';
    }

    if (msg.type === 'searchResult') {
      chancesText.textContent = 'Chances: ' + msg.seekerChances;
      if (msg.found) showToast('Found ' + msg.hiderName + '!');
      else showToast('Nobody there! Chances: ' + msg.seekerChances);
    }

    if (msg.type === 'youWereFound') showToast('You were found!');

    if (msg.type === 'gameOver') {
      hud.classList.add('hidden');
      gameOverScreen.classList.remove('hidden');
      winnerText.textContent = msg.winner === 'seeker' ? 'Seeker wins!' : 'Hiders win!';
    }

    if (msg.type === 'reset') {
      gameOverScreen.classList.add('hidden');
      hud.classList.add('hidden');
      lobby.classList.remove('hidden');
      myRole = null;
      btnSeeker.classList.remove('active-seeker');
      btnHider.classList.remove('active-hider');
    }

    onMessage(msg);
  };

  ws.onerror = () => {};
  ws.onclose = () => setTimeout(connect, 2000);
}

function updatePlayerList(players) {
  let hasSeeker = false, hasHider = false;
  const lines = players.map(p => {
    const me = p.id === myId ? ' (you)' : '';
    const role = p.role ? ` [${p.role}]` : '';
    if (p.role === 'seeker') hasSeeker = true;
    if (p.role === 'hider') hasHider = true;
    if (p.id === myId && p.role) myRole = p.role;
    return p.name + role + me;
  });
  playerList.innerHTML = lines.join('<br>');
  btnStart.disabled = !(hasSeeker && hasHider);
}

nameInput.addEventListener('input', () => send({ type: 'setName', name: nameInput.value.trim() }));
btnSeeker.addEventListener('click', () => {
  send({ type: 'setRole', role: 'seeker' }); myRole = 'seeker';
  btnSeeker.classList.add('active-seeker'); btnHider.classList.remove('active-hider');
});
btnHider.addEventListener('click', () => {
  send({ type: 'setRole', role: 'hider' }); myRole = 'hider';
  btnHider.classList.add('active-hider'); btnSeeker.classList.remove('active-seeker');
});
btnStart.addEventListener('click', () => send({ type: 'startGame' }));
btnAgain.addEventListener('click', () => send({ type: 'resetGame' }));

connect();

export { send, myId, showToast, onMessage };
export function getMyId() { return myId; }
export function getMyRole() { return myRole; }
export function setOnMessage(fn) { onMessage = fn; }
