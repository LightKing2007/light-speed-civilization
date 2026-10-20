/* 原创程序化电子纪录片配乐。装饰性转场静音，现场动作保留干燥短音。
 * 所有噪声偏移由事件时间决定，离线导出不依赖随机调用顺序。 */
export const SIX = 60 / 112 / 4;
const mtof = n => 440 * 2 ** ((n - 69) / 12);
const levels = [2, 1, 2, 2, 1, 2, 3, 2, 3, 2, 3, 2, 3, 3, 1, 2];
const roots = [38, 38, 41, 43, 38, 38, 46, 43, 38, 46, 43, 38, 41, 43, 46, 38];
export const MUSIC = Object.fromEntries(levels.map((lvl, i) => [String(i).padStart(2, '0'), {
  chord: [roots[i], roots[i] + 7, roots[i] + 12, roots[i] + 15], lvl,
  drone: i === 5 ? 'hum' : null,
}]));
export const DEF = MUSIC['00'];
const envelope = (gain, t, attack, peak, decay) => {
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(.00001, t + attack + decay);
};
function tone(g, t, f, peak, decay, { type = 'sine', end = f, bus = g.music, cutoff = 1800, attack = .003 } = {}) {
  const o = g.ctx.createOscillator(), a = g.ctx.createGain(), lp = g.ctx.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(end, t + Math.min(decay, .09));
  lp.type = 'lowpass'; lp.frequency.value = cutoff;
  envelope(a, t, attack, peak, decay); o.connect(lp).connect(a).connect(bus);
  o.start(t); o.stop(t + attack + decay + .03);
}
function noise(g, t, peak, decay, frequency, q = .6, bus = g.music) {
  const s = g.ctx.createBufferSource(), bp = g.ctx.createBiquadFilter(), a = g.ctx.createGain();
  s.buffer = g.noise; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = frequency; bp.Q.value = q;
  envelope(a, t, .001, peak, decay); s.connect(bp).connect(a).connect(bus);
  s.start(t, ((Math.sin(t * 731.3) + 1) * .7)); s.stop(t + decay + .02);
}
export function padAt(g, t, m) {
  if (g.pad) {
    const old = g.pad; old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.lv, t);
    old.g.gain.linearRampToValueAtTime(0, t + .8); old.oscs.forEach(o => o.stop(t + .85));
  }
  const a = g.ctx.createGain(), lv = .065, oscs = [];
  a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(lv, t + 1.1); a.connect(g.padF);
  for (const n of m.chord.slice(1)) for (const detune of [-3, 3]) {
    const o = g.ctx.createOscillator(), v = g.ctx.createGain();
    o.type = 'triangle'; o.frequency.value = mtof(n); o.detune.value = detune; v.gain.value = .16;
    o.connect(v).connect(a); o.start(t); oscs.push(o);
  }
  g.pad = { g: a, oscs, lv };
}
export function droneAt(g, t, want) {
  for (const [key, d] of Object.entries(g.drones)) if (key !== want) {
    d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(.008, t);
    d.g.gain.linearRampToValueAtTime(0, t + .3); d.o.stop(t + .35); delete g.drones[key];
  }
  if (want === 'hum' && !g.drones[want]) {
    const o = g.ctx.createOscillator(), a = g.ctx.createGain();
    o.frequency.value = 60; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(.008, t + .5);
    o.connect(a).connect(g.sfx); o.start(t); g.drones[want] = { g: a, o, src: [o] };
  }
}
export function seqStep(g, t, st, m) {
  const s = st % 16, bar = Math.floor(st / 16), phrase = bar % 8, root = m.chord[0];
  // 每八小节留出一小段空间，避免整片连续堆满鼓点。
  const breath = phrase === 7 && s >= 8;
  const strength = m.lvl === 1 ? .64 : m.lvl === 2 ? .84 : 1;
  if (!breath && (s === 0 || s === 8 || (m.lvl === 3 && s === 11))) {
    tone(g, t, 125, .68 * strength, .19, { end: 47, cutoff: 450 });
    noise(g, t, .025, .014, 1800);
  }
  if (!breath && (s === 4 || s === 12)) {
    noise(g, t, .16 * strength, .085, 1700, .65);
    tone(g, t, 178, .065 * strength, .065, { end: 145, cutoff: 650 });
  }
  if (!breath && s % (m.lvl === 1 ? 4 : 2) === 2 % (m.lvl === 1 ? 4 : 2)) {
    noise(g, t, (s % 4 === 2 ? .065 : .035) * strength, .027, 6800, .7);
  }
  if (!breath && [0, 3, 6, 8, 10, 14].includes(s)) {
    const n = root + (s === 14 && phrase % 2 ? 7 : 0);
    tone(g, t, mtof(n), .21 * strength, s === 0 ? .2 : .13, { type: 'sawtooth', cutoff: 420 });
    tone(g, t, mtof(n - 12), .12 * strength, .15, { cutoff: 200 });
  }
  // 中低音序列替代旧版高音铃铛；四小节换一次轮廓。
  if (m.lvl >= 2 && s % 2 === 0 && !breath) {
    const pattern = phrase < 4 ? [0, 7, 12, 7, 3, 7, 10, 7] : [0, 12, 7, 15, 12, 7, 3, 7];
    const f = mtof(root + 12 + pattern[s / 2]);
    tone(g, t, f, .038, .13, { type: 'triangle', cutoff: 1200, attack: .006 });
    tone(g, t, f, .023, .13, { type: 'triangle', cutoff: 1000, bus: g.delayIn, attack: .006 });
  }
  if (m.lvl === 3 && phrase === 3 && [13, 15].includes(s)) noise(g, t, .045, .04, 2200);
}
const silent = () => {};
export const FX = {
  // 无实际声源的电波、光束、标注和转场不再附加游戏提示声。
  boom: silent, sub: silent, riser: silent, whoosh: silent, swoosh: silent,
  blip: silent, chime: silent,
  click(g, t, v = 1) {
    noise(g, t, .13 * v, .017, 1900, 1.1, g.sfx);
    tone(g, t, 240, .065 * v, .025, { bus: g.sfx, cutoff: 700 });
  },
  clack(g, t, v = 1) { FX.click(g, t, v); noise(g, t + .006, .08 * v, .024, 950, 1.6, g.sfx); },
  relay(g, t, v = 1) { FX.click(g, t, v * .7); FX.click(g, t + .018, v * .4); },
  tap(g, t, v = 1) { noise(g, t, .055 * v, .012, 1100, 1, g.sfx); },
  tick(g, t, v = 1) { noise(g, t, .04 * v, .009, 2300, 1.2, g.sfx); },
  spark(g, t, v = 1) {
    noise(g, t, .18 * v, .018, 3200, .6, g.sfx);
    noise(g, t + .009, .07 * v, .012, 1800, .8, g.sfx);
  },
  beep(g, t, f = 760, d = .14, v = .26) {
    const o = g.ctx.createOscillator(), a = g.ctx.createGain(); o.frequency.value = f;
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v * .36, t + .005);
    a.gain.setValueAtTime(v * .36, t + Math.max(.006, d)); a.gain.linearRampToValueAtTime(0, t + d + .015);
    o.connect(a).connect(g.sfx); o.start(t); o.stop(t + d + .025);
  },
  morse(g, t, pattern = '...', f = 700, unit = .09, v = .25) {
    let at = t; for (const c of pattern) { if (c === ' ') { at += unit * 3; continue; }
      const d = c === '-' ? unit * 3 : unit; FX.beep(g, at, f, d, v); at += d + unit;
    }
  },
  ding(g, t, v = 1) { tone(g, t, 620, .045 * v, .12, { bus: g.sfx, cutoff: 1100, attack: .008 }); },
  glitch(g, t, v = 1) { noise(g, t, .09 * v, .05, 850, .8, g.sfx); FX.relay(g, t + .035, v * .5); },
};
