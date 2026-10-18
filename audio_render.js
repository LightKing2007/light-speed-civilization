// 【旧版 v1，已停用】v2 请用 tools/audio.mjs。见 README「旧版文件」。
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.setDefaultTimeout(600000);
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('file://' + process.cwd() + '/test.html#render');
  await p.waitForFunction(() => window.FILM && window.FILM.ready, null, { timeout: 60000 });
  const N = await p.evaluate(() => { window.LOGIC_ONLY = true; primeAt(0); return Math.ceil(FILM.TOTAL * 30); });
  for (let f = 0; f < N; f += 600) { const r = await p.evaluate(([a, b]) => { for (let k = a; k < b; k++) { try { renderFrame(k / 30); } catch (e) { return k + " " + e.stack; } } return null; }, [f, Math.min(N, f + 600)]); if (r) { console.log("ERR", r); process.exit(1); } }
  console.log('cues', await p.evaluate(() => AU.log.length));
  const len = await p.evaluate(() => AU.offline());
  const CH = 6 * 1024 * 1024, parts = [];
  for (let i = 0; i * CH < len; i++) parts.push(Buffer.from(await p.evaluate(([i, c]) => AU.wavChunk(i, c), [i, CH]), 'base64'));
  fs.writeFileSync('audio.wav', Buffer.concat(parts)); console.log('wav bytes', len);
  await b.close();
})();
