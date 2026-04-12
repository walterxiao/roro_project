let ws, myId = null, myRole = null;
let onMessage = () => {};

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
  ws = new WebSocket(proto + '//' + location.host);

  ws.onopen = () => {};

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === 'welcome') {
      myId = msg.id;
      // Find our role from player list
      const me = msg.players.find(p => p.id === myId);
      if (me && me.role) myRole = me.role;
      if (msg.phase === 'lobby') {
        // Shouldn't be on game page during lobby — go back
        window.location.href = '/';
        return;
      }
    }

    if (msg.type === 'phaseChange') {
      if (msg.phase === 'hiding') {
        phaseText.textContent = 'Hiding phase';
        chancesText.textContent = 'Chances: ' + msg.seekerChances;
        gameOverScreen.classList.add('hidden');
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
      gameOverScreen.classList.remove('hidden');
      winnerText.textContent = msg.winner === 'seeker' ? 'Seeker wins!' : 'Hiders win!';
    }

    if (msg.type === 'reset') {
      window.location.href = '/';
      return;
    }

    onMessage(msg);
  };

  ws.onerror = () => {};
  ws.onclose = () => setTimeout(connect, 2000);
}

btnAgain.addEventListener('click', () => send({ type: 'resetGame' }));

connect();

export { send, showToast };
export function getMyId() { return myId; }
export function getMyRole() { return myRole; }
export function setOnMessage(fn) { onMessage = fn; }
