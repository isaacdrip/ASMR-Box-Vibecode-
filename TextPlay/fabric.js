// ===== Ткань и мех =====
const FAB_KEY = 'asmrbox_fabric_record';
const FUR_COLS = 70;
const FUR_ROWS = 38;

let fabEls = {};
let canvas, ctx;
let W = 0, H = 0, dpr = 1;
let hairs = [];           // {x,y,angle,baseAngle,len,wave}
let drawing = false;
let lastX = 0, lastY = 0, lastT = 0;
let strokes = 0;
let record = Number(localStorage.getItem(FAB_KEY) || '0');
let fabricSound = null;
let speedSmooth = 0;
let fabricHue = 0;
let rafId = null;

function initFabric() {
  const root = document.getElementById('fabricRoot');
  if (!root) return;

  fabEls = {
    area: document.getElementById('fabricArea'),
    canvas: document.getElementById('fabricCanvas'),
    strokes: document.getElementById('fabStrokes'),
    fluff: document.getElementById('fabFluff'),
    record: document.getElementById('fabRecord'),
    brushBtn: document.getElementById('fabBrushBtn'),
    shakeBtn: document.getElementById('fabShakeBtn'),
    resetBtn: document.getElementById('fabResetBtn'),
    toast: document.getElementById('toast')
  };

  canvas = fabEls.canvas;
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  if (fabEls.record) fabEls.record.textContent = record;

  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', (e) => { if (drawing) onUp(e); });

  if (fabEls.brushBtn) fabEls.brushBtn.addEventListener('click', () => {
    hairs.forEach(h => { h.angle = h.baseAngle; h.wave = 0; });
    ASMR.crunch(0.6);
    showToast('Мех причёсан');
  });
  if (fabEls.shakeBtn) fabEls.shakeBtn.addEventListener('click', shake);
  if (fabEls.resetBtn) fabEls.resetBtn.addEventListener('click', () => {
    record = 0;
    localStorage.removeItem(FAB_KEY);
    if (fabEls.record) fabEls.record.textContent = '0';
    showToast('Рекорд сброшен');
  });

  animate();
}

// ===== Размер =====
function resize() {
  if (!canvas || !fabEls.area) return;
  const rect = fabEls.area.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = rect.width;
  H = rect.height;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildFur();
}

// ===== Построение ворса =====
function buildFur() {
  hairs = [];
  const stepX = W / FUR_COLS;
  const stepY = H / FUR_ROWS;
  for (let r = 0; r < FUR_ROWS; r++) {
    for (let c = 0; c < FUR_COLS; c++) {
      const x = c * stepX + stepX / 2 + (Math.random() - 0.5) * stepX * 0.6;
      const y = r * stepY + stepY / 2 + (Math.random() - 0.5) * stepY * 0.6;
      const base = -Math.PI / 2 + (Math.random() - 0.5) * 0.35;
      hairs.push({
        x, y,
        baseAngle: base,
        angle: base,
        len: stepY * (1.6 + Math.random() * 1.2),
        wave: Math.random() * Math.PI * 2
      });
    }
  }
}

// ===== Анимация =====
function animate() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);

  // фон ткани
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f3ecff');
  g.addColorStop(1, '#e6d9f7');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ворсинки
  const t = performance.now() / 400;
  for (let i = 0; i < hairs.length; i++) {
    const h = hairs[i];
    // возврат к базовому углу
    h.angle += (h.baseAngle - h.angle) * 0.08;
    h.wave += 0.06;
    const sway = Math.sin(t + h.wave) * 0.06;

    const a = h.angle + sway;
    const x2 = h.x + Math.cos(a) * h.len;
    const y2 = h.y + Math.sin(a) * h.len;

    const hue = 260 + (h.x / W) * 40 + Math.sin(h.wave) * 8;
    const light = 55 + Math.sin(h.angle - h.baseAngle) * 12;
    ctx.strokeStyle = `hsl(${hue}, 55%, ${light}%)`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  rafId = requestAnimationFrame(animate);
}

// ===== Взаимодействие =====
function onDown(e) {
  if (!ctx) return;
  drawing = true;
  const p = pos(e);
  lastX = p.x; lastY = p.y;
  lastT = performance.now();
  if (!fabricSound) fabricSound = ASMR.sand(0.55);
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

  if (fabricSound) fabricSound.setIntensity(speedSmooth);
  if (fabEls.fluff) fabEls.fluff.textContent = Math.round(speedSmooth * 100) + '%';

  bendHairs(lastX, lastY, p.x, p.y, 40 + speedSmooth * 40);
  lastX = p.x; lastY = p.y; lastT = now;
}

function onUp(e) {
  if (!drawing) return;
  drawing = false;
  strokes++;
  if (fabEls.strokes) fabEls.strokes.textContent = strokes;
  if (strokes > record) {
    record = strokes;
    localStorage.setItem(FAB_KEY, String(record));
    if (fabEls.record) fabEls.record.textContent = record;
  }
  if (fabricSound) {
    fabricSound.stop();
    fabricSound = null;
  }
  speedSmooth = 0;
  if (fabEls.fluff) fabEls.fluff.textContent = '0%';
}

function pos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ===== Отклонение ворсинок =====
function bendHairs(x1, y1, x2, y2, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dir = Math.atan2(dy, dx);
  const r2 = radius * radius;
  for (let i = 0; i < hairs.length; i++) {
    const h = hairs[i];
    const ddx = h.x - x2;
    const ddy = h.y - y2;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 < r2) {
      const k = 1 - d2 / r2;
      // отклоняем по направлению движения
      const target = dir + (h.baseAngle - dir) * (1 - k) + Math.PI * k * 0.9;
      h.angle += (target - h.angle) * 0.5;
    }
  }
}

// ===== Встряхнуть =====
function shake() {
  hairs.forEach(h => { h.angle = h.baseAngle + (Math.random() - 0.5) * 2.4; });
  ASMR.crunch(0.7);
  showToast('Мех встряхнулся');
}

// ===== Тост =====
function showToast(text) {
  if (!fabEls.toast) return;
  fabEls.toast.textContent = text;
  fabEls.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => fabEls.toast.classList.remove('show'), 2600);
}

// ===== Старт =====
document.addEventListener('DOMContentLoaded', initFabric);