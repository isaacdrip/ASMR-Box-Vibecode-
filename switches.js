// ===== Кнопки-переключатели =====
const SW_KEY = 'asmrbox_switch_record';

let swEls = {};
let count = 0;
let record = Number(localStorage.getItem(SW_KEY) || '0');
let activeCount = 0;

function initSwitches() {
  const root = document.getElementById('switchRoot');
  if (!root) return;

  swEls = {
    grid: document.getElementById('switchGrid'),
    count: document.getElementById('swCount'),
    active: document.getElementById('swActive'),
    record: document.getElementById('swRecord'),
    allOn: document.getElementById('swAllOnBtn'),
    allOff: document.getElementById('swAllOffBtn'),
    reset: document.getElementById('swResetBtn'),
    toast: document.getElementById('toast')
  };

  if (swEls.record) swEls.record.textContent = record;
  updateActive();

  // Все интерактивные элементы
  root.querySelectorAll('[data-type]').forEach(el => {
    const type = el.dataset.type;

    if (type === 'slider') {
      el.addEventListener('input', () => onSlider(el));
      el.addEventListener('pointerdown', () => ASMR.click(0.3));
    } else if (type === 'toggle') {
      el.addEventListener('click', () => onToggle(el));
    } else {
      el.addEventListener('click', () => onButton(el, type));
    }
  });

  if (swEls.allOn) swEls.allOn.addEventListener('click', () => setAll(true));
  if (swEls.allOff) swEls.allOff.addEventListener('click', () => setAll(false));
  if (swEls.reset) swEls.reset.addEventListener('click', () => {
    record = 0;
    localStorage.removeItem(SW_KEY);
    if (swEls.record) swEls.record.textContent = '0';
    showToast('Рекорд сброшен');
  });
}

// ===== Тумблер =====
function onToggle(el) {
  el.classList.toggle('on');
  // разная высота тона у каждого тумблера
  ASMR.click(0.7);
  bumpCount();
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(0.94)' }, { transform: 'scale(1)' }],
    { duration: 140, easing: 'ease-out' }
  );
  if (navigator.vibrate) navigator.vibrate(8);
  updateActive();
}

// ===== Кнопки =====
function onButton(el, type) {
  ASMR.squish(type === 'flat' ? 0.7 : 0.55);
  bumpCount();
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }],
    { duration: 160, easing: 'ease-out' }
  );
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 160);
  if (navigator.vibrate) navigator.vibrate(10);
}

// ===== Ползунок =====
let lastSliderValue = new Map();
function onSlider(el) {
  const v = Number(el.value);
  const prev = lastSliderValue.get(el) ?? v;
  const delta = Math.abs(v - prev);
  if (delta > 4) {
    ASMR.crunch(0.4);
    lastSliderValue.set(el, v);
    // визуальная подсветка заполнения
    el.style.setProperty('--val', v + '%');
  }
}

// ===== Счётчик =====
function bumpCount() {
  count++;
  if (swEls.count) swEls.count.textContent = count;
  if (count > record) {
    record = count;
    localStorage.setItem(SW_KEY, String(record));
    if (swEls.record) swEls.record.textContent = record;
  }
}

// ===== Активные =====
function updateActive() {
  const toggles = document.querySelectorAll('.toggle.on').length;
  const activeBtns = document.querySelectorAll('.round-btn.active, .square-btn.active').length;
  activeCount = toggles + activeBtns;
  if (swEls.active) swEls.active.textContent = activeCount;
}

// ===== Включить/выключить все =====
function setAll(on) {
  document.querySelectorAll('.toggle').forEach(t => {
    if (on) t.classList.add('on');
    else t.classList.remove('on');
  });
  ASMR.click(on ? 0.6 : 0.4);
  bumpCount();
  updateActive();
  showToast(on ? 'Все тумблеры включены' : 'Все тумблеры выключены');
}

// ===== Тост =====
function showToast(text) {
  if (!swEls.toast) return;
  swEls.toast.textContent = text;
  swEls.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => swEls.toast.classList.remove('show'), 2400);
}

// ===== Старт =====
document.addEventListener('DOMContentLoaded', initSwitches);