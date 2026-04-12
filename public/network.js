// Uses the WebSocket already created by index.html's lobby script
const roro = window.__roro;

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

function send(msg) { roro.send(msg); }

// Game module registers its message handler via this
let gameHandler = () => {};
window.__roroOnMsg = (msg) => {
  // Handle HUD updates here
  if (msg.type === 'phaseChange') {
    if (msg.phase === 'hiding') {
      phaseText.textContent = 'Hiding phase';
      chancesText.textContent = 'Chances: ' + msg.seekerChances;
      gameOverScreen.classList.add('hidden');
      if (roro.getRole() === 'seeker') blindfold.classList.remove('hidden');
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
    if (roro.getRole() !== 'seeker') phaseText.textContent = 'Hide! ' + msg.hideCountdown + 's';
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

  // Forward to game.js handler
  gameHandler(msg);
};

btnAgain.addEventListener('click', () => send({ type: 'resetGame' }));

export { send, showToast };
export function getMyId() { return roro.getId(); }
export function getMyRole() { return roro.getRole(); }
export function setOnMessage(fn) { gameHandler = fn; }
