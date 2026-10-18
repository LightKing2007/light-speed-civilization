// 离线渲染整条配乐 + 音效：node tools/audio.mjs [--only 03,04] [--draft] → _render/<full|preview_xx>/audio.wav
// 与 render.mjs 相同的导出前检查（章节构建失败 / 素材失败 / 占位章节）；先写临时文件，完成后再替换。
import fs from 'node:fs'; import path from 'node:path';
import { openFilm, filmProblems, onInterrupt } from './browser.mjs';
import { ROOT } from './build.mjs';
const A = process.argv.slice(2), i = A.indexOf('--only'), only = i >= 0 ? A[i + 1].split(',') : null, draft = A.includes('--draft');
const OUT = path.join(ROOT, '_render', only ? 'preview_' + only.join('-') : 'full'); fs.mkdirSync(OUT, { recursive: true });
const dst = path.join(OUT, 'audio.wav'), tmp = dst + '.tmp';
let F = null; const cleanup = async () => { fs.rmSync(tmp, { force: true }); if (F) await F.close(); };
onInterrupt(cleanup);
try {
  F = await openFilm({ only, scale: .25, width: 640, height: 360, strict: true });
  const problems = filmProblems(F.film, { draft });
  if (problems.length) { console.error('✗ 配乐导出中止：影片未通过导出前检查\n  · ' + problems.join('\n  · ')); await cleanup(); process.exit(1); }
  const len = await F.page.evaluate(() => AU.offline(FILM.TOTAL, FILM.chapters, FILM.cues));
  const CH = 6 * 1024 * 1024, fd = fs.openSync(tmp, 'w');
  for (let k = 0; k * CH < len; k++) fs.writeSync(fd, Buffer.from(await F.page.evaluate(([k, c]) => AU.wavChunk(k, c), [k, CH]), 'base64'));
  fs.closeSync(fd);
  if (fs.statSync(tmp).size !== len) throw new Error(`audio.wav 大小不对：${fs.statSync(tmp).size}/${len}`);
  fs.renameSync(tmp, dst); console.log('audio.wav', len, 'bytes →', dst);
  await F.close(); F = null;
} catch (e) { console.error('✗ 配乐导出中止：' + (e && e.message || e)); await cleanup(); process.exit(1); }
