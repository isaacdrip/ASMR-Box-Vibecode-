// ===== Пузырчатая плёнка — ровный прямоугольник 8×10 =====
const POP_KEY = 'asmrbox_pop_record';
const GRID_COLS = 8;
const GRID_ROWS = 10;
const TOTAL = GRID_COLS * GRID_ROWS; // 80

let popEls = {};
let popped = 0;

function initPop() {
  const root = document.getElementById('popRoot');
  if (!root) return;

  popEls = {
    grid: document.getElementById('bubbleGrid'),
    count: document.getElementById('popCount'),
    left: document.getElementById('popLeft'),
    record: document.getElementById('popRecord'),
    newBtn: document.getElementById('newSheetBtn'),
    resetBtn: document.getElementById('resetRecordBtn'),
    toast: document.getElementById('toast')
  };

  if (popEls.newBtn) popEls.newBtn.addEventListener('click', buildSheet);
  if (popEls.resetBtn) popEls.resetBtn.addEventListener('click', resetRecord);

  buildSheet();
}

// ===== Построение плёнки =====
function buildSheet() {
  if (!popEls.grid) return;
  popEls.grid.innerHTML = '';
  popped = 0;

  // фиксированные 8 колонок — прямоугольник, а не рваная сетка
  popEls.grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < TOTAL; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    b.setAttribute('role', 'button');
    b.setAttribute('aria-label', 'Пузырик');
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      popBubble(b);
    });
    frag.appendChild(b);
  }
  popEls.grid.appendChild(frag);
  updateHud();
}

// ===== Лопание =====
function popBubble(b) {
  if (b.classList.contains('popped')) return;
  b.classList.add('popped');
  popped++;
  ASMR.pop(0.75);
  spark(b);
  updateHud();

  if (popped === TOTAL) {
    const rec = Number(localStorage.getItem(POP_KEY) || '0');
    if (TOTAL > rec) {
      localStorage.setItem(POP_KEY, String(TOTAL));
      updateHud();
      showToast('Новый рекорд! Вся плёнка лопнута 🎉');
    } else {
      showToast('Вся плёнка лопнута! Нажми «Новая плёнка» 🫧');
    }
  }
}

// ===== Частицы =====
function spark(b) {
  const rect = b.getBoundingClientRect();
  const parent = b.parentElement;
  const prect = parent.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 26;
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    s.style.left = (rect.left - prect.left + rect.width / 2 - 4) + 'px';
    s.style.top = (rect.top - prect.top + rect.height / 2 - 4) + 'px';
    s.style.background = ['#a8e0d0', '#f9c4a8', '#c4b8ec', '#f4b8c4'][i % 4];
    parent.appendChild(s);
    setTimeout(() => s.remove(), 520);
  }
}

// ===== HUD =====
function updateHud() {
  if (popEls.count) popEls.count.textContent = popped;
  if (popEls.left) popEls.left.textContent = TOTAL - popped;
  if (popEls.record) popEls.record.textContent = localStorage.getItem(POP_KEY) || '0';
}

// ===== Сброс рекорда =====
function resetRecord() {
  localStorage.removeItem(POP_KEY);
  updateHud();
  showToast('Рекорд сброшен');
}

// ===== Тост =====
function showToast(text) {
  if (!popEls.toast) return;
  popEls.toast.textContent = text;
  popEls.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => popEls.toast.classList.remove('show'), 2600);
}

// ===== Старт =====
document.addEventListener('DOMContentLoaded', initPop);