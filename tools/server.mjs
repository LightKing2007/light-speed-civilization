// 极简静态文件服务器（项目根目录），供截图/导出工具使用；也可单独运行：node tools/server.mjs 8173
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
import { ROOT } from './build.mjs';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.hdr': 'application/octet-stream', '.exr': 'application/octet-stream', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.css': 'text/css', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ktx2': 'image/ktx2', '.map': 'application/json' };
export function serve(port = 0) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
      fs.stat(f, (e, st) => { if (e || !st.isFile()) { rsp.writeHead(404); return rsp.end('404 ' + p); } rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(rsp); });
    });
    srv.listen(port, '127.0.0.1', () => res({ srv, port: srv.address().port, close: () => { srv.close(); srv.closeAllConnections && srv.closeAllConnections(); } }));
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) { const s = await serve(+(process.argv[2] || 8173)); console.log(`http://127.0.0.1:${s.port}/index.html`); }
