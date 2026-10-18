// 性能测量（先测量，再决定是否改加载结构）：node tools/perf.mjs [--only 03,04] [--samples 3] [--seeks 40] [--scale 1]
// 测：首次可播放时间、各章单帧渲染耗时（首帧含着色器编译 / 稳定后）、转场帧、GPU 资源数量、
//     暂停时是否仍在渲染、反复跳转后资源与内存是否增长。结果打印成表，并写入 _shots/perf.json。
// 注意：数值取决于机器。没有 GPU 的 Linux（软件渲染）会慢一两个数量级，只能看相对大小；结论以目标机器（Mac + Chrome）上的结果为准。
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { openFilm, chromePath, chromeArgs, onInterrupt } from './browser.mjs';
import { ROOT } from './build.mjs';
import { serve } from './server.mjs';
const A = process.argv.slice(2), arg = (k, d = null) => { const i = A.indexOf('--' + k); return i < 0 ? d : A[i + 1]; };
const only = arg('only') ? arg('only').split(',') : null, N = +arg('samples', 3), SEEKS = +arg('seeks', 40), scale = +arg('scale', 1);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const ms = x => x.toFixed(0).padStart(6) + ' ms';

const t0 = Date.now();
const F = await openFilm({ only, scale });
onInterrupt(() => F.close());
const { page, film } = F, out = { date: new Date().toISOString(), browser: F.browserVersion, platform: process.platform, scale, only, chapters: [] };
out.boot = { wallMs: Date.now() - t0, pageMs: await page.evaluate(() => FILM.bootMs) };
const frame = t => page.evaluate(t => { const a = performance.now(); window.renderFrame(t); document.getElementById('gl').getContext('webgl2').finish(); return performance.now() - a; }, t);
console.log(`首次可播放：页面打开 → 全部章节构建完成 ${out.boot.pageMs} ms（含构建与启动浏览器共 ${out.boot.wallMs} ms）`);
console.log('\n章   首帧（含编译）  稳定中位数   最慢     章首转场帧');
for (const c of film.chapters) {
  const first = await frame(c.start + c.dur * .5 / N), times = [];
  for (let k = 0; k < N; k++) times.push(await frame(c.start + c.dur * (k + .5) / N));
  const edge = c.start > 0 ? await frame(c.start + .3) : null;
  const r = { id: c.id, status: c.status, firstMs: first, medianMs: med(times), maxMs: Math.max(...times), transitionMs: edge };
  out.chapters.push(r);
  console.log(`${c.id}  ${ms(first)}   ${ms(r.medianMs)}  ${ms(r.maxMs)}   ${edge == null ? '     —' : ms(edge)}${c.status === 'placeholder' ? '   （占位）' : ''}`);
}
// 同一组跳转走两遍：第一遍会把还没画过的镜头第一次上传到 GPU（正常增长）；第二遍再增长才说明有泄漏
const seekPass = async () => { for (let k = 0; k < SEEKS; k++) await frame(((k * 7919) % 1000) / 1000 * film.TOTAL); return page.evaluate(() => FILM.perf()); };
const before = await page.evaluate(() => FILM.perf()), mid = await seekPass(), after = await seekPass();
out.resources = { before, firstPass: mid, secondPass: after };
const d = (a, b) => { const n = b - a; return (n >= 0 ? '+' : '') + n; };
console.log(`\nGPU 资源：几何体 ${before.memory.geometries} · 贴图 ${before.memory.textures} · 着色器程序 ${before.programs}`);
console.log(`资源加载：实际加载 ${before.assets.loads} 次 · 缓存命中 ${before.assets.hits} 次 · 失败 ${before.assets.failed}`);
console.log(`跳转 ${SEEKS} 次（第一遍，首次上传）：几何体 ${d(before.memory.geometries, mid.memory.geometries)} · 贴图 ${d(before.memory.textures, mid.memory.textures)} · 着色器 ${d(before.programs, mid.programs)}`);
console.log(`同样再跳 ${SEEKS} 次（第二遍，应接近 0）：几何体 ${d(mid.memory.geometries, after.memory.geometries)} · 贴图 ${d(mid.memory.textures, after.memory.textures)} · 着色器 ${d(mid.programs, after.programs)}` + (mid.heap ? ` · JS 堆 ${((after.heap - mid.heap) / 1048576).toFixed(1)} MB` : ''));
await F.close();

// 暂停时是否仍在渲染：打开实时播放器，播放 1 秒后暂停，数 2 秒内渲染了多少帧
{
  const b = await (await import('./build.mjs')).build(only ? { dev: only } : {}), S = await serve(0);
  const br = await chromium.launch({ executablePath: chromePath(), headless: true, args: [...chromeArgs(), '--autoplay-policy=no-user-gesture-required'] });
  try {
    const p = await br.newPage({ viewport: { width: 960, height: 540 } });
    await p.goto(`http://127.0.0.1:${S.port}/${b.html}`);
    await p.waitForFunction(() => window.FILM && window.FILM.ready && window.PLAYER, null, { timeout: 240000 });
    await p.evaluate(() => document.getElementById('bGo').click()); await p.waitForTimeout(1000);
    const r = await p.evaluate(async () => {
      const f0 = FILM.perf().frames, w0 = performance.now(); await new Promise(r => setTimeout(r, 2000)); const play = (FILM.perf().frames - f0) / ((performance.now() - w0) / 1000);
      PLAYER.toggle(); const f1 = FILM.perf().frames, w1 = performance.now(); await new Promise(r => setTimeout(r, 2000)); const paused = (FILM.perf().frames - f1) / ((performance.now() - w1) / 1000);
      return { play, paused };
    });
    out.paused = r;
    console.log(`\n实时播放：播放中 ${r.play.toFixed(1)} 帧/秒 · 暂停后 ${r.paused.toFixed(1)} 帧/秒${r.paused > Math.max(.1, r.play * .3) ? '（暂停时仍在持续渲染）' : ''}`);
  } finally { await br.close(); S.close(); }
}
fs.mkdirSync(path.join(ROOT, '_shots'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '_shots/perf.json'), JSON.stringify(out, null, 1));
console.log('\n→ _shots/perf.json');
