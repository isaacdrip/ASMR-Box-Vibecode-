// ===== Спиннер-щелкунчик =====
const SPIN_KEY = 'asmrbox_spin_record';
const SECTORS = 6;

let spinEls = {};
let angle = 0;           // текущий угол, град
let velocity = 0;        // град/кадр
let lastSector = 0;
let clicks = 0;
let turns = 0;
let record = Number(localStorage.getItem(SPIN_KEY) || '0');
let raf = null;
let drag = { active: false, lastAngle: 0, lastT: 0 };

function initSpinner() {
  const root = document.getElementById('spinnerRoot');
  if (!root) return;

  spinEls = {
    area: document.getElementById('spinArea'),
    wheel: document.getElementById('spinnerWheel'),
    group: document.getElementById('spinnerGroup'),
    turns: document.getElementById('spinTurns'),
    clicks: document.getElementById('spinClicks'),
    record: document.getElementById('spinRecord'),
    kick: document.getElementById('spinKickBtn'),
    reset: document.getElementById('spinResetBtn'),
    toast: document.getElementById('toast')
  };

  if (spinEls.record) spinEls.record.textContent = record;
  if (spinEls.kick) spinEls.kick.addEventListener('click', () => kick(28 + Math.random() * 20));
  if (spinEls.reset) spinEls.reset.addEventListener('click', () => {
    record = 0;
    localStorage.removeItem(SPIN_KEY);
    if (spinEls.record) spinEls.record.textContent = '0';
    showToast('Рекорд сброшен');
  });

  const area = spinEls.area;
  if (!area) return;

  area.addEventListener('pointerdown', onDown);
  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerup', onUp);
  area.addEventListener('pointercancel', onUp);
  area.addEventListener('pointerleave', (e) => { if (drag.active) onUp(e); });

  loop();
}

// ===== Мышь/палец =====
function onDown(e) {
  drag.active = true;
  drag.lastAngle = pointerAngle(e);
  drag.lastT = performance.now();
  velocity = 0;
  try { spinEls.area.setPointerCapture(e.pointerId); } catch (err) {}
}

function onMove(e) {
  if (!drag.active) return;
  const a = pointerAngle(e);
  const now = performance.now();
  const dt = Math.max(8, now - drag.lastT);
  let delta = a - drag.lastAngle;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  angle += delta;
  velocity = delta / dt * 16; // грубая нормализация
  drag.lastAngle = a;
  drag.lastT = now;
  checkSectors();
  render();
}

function onUp(e) {
  if (!drag.active) return;
  drag.active = false;
  // инерция
  if (Math.abs(velocity) < 2) velocity = 0;
}

function pointerAngle(e) {
  const rect = spinEls.area.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
}

// ===== Автокрутка =====
function kick(v) {
  velocity = v;
}

// ===== Цикл =====
function loop() {
  if (!drag.active) {
    angle += velocity;
    velocity *= 0.965;
    if (Math.abs(velocity) < 0.05) velocity = 0;
    checkSectors();
    render();
  }
  raf = requestAnimationFrame(loop);
}

// ===== Проверка секторов =====
function checkSectors() {
  const sectorSize = 360 / SECTORS;
  // нормализуем
  let a = angle % 360;
  if (a < 0) a += 360;
  const sector = Math.floor(a / sectorSize);
  if (sector !== lastSector) {
    lastSector = sector;
    clicks++;
    ASMR.click(0.6);
    if (spinEls.clicks) spinEls.clicks.textContent = clicks;
    if (clicks > record) {
      record = clicks;
      localStorage.setItem(SPIN_KEY, String(record));
      if (spinEls.record) spinEls.record.textContent = record;
    }
  }
  const t = Math.floor(Math.abs(angle) / 360);
  if (t !== turns) {
    turns = t;
    if (spinEls.turns) spinEls.turns.textContent = turns;
  }
}

// ===== Отрисовка =====
function render() {
  if (spinEls.group) {
    spinEls.group.setAttribute('transform', `rotate(${angle} 100 100)`);
  }
}

// ===== Тост =====
function showToast(text) {
  if (!spinEls.toast) return;
  spinEls.toast.textContent = text;
  spinEls.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => spinEls.toast.classList.remove('show'), 2600);
}

// ===== Старт =====
document.addEventListener('DOMContentLoaded', initSpinner);