// 离线渲染整条配乐 + 音效：node tools/audio.mjs → _render/audio.wav
import fs from 'node:fs'; import path from 'node:path';
import { openFilm } from './browser.mjs';
import { ROOT } from './build.mjs';
const i = process.argv.indexOf('--only'); const only = i > 0 ? process.argv[i + 1].split(',') : null;
const OUT = path.join(ROOT, '_render', only ? 'preview_' + only.join('-') : 'full'); fs.mkdirSync(OUT, { recursive: true });
const F = await openFilm({ only, scale: .25, width: 640, height: 360 });
const len = await F.page.evaluate(() => AU.offline(FILM.TOTAL, FILM.chapters, FILM.cues));
const CH = 6 * 1024 * 1024, parts = [];
for (let i = 0; i * CH < len; i++) parts.push(Buffer.from(await F.page.evaluate(([i, c]) => AU.wavChunk(i, c), [i, CH]), 'base64'));
fs.writeFileSync(path.join(OUT, 'audio.wav'), Buffer.concat(parts)); console.log('audio.wav', len, 'bytes');
await F.close();
