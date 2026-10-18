/* 生成式配乐与音效（Web Audio）。同一套代码：实时播放用 AudioContext，导出用 OfflineAudioContext 一次渲染整条音轨。
   - 配乐：每章一个和弦垫底（柔和的正弦/三角波叠加 + 低通），按章节「强度」叠加脉冲、拨弦、轻打击；可选环境底噪。
   - 音效：章节在 build 里用 ctx.cue(t, 'name', ...args) 声明，时间是章内秒。
   - 实时播放：以 clock.js 的统一时钟为准，节拍与音效都按影片时间提前约 0.15 s 排进 AudioContext（不依赖画面帧率）；
     跳转时整批静音已排队的声音（每次跳转换一组「批次」总线），避免跳到新位置后还响起上一段的声音。 */
import { clamp } from './util.js';
import { makeScheduler } from './clock.js';

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const SIX = 60 / 84 / 4;
/* 全片配乐计划：按章节 id。chord = MIDI 音高；lvl 0–3 = 节奏层强度；drone = 环境声 */
export const MUSIC = {
  '00': { chord: [50, 57, 62, 64, 69], lvl: 1, drone: 'room' },
  '01': { chord: [45, 52, 57, 60, 64], lvl: 1, drone: 'room' },
  '02': { chord: [41, 48, 53, 57, 60], lvl: 2, drone: 'room' },
  '03': { chord: [43, 50, 55, 59, 62], lvl: 2, drone: 'wind' },
  '04': { chord: [45, 52, 57, 64, 67], lvl: 1, drone: null },
  '05': { chord: [40, 47, 52, 55, 59], lvl: 2, drone: 'hum' },
  '06': { chord: [48, 55, 60, 64, 67], lvl: 3, drone: null },
  '07': { chord: [47, 54, 59, 62, 66], lvl: 2, drone: null },
  '08': { chord: [43, 50, 55, 62, 66], lvl: 3, drone: null },
  '09': { chord: [45, 52, 57, 60, 64], lvl: 2, drone: 'room' },
  '10': { chord: [41, 48, 53, 60, 64], lvl: 3, drone: null },
  '11': { chord: [38, 45, 50, 57, 62], lvl: 2, drone: 'ocean' },
  '12': { chord: [43, 50, 55, 59, 62], lvl: 3, drone: null },
  '13': { chord: [40, 47, 52, 59, 62], lvl: 3, drone: 'wind' },
  '14': { chord: [38, 45, 50, 54, 57], lvl: 1, drone: null },
  '15': { chord: [50, 54, 57, 62, 66], lvl: 2, drone: null },
};
const DEF = { chord: [50, 57, 62, 64], lvl: 1, drone: null };

function graph(ctx) {
  const g = { ctx, pad: null, drones: {}, lastBlip: -1, batches: 0 };
  const imp = sec => { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let s = 1234 + c * 77; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 3); } } return b; };
  g.master = ctx.createGain(); g.master.gain.value = .9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
  g.master.connect(comp).connect(ctx.destination);
  g.rev = ctx.createConvolver(); g.rev.buffer = imp(3.2); const rg = ctx.createGain(); rg.gain.value = .42; g.rev.connect(rg).connect(g.master);
  g.musicOut = ctx.createGain(); g.musicOut.gain.value = .55; g.musicOut.connect(g.master); g.musicOut.connect(g.rev);
  g.padF = ctx.createBiquadFilter(); g.padF.type = 'lowpass'; g.padF.frequency.value = 1100; g.padF.Q.value = .5; g.padF.connect(g.musicOut);
  const lfo = ctx.createOscillator(); lfo.frequency.value = .05; const lg = ctx.createGain(); lg.gain.value = 380; lfo.connect(lg).connect(g.padF.frequency); lfo.start(0);
  g.delay = ctx.createDelay(1.5); g.delay.delayTime.value = SIX * 3; g.fb = ctx.createGain(); g.fb.gain.value = .3; g.dl = ctx.createGain(); g.dl.gain.value = .35; g.delay.connect(g.fb).connect(g.delay); g.delay.connect(g.dl).connect(g.musicOut);
  g.sfxOut = ctx.createGain(); g.sfxOut.gain.value = .8; g.sfxOut.connect(g.master); const sr = ctx.createGain(); sr.gain.value = .25; g.sfxOut.connect(sr).connect(g.rev);
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
let RS = 7; const rnd = () => { RS = (RS * 16807) % 2147483647; return RS / 2147483647; };
const nsrc = (g, t, dur) => { const s = g.ctx.createBufferSource(); s.buffer = g.noise; s.loop = true; s.start(t, rnd() * 1.5); s.stop(t + dur + .05); return s; };
const env = (gn, t, a, peak, d) => { gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(peak, t + a); gn.gain.exponentialRampToValueAtTime(.0001, t + a + d); };

