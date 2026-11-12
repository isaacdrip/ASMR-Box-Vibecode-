// ===== Поп-ит =====
const POPIT_KEY = 'asmrbox_popit_record';
const POPIT_COLS = 6;
const POPIT_ROWS = 6;
const POPIT_TOTAL = POPIT_COLS * POPIT_ROWS;

let popitEls = {};
let presses = 0;
let pushed = 0;
let record = Number(localStorage.getItem(POPIT_KEY) || '0');

function initPopit() {
  const root = document.getElementById('popitRoot');
  if (!root) return;

  popitEls = {
    board: document.getElementById('popitBoard'),
    count: document.getElementById('poCount'),
    pushed: document.getElementById('poPushed'),
    record: document.getElementById('poRecord'),
    resetAll: document.getElementById('poResetAllBtn'),
    resetRecord: document.getElementById('poResetRecordBtn'),
    toast: document.getElementById('toast')
  };

  if (popitEls.record) popitEls.record.textContent = record;
  if (popitEls.resetAll) popitEls.resetAll.addEventListener('click', resetAll);
  if (popitEls.resetRecord) popitEls.resetRecord.addEventListener('click', () => {
    record = 0;
    localStorage.removeItem(POPIT_KEY);
    if (popitEls.record) popitEls.record.textContent = '0';
    showToast('Рекорд сброшен');
  });

  buildBoard();
}

// ===== Построение =====
function buildBoard() {
  if (!popitEls.board) return;
  popitEls.board.innerHTML = '';
  pushed = 0;
  presses = 0;
  popitEls.board.style.gridTemplateColumns = `repeat(${POPIT_COLS}, 1fr)`;

  const frag = document.createDocumentFragment();
  for (let r = 0; r < POPIT_ROWS; r++) {
    for (let c = 0; c < POPIT_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'popit-cell';

      const bubble = document.createElement('div');
      bubble.className = 'popit-bubble';
      // лёгкий сдвиг цвета по сетке для «силиконового» вида
      const hue = 170 + (r * 6 + c) * 3;
      bubble.style.setProperty('--hue', hue);

      // высота тона зависит от позиции — чем правее/ниже, тем выше
      bubble.dataset.tone = String(0.35 + ((r * POPIT_COLS + c) / POPIT_TOTAL) * 0.55);

      cell.appendChild(bubble);
      cell.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        toggleBubble(bubble);
      });
      frag.appendChild(cell);
    }
  }
  popitEls.board.appendChild(frag);
  updateHud();
}

// ===== Нажатие =====
function toggleBubble(bubble) {
  const isPushed = bubble.classList.contains('pushed');
  const tone = Number(bubble.dataset.tone || '0.6');

  if (isPushed) {
    bubble.classList.remove('pushed');
    pushed--;
    ASMR.pop(tone * 0.9);           // возврат — чуть тише
  } else {
    bubble.classList.add('pushed');
    pushed++;
    ASMR.pop(tone);                  // выдавливание — громче/выше
  }

  presses++;
  if (popitEls.count) popitEls.count.textContent = presses;
  if (presses > record) {
    record = presses;
    localStorage.setItem(POPIT_KEY, String(record));
    if (popitEls.record) popitEls.record.textContent = record;
  }
  updateHud();
  if (navigator.vibrate) navigator.vibrate(6);

  if (pushed === POPIT_TOTAL) {
    ASMR.click(0.5);
    showToast('Все пупырышки выдавлены! Нажми «Вернуть все» 🫧');
  }
}

// ===== HUD =====
function updateHud() {
  if (popitEls.pushed) popitEls.pushed.textContent = pushed;
}

// ===== Вернуть все =====
function resetAll() {
  document.querySelectorAll('.popit-bubble.pushed').forEach(b => b.classList.remove('pushed'));
  pushed = 0;
  updateHud();
  ASMR.squish(0.6);
  showToast('Все пупырышки возвращены');
}

// ===== Тост =====
function showToast(text) {
  if (!popitEls.toast) return;
  popitEls.toast.textContent = text;
  popitEls.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => popitEls.toast.classList.remove('show'), 2600);
}

// ===== Старт =====
document.addEventListener('DOMContentLoaded', initPopit);