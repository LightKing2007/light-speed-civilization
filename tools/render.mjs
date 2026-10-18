// 导出整片视频（正式导出，可断点续渲）：
//   node tools/render.mjs [--scale 1.5] [--only 03,04] [--fps 30] [--crf 15] [--fresh] [--draft]
//   --fresh  全部重渲（忽略已有分段）
//   --draft  允许占位章节（画面右上角带「占位」标记），用于看整片草稿；其他问题照样会中止导出
// 每章一个分段 _render/<full|preview_xx>/seg_NN.mp4（帧经管道直接送入 ffmpeg），最后拼接为 video.mp4。
// 续渲：分段旁的 seg_NN.json 记录了源码、素材、导出参数与依赖章节（见 tools/segments.mjs），全部一致且帧数完整才复用。
// 中止条件：章节构建失败、素材加载失败、占位章节（未加 --draft）、任意一帧镜头更新 / HUD 绘制出错、页面报错。
import fs from 'node:fs'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { openFilm, filmProblems, onInterrupt } from './browser.mjs';
import { ROOT } from './build.mjs';
import { makeRecord, checkSegment, countFrames, writeAtomic } from './segments.mjs';
const A = process.argv.slice(2), has = k => A.includes('--' + k), arg = (k, d = null) => { const i = A.indexOf('--' + k); return i < 0 ? d : A[i + 1]; };
const FPS = +arg('fps', 30), CRF = arg('crf', '15'), scale = +arg('scale', 1.5), only = arg('only') ? arg('only').split(',') : null;
const fresh = has('fresh'), draft = has('draft');
const W = 1920, H = 1080, QUALITY = 95, PRESET = 'slow', TUNE = 'film';
const TAG = only ? 'preview_' + only.join('-') : 'full';
const OUT = path.join(ROOT, '_render', TAG); fs.mkdirSync(OUT, { recursive: true });
const fail = (msg, extra = []) => { console.error('\n✗ 导出中止：' + msg); for (const x of extra) console.error('  · ' + x); };

let F = null, ff = null, tmpSeg = null;
const cleanup = async () => {
  if (ff && ff.exitCode == null) { try { ff.stdin.destroy(); ff.kill('SIGKILL'); } catch (e) { } }
  if (tmpSeg) fs.rmSync(tmpSeg, { force: true });
  if (F) await F.close();
};
onInterrupt(cleanup);

