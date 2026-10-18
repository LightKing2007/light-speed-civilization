// 合成成片：_render/<full|preview_xx>/video.mp4 + audio.wav → 光速文明.mp4（响度标准化到 -16 LUFS）
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static'; import { ROOT } from './build.mjs';
const i = process.argv.indexOf('--only'); const only = i > 0 ? process.argv[i + 1].split(',') : null;
const OUT = path.join(ROOT, '_render', only ? 'preview_' + only.join('-') : 'full');
const DST = only ? path.join(OUT, '预览_' + only.join('-') + '.mp4') : path.join(ROOT, '光速文明.mp4'), TMP = DST.replace(/\.mp4$/, '.tmp.mp4');
const need = ['video.mp4', 'audio.wav'].map(f => path.join(OUT, f)).filter(f => !fs.existsSync(f));
if (need.length) { console.error('✗ 缺少：\n  ' + need.join('\n  ') + '\n先运行 npm run render 与 npm run audio（参数保持一致）。'); process.exit(1); }
try {
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', path.join(OUT, 'video.mp4'), '-i', path.join(OUT, 'audio.wav'), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-shortest', '-movflags', '+faststart', '-f', 'mp4', TMP], { stdio: 'inherit' });
  fs.renameSync(TMP, DST); console.log('→', DST);
} catch (e) { fs.rmSync(TMP, { force: true }); console.error('✗ 合成失败：' + e.message); process.exit(1); }
