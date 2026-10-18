// 导出分段缓存：哪些变化会让哪些分段失效；视频不完整时不复用。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { makeRecord, diffRecord, importClosure, checkSegment, resetHashes, SHARED } from '../tools/segments.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lsc-seg-'));
const files = {
  'src/engine/film.js': 'film', 'src/engine/util.js': 'util', 'src/index.template.html': 'html', 'package-lock.json': 'lock',
  'src/chapters/01-a.js': 'a', 'src/chapters/02-b.js': 'b', 'src/chapters/03-c.js': 'c', 'src/chapters/15-finale.js': 'fin',
  'src/props/01/thing.js': 'thing', 'assets/x.jpg': 'X', 'assets/y.jpg': 'Y',
  ...Object.fromEntries(SHARED.filter(f => f.startsWith('tools/')).map(f => [f, f])),
};
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), s); resetHashes(); };
for (const [f, s] of Object.entries(files)) write(f, s);
const imp = (...p) => ({ imports: p.map(x => ({ path: x })) });
const meta = { inputs: {
  'src/engine/film.js': imp('src/engine/util.js', 'node_modules/three/build/three.module.js'), 'src/engine/util.js': imp(), 'node_modules/three/build/three.module.js': imp(),
  'src/chapters/01-a.js': imp('src/engine/util.js', 'src/props/01/thing.js'), 'src/props/01/thing.js': imp(),
  'src/chapters/02-b.js': imp('src/engine/util.js'), 'src/chapters/03-c.js': imp(), 'src/chapters/15-finale.js': imp(),
} };
// 02 的开头与 01 的最后一个镜头转场重叠；15 尾声引用 01、03 的画面
const film = { TOTAL: 40, chapters: [
  { id: '01', start: 0, dur: 10, status: 'implemented', assets: ['assets/x.jpg'], renders: ['01'] },
  { id: '02', start: 10, dur: 10, status: 'implemented', assets: ['assets/y.jpg'], renders: ['01', '02'] },
  { id: '03', start: 20, dur: 10, status: 'implemented', assets: [], renders: ['03'] },
  { id: '15', start: 30, dur: 10, status: 'implemented', assets: [], renders: ['01', '03', '15'] },
] };
const params = { fps: 30, crf: '15', scale: 1.5, width: 1920, height: 1080, draft: false, browser: 'x' };
const keys = (p = params, f = film) => Object.fromEntries(f.chapters.map((c, i) => [c.id, makeRecord({ root, meta, film: f, index: i, params: p }).key]));
const changed = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]).sort();
const edit = (f, s, fn) => { const old = fs.readFileSync(path.join(root, f), 'utf8'); write(f, s); try { return fn(); } finally { write(f, old); } };

test('依赖闭包包含道具模块与引擎，不含 node_modules', () => {
  assert.deepEqual(importClosure(meta, 'src/chapters/01-a.js'), ['src/chapters/01-a.js', 'src/engine/util.js', 'src/props/01/thing.js']);
});

test('什么都没改：所有分段的记录不变', () => { assert.deepEqual(keys(), keys()); });

test('改了第 01 章的道具：01、与它转场重叠的 02、引用它的尾声 15 失效，03 不受影响', () => {
  const k0 = keys(); const k1 = edit('src/props/01/thing.js', 'thing v2', () => keys());
  assert.deepEqual(changed(k0, k1), ['01', '02', '15']);
});

test('改了第 03 章：03 与引用它的尾声失效', () => {
  const k0 = keys(); assert.deepEqual(changed(k0, edit('src/chapters/03-c.js', 'c2', () => keys())), ['03', '15']);
});

test('换了素材文件内容：用到它的分段失效', () => {
  const k0 = keys(); assert.deepEqual(changed(k0, edit('assets/y.jpg', 'Y2', () => keys())), ['02']);
  assert.deepEqual(changed(k0, edit('assets/x.jpg', 'X2', () => keys())), ['01', '02', '15']);
});

test('改了引擎、页面模板、依赖版本或导出工具：全部失效', () => {
  const k0 = keys();
  for (const f of ['src/engine/util.js', 'src/index.template.html', 'package-lock.json', 'tools/render.mjs']) assert.deepEqual(changed(k0, edit(f, 'changed', () => keys())), ['01', '02', '03', '15'], f);
});

test('帧率、画质、渲染比例、浏览器变化：全部失效，并说明原因', () => {
  const k0 = keys();
  for (const p of [{ fps: 24 }, { crf: '18' }, { scale: 1 }, { browser: 'y' }, { draft: true }]) assert.deepEqual(changed(k0, keys({ ...params, ...p })), ['01', '02', '03', '15'], JSON.stringify(p));
  const a = makeRecord({ root, meta, film, index: 0, params }), b = makeRecord({ root, meta, film, index: 0, params: { ...params, crf: '18' } });
  assert.match(diffRecord(a, b).join(), /crf/);
});

test('前面章节的时长变化会让后面的分段失效（起点与帧号变了）', () => {
  const f2 = { ...film, chapters: film.chapters.map(c => c.id === '01' ? { ...c, dur: 11 } : { ...c, start: c.start + 1 }) };
  f2.TOTAL = 41;
  assert.deepEqual(changed(keys(), keys(params, f2)), ['01', '02', '03', '15']);
});

test('视频分段不完整或缺失时不复用；完整且记录一致才复用', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsc-vid-'));
  const rec = { ...makeRecord({ root, meta, film: { TOTAL: 1, chapters: [{ id: '01', start: 0, dur: 1, status: 'implemented', assets: [], renders: ['01'] }] }, index: 0, params: { ...params, fps: 10 } }) };
  const seg = path.join(dir, 'seg_01.mp4'), recFile = path.join(dir, 'seg_01.json');
  assert.equal((await checkSegment({ ffmpeg, seg, recFile, rec })).ok, false, '没有记录');
  fs.writeFileSync(recFile, JSON.stringify(rec));
  assert.match((await checkSegment({ ffmpeg, seg, recFile, rec })).reasons.join(), /缺失或损坏/);
  const mk = n => execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=64x36:rate=10', '-frames:v', String(n), '-pix_fmt', 'yuv420p', seg]);
  mk(7); assert.match((await checkSegment({ ffmpeg, seg, recFile, rec })).reasons.join(), /不完整：7\/10/);
  mk(10); assert.equal((await checkSegment({ ffmpeg, seg, recFile, rec })).ok, true);
  fs.writeFileSync(seg, fs.readFileSync(seg).subarray(0, 300));
  assert.equal((await checkSegment({ ffmpeg, seg, recFile, rec })).ok, false, '截断的文件');
});