try {
  F = await openFilm({ only, scale, strict: true, width: W, height: H });
  const { page, film } = F;
  const problems = filmProblems(film, { draft });
  if (problems.length) { fail('影片未通过导出前检查', problems); await cleanup(); process.exit(1); }
  const params = { fps: FPS, crf: CRF, scale, width: W, height: H, quality: QUALITY, preset: PRESET, tune: TUNE, draft, browser: F.browserVersion };
  console.log(`TOTAL ${film.TOTAL}s · ${Math.round(film.TOTAL * FPS)} frames · scale ${scale}${draft ? ' · 草稿' : ''}${fresh ? ' · 全部重渲' : ''}`);
  const t0 = Date.now(); let done = 0, logN = F.log.length;
  for (let i = 0; i < film.chapters.length; i++) {
    const c = film.chapters[i];
    const seg = path.join(OUT, `seg_${c.id}.mp4`), recFile = path.join(OUT, `seg_${c.id}.json`);
    fs.rmSync(seg + '.ok', { force: true });            // 旧版的完成标记不再可信
    const rec = makeRecord({ root: ROOT, meta: F.build.meta, film, index: i, params, only });
    if (!fresh) {
      const chk = await checkSegment({ ffmpeg, seg, recFile, rec });
      if (chk.ok) { console.log(`seg ${c.id} 未变化，复用`); continue; }
      console.log(`seg ${c.id} 需要重渲：${chk.reasons.join('；')}`);
    }
    fs.rmSync(recFile, { force: true });                 // 先删记录：中途失败时不会让旧记录配上新内容
    tmpSeg = path.join(OUT, `seg_${c.id}.tmp.mp4`); fs.rmSync(tmpSeg, { force: true });
    ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-tune', TUNE, '-pix_fmt', 'yuv420p', '-r', String(FPS), tmpSeg], { stdio: ['pipe', 'inherit', 'inherit'] });
    let ffErr = null; ff.stdin.on('error', e => { ffErr = ffErr || e; });
    const ffDone = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg 退出码 ' + code))); });
    ffDone.catch(e => { ffErr = ffErr || e; });
    const segT0 = Date.now();
    for (let f = rec.f0; f < rec.f1; f++) {
      const t = f / FPS;
      try { await page.evaluate(t => window.renderFrame(t), t); }
      catch (e) { fail(`第 ${c.id} 章 · 帧 ${f}（全片 ${t.toFixed(3)} s）渲染出错`, [String(e.message || e).replace(/^.*?Error: /, '')]); await cleanup(); process.exit(1); }
      const bad = F.log.slice(logN).filter(l => /^(PAGEERROR|ERROR)/.test(l)); logN = F.log.length;
      if (bad.length) { fail(`第 ${c.id} 章 · 帧 ${f}（全片 ${t.toFixed(3)} s）页面报错`, bad.slice(0, 5)); await cleanup(); process.exit(1); }
      const buf = await page.screenshot({ type: 'jpeg', quality: QUALITY });
      if (ffErr) { fail(`编码器出错（第 ${c.id} 章 · 帧 ${f}）`, [String(ffErr.message || ffErr)]); await cleanup(); process.exit(1); }
      if (!ff.stdin.write(buf)) await new Promise(r => { const k = () => { ff.stdin.off('drain', k); ff.off('close', k); r(); }; ff.stdin.on('drain', k); ff.on('close', k); });
      done++; if (f % 150 === 0) console.log(`  ch ${c.id} frame ${f}/${rec.f1} · ${((Date.now() - t0) / 1000).toFixed(0)} s · ${(done / ((Date.now() - t0) / 1000)).toFixed(1)} fps`);
    }
    ff.stdin.end();
    try { await ffDone; } catch (e) { fail(`编码器出错（第 ${c.id} 章收尾）`, [String(e.message || e)]); await cleanup(); process.exit(1); }
    ff = null;
    const n = await countFrames(ffmpeg, tmpSeg);
    if (n !== rec.frames) { fail(`第 ${c.id} 章分段帧数不对：${n}/${rec.frames}`); await cleanup(); process.exit(1); }
    fs.renameSync(tmpSeg, seg); tmpSeg = null;
    writeAtomic(recFile, JSON.stringify({ ...rec, completed: new Date().toISOString(), seconds: Math.round((Date.now() - segT0) / 1000) }, null, 1));
    console.log(`seg ${c.id} done`);
  }
  const warn = [...new Set(F.log.filter(l => l.startsWith('WARNING')))];
  if (warn.length) console.log('CONSOLE WARNINGS:\n  ' + warn.slice(0, 30).join('\n  '));
  await F.close(); F = null;
  // 拼接：先写临时文件，帧数核对无误再替换 video.mp4
  const list = path.join(OUT, 'list.txt'); fs.writeFileSync(list, film.chapters.map(c => `file 'seg_${c.id}.mp4'`).join('\n'));
  const tmp = path.join(OUT, 'video.tmp.mp4'), dst = path.join(OUT, 'video.mp4');
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', tmp], { stdio: 'inherit' });
  const want = film.chapters.reduce((a, c) => a + Math.round((c.start + c.dur) * FPS) - Math.round(c.start * FPS), 0), got = await countFrames(ffmpeg, tmp);
  if (got !== want) { fs.rmSync(tmp, { force: true }); fail(`拼接后帧数不对：${got}/${want}`); process.exit(1); }
  fs.renameSync(tmp, dst);
  console.log('video:', dst, `(${got} frames)`);
} catch (e) {
  fail(String(e && e.message || e)); await cleanup(); process.exit(1);
}
