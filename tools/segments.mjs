// 分段渲染记录（tools/render.mjs 的断点续渲依据）。
// 每个完成的分段 seg_NN.mp4 旁边有 seg_NN.json，记录：
//   - sources：会画到这一段的各章（本章 + 转场重叠的上一章 + 尾声引用的章节）的源码依赖闭包，加上引擎运行时与导出工具本身；
//   - assets：这些章节实际加载过的素材文件；
//   - params：帧率、画质、渲染比例、分辨率、编码参数、浏览器版本、是否草稿；
//   - timeline：本章在全片中的起点、时长、预期帧数（片头片尾的淡入淡出、胶片颗粒都与全片时间有关）。
// 全部内容的哈希一致、且视频帧数完整，才复用；否则重渲。第一版是保守策略：相关文件有任何变化就失效。
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFile } from 'node:child_process';

export const RECORD_VERSION = 1;
const fileHash = new Map();
/** 文件内容哈希（同一次运行内缓存）；不存在返回 'missing' */
export function hashFile(root, rel) {
  const abs = path.join(root, rel);
  if (fileHash.has(abs)) return fileHash.get(abs);
  let h = 'missing';
  try { h = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex').slice(0, 20); } catch (e) { }
  fileHash.set(abs, h); return h;
}
export const resetHashes = () => fileHash.clear();

/** esbuild metafile：从 file 出发的 import 闭包（项目内的源码文件，相对 ROOT 的路径） */
export function importClosure(meta, file) {
  const out = new Set(), todo = [file];
  while (todo.length) {
    const f = todo.pop(); if (out.has(f)) continue;
    const node = meta.inputs[f]; if (!node) continue; out.add(f);
    for (const im of node.imports || []) if (im.path && !im.external) todo.push(im.path);
  }
  return [...out].filter(f => !f.startsWith('node_modules/')).sort();
}
export function chapterFile(meta, id) { return Object.keys(meta.inputs).find(f => new RegExp(`(^|/)chapters/${id}-[^/]*\\.js$`).test(f)) || null; }

/** 所有分段共用的依赖：引擎运行时、页面模板、依赖版本、导出工具本身 */
export const SHARED = ['src/engine/film.js', 'src/index.template.html', 'package-lock.json', 'tools/render.mjs', 'tools/segments.mjs', 'tools/browser.mjs', 'tools/build.mjs', 'tools/server.mjs'];

/** 生成第 i 章分段的渲染记录。film = FILM 摘要（chapters[].renders/assets），meta = esbuild metafile */
export function makeRecord({ root, meta, film, index, params, only = null }) {
  const c = film.chapters[index], fps = params.fps;
  const f0 = Math.round(c.start * fps), f1 = Math.round((c.start + c.dur) * fps);
  const renders = c.renders || [c.id];
  const src = new Set();
  for (const f of SHARED) { if (f.startsWith('src/') && meta.inputs[f]) importClosure(meta, f).forEach(x => src.add(x)); else src.add(f); }
  const missingChapters = [];
  for (const id of renders) { const f = chapterFile(meta, id); if (f) importClosure(meta, f).forEach(x => src.add(x)); else missingChapters.push(id); }
  const assets = new Set();
  for (const id of renders) { const ch = film.chapters.find(x => x.id === id); for (const a of (ch && ch.assets) || []) assets.add(a); }
  const last = index === film.chapters.length - 1;
  const rec = {
    version: RECORD_VERSION, chapter: c.id, frames: f1 - f0, f0, f1,
    params,
    timeline: { start: c.start, dur: c.dur, total: last ? film.TOTAL : null, only: only ? only.join(',') : null, status: c.status },
    renders, missingChapters,
    sources: Object.fromEntries([...src].sort().map(f => [f, hashFile(root, f)])),
    assets: Object.fromEntries([...assets].sort().map(f => [f, hashFile(root, f)])),
  };
  rec.key = crypto.createHash('sha256').update(JSON.stringify(rec)).digest('hex').slice(0, 24);
  return rec;
}

/** 说明旧记录与当前记录哪里不同（用于打印「为什么重渲」） */
export function diffRecord(old, cur) {
  if (!old) return ['没有渲染记录'];
  if (old.version !== cur.version) return ['记录格式版本变化'];
  const out = [];
  for (const k of Object.keys(cur.params)) if (JSON.stringify(old.params && old.params[k]) !== JSON.stringify(cur.params[k])) out.push(`导出参数 ${k}: ${JSON.stringify(old.params && old.params[k])} → ${JSON.stringify(cur.params[k])}`);
  if (JSON.stringify(old.timeline) !== JSON.stringify(cur.timeline) || old.frames !== cur.frames) out.push('时间线变化（起点 / 时长 / 帧数 / 状态）');
  if (JSON.stringify(old.renders) !== JSON.stringify(cur.renders)) out.push(`依赖章节变化：${(old.renders || []).join(',')} → ${cur.renders.join(',')}`);
  for (const kind of ['sources', 'assets']) {
    const a = old[kind] || {}, b = cur[kind], label = kind === 'sources' ? '源码' : '素材';
    const changed = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(f => a[f] !== b[f]);
    if (changed.length) out.push(`${label}变化：${changed.slice(0, 6).join('、')}${changed.length > 6 ? ` 等 ${changed.length} 个` : ''}`);
  }
  if (!out.length && old.key !== cur.key) out.push('记录不一致');
  return out;
}

/** 用 ffmpeg 数出视频里的帧数（流复制逐包输出校验和，不解码，很快）；文件损坏 / 不存在返回 -1 */
export function countFrames(ffmpeg, file) {
  return new Promise(res => {
    if (!fs.existsSync(file)) return res(-1);
    execFile(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'framecrc', '-'], { maxBuffer: 1 << 26 }, (err, out) => {
      if (err) return res(-1);
      res(String(out).split('\n').filter(l => l && !l.startsWith('#')).length);
    });
  });
}

/** 判断分段能否复用：返回 { ok, reasons } */
export async function checkSegment({ ffmpeg, seg, recFile, rec }) {
  let old = null; try { old = JSON.parse(fs.readFileSync(recFile, 'utf8')); } catch (e) { }
  const reasons = old && old.key === rec.key ? [] : diffRecord(old, rec);
  if (!reasons.length) { const n = await countFrames(ffmpeg, seg); if (n !== rec.frames) reasons.push(n < 0 ? '视频分段缺失或损坏' : `视频分段不完整：${n}/${rec.frames} 帧`); }
  return { ok: !reasons.length, reasons };
}

/** 原子写文件：先写临时文件再改名，中断时不会留下半截的记录 */
export function writeAtomic(file, data) { const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, data); fs.renameSync(tmp, file); }
