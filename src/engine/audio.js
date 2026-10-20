/* 新版声音设计；保留统一时钟、预调度及跳转批次清理。 */
import { clamp } from './util.js';
import { makeScheduler } from './clock.js';
import { MUSIC, DEF, SIX, padAt, droneAt, seqStep, FX } from './sound-design.js';
export { MUSIC };

function graph(ctx) {
  const g = { ctx, pad: null, drones: {}, lastBlip: -1, batches: 0 };
  const imp = sec => { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let s = 1234 + c * 77; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 3); } } return b; };
  g.master = ctx.createGain(); g.master.gain.value = .9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
  g.master.connect(comp).connect(ctx.destination);
  g.rev = ctx.createConvolver(); g.rev.buffer = imp(.45); const rg = ctx.createGain(); rg.gain.value = .08; g.rev.connect(rg).connect(g.master);
  g.musicOut = ctx.createGain(); g.musicOut.gain.value = .55; g.musicOut.connect(g.master); g.musicOut.connect(g.rev);
  g.padF = ctx.createBiquadFilter(); g.padF.type = 'lowpass'; g.padF.frequency.value = 650; g.padF.Q.value = .5; g.padF.connect(g.musicOut);
  const lfo = ctx.createOscillator(); lfo.frequency.value = .05; const lg = ctx.createGain(); lg.gain.value = 90; lfo.connect(lg).connect(g.padF.frequency); lfo.start(0);
  g.delay = ctx.createDelay(1.5); g.delay.delayTime.value = SIX * 3; g.fb = ctx.createGain(); g.fb.gain.value = .3; g.dl = ctx.createGain(); g.dl.gain.value = .35; g.delay.connect(g.fb).connect(g.delay); g.delay.connect(g.dl).connect(g.musicOut);
  g.sfxOut = ctx.createGain(); g.sfxOut.gain.value = .48; g.sfxOut.connect(g.master); const sr = ctx.createGain(); sr.gain.value = .04; g.sfxOut.connect(sr).connect(g.rev);
  g.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = g.noise.getChannelData(0); let s = 99; for (let i = 0; i < nd.length; i++) { s = (s * 16807) % 2147483647; nd[i] = (s / 2147483647) * 2 - 1; }
  newBatch(g);
  return g;
}
/* 批次总线：节拍、音效、环境声、延迟回声的输入都接在 g.music / g.sfx / g.delayIn 上。
   跳转时旧批次 15 ms 内淡出并断开（连同已经排进 AudioContext、还没响的声音），延迟线清空一圈，新声音走新批次。 */
function newBatch(g) {
  const c = g.ctx, t = c.currentTime;
  for (const [k, out] of [['music', g.musicOut], ['sfx', g.sfxOut], ['delayIn', g.delay]]) {
    const old = g[k]; if (old) { old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + .015); setTimeout(() => old.disconnect(), 200); }
    const b = c.createGain(); b.connect(out); g[k] = b;
  }
  if (g.drones) { for (const n of Object.keys(g.drones)) g.drones[n].src.forEach(x => { try { x.stop(t + .03); } catch (e) { } }); g.drones = {}; }
  if (g.fb && g.batches++) {
    const d = g.delay.delayTime.value + .05;
    for (const [n, v] of [[g.fb, .3], [g.dl, .35]]) { n.gain.cancelScheduledValues(t); n.gain.setValueAtTime(0, t); n.gain.setValueAtTime(0, t + d); n.gain.linearRampToValueAtTime(v, t + d + .05); }
  }
}
export const FX_NAMES = Object.keys(FX);

const musicFor = id => MUSIC[id] || DEF;

