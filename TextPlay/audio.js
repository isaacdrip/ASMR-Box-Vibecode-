// ===== ASMR Audio Engine =====
// Мягкие ASMR-звуки через Web Audio API. Внешних файлов нет.

const ASMR = (() => {
  let ctx = null;
  let master = null;
  let noiseCache = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.85;
      // мягкий компрессор, чтобы ничего не «резало» ухо
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 30;
      comp.ratio.value = 2.5;
      comp.attack.value = 0.02;
      comp.release.value = 0.3;
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function getNoise(seconds = 2) {
    if (noiseCache && noiseCache.duration >= seconds) return noiseCache;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    noiseCache = buf;
    return buf;
  }

  function env(gainNode, peak, attack, release, now) {
    const g = gainNode.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0.0001, now);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + attack);
    g.exponentialRampToValueAtTime(0.0001, now + attack + release);
  }

  // Очень мягкая огибающая: долгая линейная атака, экспоненциальный спад
  function softEnv(gainNode, peak, attack, release, now) {
    const g = gainNode.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0.0001, now);
    g.linearRampToValueAtTime(Math.max(0.0002, peak), now + attack);
    g.exponentialRampToValueAtTime(0.0001, now + attack + release);
  }

  function makePanner(pan) {
    if (!ctx) return null;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      return p;
    }
    const g = ctx.createGain();
    g.gain.value = 1;
    return g;
  }

  // ===== POP =====
  function pop(vol = 0.7, pan = 0) {
    const ac = ensure(); if (!ac) return;
    const now = ac.currentTime;
    const out = ac.createGain(); out.gain.value = vol;
    const pn = makePanner(pan);
    out.connect(pn).connect(master);

    const osc = ac.createOscillator();
    osc.type = 'sine';
    const f0 = 520 + Math.random() * 380;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.35, now + 0.09);

    const e = ac.createGain();
    env(e, 0.85, 0.004, 0.11, now);

    const click = ac.createBufferSource();
    click.buffer = getNoise(0.1);
    const cf = ac.createBiquadFilter();
    cf.type = 'highpass'; cf.frequency.value = 2200;
    const ce = ac.createGain();
    env(ce, 0.5, 0.002, 0.05, now);

    osc.connect(e).connect(out);
    click.connect(cf).connect(ce).connect(out);
    osc.start(now); osc.stop(now + 0.16);
    click.start(now); click.stop(now + 0.08);
  }

  // ===== SQUISH — очень мягкий, «подушечный» =====
  // Полностью без ВЧ. Только глухой низкочастотный шум + мягкий синус.
  // Атака 80–120 мс, длинный хвост. Никаких щелчков и барабанов.
  function squish(vol = 0.7, pan = 0) {
    const ac = ensure(); if (!ac) return;
    const now = ac.currentTime;
    const out = ac.createGain(); out.gain.value = vol * 0.7; // общий уровень ниже
    const pn = makePanner(pan);
    out.connect(pn).connect(master);

    // --- Слой 1: «вата/поролон» — шум через очень низкий lowpass, широкий ---
    const foam = ac.createBufferSource();
    foam.buffer = getNoise(0.8);
    const foamLP = ac.createBiquadFilter();
    foamLP.type = 'lowpass';
    foamLP.frequency.value = 280 + Math.random() * 80;    // глухо, без «шшш»
    foamLP.Q.value = 0.5;
    const foamLP2 = ac.createBiquadFilter();
    foamLP2.type = 'lowpass';
    foamLP2.frequency.value = 420;
    foamLP2.Q.value = 0.5;
    const foamEnv = ac.createGain();
    softEnv(foamEnv, 0.45, 0.11, 0.45, now);              // атака 110 мс
    foam.connect(foamLP).connect(foamLP2).connect(foamEnv).connect(out);

    // --- Слой 2: «желе» — синус с плавным скольжением, без удара ---
    const sub = ac.createOscillator();
    sub.type = 'sine';
    const f0 = 110 + Math.random() * 30;
    sub.frequency.setValueAtTime(f0, now);
    sub.frequency.linearRampToValueAtTime(f0 * 0.7, now + 0.45);
    const subEnv = ac.createGain();
    softEnv(subEnv, 0.28, 0.09, 0.4, now);
    sub.connect(subEnv).connect(out);

    // --- Слой 3: «мягкий пух» — второй синус чуть выше, очень тихий ---
    const puff = ac.createOscillator();
    puff.type = 'sine';
    const f1 = 200 + Math.random() * 40;
    puff.frequency.setValueAtTime(f1, now);
    puff.frequency.linearRampToValueAtTime(f1 * 0.85, now + 0.35);
    const puffEnv = ac.createGain();
    softEnv(puffEnv, 0.1, 0.12, 0.3, now);
    puff.connect(puffEnv).connect(out);

    foam.start(now); foam.stop(now + 0.62);
    sub.start(now); sub.stop(now + 0.55);
    puff.start(now); puff.stop(now + 0.5);
  }

  // ===== STRETCH =====
  function stretch(vol = 0.6, pan = 0) {
    const ac = ensure(); if (!ac) return null;
    const now = ac.currentTime;
    const out = ac.createGain(); out.gain.value = 0;
    const pn = makePanner(pan);
    out.connect(pn).connect(master);

    const osc = ac.createOscillator();
    osc.type = 'sine';                       // мягкий синус вместо пилы
    osc.frequency.value = 100;

    const lfo = ac.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain).connect(osc.frequency);

    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 500;

    const n = ac.createBufferSource();
    n.buffer = getNoise(2);
    n.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = 700;
    const ng = ac.createGain(); ng.gain.value = 0.14;

    osc.connect(lp).connect(out);
    n.connect(bp).connect(ng).connect(out);
    osc.start(now); lfo.start(now); n.start(now);

    out.gain.setTargetAtTime(vol * 0.3, now, 0.12);

    return {
      setIntensity(k) {
        const v = Math.max(0, Math.min(1, k));
        const t = ac.currentTime;
        out.gain.setTargetAtTime(vol * (0.1 + v * 0.5), t, 0.08);
        lp.frequency.setTargetAtTime(300 + v * 900, t, 0.1);
        osc.frequency.setTargetAtTime(80 + v * 100, t, 0.1);
        lfo.frequency.setTargetAtTime(3 + v * 6, t, 0.1);
      },
      setPan(p) {
        const v = Math.max(-1, Math.min(1, p));
        const t = ac.currentTime;
        if (pn.pan) pn.pan.setTargetAtTime(v, t, 0.05);
        else if (pn.gain) pn.gain.setTargetAtTime(1 - Math.abs(v) * 0.2, t, 0.05);
      },
      stop() {
        const t = ac.currentTime;
        out.gain.setTargetAtTime(0, t, 0.12);
        setTimeout(() => {
          try { osc.stop(); lfo.stop(); n.stop(); } catch(e){}
          try { out.disconnect(); } catch(e){}
          try { pn.disconnect && pn.disconnect(); } catch(e){}
        }, 350);
      }
    };
  }

  // ===== CRUNCH =====
  function crunch(vol = 0.6, pan = 0) {
    const ac = ensure(); if (!ac) return;
    const now = ac.currentTime;
    const out = ac.createGain(); out.gain.value = vol;
    const pn = makePanner(pan);
    out.connect(pn).connect(master);

    const n = ac.createBufferSource();
    n.buffer = getNoise(0.4);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1600;
    const bp = ac.createBiquadFilter();
    bp.type = 'peaking'; bp.frequency.value = 3200; bp.gain.value = 8;
    const e = ac.createGain();
    env(e, 0.8, 0.005, 0.18, now);
    n.connect(hp).connect(bp).connect(e).connect(out);
    n.start(now); n.stop(now + 0.22);
  }

  // ===== CLICK =====
  function click(vol = 0.6, pan = 0) {
    const ac = ensure(); if (!ac) return;
    const now = ac.currentTime;
    const out = ac.createGain(); out.gain.value = vol;
    const pn = makePanner(pan);
    out.connect(pn).connect(master);

    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
    const e = ac.createGain();
    env(e, 0.5, 0.002, 0.04, now);

    const n = ac.createBufferSource();
    n.buffer = getNoise(0.05);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 3000;
    const ne = ac.createGain();
    env(ne, 0.4, 0.001, 0.03, now);

    osc.connect(e).connect(out);
    n.connect(hp).connect(ne).connect(out);
    osc.start(now); osc.stop(now + 0.06);
    n.start(now); n.stop(now + 0.05);
  }

  // ===== SAND =====
  function sand(vol = 0.5, pan = 0) {
    const ac = ensure(); if (!ac) return null;
    const now = ac.currentTime;
    const out = ac.createGain(); out.gain.value = 0;
    const pn = makePanner(pan);
    out.connect(pn).connect(master);

    const n = ac.createBufferSource();
    n.buffer = getNoise(2);
    n.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 600;
    const e = ac.createGain(); e.gain.value = 0.25;

    n.connect(bp).connect(hp).connect(e).connect(out);
    n.start(now);
    out.gain.setTargetAtTime(vol * 0.4, now, 0.1);

    return {
      setIntensity(k) {
        const v = Math.max(0, Math.min(1, k));
        const t = ac.currentTime;
        out.gain.setTargetAtTime(vol * (0.08 + v * 0.5), t, 0.06);
        bp.frequency.setTargetAtTime(1200 + v * 2200, t, 0.08);
      },
      setPan(p) {
        const v = Math.max(-1, Math.min(1, p));
        const t = ac.currentTime;
        if (pn.pan) pn.pan.setTargetAtTime(v, t, 0.05);
        else if (pn.gain) pn.gain.setTargetAtTime(1 - Math.abs(v) * 0.2, t, 0.05);
      },
      stop() {
        const t = ac.currentTime;
        out.gain.setTargetAtTime(0, t, 0.1);
        setTimeout(() => {
          try { n.stop(); } catch(e){}
          try { out.disconnect(); } catch(e){}
          try { pn.disconnect && pn.disconnect(); } catch(e){}
        }, 350);
      }
    };
  }

  function unlock() {
    ensure();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  return { pop, squish, stretch, crunch, click, sand, ensure };
})();