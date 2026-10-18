// 构建：生成 assets/index.json、打包 dist/film.js、生成 index.html。
// 用法：node tools/build.mjs            → 正式版（全部章节）
//       node tools/build.mjs --dev 05,06 → dev-05,06.html（只含这些章节，互不影响）
import * as esbuild from 'esbuild';
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
  const opts = { bundle: true, format: 'iife', target: 'es2022', sourcemap: dev ? 'inline' : 'linked', minify, legalComments: 'none', outfile: path.join(ROOT, 'dist', tag + '.js'), logLevel: 'error', absWorkingDir: ROOT };
  if (dev) {
    const files = fs.readdirSync(path.join(ROOT, 'src/chapters')).filter(f => /^\d\d-.*\.js$/.test(f));
    const pick = dev.map(id => { const f = files.find(x => x.startsWith(id + '-')); if (!f) throw new Error('chapter not found: ' + id); return f; });
    opts.stdin = { contents: `import { boot } from './engine/film.js';\n${pick.map((f, i) => `import c${i} from './chapters/${f}';`).join('\n')}\nboot([${pick.map((_, i) => 'c' + i).join(',')}]);`, resolveDir: path.join(ROOT, 'src'), sourcefile: tag + '-entry.js' };
  } else opts.entryPoints = [path.join(ROOT, 'src/main.js')];
  await esbuild.build(opts);
  const html = fs.readFileSync(path.join(ROOT, 'src/index.template.html'), 'utf8').replace('<!--SCRIPT-->', `<script src="dist/${tag}.js"></script>`);
  const htmlName = dev ? tag + '.html' : 'index.html';
  fs.writeFileSync(path.join(ROOT, dev ? 'dist/' + htmlName : htmlName), dev ? html.replace('<head>', '<head><base href="../">') : html);
  return { js: opts.outfile, html: dev ? 'dist/' + htmlName : htmlName };
}
if (process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--dev'); const dev = i > 0 ? process.argv[i + 1].split(',') : null;
  build({ dev }).then(r => console.log('built', r.html, (fs.statSync(r.js).size / 1024).toFixed(0) + ' KB')).catch(e => { console.error(e.message); process.exit(1); });
}
