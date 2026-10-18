// 用本机 Google Chrome（Metal GPU）以无头模式打开影片的 #render 模式。
import { chromium } from 'playwright-core';
import { serve } from './server.mjs';
import { build } from './build.mjs';
export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export async function openFilm({ only = null, scale = 1, debug = false, width = 1920, height = 1080, timeout = 240000 } = {}) {
  const b = only ? await build({ dev: only }) : await build({});
  const S = await serve(0);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const log = []; page.on('pageerror', e => log.push('PAGEERROR ' + e.message)); page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') log.push(t.toUpperCase() + ' ' + m.text().slice(0, 400)); });
  page.setDefaultTimeout(timeout);
  const hash = ['render', only ? 'only=' + only.join(',') : '', 'scale=' + scale, debug ? 'debug' : ''].filter(Boolean).join('&');
  await page.goto(`http://127.0.0.1:${S.port}/${b.html}#${hash}`);
  await page.waitForFunction(() => window.FILM && window.FILM.ready, null, { timeout });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const film = await page.evaluate(() => ({ TOTAL: FILM.TOTAL, chapters: FILM.chapters, failed: FILM.failed }));
  return { browser, page, film, log, close: async () => { await browser.close(); S.close(); } };
}
