/* 统一播放时钟、音频前瞻调度与播放控制（纯逻辑：不碰 DOM / Web Audio，node 里可以用假时钟测试，见 test/clock.test.mjs）。

   makeClock：影片时间 = 时钟源 − 偏移
   - 时钟源是任意单调递增的秒数：音频可用时用 AudioContext 的输出时间（耳朵此刻听到的位置），否则用 performance.now()。
   - 画面、字幕、标注、音效调度都读同一个 clock.time()。渲染卡顿时，下一帧直接读到「声音已经走到的时间」，不会越拖越远。
   - follows = true 表示这个时钟源会随播放一起暂停（AudioContext 被 suspend），恢复时保持原偏移，已排队的声音仍然对得上。
   - toSource(t)：影片时间 t 对应的时钟源时刻；音频在这个 AudioContext 时间开始发声，就正好在画面到达 t 时被听到。

   makeScheduler：把 [已调度到的时间, now + ahead) 里的节拍步与音效逐个交给回调；seek() 开启新批次；迟到太多的音效直接丢弃。

   makeTransport：播放 / 暂停 / 跳转一次性同步时钟与音频；每帧 frame() 按音频状态选时钟源，返回本帧影片时间。 */
const perfNow = () => performance.now() / 1000;

export function makeClock({ source = perfNow, name = 'fallback', follows = false } = {}) {
  let src = source, srcName = name, fol = follows, off = src(), held = 0, last = 0, playing = false;
  const clock = {
    get playing() { return playing; },
    get source() { return srcName; },
    time() {
      if (!playing) return held;
      const t = src() - off;
      if (t < last) return last;          // 时钟源偶尔回退（音频输出时间戳抖动）时不让画面倒退
      last = t; return t;
    },
    /** 返回 true 表示偏移被重新对齐（音频需要按新位置重新排队） */
    play() {
      if (playing) return false;
      let moved = !fol;
      if (fol && Math.abs(src() - off - held) > .25) moved = true;   // 时钟源没有跟着暂停：放弃旧对应关系
      if (moved) off = src() - held;
      playing = true; last = held; return moved && fol;
    },
    pause() { if (!playing) return; held = clock.time(); playing = false; },
    seek(t) { off = src() - t; held = t; last = t; },
    /** 换时钟源，影片时间保持连续 */
    use(fn, nm, follows = false) { const t = clock.time(); src = fn; srcName = nm; fol = follows; off = src() - t; held = t; last = t; },
    toSource(t) { return t + off; },
  };
  return clock;
}

/** cues：按时间排序的 [t, name, args]；onStep(t, n) / onCue(t, cue) 收到的是影片时间 */
export function makeScheduler({ step, cues = [], ahead = .15, late = .12, onStep = () => { }, onCue = () => { } }) {
  let n = 0, next = 0, ci = 0, epoch = 0;
  const first = t => { let lo = 0, hi = cues.length; while (lo < hi) { const m = (lo + hi) >> 1; if (cues[m][0] < t) lo = m + 1; else hi = m; } return lo; };
  return {
    get epoch() { return epoch; },
    seek(t) { epoch++; n = Math.max(0, Math.ceil(t / step - 1e-9)); next = n * step; ci = first(t); },
    advance(now) {
      const end = now + ahead;
      while (next < end) { if (next >= now - .02) onStep(next, n); n++; next = n * step; }
      while (ci < cues.length && cues[ci][0] < end) { const c = cues[ci++]; if (c[0] >= now - late) onCue(c[0], c); }
    },
  };
}

/* audio 接口（AU 实现，测试里用假的）：available() running() now() play() pause() seek(t) */
export function makeTransport({ audio = null, now = perfNow, total = Infinity, stallLimit = .25 } = {}) {
  const clock = makeClock({ source: now, name: 'fallback' });
  let playing = false, stallAt = null;
  const clampT = t => Math.min(Math.max(t, 0), total);
  const tp = {
    clock,
    get playing() { return playing; },
    /** 开始播放：音频可用就以它为基准 */
    start(t = 0) {
      if (audio && audio.available()) clock.use(audio.now, 'audio', true);
      playing = false; clock.pause(); tp.seek(t); tp.play();
    },
    play() {
      if (playing) return; playing = true;
      if (audio) audio.play();
      if (clock.play() && audio) audio.seek(clock.time());
    },
    pause() { if (!playing) return; playing = false; clock.pause(); if (audio) audio.pause(); },
    seek(t) { t = clampT(t); clock.seek(t); if (audio) audio.seek(t); },
    /** 每帧调用一次。音频在播放中停住超过 stallLimit 秒 → 改用替代时钟；音频恢复 → 切回并重新排队 */
    frame() {
      if (playing && audio && audio.available()) {
        const ok = audio.running();
        if (ok) {
          stallAt = null;
          if (clock.source !== 'audio') { clock.use(audio.now, 'audio', true); audio.seek(clock.time()); }
        } else if (clock.source === 'audio') {
          const n = now(); if (stallAt == null) stallAt = n; else if (n - stallAt > stallLimit) { clock.use(now, 'fallback'); stallAt = null; }
        }
      }
      return clock.time();
    },
  };
  return tp;
}
