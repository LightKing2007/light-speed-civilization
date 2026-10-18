// 导出整片视频（可断点续渲）：node tools/render.mjs [--scale 1.5] [--only 03,04] [--fps 30] [--crf 15]
// 每章一个分段 _render/seg_NN.mp4（帧直接经管道送入 ffmpeg，不落地成图片），最后拼接为 _render/video.mp4。
import fs from 'node:fs'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { openFilm } from './browser.mjs';
import { ROOT } from './build.mjs';
const A = process.argv.slice(2), arg = (k, d = null) => { const i = A.indexOf('--' + k); return i < 0 ? d : A[i + 1]; };
const FPS = +arg('fps', 30), CRF = arg('crf', '15'), scale = +arg('scale', 1.5), only = arg('only') ? arg('only').split(',') : null;
const TAG = only ? 'preview_' + only.join('-') : 'full';
const OUT = path.join(ROOT, '_render', TAG); fs.mkdirSync(OUT, { recursive: true });
const F = await openFilm({ only, scale }); const { page, film } = F;
console.log(`TOTAL ${film.TOTAL}s · ${Math.round(film.TOTAL * FPS)} frames · scale ${scale}`);
const t0 = Date.now(); let done = 0;
for (const c of film.chapters) {
  const seg = path.join(OUT, `seg_${c.id}.mp4`), ok = seg + '.ok';
  if (fs.existsSync(ok)) { console.log(`seg ${c.id} exists, skip`); continue; }
  const f0 = Math.round(c.start * FPS), f1 = Math.round((c.start + c.dur) * FPS);
  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-tune', 'film', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done$ = new Promise((res, rej) => ff.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg ' + code))));
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.renderFrame(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    done++; if (f % 150 === 0) console.log(`  ch ${c.id} frame ${f}/${f1} · ${((Date.now() - t0) / 1000).toFixed(0)} s · ${(done / ((Date.now() - t0) / 1000)).toFixed(1)} fps`);
  }
  ff.stdin.end(); await done$; fs.writeFileSync(ok, String(f1 - f0)); console.log(`seg ${c.id} done`);
}
if (F.log.length) console.log('CONSOLE:\n  ' + [...new Set(F.log)].slice(0, 30).join('\n  '));
await F.close();
{
  const list = path.join(OUT, 'list.txt'); fs.writeFileSync(list, film.chapters.map(c => `file 'seg_${c.id}.mp4'`).join('\n'));
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(OUT, 'video.mp4')], { stdio: 'inherit' });
  console.log('video:', path.join(OUT, 'video.mp4'));
}
