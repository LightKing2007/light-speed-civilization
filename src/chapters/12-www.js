/* 12 · 万维网（1989 – 1993）
   A  桌上的 1989 年提案首页，框出上司的批注「Vague but exciting ...」
   B  NeXT 立方体电脑 + MegaPixel 显示器：复原的 WorldWideWeb 浏览器与第一个网页（4 级灰度，链接只有下划线）
   C  一次点击（机能风时序图）：网址拆成协议 / 主机 / 路径 → DNS 查地址 → TCP 三次握手 → GET 请求 → 服务器送回 HTML
      → 浏览器排版 → 点一下超链接，请求发往世界另一端的另一台服务器
   D  1993 年 4 月 30 日 CERN 声明（排印复原）→ 网站数量对数曲线（1991 年 1 个 → 2026 年约 14.9 亿）
   道具在 src/props/12/web.js。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildOffice, drawFirstPage } from '../props/12/web.js';

/* ---------- 一次点击：时序图 ---------- */
const LANES = [['浏览器', '你的电脑', 300], ['DNS 服务器', '域名 → 地址', 760], ['网页服务器', 'info.cern.ch · 日内瓦', 1200], ['另一台服务器', 'SLAC · 美国加州', 1640]];
const MSGS = [   // [出发时刻, 从, 到, 文字, 颜色]
  [16.4, 0, 1, 'info.cern.ch 在哪？', '#9fdcff'], [17.5, 1, 0, '192.0.2.10（示意）', '#9fdcff'],
  [20.0, 0, 2, 'SYN', '#5aa9ff'], [20.45, 2, 0, 'SYN-ACK', '#5aa9ff'], [20.9, 0, 2, 'ACK · 连接建立', '#5aa9ff'],
  [21.7, 0, 2, 'GET /hypertext/WWW/TheProject.html HTTP/1.0', '#ff9a4a'], [23.0, 2, 0, 'HTTP/1.0 200 OK + HTML', '#5fd38d'],
  [28.0, 0, 3, 'GET …（点了一下超链接）', '#ff9a4a'], [29.3, 3, 0, '另一份文档', '#5fd38d'],
];
const FLY = .7, ROW0 = 392, ROWH = 40;
const HTML = ['<TITLE>The World Wide Web project</TITLE>', '<H1>World Wide Web</H1>The WorldWideWeb (W3) is a', 'wide-area <A HREF="WhatIs.html">hypermedia</A> information', 'retrieval initiative aiming to give universal', 'access to a large universe of documents.<P>', '<DL><DT><A HREF="…">What\'s out there?</A> …'];
/* ---------- 网站数量 ---------- */
const SITES = [[1991, 1, '1'], [1992, 10, '10'], [1993, 130, '130'], [1994, 2738, '2 738'], [1995, 23500, '2.35 万'], [1996, 257601, '25.8 万'], [2000, 1.7e7, '1 700 万'], [2014, 1e9, '10 亿'], [2026, 1.49e9, '约 14.9 亿']];
const GR = { x0: 340, x1: 1560, y0: 830, y1: 230, yr0: 1990, yr1: 2027, lg1: 10 };
const gx = yr => lerp(GR.x0, GR.x1, (yr - GR.yr0) / (GR.yr1 - GR.yr0)), gy = n => lerp(GR.y0, GR.y1, Math.log10(n) / GR.lg1);

