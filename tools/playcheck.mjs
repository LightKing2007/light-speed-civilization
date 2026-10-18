// 实时播放检查（真实浏览器 + 真实 AudioContext）：node tools/playcheck.mjs [--only 03]
// 打开实时播放器、点播放，然后人为制造主线程卡顿、暂停、跳转，检查：
//   1. 时钟以音频为基准；2. 卡顿后的下一帧直接追上音频时间（不再每帧最多 +0.05 s）；
//   3. 暂停期间画面时间不动，恢复后继续；4. 跳转后画面时间与音频批次同时更新，进度条读数一致。
// 只检查时间关系；声音听起来是否自然仍需人工播放确认。
import { chromium } from 'playwright-core';
import { serve } from './server.mjs';
import { build } from './build.mjs';
import { chromePath, chromeArgs, onInterrupt } from './browser.mjs';
const A = process.argv.slice(2), i = A.indexOf('--only'), only = i >= 0 ? A[i + 1].split(',') : ['03'];
const b = await build({ dev: only }), S = await serve(0);
const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: [...chromeArgs(), '--autoplay-policy=no-user-gesture-required'] });
const close = async () => { await browser.close(); S.close(); };
onInterrupt(close);
const results = []; const check = (name, ok, info) => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${info ? ' · ' + info : ''}`); };
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${S.port}/${b.html}`);
  await page.waitForFunction(() => window.FILM && window.FILM.ready && window.PLAYER, null, { timeout: 240000 });
  await page.evaluate(() => document.getElementById('bGo').click());
  await page.waitForFunction(() => AU.running(), null, { timeout: 10000 }).catch(() => { });
  const st = () => page.evaluate(() => ({ T: PLAYER.transport.clock.time(), src: PLAYER.transport.clock.source, playing: PLAYER.transport.playing, au: AU.diag(), shown: document.getElementById('tNow').textContent }));
  const frames = n => page.evaluate(n => new Promise(r => { let k = 0; const f = () => ++k >= n ? r() : requestAnimationFrame(f); requestAnimationFrame(f); }), n);
  await page.waitForTimeout(1500);
  let s = await st();
  check('音频可用且时钟以音频为基准', s.au && s.au.state === 'running' && s.src === 'audio', `source=${s.src} audio=${s.au && s.au.state}`);

  // 卡顿：主线程忙等 1.2 s；比较前后的影片时间与 AudioContext 时间增量
  const stall = await page.evaluate(() => new Promise(r => requestAnimationFrame(() => {
    const t0 = PLAYER.transport.clock.time(), c0 = AU.diag().currentTime, w = performance.now(); while (performance.now() - w < 1200) { }
    requestAnimationFrame(() => r({ dT: PLAYER.transport.clock.time() - t0, dC: AU.diag().currentTime - c0 }));
  })));
  check('卡顿 1.2 s 后画面一帧追上音频', Math.abs(stall.dT - stall.dC) < .08 && stall.dT > 1.1, `画面 +${stall.dT.toFixed(3)} s · 音频 +${stall.dC.toFixed(3)} s`);

  // 连续卡顿：10 次 300 ms，统计漂移
  const drift = await page.evaluate(async () => {
    const t0 = PLAYER.transport.clock.time(), c0 = AU.diag().currentTime;
    for (let k = 0; k < 10; k++) { await new Promise(r => requestAnimationFrame(r)); const w = performance.now(); while (performance.now() - w < 300) { } }
    await new Promise(r => requestAnimationFrame(r));
    return (PLAYER.transport.clock.time() - t0) - (AU.diag().currentTime - c0);
  });
  check('反复卡顿不累积漂移', Math.abs(drift) < .08, `漂移 ${(drift * 1000).toFixed(1)} ms`);

  // 暂停
  await page.keyboard.press('Space'); await frames(2); const p0 = await st(); await page.waitForTimeout(1000); const p1 = await st();
  check('暂停期间画面时间不动', !p0.playing && Math.abs(p1.T - p0.T) < 1e-6, `${p0.T.toFixed(3)} → ${p1.T.toFixed(3)}`);
  await page.keyboard.press('Space'); await page.waitForTimeout(800); const p2 = await st();
  check('恢复后从暂停位置继续', p2.playing && p2.T > p1.T + .5 && p2.T < p1.T + 1.2, `${p1.T.toFixed(3)} → ${p2.T.toFixed(3)}`);

  // 跳转（← / → 各 10 秒）：音频开启新批次，画面时间同时到位
  const sk = await page.evaluate(() => {
    const t0 = PLAYER.transport.clock.time(), b0 = AU.diag().batches;
    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    return { t0, t1: PLAYER.transport.clock.time(), b0, b1: AU.diag().batches };
  });
  check('跳转后画面时间立即到达新位置', Math.abs(sk.t1 - Math.max(0, sk.t0 - 10)) < .05, `${sk.t0.toFixed(3)} → ${sk.t1.toFixed(3)}`);
  check('跳转时旧音频批次被替换', sk.b1 === sk.b0 + 1, `批次 ${sk.b0} → ${sk.b1}`);
  const k1 = await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r({ T: PLAYER.transport.clock.time(), shown: document.getElementById('tNow').textContent }))));
  const [mm, ss] = k1.shown.split(' / ')[0].split(':').map(Number);
  check('进度读数与画面时间一致', Math.abs(mm * 60 + ss - k1.T) < 1.05, `${k1.shown} · T=${k1.T.toFixed(2)}`);
  check('页面无报错', !errs.length, errs.slice(0, 3).join(' | '));
} catch (e) { check('检查过程出错', false, e.message); }
await close();
const bad = results.filter(r => !r.ok).length; console.log(bad ? `\n${bad} 项未通过` : '\n全部通过'); process.exit(bad ? 1 : 0);
