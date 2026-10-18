/* ============ generative score & sound design (Web Audio) ============
   Every voice takes an absolute start time, so the same code plays live
   (AudioContext) or renders the whole soundtrack offline (OfflineAudioContext). */
const AU = (() => {
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // one chord per scene: D drone → Dm → B♭ → F → C → Dm9 → B♭maj7 → F → C/E → Gm → B♭ → Fmaj7 → D (resolves to major)
  const CH = [[38, 45, 50, 57], [50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60], [50, 53, 57, 64], [46, 50, 53, 57], [41, 45, 48, 55], [40, 48, 52, 55], [43, 46, 50, 55], [46, 50, 53, 58], [41, 45, 48, 52], [50, 54, 57, 62]];
  const LV = [0, 0, 1, 1, 2, 2, 2, 3, 3, 2, 3, 2, 0];
  const SIX = 60 / 84 / 4;
  let G = null, on = true, rec = null, step = 0, nextT = 0;
  function graph(ctx) {
    const g = { ctx, pad: null, drones: {}, lastBlip: -1 };
    const imp = (sec) => { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); } return b; };
    g.master = ctx.createGain(); g.master.gain.value = .9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = .01; comp.release.value = .3;
    g.master.connect(comp).connect(ctx.destination);
    g.rev = ctx.createConvolver(); g.rev.buffer = imp(3.6); const rg = ctx.createGain(); rg.gain.value = .55; g.rev.connect(rg).connect(g.master);
    g.music = ctx.createGain(); g.music.gain.value = .5; g.music.connect(g.master); g.music.connect(g.rev);
    g.padF = ctx.createBiquadFilter(); g.padF.type = 'lowpass'; g.padF.frequency.value = 850; g.padF.Q.value = .8; g.padF.connect(g.music);
    const lfo = ctx.createOscillator(); lfo.frequency.value = .06; const lg = ctx.createGain(); lg.gain.value = 320; lfo.connect(lg).connect(g.padF.frequency); lfo.start(0);
    g.delay = ctx.createDelay(1.5); g.delay.delayTime.value = SIX * 3; const fb = ctx.createGain(); fb.gain.value = .33; const dl = ctx.createGain(); dl.gain.value = .4; g.delay.connect(fb).connect(g.delay); g.delay.connect(dl).connect(g.music);
    g.sfx = ctx.createGain(); g.sfx.gain.value = .75; g.sfx.connect(g.master); const sr = ctx.createGain(); sr.gain.value = .35; g.sfx.connect(sr).connect(g.rev);
    g.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = g.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return g;
  }
  const nsrc = (g, t, dur) => { const s = g.ctx.createBufferSource(); s.buffer = g.noise; s.loop = true; s.start(t, Math.random()); s.stop(t + dur + .05); return s; };
  const env = (gn, t, a, peak, d) => { gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(peak, t + a); gn.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
  function padAt(g, t, idx) {
    const c = g.ctx;
    if (g.pad) { const o = g.pad; o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(.13, t); o.g.gain.linearRampToValueAtTime(0, t + 2.6); o.oscs.forEach(x => x.stop(t + 3)); }
    const gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.13, t + 3); gn.connect(g.padF);
    const oscs = [], notes = CH[idx];
    notes.forEach(m => [-8, 8].forEach(d => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = d + (Math.random() * 4 - 2); const og = c.createGain(); og.gain.value = .17 / notes.length; o.connect(og).connect(gn); o.start(t); oscs.push(o); }));
    const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = mtof(notes[0] - 12); const sg = c.createGain(); sg.gain.value = .26; sub.connect(sg).connect(gn); sub.start(t); oscs.push(sub);
    g.pad = { g: gn, oscs };
  }
  function droneAt(g, t, want) {
    const c = g.ctx;
    for (const n of Object.keys(g.drones)) if (n !== want) { const d = g.drones[n]; delete g.drones[n]; d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.lv, t); d.g.gain.linearRampToValueAtTime(0, t + 1.2); d.src.forEach(x => x.stop(t + 1.4)); }
    if (want && !g.drones[want]) {
      const lv = want === 'hum' ? .05 : .035, gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(lv, t + 2); gn.connect(g.sfx); const src = [];
      if (want === 'hum') [60, 120, 180].forEach((f, i) => { const o = c.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; const og = c.createGain(); og.gain.value = [1, .5, .25][i]; o.connect(og).connect(gn); o.start(t); src.push(o); });
      else { const s = c.createBufferSource(); s.buffer = g.noise; s.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = .6; s.connect(bp).connect(gn); s.start(t); src.push(s); }
      g.drones[want] = { g: gn, src, lv };
    }
  }
  function kickAt(g, t, v) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(38, t + .22); env(gn, t, .004, v, .42); o.connect(gn).connect(g.music); o.start(t); o.stop(t + .5); }
  function pluckAt(g, t, f, v) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(), lp = c.createBiquadFilter(); o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(600, t + .3); env(gn, t, .004, v, .42); o.connect(lp).connect(gn); gn.connect(g.music); gn.connect(g.delay); o.start(t); o.stop(t + .5); }
  function hatAt(g, t, v) { const s = nsrc(g, t, .06), hp = g.ctx.createBiquadFilter(), gn = g.ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 7500; env(gn, t, .002, v, .05); s.connect(hp).connect(gn).connect(g.music); }
  function seqStep(g, t, st, L, notes) {
    const s = st % 16;
    if (L >= 1 && (s === 0 || s === 8)) kickAt(g, t, L >= 2 ? .85 : .55);
    if (L >= 3 && (s === 4 || s === 12)) kickAt(g, t, .4);
    if (L >= 2 && s % 2 === 0) { const pat = [0, 2, 1, 3, 2, 1, 3, 2]; pluckAt(g, t, mtof(notes[pat[(s / 2) % 8] % notes.length] + 12), L >= 3 ? .085 : .06); }
    if (L >= 3 && s % 4 === 2) hatAt(g, t, .045);
    if (L === 1 && s === 0 && (st >> 4) % 2 === 0) pluckAt(g, t, mtof(notes[notes.length - 1] + 12), .05);
  }
  const FX = {
    boom(g, t, v = 1) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(26, t + 1.6); env(gn, t, .01, .9 * v, 2.2); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + 2.4); const s = nsrc(g, t, 1.2), lp = c.createBiquadFilter(), ng = c.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(120, t + 1); env(ng, t, .005, .35 * v, 1); s.connect(lp).connect(ng).connect(g.sfx); },
    riser(g, t, d) { const c = g.ctx, s = nsrc(g, t, d), bp = c.createBiquadFilter(), gn = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(5000, t + d); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.24, t + d * .9); gn.gain.linearRampToValueAtTime(0, t + d); s.connect(bp).connect(gn).connect(g.sfx); },
    crackle(g, t0, v = 1) { const c = g.ctx; for (let k = 0; k < 4 + Math.random() * 4; k++) { const t = t0 + Math.random() * .12, s = nsrc(g, t, .03), hp = c.createBiquadFilter(), gn = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 3000; env(gn, t, .001, (.25 + Math.random() * .35) * v, .03 + Math.random() * .04); s.connect(hp).connect(gn).connect(g.sfx); } },
    beep(g, t, f = 760, d = .16, v = .3) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.value = f; gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v, t + .01); gn.gain.setValueAtTime(v, t + d); gn.gain.linearRampToValueAtTime(0, t + d + .02); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + d + .05); },
    blip(g, t, f = 1200, v = .14) { if (t - g.lastBlip < .06) return; g.lastBlip = t; const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + .05); env(gn, t, .003, v, .09); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + .15); },
    chime(g, t, f = 880, v = .16) { const c = g.ctx;[1, 2.01, 3.02].forEach((h, i) => { const o = c.createOscillator(), gn = c.createGain(); o.frequency.value = f * h; env(gn, t, .005, v / (i + 1), 1.4 / (i + 1)); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + 1.6); }); },
    glitch(g, t0) { const c = g.ctx; for (let k = 0; k < 9; k++) { const t = t0 + k * .035 + Math.random() * .02, o = c.createOscillator(), gn = c.createGain(); o.type = 'square'; o.frequency.value = 80 + Math.random() * 1400; env(gn, t, .001, .12, .03); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + .06); } FX.crackle(g, t0, 1.3); }
  };
  function tick() {
    if (!G || G.ctx.state !== 'running' || !playing) return;
    if (nextT < G.ctx.currentTime) nextT = G.ctx.currentTime + .05;
    while (nextT < G.ctx.currentTime + .12) { const i = cur < 0 ? 0 : cur; seqStep(G, nextT, step, LV[i], CH[i]); nextT += SIX; step++; }
  }
  const call = (name, args) => { if (rec) { rec.push([T, name, args]); return; } if (!G) return; FX[name](G, G.ctx.currentTime + .01, ...args); };
  const api = {
    init() { if (G || rec) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; G = graph(new AC()); G.master.gain.value = on ? .9 : 0; setInterval(tick, 25); },
    record() { rec = []; },
    scene(i, S) { if (rec || !G) return; const t = G.ctx.currentTime + .01; padAt(G, t, i); droneAt(G, t, S.drone || null); },
    play() { if (G) G.ctx.resume(); }, pause() { if (G) G.ctx.suspend(); },
    resync() { if (G) nextT = G.ctx.currentTime + .05; },
    setOn(v) { on = v; if (G) G.master.gain.setTargetAtTime(v ? .9 : 0, G.ctx.currentTime, .1); },
    duck(v) { if (G) G.music.gain.setTargetAtTime(v ? .28 : .5, G.ctx.currentTime, .3); },
    /* full soundtrack, rendered offline from the recorded cue log */
    async offline() {
      const sr = 44100, len = Math.ceil(sr * TOTAL), oc = new OfflineAudioContext(2, len, sr), g = graph(oc);
      g.master.gain.setValueAtTime(0, 0); g.master.gain.linearRampToValueAtTime(.9, 2); g.master.gain.setValueAtTime(.9, TOTAL - 3); g.master.gain.linearRampToValueAtTime(0, TOTAL - .1);
      SCENES.forEach((S, i) => { padAt(g, STARTS[i] + .01, i); droneAt(g, STARTS[i] + .01, S.drone || null); });
      for (let st = 0; st * SIX < TOTAL - 1; st++) { const t = st * SIX, i = locate(t); seqStep(g, t, st, LV[i], CH[i]); }
      for (const [t, n, a] of (rec || [])) if (FX[n] && t < TOTAL - .2) FX[n](g, Math.max(.01, t), ...a);
      const buf = await oc.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, out = new DataView(new ArrayBuffer(44 + n * 4));
      const wr = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
      wr(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); wr(8, 'WAVE'); wr(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); wr(36, 'data'); out.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, clamp(L[i], -1, 1) * 32767, true); out.setInt16(46 + i * 4, clamp(R[i], -1, 1) * 32767, true); }
      api.wav = new Uint8Array(out.buffer); return api.wav.length;
    },
    wavChunk(i, size) { const a = api.wav.subarray(i * size, (i + 1) * size); let s = ''; for (let k = 0; k < a.length; k += 32768) s += String.fromCharCode.apply(null, a.subarray(k, k + 32768)); return btoa(s); },
    get log() { return rec; }
  };
  for (const n of Object.keys(FX)) api[n] = (...a) => call(n, a);
  return api;
})();
