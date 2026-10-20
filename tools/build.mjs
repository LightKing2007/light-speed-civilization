// 构建：生成 assets/index.json、打包 dist/film.js、生成 index.html。
// 用法：node tools/build.mjs            → 正式版（全部章节）
//       node tools/build.mjs --dev 05,06 → dev-05,06.html（只含这些章节，互不影响）
// 环境变量 FILM_EXTRA_CHAPTERS=目录：--dev 时额外在这些目录里找章节（tools/faultcheck.mjs 用它载入故障演练章节）
import * as esbuild from 'esbuild';
import { createHash } from 'node:crypto';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
export const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

export function writeAssetIndex() {
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { if (e.name.startsWith('.') || e.name.endsWith('.tmp')) continue; const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else out.push(p); } };
  if (fs.existsSync(path.join(ROOT, 'assets'))) walk('assets');
  out.sort(); const dst = path.join(ROOT, 'assets/index.json'), txt = JSON.stringify(out.filter(f => f !== 'assets/index.json'));
  try { if (fs.readFileSync(dst, 'utf8') === txt) return out.length; } catch (e) { }
  const tmp = dst + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, txt); fs.renameSync(tmp, dst);  // 原子替换，避免并行构建读到半截文件
  return out.length;
}
export async function build({ dev = null, minify = !dev } = {}) {
  writeAssetIndex();
  const tag = dev ? 'dev-' + dev.join(',') : 'film';
  const opts = { bundle: true, format: 'iife', target: 'es2022', sourcemap: dev ? 'inline' : 'linked', minify, legalComments: 'none', outfile: path.join(ROOT, 'dist', tag + '.js'), logLevel: 'error', absWorkingDir: ROOT, metafile: true };
  if (dev) {
    const dirs = ['src/chapters', ...(process.env.FILM_EXTRA_CHAPTERS || '').split(path.delimiter).filter(Boolean)];
    const files = dirs.flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => /^\d\d-.*\.js$/.test(f)).map(f => path.relative(path.join(ROOT, 'src'), path.join(ROOT, d, f)).split(path.sep).join('/')));
    const pick = dev.map(id => { const f = files.find(x => path.basename(x).startsWith(id + '-')); if (!f) throw new Error('chapter not found: ' + id); return f; });
    opts.stdin = { contents: `import { boot } from './engine/film.js';\n${pick.map((f, i) => `import c${i} from './${f}';`).join('\n')}\nboot([${pick.map((_, i) => 'c' + i).join(',')}]);`, resolveDir: path.join(ROOT, 'src'), sourcefile: tag + '-entry.js' };
  } else opts.entryPoints = [path.join(ROOT, 'src/main.js')];
  const res = await esbuild.build(opts);
  const revision = createHash('sha256').update(fs.readFileSync(opts.outfile)).digest('hex').slice(0, 16);
  const html = fs.readFileSync(path.join(ROOT, 'src/index.template.html'), 'utf8').replace('<!--SCRIPT-->', `<script src="dist/${tag}.js?v=${revision}"></script>`);
  const htmlName = dev ? tag + '.html' : 'index.html';
  fs.writeFileSync(path.join(ROOT, dev ? 'dist/' + htmlName : htmlName), dev ? html.replace('<head>', '<head><base href="../">') : html);
  return { js: opts.outfile, html: dev ? 'dist/' + htmlName : htmlName, meta: res.metafile };   // meta.inputs：每个源文件及其 import（导出缓存用）
}
if (process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--dev'); const dev = i > 0 ? process.argv[i + 1].split(',') : null;
  build({ dev }).then(r => console.log('built', r.html, (fs.statSync(r.js).size / 1024).toFixed(0) + ' KB')).catch(e => { console.error(e.message); process.exit(1); });
}
