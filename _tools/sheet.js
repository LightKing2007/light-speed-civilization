// usage: node sheet.js <dir> <out.jpg> [cols] [thumbW]
const { chromium } = require('playwright-core'); const fs = require('fs'), path = require('path');
(async () => {
  const dir = process.argv[2], out = process.argv[3], cols = +(process.argv[4] || 4), tw = +(process.argv[5] || 480);
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|png)$/.test(f)).sort();
  const th = Math.round(tw * 9 / 16);
  const html = `<html><body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:4px;font:12px monospace;color:#fff">` + files.map(f => `<div style="position:relative"><img src="file://${path.resolve(dir, f)}" style="width:${tw}px;height:${th}px;display:block"><span style="position:absolute;left:4px;top:2px;background:#000a;padding:1px 4px">${f}</span></div>`).join('') + '</body></html>';
  fs.writeFileSync(dir + '/_sheet.html', html);
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--allow-file-access-from-files'] });
  const rows = Math.ceil(files.length / cols);
  const p = await b.newPage({ viewport: { width: cols * (tw + 4), height: rows * (th + 4) } });
  await p.goto('file://' + path.resolve(dir, '_sheet.html')); await p.waitForTimeout(500);
  await p.screenshot({ path: out, type: 'jpeg', quality: 82, fullPage: true }); await b.close();
})();
