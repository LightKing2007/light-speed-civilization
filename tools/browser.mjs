// 用无头 Chrome / Chromium 打开影片的 #render 模式（截图、导出、配乐渲染共用）。
// 浏览器查找顺序：环境变量 CHROME_PATH → macOS 本机 Google Chrome（Metal GPU）→ Playwright 自带的 Chromium。
// 任何一步失败都会关闭浏览器与本地服务器再抛出，不留后台进程。
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './server.mjs';
import { build } from './build.mjs';

const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export function chromePath() {
  let bundled = null; try { bundled = chromium.executablePath(); } catch (e) { }
  const list = [process.env.CHROME_PATH, process.platform === 'darwin' ? MAC_CHROME : null, bundled, '/opt/pw-browsers/chromium'].filter(Boolean);
  const f = list.find(p => fs.existsSync(p));
  if (!f) throw new Error('找不到 Chrome / Chromium。请安装 Google Chrome，或设置环境变量 CHROME_PATH 指向浏览器可执行文件。');
  return f;
}
const ARGS = ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--force-color-profile=srgb'];
// macOS 走 Metal；其他平台没有可用 GPU 时允许回退到 SwiftShader 软件渲染（很慢，但结果正确）
export const chromeArgs = () => process.platform === 'darwin' ? ['--use-angle=metal', ...ARGS] : [...ARGS, '--enable-unsafe-swiftshader'];

/** strict：正式导出模式（问题记进 FILM.errors，出错的帧会让 renderFrame 抛出） */
export async function openFilm({ only = null, scale = 1, debug = false, strict = false, width = 1920, height = 1080, timeout = 240000 } = {}) {
  const b = only ? await build({ dev: only }) : await build({});
  const S = await serve(0);
  let browser = null;
  const close = async () => { try { if (browser) await browser.close(); } catch (e) { } browser = null; S.close(); };
  try {
    browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: chromeArgs() });
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const log = []; page.on('pageerror', e => log.push('PAGEERROR ' + e.message)); page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') log.push(t.toUpperCase() + ' ' + m.text().slice(0, 400)); });
    page.setDefaultTimeout(timeout);
    const hash = ['render', only ? 'only=' + only.join(',') : '', 'scale=' + scale, debug ? 'debug' : '', strict ? 'strict' : ''].filter(Boolean).join('&');
    await page.goto(`http://127.0.0.1:${S.port}/${b.html}#${hash}`);
    await page.waitForFunction(() => window.FILM && window.FILM.ready, null, { timeout });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const film = await page.evaluate(() => ({ TOTAL: FILM.TOTAL, mode: FILM.mode, chapters: FILM.chapters, failed: [...FILM.failed], errors: FILM.errors }));
    return { browser, page, film, log, build: b, browserVersion: browser.version(), close };
  } catch (e) { await close(); throw e; }
}

/** 正式导出前的检查：返回阻止导出的问题列表（空 = 可以导出）。draft = 允许占位章节（画面右上角带「占位」标记） */
export function filmProblems(film, { draft = false } = {}) {
  const out = [];
  for (const e of film.errors || []) if (e.kind === 'build') out.push(`第 ${e.chapter} 章构建失败：${e.message}`);
  for (const k of film.failed || []) {
    const url = k.replace(/^[a-z]+:/, '').replace(/\|.*$/, ''), who = (film.chapters || []).filter(c => (c.assets || []).includes(url)).map(c => c.id);
    out.push(`素材加载失败：${url}${who.length ? '（第 ' + who.join('、') + ' 章）' : ''}`);
  }
  for (const e of film.errors || []) if (e.kind !== 'build') out.push(`第 ${e.chapter} 章 ${e.kind === 'shot' ? '镜头 ' + e.shot : 'HUD'} 出错（构建时）：${e.message}`);
  const ph = (film.chapters || []).filter(c => c.status === 'placeholder').map(c => c.id);
  if (ph.length && !draft) out.push(`占位章节尚未实现：${ph.join('、')}（只想看整片草稿请加 --draft，画面会带「占位」标记）`);
  return out;
}

/** Ctrl+C / kill 时先清理（关浏览器、停 ffmpeg、删临时文件）再退出 */
export function onInterrupt(fn) {
  const h = async sig => { console.error(`\n收到 ${sig}，正在清理……`); try { await fn(); } finally { process.exit(130); } };
  process.once('SIGINT', h); process.once('SIGTERM', h);
}
