const { chromium } = require('playwright-core');
(async () => {
  const out = process.argv[3];
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + __dirname + '/v1test.html#render');
  await p.waitForFunction(() => window.FILM && window.FILM.ready, null, { timeout: 60000 });
  console.log('TOTAL', await p.evaluate(() => FILM.TOTAL));
  const times = process.argv[2].split(',').map(Number);
  for (const t of times) {
    await p.evaluate(t => { for (let k = 15; k >= 0; k--) renderFrame(Math.max(0, t - k / 30)); }, t);
    await p.screenshot({ path: `${out}/s${t.toFixed(1).padStart(6, '0')}.jpg`, type: 'jpeg', quality: 80 });
  }
  console.log(errs.slice(0, 20).join('\n') || 'no errors');
  await b.close();
})();
