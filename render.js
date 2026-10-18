// usage: node render.js <fromFrame> <toFrame>   (30 fps, 1280x720, resumable)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
(async () => {
  const FPS = 30, from = +process.argv[2], to = +process.argv[3];
  fs.mkdirSync('frames', { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.setDefaultTimeout(180000); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('file://' + process.cwd() + '/test.html#render');
  await p.waitForFunction(() => window.FILM && window.FILM.ready, null, { timeout: 60000 });
  const total = await p.evaluate(() => FILM.TOTAL), last = Math.min(to, Math.ceil(total * FPS) - 1);
  let f = from; while (f <= last && fs.existsSync(`frames/f${String(f).padStart(5, '0')}.jpg`)) f++;
  if (f > last) { console.log('done'); await b.close(); return; }
  await p.evaluate(([t0, fps]) => { primeAt(Math.max(0, t0 - 20 / fps)); for (let k = 20; k >= 1; k--) renderFrame(Math.max(0, t0 - k / fps)); }, [f / FPS, FPS]);
  const t0 = Date.now();
  for (; f <= last; f++) {
    await p.evaluate(t => renderFrame(t), f / FPS);
    await p.screenshot({ path: `frames/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (f % 150 === 0) console.log('frame', f, '/', last, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  await b.close();
})();
