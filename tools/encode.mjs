// 合成成片：_render/video.mp4 + _render/audio.wav → 光速文明.mp4（响度标准化到 -16 LUFS）
import path from 'node:path'; import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static'; import { ROOT } from './build.mjs';
const i = process.argv.indexOf('--only'); const only = i > 0 ? process.argv[i + 1].split(',') : null;
const OUT = path.join(ROOT, '_render', only ? 'preview_' + only.join('-') : 'full');
const DST = only ? path.join(OUT, '预览_' + only.join('-') + '.mp4') : path.join(ROOT, '光速文明.mp4');
execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', path.join(OUT, 'video.mp4'), '-i', path.join(OUT, 'audio.wav'), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-shortest', '-movflags', '+faststart', DST], { stdio: 'inherit' });
console.log('→', DST);