export default {
  id: '12', status: 'implemented', slug: 'www', title: '万维网', dur: 42,
  card: {"title": "万维网", "short": "万维网", "meta": "CERN · 1989 — 1993"},
  stamps: [[0, "1989"], [32.4, "1993"]],
  caps: [[0.4, 6.6, "1989 年，CERN 的蒂姆·伯纳斯-李交上一份提案，上司在封面批了一句：「含糊，但令人兴奋。」"], [7.0, 13.0, "他在一台 NeXT 电脑上，写出了第一个网站、第一个浏览器和第一个网页服务器程序。"], [13.4, 19.6, "网址说明文件在哪台机器、哪个位置；浏览器先把域名翻译成 IP 地址，"], [20.0, 26.0, "再用 HTTP 发出请求；服务器送回用 HTML 写成的页面，浏览器把它排版显示。"], [26.4, 32.0, "页面里的超链接指向别的网址——轻轻一点，就跳到世界另一端的文档。"], [32.4, 38.0, "1993 年 4 月，CERN 宣布这项技术免费向所有人开放。"], [38.4, 41.8, "网站从一个，增长到今天的近十五亿个。"]],
  credits: ['assets/models/polyhaven/metal_office_desk', 'assets/models/polyhaven/desk_lamp_arm_01'],
  async build(ctx) {
    const { KIT } = ctx;
    const OF = await buildOffice(KIT), Y = OF.deskTop;
    OF.scene.updateMatrixWorld(true);
    const noteAt = OF.proposal.localToWorld(V(.057, .123, 0)), labelAt = OF.cube.localToWorld(V(.02, .2, .154)), screenAt = OF.screen.getWorldPosition(V()), cubeAt = OF.cube.localToWorld(V(.1, .3, .1)), stmtAt = OF.statement.getWorldPosition(V());

    /* ================= A · 提案 ================= */
    const camA = KIT.cam(30, .01, 50), P0 = OF.proposal.getWorldPosition(V());
    const pA = camPath([[0, [P0.x + .18, Y + .5, P0.z + .4], [P0.x, Y, P0.z + .02], 30], [4.0, [P0.x + .12, Y + .36, P0.z + .26], [P0.x + .02, Y, P0.z - .02], 28], [7.2, [noteAt.x + .06, Y + .24, noteAt.z + .16], [noteAt.x - .01, Y, noteAt.z], 26]]);
    const shA = ctx.shot({ name: '12.A 提案', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: OF.scene, camera: camA,
      post: { exposure: 1.0, ao: { radius: .02, intensity: .8 }, dof: { focus: .5, aperture: .002, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .42 },
      update(t) { OF.proposal.visible = true; OF.statement.visible = false; const c = pA(t); applyCam(camA, c, t, .0004); shA.post.dof.focus = camA.position.distanceTo(c.l); } });
    ctx.lower({ t0: 1.0, t1: 3.8, name: '《Information Management: A Proposal》', meta: '蒂姆·伯纳斯-李 · CERN · 1989 年 3 月（1990 年 5 月修订）', credit: '按原件首页版式排印复原（下半页的图为示意）' });
    ctx.draw2d({ shot: shA, t0: 4.0, t1: 6.9, draw(g, t, a, proj) {
      const p = proj(noteAt); if (!p) return; const e = easeIO(ss(4.0, 4.5, t));
      g.strokeStyle = ink.accent; g.lineWidth = 2.5; g.strokeRect(p.x - 230 * e, p.y - 70, 460 * e, 120);
      g.save(); g.globalAlpha *= ss(4.4, 4.8, t);
      g.fillStyle = 'rgba(8,9,10,.82)'; g.fillRect(p.x - 230, p.y + 64, 460, 92);
      ink.text(g, '「含糊，但令人兴奋」', p.x - 210, p.y + 104, { font: ink.sans(26, 600), color: ink.accent });
      ink.text(g, '上司迈克·森德尔的手写批注', p.x - 210, p.y + 138, { font: ink.sans(17), color: ink.dim });
      g.restore();
    } });

    /* ================= B · NeXT ================= */
    const camB = KIT.cam(32, .01, 50);
    const pB = camPath([[7.0, [-.75, Y + .55, 1.35], [-.3, Y + .22, -.12], 32], [13.6, [.15, Y + .42, 1.0], [-.2, Y + .26, -.12], 30]]);
    const shB = ctx.shot({ name: '12.B NeXT', t0: 7.0, in: { type: 'dissolve', dur: .8 }, scene: OF.scene, camera: camB,
      post: { exposure: 1.05, ao: { radius: .05, intensity: .9 }, dof: { focus: 1.2, aperture: .0018, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .38, bloom: { strength: .1 } },
      update(t) { OF.proposal.visible = true; OF.statement.visible = false; const c = pB(t); applyCam(camB, c, t, .0004); shB.post.dof.focus = camB.position.distanceTo(screenAt); } });
    ctx.lower({ t0: 7.4, t1: 10.2, name: 'NeXT 电脑上的 WorldWideWeb（复原）', meta: '1990 年 · 第一个网站、浏览器和网页服务器都在这台机器上写成', credit: '场景为写实复原 · 屏幕只有 4 级灰度，链接只用下划线标出' });
    ctx.callout({ shot: shB, at: cubeAt, title: 'NeXT 立方体', sub: '世界上第一台网页服务器', t0: 8.0, t1: 13.3, side: 'left', dx: -120, dy: -130 });
    ctx.callout({ shot: shB, at: labelAt, title: '「这是服务器，别关机！！」', sub: '机箱上的手写标签', t0: 9.4, t1: 13.3, side: 'left', dx: -150, dy: 110, style: 'accent' });
    ctx.callout({ shot: shB, at: screenAt, title: '第一个网页', sub: 'World Wide Web 项目主页', t0: 10.4, t1: 13.3, side: 'right', dx: 160, dy: -150 });

    /* ================= C · 一次点击 ================= */
    const camC = KIT.cam(28, .01, 50);
    const pC = camPath([[13.4, [-.1, Y + .38, .62], [-.03, Y + .33, -.08], 28], [32.4, [.06, Y + .34, .52], [-.01, Y + .33, -.08], 28]]);
    ctx.shot({ name: '12.C 一次点击', t0: 13.4, in: { type: 'blur', dur: 1.0, params: [6] }, scene: OF.scene, camera: camC,
      post: { exposure: .55, dof: { focus: .3, aperture: .02, maxBlur: 18 }, grade: ctx.grade.cool, vignette: .5 },
      update(t) { applyCam(camC, pC(t), t, .0003); } });
    const pageCanvas = document.createElement('canvas'); pageCanvas.width = 520; pageCanvas.height = 330;
    const pg = pageCanvas.getContext('2d'); pg.fillStyle = '#fff'; pg.fillRect(0, 0, 520, 330); const pLinks = drawFirstPage(pg, 16, 6, 488, { size: 12.5 });
    const clickLink = pLinks.find(l => /What/.test(l.text)) || pLinks[0];
    ctx.draw2d({ t0: 13.8, t1: 32.3, fade: .4, draw(g, t) {
      // 网址拆解
      const url = ['http://', 'info.cern.ch', '/hypertext/WWW/TheProject.html'], cols = ['#ff9a4a', '#9fdcff', '#5fd38d'], lab = [['协议', '用什么方式取'], ['主机', '在哪台机器'], ['路径', '机器里的哪个位置']];
      g.font = ink.mono(36, 600); let x = 960 - g.measureText(url.join('')).width / 2; const uy = 150;
      g.fillStyle = 'rgba(8,10,14,.82)'; g.fillRect(x - 30, uy - 52, g.measureText(url.join('')).width + 60, 140); ink.corners(g, x - 30, uy - 52, g.measureText(url.join('')).width + 60, 140, 12, ink.dim);
      url.forEach((s, i) => { g.font = ink.mono(36, 600); const w = g.measureText(s).width, k = ss(14.2 + i * .5, 14.6 + i * .5, t); ink.text(g, s, x, uy, { font: ink.mono(36, 600), color: k > .5 ? cols[i] : ink.white }); if (k > 0) { g.save(); g.globalAlpha *= k; ink.line(g, [[x + 2, uy + 14], [x + w - 2, uy + 14]], cols[i], 2); ink.text(g, lab[i][0], x + w / 2, uy + 46, { font: ink.sans(19, 600), color: cols[i], align: 'center' }); ink.text(g, lab[i][1], x + w / 2, uy + 72, { font: ink.sans(15), color: ink.dim, align: 'center' }); g.restore(); } x += w; });
      // 泳道
      const lanesOn = ss(15.8, 16.3, t);
      g.save(); g.globalAlpha *= lanesOn;
      LANES.forEach(([n, d, lx], i) => { const k = i === 3 ? ss(27.4, 27.9, t) : 1; if (k <= 0) return; g.save(); g.globalAlpha *= k; g.fillStyle = 'rgba(8,10,14,.85)'; g.fillRect(lx - 120, 290, 240, 66); ink.rect(g, lx - 120, 290, 240, 66, ink.dim, 1); ink.text(g, n, lx, 318, { font: ink.sans(20, 600), align: 'center' }); ink.text(g, d, lx, 344, { font: ink.sans(14), color: ink.dim, align: 'center' }); g.setLineDash([4, 6]); ink.line(g, [[lx, 360], [lx, 735]], 'rgba(235,235,230,.25)', 1.2); g.setLineDash([]); g.restore(); });
      g.restore();
      // 消息箭头 + 飞行中的小包
      MSGS.forEach(([t0, a, b, text, col], i) => {
        if (t < t0) return; const y = ROW0 + i * ROWH, xa = LANES[a][2], xb = LANES[b][2], u = clamp((t - t0) / FLY), xe = lerp(xa, xb, easeIO(u)), dir = Math.sign(xb - xa);
        g.fillStyle = 'rgba(8,10,14,.6)'; g.fillRect(Math.min(xa, xb), y - 30, Math.abs(xb - xa), 38);
        ink.line(g, [[xa, y], [xe, y]], col, 2);
        if (u >= 1) { ink.line(g, [[xb - dir * 12, y - 6], [xb, y], [xb - dir * 12, y + 6]], col, 2); } else { g.fillStyle = col; g.beginPath(); g.arc(xe, y, 6, 0, 7); g.fill(); }
        ink.text(g, text, (xa + xb) / 2, y - 10, { font: text.startsWith('GET /') || text.startsWith('HTTP') ? ink.mono(15, 600) : ink.sans(16, 600), color: col, align: 'center' });
      });
      // 服务器送回的 HTML 文本
      if (t > 23.4 && t < 28.0) { const k = ss(23.4, 23.8, t) * (1 - ss(27.5, 28.0, t)), x0 = 1330, y0 = 776; g.save(); g.globalAlpha *= k; g.fillStyle = 'rgba(8,10,14,.9)'; g.fillRect(x0 - 16, y0 - 34, 560, 196); ink.rect(g, x0 - 16, y0 - 34, 560, 196, '#5fd38d99', 1); ink.text(g, 'HTML（服务器送回的文本）', x0, y0 - 10, { font: ink.sans(15), color: '#5fd38d' }); HTML.forEach((l, i) => { if (t > 23.6 + i * .25) ink.text(g, l, x0, y0 + 20 + i * 24, { font: ink.mono(13), color: ink.white }); }); g.restore(); }
      // 浏览器排版出的页面 + 点击
      if (t > 24.4) {
        const k = ss(24.4, 24.9, t), x0 = 470, y0 = 784, s = .6;
        g.save(); g.globalAlpha *= k;
        ink.text(g, '浏览器排版出的页面', x0, y0 - 34, { font: ink.sans(15), color: ink.dim });
        g.fillStyle = '#000'; g.fillRect(x0 - 3, y0 - 20, 520 * s + 6, 18); ink.text(g, 'The World Wide Web project', x0 + 260 * s, y0 - 7, { font: ink.sans(11, 600), color: '#fff', align: 'center' });
        g.drawImage(pageCanvas, 0, 0, 520, 260, x0, y0, 520 * s, 260 * s); ink.rect(g, x0 - 3, y0 - 20, 520 * s + 6, 260 * s + 22, ink.dim, 1);
        if (t > 26.6) { const L = clickLink, cxp = x0 + (L.x + L.w / 2) * s, cyp = y0 + (L.y + L.h * .7) * s, flash = ss(27.4, 27.5, t) * (1 - ss(27.5, 28.0, t)); g.fillStyle = `rgba(255,154,74,${.25 + .5 * flash})`; g.fillRect(x0 + (L.x - 4) * s, y0 + (L.y + 2) * s, (L.w + 8) * s, L.h * s); const px = lerp(cxp + 120, cxp, easeIO(ss(26.6, 27.3, t))), py = lerp(cyp + 90, cyp, easeIO(ss(26.6, 27.3, t))); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + 26); g.lineTo(px + 7, py + 19); g.lineTo(px + 13, py + 31); g.lineTo(px + 17, py + 29); g.lineTo(px + 11, py + 17); g.lineTo(px + 20, py + 17); g.closePath(); g.fill(); g.stroke(); }
        g.restore();
      }
    } });

    /* ================= D · 开放 → 爆发 ================= */
    const camD = KIT.cam(30, .01, 50);
    const pD = camPath([[32.4, [stmtAt.x + .1, Y + .42, stmtAt.z + .34], [stmtAt.x, Y, stmtAt.z], 30], [36.2, [stmtAt.x + .05, Y + .3, stmtAt.z + .22], [stmtAt.x - .01, Y, stmtAt.z - .02], 28], [42.4, [stmtAt.x, Y + .5, stmtAt.z + .5], [stmtAt.x, Y, stmtAt.z], 30]]);
    const shD = ctx.shot({ name: '12.D 开放', t0: 32.4, in: { type: 'dissolve', dur: .8 }, scene: OF.scene, camera: camD,
      post: { exposure: 1.0, ao: { radius: .02, intensity: .8 }, dof: { focus: .5, aperture: .002, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .42 },
      update(t) { OF.proposal.visible = false; OF.statement.visible = true; const c = pD(t); applyCam(camD, c, t, .0004); shD.post.dof.focus = camD.position.distanceTo(c.l); shD.post.exposure = 1.05 - .5 * ss(35.6, 36.4, t); } });
    ctx.lower({ t0: 32.9, t1: 35.6, name: 'CERN 声明 · 1993 年 4 月 30 日', meta: '万维网软件进入公共领域：任何人都可以免费使用', credit: '标题与日期按原件排印，正文以灰条示意' });
    ctx.draw2d({ t0: 35.8, t1: 42.2, fade: .5, draw(g, t, a0) {
      const P = { x: 200, y: 140, w: 1520, h: 790 }, yc = lerp(1990.5, 2026.6, easeIO(ss(36.0, 39.8, t)));
      g.fillStyle = 'rgba(8,9,10,.84)'; g.fillRect(P.x, P.y, P.w, P.h); ink.corners(g, P.x, P.y, P.w, P.h, 16, ink.dim);
      ink.text(g, 'WEBSITES · 全世界的网站数量 · 对数坐标（纵轴每格 ×10）', P.x + 30, P.y + 42, { font: ink.mono(16), color: ink.dim });
      for (let i = 0; i <= GR.lg1; i += 1) { const y = gy(Math.pow(10, i)); ink.line(g, [[GR.x0, y], [GR.x1, y]], i === 0 ? ink.dim : 'rgba(235,235,230,.07)', 1); if (i % 3 === 0 || i === 10) ink.text(g, ['1', '', '', '1 000', '', '', '100 万', '', '', '10 亿', '100 亿'][i], GR.x0 - 14, y + 5, { font: ink.sans(16), color: ink.dim, align: 'right' }); }
      for (let yr = 1990; yr <= 2025; yr += 5) { const x = gx(yr); ink.line(g, [[x, GR.y0], [x, GR.y0 + 8]], ink.dim, 1); ink.text(g, String(yr), x, GR.y0 + 32, { font: ink.mono(16), color: ink.dim, align: 'center' }); }
      const pts = SITES.filter(([yr]) => yr <= yc).map(([yr, n]) => [gx(yr), gy(n)]);
      const nxt = SITES.find(([yr]) => yr > yc); if (nxt && pts.length) { const prev = SITES[pts.length - 1], u = (yc - prev[0]) / (nxt[0] - prev[0]); pts.push([lerp(gx(prev[0]), gx(nxt[0]), u), lerp(gy(prev[1]), gy(nxt[1]), u)]); }
      if (pts.length > 1) ink.line(g, pts, ink.accent, 2.6);
      SITES.forEach(([yr, n, txt], i) => { const k = clamp((yc - yr) / .8); if (k <= 0) return; const x = gx(yr), y = gy(n), last = i === SITES.length - 1; g.save(); g.globalAlpha *= k; g.fillStyle = last ? ink.accent : ink.white; g.beginPath(); g.arc(x, y, last ? 8 : 5.5, 0, 7); g.fill(); if (last) { ink.text(g, `${yr} · ${txt}`, x - 16, y - 40, { font: ink.sans(24, 600), color: ink.accent, align: 'right' }); ink.text(g, '其中活跃网站约 2.2 亿', x - 16, y - 12, { font: ink.sans(17), color: ink.dim, align: 'right' }); } else if (i < 7 || i === 7) { ink.text(g, `${yr} · ${txt}`, x + 12, y + 26, { font: ink.mono(15, 600), color: ink.white }); } g.restore(); });
      ink.text(g, '数据：M. Gray（MIT）早期统计、Netcraft 网站调查等公开数据（2026 年 7 月）', P.x + P.w - 24, P.y + P.h - 16, { font: ink.mono(13), color: 'rgba(235,235,230,.45)', align: 'right' });
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(4.0, 'tick', .6);
    ctx.cue(7.0, 'swoosh', .25); ctx.cue(9.4, 'tap', .6);
    ctx.cue(13.4, 'whoosh', 1.0, .22); for (let i = 0; i < 3; i++) ctx.cue(14.2 + i * .5, 'blip', 800 + i * 150, .04);
    for (const [t0] of MSGS) { ctx.cue(t0, 'tick', .6); ctx.cue(t0 + FLY, 'blip', 1000, .04); }
    ctx.cue(27.45, 'click', .6);
    ctx.cue(32.4, 'swoosh', .25); ctx.cue(35.8, 'riser', 3.8, .12); ctx.cue(39.8, 'chime', 880, .07);
  },
};
