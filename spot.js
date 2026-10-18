// 【旧版 v1，已停用】v2 请用 tools/spot.mjs。见 README「旧版文件」。
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/test.html#render');
  await p.waitForFunction(() => window.FILM && window.FILM.ready, null, { timeout: 60000 });
  const times = process.argv[2].split(',').map(Number);
  for (const t of times) {
    await p.evaluate(t => { for (let k = 12; k >= 0; k--) renderFrame(Math.max(0, t - k / 30)); }, t);
    await p.screenshot({ path: `shots/s${t.toFixed(1).padStart(6, '0')}.jpg`, type: 'jpeg', quality: 85 });
  }
  console.log(errs.slice(0, 20).join('\n') || 'no errors');
  await b.close();
})();