export const AU = (() => {
  let G = null, on = true, plan = [], chI = -1, timer = null, clock = null, sched = null, lastOut = 0;
  function chapterAt(t) { let k = 0; for (let i = 0; i < plan.length; i++) if (t >= plan[i].start) k = i; return k; }
  const live = () => G && G.ctx.state === 'running' && clock && clock.source === 'audio';
  /** 影片时间 → AudioContext 时间（不早于「马上」，避免安排到已经过去的时刻） */
  const at = t => Math.max(clock.toSource(t), G.ctx.currentTime + .003);
  function tick() {
    if (!live()) return;
    const now = clock.time();
    const k = chapterAt(now); if (k !== chI) { chI = k; const m = plan[k] ? plan[k].m : DEF; padAt(G, G.ctx.currentTime + .02, m); droneAt(G, G.ctx.currentTime + .02, m.drone); }
    sched.advance(now);
  }
  const api = {
    version: '电子纪录片配乐 · 112 BPM · 第二版',
    /** music：各章 {start, id}；opt.clock：统一时钟（clock.js）；opt.cues：[影片秒, 音效名, 参数] 已排序 */
    init(music, { clock: ck = null, cues = [] } = {}) {
      plan = (music || []).map(c => ({ start: c.start, m: c.music || musicFor(c.id || '') })); if (window.FILM) plan = window.FILM.chapters.map(c => ({ start: c.start, m: musicFor(c.id) }));
      if (ck) clock = ck;
      sched = makeScheduler({
        step: SIX, cues,
        onStep: (t, n) => seqStep(G, at(t), n, plan.length ? plan[chapterAt(t)].m : DEF),
        onCue: (t, c) => { if (!FX[c[1]]) return; try { FX[c[1]](G, at(t), ...(c[2] || [])); } catch (e) { console.warn(e); } },
      });
      if (G) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; G = graph(new AC()); G.master.gain.value = on ? .9 : 0; timer = setInterval(tick, 25);
    },
    available: () => !!G,
    /** 诊断用（tools/playcheck.mjs）：AudioContext 与已开启的批次数 */
    diag: () => G ? { state: G.ctx.state, currentTime: G.ctx.currentTime, batches: G.batches, sched: !!sched } : null,
    running: () => !!G && G.ctx.state === 'running',
    /** 音频时钟（秒）：此刻正从扬声器出来的那一刻在 AudioContext 时间轴上的位置；暂停时冻结 */
    now() {
      if (!G) return 0; const c = G.ctx;
      if (c.state === 'running') {
        let v = c.currentTime - (c.outputLatency || c.baseLatency || 0);
        if (c.getOutputTimestamp) { const o = c.getOutputTimestamp(); if (o.performanceTime > 0 && o.contextTime > 0) v = o.contextTime + (performance.now() - o.performanceTime) / 1000; }
        lastOut = Math.max(lastOut, Math.min(v, c.currentTime));
      }
      return lastOut;
    },
    play() { if (G) G.ctx.resume(); },
    pause() { if (G) G.ctx.suspend(); },
    /** 跳转：旧批次静音，从 t 起重新排队；配乐垫底与环境声在下一次 tick 按新章节重建 */
    seek(t) { if (!G || !sched) return; newBatch(G); sched.seek(t); chI = -1; },
    setOn(v) { on = v; if (G) G.master.gain.setTargetAtTime(v ? .9 : 0, G.ctx.currentTime, .1); },
    duck(v) { if (G) G.musicOut.gain.setTargetAtTime(v ? .3 : .55, G.ctx.currentTime, .3); },
    /** 离线渲染整条音轨 → WAV（Uint8Array），由 tools/audio.mjs 调用 */
    async offline(TOTAL, chapters, cues) {
      const sr = 48000, len = Math.ceil(sr * TOTAL), oc = new OfflineAudioContext(2, len, sr), g = graph(oc);
      g.master.gain.setValueAtTime(0, 0); g.master.gain.linearRampToValueAtTime(.9, 1.5); g.master.gain.setValueAtTime(.9, Math.max(1.6, TOTAL - 3)); g.master.gain.linearRampToValueAtTime(0, TOTAL - .05);
      const pl = chapters.map(c => ({ start: c.start, m: musicFor(c.id) }));
      pl.forEach(p => { padAt(g, p.start + .01, p.m); droneAt(g, p.start + .01, p.m.drone); });
      for (let st = 0; st * SIX < TOTAL - 1; st++) { const t = st * SIX; let k = 0; for (let i = 0; i < pl.length; i++) if (t >= pl[i].start) k = i; seqStep(g, t, st, pl[k].m); }
      for (const [t, n, a] of cues) if (FX[n] && t < TOTAL - .2) { try { FX[n](g, Math.max(.01, t), ...(a || [])); } catch (e) { console.warn(e); } }
      const buf = await oc.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, out = new DataView(new ArrayBuffer(44 + n * 4));
      const wr = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
      wr(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); wr(8, 'WAVE'); wr(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); wr(36, 'data'); out.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, clamp(L[i], -1, 1) * 32767, true); out.setInt16(46 + i * 4, clamp(R[i], -1, 1) * 32767, true); }
      api.wav = new Uint8Array(out.buffer); return api.wav.length;
    },
    wavChunk(i, size) { const a = api.wav.subarray(i * size, (i + 1) * size); let s = ''; for (let k = 0; k < a.length; k += 32768) s += String.fromCharCode.apply(null, a.subarray(k, k + 32768)); return btoa(s); },
  };
  return api;
})();