function padAt(g, t, m) {
  const c = g.ctx;
  if (g.pad) { const o = g.pad; o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.lv, t); o.g.gain.linearRampToValueAtTime(0, t + 2.4); o.oscs.forEach(x => x.stop(t + 2.6)); }
  const lv = .12, gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(lv, t + 2.2); gn.connect(g.padF);
  const oscs = [], notes = m.chord;
  notes.forEach((n, i) => [-6, 6].forEach(d => { const o = c.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = mtof(n); o.detune.value = d; const og = c.createGain(); og.gain.value = (i === 0 ? .32 : .16) / notes.length; o.connect(og).connect(gn); o.start(t); oscs.push(o); }));
  const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = mtof(notes[0] - 12); const sg = c.createGain(); sg.gain.value = .22; sub.connect(sg).connect(gn); sub.start(t); oscs.push(sub);
  g.pad = { g: gn, oscs, lv };
}
function droneAt(g, t, want) {
  const c = g.ctx;
  for (const n of Object.keys(g.drones)) if (n !== want) { const d = g.drones[n]; delete g.drones[n]; d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.lv, t); d.g.gain.linearRampToValueAtTime(0, t + 1.5); d.src.forEach(x => x.stop(t + 1.7)); }
  if (want && !g.drones[want]) {
    const lv = { hum: .045, wind: .04, room: .03, ocean: .07 }[want] || .03, gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(lv, t + 2); gn.connect(g.sfx); const src = [];
    if (want === 'hum') [60, 120, 180].forEach((f, i) => { const o = c.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; const og = c.createGain(); og.gain.value = [1, .5, .25][i]; o.connect(og).connect(gn); o.start(t); src.push(o); });
    else { const s = c.createBufferSource(); s.buffer = g.noise; s.loop = true; const bp = c.createBiquadFilter(); bp.type = want === 'ocean' ? 'lowpass' : 'bandpass'; bp.frequency.value = { wind: 520, room: 260, ocean: 180 }[want] || 400; bp.Q.value = .6; s.connect(bp).connect(gn); s.start(t); src.push(s); }
    g.drones[want] = { g: gn, src, lv };
  }
}
function kickAt(g, t, v) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + .2); env(gn, t, .004, v, .38); o.connect(gn).connect(g.music); o.start(t); o.stop(t + .45); }
function pluckAt(g, t, f, v) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(), lp = c.createBiquadFilter(); o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + .35); env(gn, t, .004, v, .6); o.connect(lp).connect(gn); gn.connect(g.music); gn.connect(g.delayIn); o.start(t); o.stop(t + .7); }
function hatAt(g, t, v) { const s = nsrc(g, t, .06), hp = g.ctx.createBiquadFilter(), gn = g.ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 8000; env(gn, t, .002, v, .045); s.connect(hp).connect(gn).connect(g.music); }
function seqStep(g, t, st, m) {
  const s = st % 16, L = m.lvl, notes = m.chord;
  if (L >= 2 && (s === 0 || s === 8)) kickAt(g, t, L >= 3 ? .5 : .35);
  if (L >= 2 && s % 2 === 0) { const pat = [0, 2, 1, 3, 2, 1, 3, 2]; pluckAt(g, t, mtof(notes[1 + pat[(s / 2) % 8] % (notes.length - 1)] + 12), L >= 3 ? .055 : .042); }
  if (L >= 3 && s % 4 === 2) hatAt(g, t, .028);
  if (L === 1 && s === 0 && (st >> 4) % 2 === 0) pluckAt(g, t, mtof(notes[notes.length - 1] + 12), .04);
}
const FX = {
  boom(g, t, v = 1) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.4); env(gn, t, .01, .8 * v, 2); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + 2.2); const s = nsrc(g, t, 1.1), lp = c.createBiquadFilter(), ng = c.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(100, t + 1); env(ng, t, .005, .25 * v, 1); s.connect(lp).connect(ng).connect(g.sfx); },
  sub(g, t, v = 1) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.setValueAtTime(52, t); o.frequency.exponentialRampToValueAtTime(34, t + .8); env(gn, t, .008, .7 * v, 1.1); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + 1.3); },
  riser(g, t, d = 1, v = 1) { const c = g.ctx, s = nsrc(g, t, d), bp = c.createBiquadFilter(), gn = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 2.5; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(4500, t + d); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.18 * v, t + d * .92); gn.gain.linearRampToValueAtTime(0, t + d); s.connect(bp).connect(gn).connect(g.sfx); },
  whoosh(g, t, d = .9, v = 1) { const c = g.ctx, s = nsrc(g, t, d), bp = c.createBiquadFilter(), gn = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2200, t + d * .5); bp.frequency.exponentialRampToValueAtTime(500, t + d); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.16 * v, t + d * .45); gn.gain.linearRampToValueAtTime(0, t + d); s.connect(bp).connect(gn).connect(g.sfx); },
  spark(g, t0, v = 1) { const c = g.ctx; const sn = nsrc(g, t0, .02), hp0 = c.createBiquadFilter(), g0 = c.createGain(); hp0.type = 'highpass'; hp0.frequency.value = 900; env(g0, t0, .0005, .5 * v, .018); sn.connect(hp0).connect(g0).connect(g.sfx); for (let k = 0; k < 5 + rnd() * 4; k++) { const t = t0 + rnd() * .1, s = nsrc(g, t, .03), hp = c.createBiquadFilter(), gn = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 1500 + rnd() * 3500; env(gn, t, .001, (.2 + rnd() * .3) * v, .02 + rnd() * .04); s.connect(hp).connect(gn).connect(g.sfx); } },
  click(g, t, v = 1) { const c = g.ctx, s = nsrc(g, t, .03), bp = c.createBiquadFilter(), gn = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 3; env(gn, t, .0008, .5 * v, .02); s.connect(bp).connect(gn).connect(g.sfx); const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(120, t + .04); env(og, t, .001, .25 * v, .05); o.connect(og).connect(g.sfx); o.start(t); o.stop(t + .08); },
  clack(g, t, v = 1) { FX.click(g, t, v * .9); const c = g.ctx, o = c.createOscillator(), og = c.createGain(); o.type = 'square'; o.frequency.value = 1900; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 8; env(og, t, .0005, .12 * v, .05); o.connect(bp).connect(og).connect(g.sfx); o.start(t); o.stop(t + .08); },
  relay(g, t, v = 1) { FX.click(g, t, v * .6); FX.click(g, t + .012, v * .35); },
  morse(g, t, pattern = '...', f = 700, unit = .09, v = .25) { let x = t; for (const ch of pattern) { if (ch === ' ') { x += unit * 3; continue; } const d = ch === '-' ? unit * 3 : unit; FX.beep(g, x, f, d, v); x += d + unit; } },
  beep(g, t, f = 760, d = .14, v = .26) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.value = f; gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v, t + .008); gn.gain.setValueAtTime(v, t + d); gn.gain.linearRampToValueAtTime(0, t + d + .015); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + d + .05); },
  blip(g, t, f = 1200, v = .12) { if (t - g.lastBlip < .05) return; g.lastBlip = t; const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.4, t + .05); env(gn, t, .003, v, .08); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + .14); },
  tick(g, t, v = 1) { const c = g.ctx, o = c.createOscillator(), gn = c.createGain(); o.frequency.value = 3200; env(gn, t, .0005, .05 * v, .012); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + .03); },
  chime(g, t, f = 880, v = .14) { const c = g.ctx;[1, 2.01, 3.02].forEach((h, i) => { const o = c.createOscillator(), gn = c.createGain(); o.frequency.value = f * h; env(gn, t, .005, v / (i + 1), 1.4 / (i + 1)); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + 1.6); }); },
  ding(g, t, v = 1) { FX.chime(g, t, 1318.5, .12 * v); FX.chime(g, t + .11, 1760, .1 * v); },
  tap(g, t, v = 1) { const c = g.ctx, s = nsrc(g, t, .02), bp = c.createBiquadFilter(), gn = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 2; env(gn, t, .0005, .09 * v, .015); s.connect(bp).connect(gn).connect(g.sfx); },
  swoosh(g, t, v = 1) { FX.whoosh(g, t, .5, v * .8); },
  glitch(g, t0, v = 1) { const c = g.ctx; for (let k = 0; k < 9; k++) { const t = t0 + k * .035 + rnd() * .02, o = c.createOscillator(), gn = c.createGain(); o.type = 'square'; o.frequency.value = 80 + rnd() * 1400; env(gn, t, .001, .1 * v, .03); o.connect(gn).connect(g.sfx); o.start(t); o.stop(t + .06); } FX.spark(g, t0, v); },
};
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
