// ===== Песочница =====
const SAND_KEY = 'asmrbox_sand_record';

let sandEls = {};
let canvas, ctx;
let W = 0, H = 0, dpr = 1;
let drawing = false;
let lastX = 0, lastY = 0, lastT = 0;
let strokes = 0;
let record = Number(localStorage.getItem(SAND_KEY) || '0');
let sandSound = null;
let speedSmooth = 0;

function initSand() {
  const root = document.getElementById('sandRoot');
  if (!root) return;

  sandEls = {
    area: document.getElementById('sandArea'),
    canvas: document.getElementById('sandCanvas'),
    strokes: document.getElementById('sandStrokes'),
    speed: document.getElementById('sandSpeed'),
    record: document.getElementById('sandRecord'),
    smoothBtn: document.getElementById('sandSmoothBtn'),
    waveBtn: document.getElementById('sandWaveBtn'),
    resetBtn: document.getElementById('sandResetRecordBtn'),
    toast: document.getElementById('toast')
  };

  canvas = sandEls.canvas;
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  if (sandEls.record) sandEls.record.textContent = record;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onUp);

  if (sandEls.smoothBtn) sandEls.smoothBtn.addEventListener('click', () => {
    fillSand();
    showToast('Песок разровнен');
  });
  if (sandEls.waveBtn) sandEls.waveBtn.addEventListener('click', makeWaves);
  if (sandEls.resetBtn) sandEls.resetBtn.addEventListener('click', () => {
    record = 0;
    localStorage.removeItem(SAND_KEY);
    if (sandEls.record) sandEls.record.textContent = '0';
    showToast('Рекорд сброшен');
  });
}

// ===== Размер canvas =====
function resizeCanvas() {
  if (!canvas || !sandEls.area) return;
  const rect = sandEls.area.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = rect.width;
  H = rect.height;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fillSand();
}

// ===== Заливка песка =====
function fillSand() {
  if (!ctx) return;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ffe9c9');
  g.addColorStop(1, '#f0d3a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // зернистость
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

// ===== Рисование =====
function onDown(e) {
  if (!ctx) return;
  drawing = true;
  const p = pos(e);
  lastX = p.x; lastY = p.y;
  lastT = performance.now();
  if (!sandSound) sandSound = ASMR.sand(0.7);
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
}

function onMove(e) {
  if (!drawing || !ctx) return;
  const p = pos(e);
  const now = performance.now();
  const dt = Math.max(1, now - lastT);
  const dist = Math.hypot(p.x - lastX, p.y - lastY);
  const speed = Math.min(1, dist / dt * 4);

  speedSmooth = speedSmooth * 0.7 + speed * 0.3;
  if (sandSound) sandSound.setIntensity(speedSmooth);
  if (sandEls.speed) sandEls.speed.textContent = Math.round(speedSmooth * 100);

  carve(lastX, lastY, p.x, p.y, 6 + speedSmooth * 10);

  lastX = p.x; lastY = p.y; lastT = now;
}

function onUp(e) {
  if (!drawing) return;
  drawing = false;
  strokes++;
  if (sandEls.strokes) sandEls.strokes.textContent = strokes;
  if (strokes > record) {
    record = strokes;
    localStorage.setItem(SAND_KEY, String(record));
    if (sandEls.record) sandEls.record.textContent = record;
  }
  if (sandSound) {
    sandSound.stop();
    sandSound = null;
  }
  speedSmooth = 0;
  if (sandEls.speed) sandEls.speed.textContent = '0';
}

// ===== Позиция =====
function pos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ===== Выдавливание следа =====
function carve(x1, y1, x2, y2, width) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(200,160,105,0.55)';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,246,225,0.75)';
  ctx.lineWidth = Math.max(2, width * 0.45);
  ctx.beginPath();
  ctx.moveTo(x1, y1 + width * 0.35);
  ctx.lineTo(x2, y2 + width * 0.35);
  ctx.stroke();
  ctx.restore();
}

// ===== Волны =====
function makeWaves() {
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const src = new Uint8ClampedArray(img.data);
  const w = canvas.width, h = canvas.height;
  const amp = 14 * dpr;
  for (let y = 0; y < h; y++) {
    const shift = Math.round(Math.sin(y / (18 * dpr)) * amp);
    for (let x = 0; x < w; x++) {
      const sx = Math.min(w - 1, Math.max(0, x + shift));
      const di = (y * w + x) * 4;
      const si = (y * w + sx) * 4;
      img.data[di] = src[si];
      img.data[di + 1] = src[si + 1];
      img.data[di + 2] = src[si + 2];
    }
  }
  ctx.putImageData(img, 0, 0);
  ASMR.crunch(0.6);
  showToast('Волны на песке');
}

// ===== Тост =====
function showToast(text) {
  if (!sandEls.toast) return;
  sandEls.toast.textContent = text;
  sandEls.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => sandEls.toast.classList.remove('show'), 2600);
}

// ===== Старт =====
document.addEventListener('DOMContentLoaded', initSand);