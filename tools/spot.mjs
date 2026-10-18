// 截图检查：node tools/spot.mjs --only 05 [--every 1.5 | --times 1,4.2,9] [--out dir] [--scale 1] [--debug] [--sheet]
// 时间为所选章节拼接后的全局秒（只选一章时就是章内秒）。输出 JPG + 可选拼图 sheet.jpg，并打印控制台报错。
import fs from 'node:fs'; import path from 'node:path';
import { openFilm } from './browser.mjs';
import { ROOT } from './build.mjs';
const A = process.argv.slice(2), arg = (k, d = null) => { const i = A.indexOf('--' + k); return i < 0 ? d : (A[i + 1] && !A[i + 1].startsWith('--') ? A[i + 1] : true); };
const only = arg('only') ? String(arg('only')).split(',') : null;
const out = path.resolve(arg('out', path.join(ROOT, '_shots', only ? only.join('_') : 'all')));
fs.mkdirSync(out, { recursive: true });
const t0 = Date.now();
const F = await openFilm({ only, scale: +arg('scale', 1), debug: !!arg('debug') });
const { page, film } = F;
let times = arg('times') ? String(arg('times')).split(',').map(Number) : null;
if (!times) { const ev = +arg('every', 2); times = []; for (let t = .5; t < film.TOTAL; t += ev) times.push(+t.toFixed(2)); }
console.log(`TOTAL ${film.TOTAL.toFixed(2)}s · chapters ${film.chapters.map(c => c.id + '@' + c.start).join(' ')} · boot ${((Date.now() - t0) / 1000).toFixed(1)}s`);
const files = [];
for (const t of times) {
  const r0 = Date.now(); await page.evaluate(t => window.renderFrame(t), t); const rt = Date.now() - r0;
  const f = path.join(out, `t${t.toFixed(2).padStart(7, '0')}.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 86 }); files.push(f);
  if (times.length < 40) console.log(`  t=${t}  render ${rt} ms`);
}
if (arg('sheet')) {
  const cols = 4, tw = 480, th = 270;
  const html = `<html><body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:4px;font:13px monospace;color:#fff">` + files.map(f => `<div style="position:relative"><img src="data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}" style="width:${tw}px;height:${th}px;display:block"><span style="position:absolute;left:4px;top:2px;background:#000b;padding:1px 5px">${path.basename(f, '.jpg')}</span></div>`).join('') + '</body></html>';
  await page.setViewportSize({ width: cols * (tw + 4), height: Math.ceil(files.length / cols) * (th + 4) });
  await page.setContent(html); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, 'sheet.jpg'), type: 'jpeg', quality: 85, fullPage: true });
  console.log('sheet:', path.join(out, 'sheet.jpg'));
}
console.log(`frames: ${files.length} → ${out}`);
if (film.failed && film.failed.length) console.log('FAILED ASSETS:\n  ' + film.failed.join('\n  '));
const uniq = [...new Set(F.log)]; console.log(uniq.length ? 'CONSOLE:\n  ' + uniq.slice(0, 40).join('\n  ') : 'console: clean');
await F.close();
