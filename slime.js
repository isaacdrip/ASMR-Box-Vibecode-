// ===== Тягучий слайм со стерео-панорамой =====
const SLIME_MAX_KEY = 'asmrbox_slime_max';

let slimeEls = {};
let drag = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 };
let currentStretch = 0;
let maxStretch = Number(localStorage.getItem(SLIME_MAX_KEY) || '0');
let stretchSound = null;
let returnAnim = null;
let lastPan = 0;

function initSlime() {
  const root = document.getElementById('slimeRoot');
  if (!root) return;

  slimeEls = {
    area: document.getElementById('slimeArea'),
    blob: document.getElementById('slimeBlob'),
    stretch: document.getElementById('slimeStretch'),
    max: document.getElementById('slimeMax'),
    resetBtn: document.getElementById('slimeResetBtn'),
    toast: document.getElementById('toast')
  };

  if (slimeEls.resetBtn) slimeEls.resetBtn.addEventListener('click', () => {
    maxStretch = 0;
    localStorage.removeItem(SLIME_MAX_KEY);
    updateHud();
    showToast('Максимум сброшен');
  });

  if (slimeEls.max) slimeEls.max.textContent = Math.round(maxStretch) + '%';

  const area = slimeEls.area;
  if (!area) return;

  area.addEventListener('pointerdown', onDown);
  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerup', onUp);
  area.addEventListener('pointercancel', onUp);
  area.addEventListener('pointerleave', onUp);
}

// ===== Старт =====
function onDown(e) {
  if (!slimeEls.area) return;
  const rect = slimeEls.area.getBoundingClientRect();
  drag.active = true;
  drag.startX = e.clientX;
  drag.startY = e.clientY;
  drag.curX = e.clientX - rect.left;
  drag.curY = e.clientY - rect.top;
  cancelReturn();

  if (!stretchSound) stretchSound = ASMR.stretch(0.7, 0);
  if (stretchSound) {
    stretchSound.setIntensity(0);
    stretchSound.setPan(0);
  }
  lastPan = 0;

  try { slimeEls.area.setPointerCapture(e.pointerId); } catch (err) {}
}

// ===== Движение =====
function onMove(e) {
  if (!drag.active || !slimeEls.area) return;
  const rect = slimeEls.area.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = e.clientX - cx;
  const dy = e.clientY - cy;

  const maxDist = Math.min(rect.width, rect.height) * 0.42;
  const dist = Math.min(Math.hypot(dx, dy), maxDist);
  const angle = Math.atan2(dy, dx);

  const offsetX = Math.cos(angle) * dist;
  const offsetY = Math.sin(angle) * dist;

  const k = dist / maxDist; // 0..1
  setStretch(k);

  // ===== Стерео-панорама: нормализуем offsetX к [-1..1] =====
  // Двигаем влево от центра → pan = -1 (левое ухо)
  // Двигаем вправо → pan = +1 (правое ухо)
  const panRaw = offsetX / maxDist;              // -1..1
  // Небольшая мёртвая зона по центру (±8% не меняют панораму)
  const dead = 0.08;
  let pan = 0;
  if (panRaw > dead) pan = (panRaw - dead) / (1 - dead);
  else if (panRaw < -dead) pan = (panRaw + dead) / (1 - dead);
  pan = Math.max(-1, Math.min(1, pan));

  // Плавное сглаживание панорамы, чтобы не «дёргалось»
  lastPan = lastPan * 0.6 + pan * 0.4;
  if (stretchSound) stretchSound.setPan(lastPan);

  // Деформация блоба
  const blob = slimeEls.blob;
  if (blob) {
    const scaleX = 1 + k * 0.45;
    const scaleY = 1 - k * 0.25;
    blob.style.transform =
      `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) ` +
      `rotate(${angle * 180 / Math.PI}deg) ` +
      `scale(${scaleX}, ${scaleY})`;
    blob.style.borderRadius =
      `${48 + k * 10}% ${52 - k * 10}% ${46 - k * 8}% ${54 + k * 8}% / ` +
      `${52 + k * 8}% ${48 - k * 8}% ${52 - k * 10}% ${48 + k * 10}%`;
  }

  if (stretchSound) stretchSound.setIntensity(k);

  if (slimeEls.stretch) slimeEls.stretch.textContent = Math.round(k * 100) + '%';
  if (k * 100 > maxStretch) {
    maxStretch = k * 100;
    if (slimeEls.max) slimeEls.max.textContent = Math.round(maxStretch) + '%';
    localStorage.setItem(SLIME_MAX_KEY, String(maxStretch));
  }
}

// ===== Отпускание =====
function onUp(e) {
  if (!drag.active) return;
  drag.active = false;

  if (stretchSound) {
    stretchSound.stop();
    stretchSound = null;
  }
  // Финальный «чавк» тоже с панорамой — там, где отпустил
  ASMR.squish(0.8, lastPan);
  lastPan = 0;

  returnBlob();
  setStretch(0);
}

// ===== Возвратка =====
function returnBlob() {
  const blob = slimeEls.blob;
  if (!blob) return;
  cancelReturn();
  blob.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), border-radius 0.5s ease';
  blob.style.transform = 'translate(-50%, -50%) scale(1, 1)';
  blob.style.borderRadius = '48% 52% 46% 54% / 52% 48% 52% 48%';
  returnAnim = setTimeout(() => {
    blob.style.transition = 'border-radius 0.15s ease';
    returnAnim = null;
  }, 520);
}

function cancelReturn() {
  if (returnAnim) {
    clearTimeout(returnAnim);
    returnAnim = null;
  }
  const blob = slimeEls.blob;
  if (blob) blob.style.transition = 'border-radius 0.15s ease';
}

function setStretch(k) {
  currentStretch = k;
}

function updateHud() {
  if (slimeEls.stretch) slimeEls.stretch.textContent = '0%';
  if (slimeEls.max) slimeEls.max.textContent = Math.round(maxStretch) + '%';
}

function showToast(text) {
  if (!slimeEls.toast) return;
  slimeEls.toast.textContent = text;
  slimeEls.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => slimeEls.toast.classList.remove('show'), 2600);
}

document.addEventListener('DOMContentLoaded', initSlime);