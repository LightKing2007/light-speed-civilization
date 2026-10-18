// 统一播放时钟：用可替换的假时钟模拟渲染卡顿、暂停、跳转、音频中断，检查画面时间始终等于音频正在播放的位置。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClock, makeScheduler, makeTransport } from '../src/engine/clock.js';

/** 假世界：wall = 真实流逝时间；假音频有自己的时钟（比系统时钟快 0.1%，模拟真实设备的时钟漂移），
    并独立记下「它认为自己正在播放的影片位置」= 最近一次 seek 的位置 + 之后音频时钟走过的时间。 */
function world({ audio = true, rate = 1.001, suspendDelay = 0 } = {}) {
  const w = { wall: 0 };
  const a = {
    state: 'suspended', ctx: 0, pos0: 0, ctx0: 0, seeks: [], pending: 0, ok: audio,
    available: () => a.ok, running: () => a.state === 'running', now: () => a.ctx,
    play() { a.state = 'running'; }, pause() { a.pending = suspendDelay; if (!suspendDelay) a.state = 'suspended'; },
    seek(t) { a.seeks.push(t); a.pos0 = t; a.ctx0 = a.ctx; },
    filmPos: () => a.pos0 + (a.ctx - a.ctx0),
  };
  w.audio = a;
  w.advance = dt => {
    w.wall += dt;
    if (a.state === 'running') { const run = a.pending > 0 ? Math.min(dt, a.pending) : dt; a.ctx += run * rate; if (a.pending > 0) { a.pending -= run; if (a.pending <= 1e-12) { a.pending = 0; a.state = 'suspended'; } } }
  };
  w.now = () => w.wall;
  return w;
}
const near = (a, b, eps = 1e-9, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} vs ${b}`);

test('渲染卡顿：每一帧的画面时间都等于音频正在播放的位置（不会累积落后）', () => {
  const w = world(), tp = makeTransport({ audio: w.audio, now: w.now });
  tp.start(0);
  let maxErr = 0, frames = 0;
  for (let i = 0; i < 3000; i++) {
    w.advance(i % 40 === 39 ? .45 : 1 / 60);           // 每 40 帧卡住 0.45 秒
    const T = tp.frame(); frames++;
    maxErr = Math.max(maxErr, Math.abs(T - w.audio.filmPos()));
  }
  assert.ok(maxErr < 1e-9, '画面与音频偏差 ' + maxErr);
  assert.equal(tp.clock.source, 'audio');
  // 对照旧实现（每帧最多 +0.05 s 的累加器）：同样的卡顿下会落后几十秒
  let old = 0; for (let i = 0; i < frames; i++) old += Math.min(.05, i % 40 === 39 ? .45 : 1 / 60);
  assert.ok(w.audio.filmPos() - old > 25, '旧算法应明显落后（用于说明本测试能发现问题）');
});

test('暂停：画面冻结；恢复后从同一位置继续，并且不需要重新排队已调度的声音', () => {
  const w = world(), tp = makeTransport({ audio: w.audio, now: w.now });
  tp.start(5);
  for (let i = 0; i < 180; i++) { w.advance(1 / 60); tp.frame(); }
  tp.pause();
  const held = tp.frame();
  for (let i = 0; i < 300; i++) { w.advance(1 / 60); near(tp.frame(), held, 0, '暂停期间画面不动'); }
  const seeks = w.audio.seeks.length;
  tp.play();
  for (let i = 0; i < 120; i++) { w.advance(1 / 60); near(tp.frame(), w.audio.filmPos(), 1e-9, '恢复后与音频一致'); }
  assert.equal(w.audio.seeks.length, seeks, '恢复播放不应让音频重新排队');
  near(held, 5 + 3 * 1.001, 1e-6);
});

test('暂停时音频晚几毫秒才真正停下：恢复后画面跟上声音实际停下的位置', () => {
  const w = world({ suspendDelay: .012 }), tp = makeTransport({ audio: w.audio, now: w.now });
  tp.start(0);
  for (let i = 0; i < 60; i++) { w.advance(1 / 60); tp.frame(); }
  tp.pause(); for (let i = 0; i < 60; i++) { w.advance(1 / 60); tp.frame(); }
  tp.play(); w.advance(1 / 60);
  near(tp.frame(), w.audio.filmPos(), 1e-9);
});

test('跳转：画面与音频同时到达新位置，之后保持一致', () => {
  const w = world(), tp = makeTransport({ audio: w.audio, now: w.now, total: 700 });
  tp.start(0);
  for (let i = 0; i < 600; i++) { w.advance(1 / 60); tp.frame(); }
  tp.seek(412.5);
  near(tp.frame(), 412.5, 0, '跳转后立即到位');
  assert.equal(w.audio.seeks.at(-1), 412.5, '音频收到同一个位置');
  for (let i = 0; i < 200; i++) { w.advance(i % 20 === 0 ? .3 : 1 / 60); near(tp.frame(), w.audio.filmPos(), 1e-9); }
  tp.seek(-5); near(tp.frame(), 0, 0, '越界被夹到 0');
  tp.seek(9999); near(tp.frame(), 700, 0, '越界被夹到片尾');
  // 暂停状态下拖动进度条
  tp.pause(); tp.seek(100); near(tp.frame(), 100, 0);
  w.advance(2); near(tp.frame(), 100, 0, '暂停中跳转后仍停在新位置');
  tp.play(); w.advance(.5); near(tp.frame(), w.audio.filmPos(), 1e-9);
});

test('没有音频：使用替代时钟，卡顿后直接追上真实时间', () => {
  const w = world({ audio: false }), tp = makeTransport({ audio: w.audio, now: w.now });
  tp.start(0);
  assert.equal(tp.clock.source, 'fallback');
  for (let i = 0; i < 500; i++) { w.advance(i % 25 === 0 ? .6 : 1 / 60); near(tp.frame(), w.wall, 1e-9); }
  const tp2 = makeTransport({ now: w.now }); tp2.start(10); const w0 = w.wall; w.advance(1.5); near(tp2.frame(), 10 + w.wall - w0, 1e-9, '完全不传 audio 也能播放');
});

test('音频中途停住：0.25 秒后改用替代时钟，画面继续；音频恢复后切回并按当前位置重新排队', () => {
  const w = world(), tp = makeTransport({ audio: w.audio, now: w.now });
  tp.start(0);
  for (let i = 0; i < 120; i++) { w.advance(1 / 60); tp.frame(); }
  w.audio.state = 'interrupted';                      // 例如系统音频设备被占用
  let prev = tp.frame(), maxStep = 0;
  for (let i = 0; i < 120; i++) { w.advance(1 / 60); const T = tp.frame(); maxStep = Math.max(maxStep, T - prev); assert.ok(T >= prev); prev = T; }
  assert.equal(tp.clock.source, 'fallback');
  assert.ok(prev > 2 + 1.5, '音频停住后画面仍在前进');
  w.audio.state = 'running';
  w.advance(1 / 60); const T = tp.frame();
  assert.equal(tp.clock.source, 'audio');
  near(w.audio.seeks.at(-1), T, 1e-9, '切回音频时按当前位置重新排队');
  assert.ok(T - prev < .02, '切换时间源时画面连续');
  for (let i = 0; i < 60; i++) { w.advance(1 / 60); near(tp.frame(), w.audio.filmPos(), 1e-9); }
});

test('开始时音频还没真正启动：画面等待片刻，不会抢跑', () => {
  const w = world(), tp = makeTransport({ audio: w.audio, now: w.now });
  w.audio.play = () => { };                           // resume() 尚未生效
  tp.start(0);
  for (let i = 0; i < 6; i++) { w.advance(1 / 60); near(tp.frame(), 0, 0); }
  w.audio.state = 'running';
  for (let i = 0; i < 60; i++) { w.advance(1 / 60); near(tp.frame(), w.audio.filmPos(), 1e-9); }
});

test('时钟源回退抖动时画面不倒退', () => {
  let src = 0; const c = makeClock({ source: () => src });
  c.seek(0); c.play(); src = 1; assert.equal(c.time(), 1); src = .995; assert.equal(c.time(), 1); src = 1.2; near(c.time(), 1.2);
  near(c.toSource(5), 5, 1e-12);
});

test('调度器：节拍不重复不遗漏；跳转后旧位置之前的音效不再响；卡顿迟到的音效被丢弃', () => {
  const steps = [], fired = [];
  const cues = [[1, 'a'], [2, 'b'], [2.05, 'c'], [5, 'd'], [9, 'e'], [9.5, 'f']];
  const s = makeScheduler({ step: .25, cues, ahead: .15, late: .12, onStep: (t, n) => steps.push([t, n]), onCue: (t, c) => fired.push([s.epoch, c[1]]) });
  s.seek(0);
  for (let now = 0; now < 3; now += 1 / 60) s.advance(now);
  const ts = steps.map(x => x[0]);
  assert.equal(new Set(ts).size, ts.length, '没有重复的节拍');
  ts.forEach((t, i) => near(t, i * .25, 1e-9, '节拍按 n·step 精确排布'));
  assert.deepEqual(fired, [[1, 'a'], [1, 'b'], [1, 'c']]);
  // 跳到 9.2：9 秒的 e 已过去不补响，9.5 的 f 正常
  s.seek(9.2); assert.equal(s.epoch, 2);
  for (let now = 9.2; now < 10; now += 1 / 60) s.advance(now);
  assert.deepEqual(fired.slice(3), [[2, 'f']]);
  assert.ok(steps.filter(x => x[0] > 3).every(x => x[0] >= 9.2), '跳转后不会补排跳过的节拍');
  // 主线程卡住：从 4.0 直接跳到 5.5 才调度，5 秒的 d 已迟到 0.5 秒 → 丢弃
  s.seek(4); s.advance(4); s.advance(5.5);
  assert.ok(!fired.some(f => f[1] === 'd'), '迟到太多的音效被丢弃');
});
