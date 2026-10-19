/* 12 · 万维网（1989 – 1993）
   A  桌上的 1989 年提案首页，框出上司的批注「Vague but exciting ...」
   B  NeXT 立方体电脑 + MegaPixel 显示器：复原的 WorldWideWeb 浏览器与第一个网页（4 级灰度，链接只有下划线）
   C  一次点击（时序图，一步一步来）：网址拆成协议 / 主机 / 路径 → 问 DNS 要地址 → HTTP 请求 → 服务器送回 HTML → 浏览器排版
      → 点一下超链接，请求发往世界另一端的另一台服务器。每一组往返出现时，上一组淡出，画面上始终只有当前这一步。
   D  1993 年 4 月 30 日 CERN 声明（排印复原）→ 网站数量对数曲线（1991 年 1 个 → 2026 年约 14.9 亿）
   道具在 src/props/12/web.js。所有动画都是 t 的纯函数。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildOffice, drawFirstPage } from '../props/12/web.js';

/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.92)';
const panelBox = (g, x, y, w, h, edge = 'rgba(235,235,230,.22)') => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, edge, 1); };
const arrowHead = (g, x, y, dir, col, s = 14) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(x - dir * s, y - s * .55); g.lineTo(x - dir * s, y + s * .55); g.closePath(); g.fill(); };

/* ---------- 一次点击：时序图 ---------- */
const LANES = [['浏览器', '', 300], ['DNS 服务器', '', 760], ['网页服务器', 'info.cern.ch · 日内瓦', 1220], ['另一台服务器', 'SLAC · 美国加州', 1660]];
const ROWS = [452, 534], FLY = .7, C_BLUE = '#9fdcff', C_REQ = '#ff9a4a', C_OK = '#5fd38d';
const MSGS = [   // [出发时刻, 从, 到, 行, 文字, 颜色, 淡出时刻]：三组往返轮流用同两行
  [16.4, 0, 1, 0, 'info.cern.ch 在哪？', C_BLUE, 21.2],
  [17.1, 1, 0, 1, '地址：192.0.2.10（示意）', C_BLUE, 21.2],
  [21.3, 0, 2, 0, 'HTTP 请求：请把这一页发给我', C_REQ, 27.0],
  [21.9, 2, 0, 1, '送回这一页的 HTML 文本', C_OK, 27.0],
  [27.4, 0, 3, 0, '点了超链接：向另一台服务器要文档', C_REQ, 99],
  [28.3, 3, 0, 1, '送回另一份文档', C_OK, 99],
];
const HTML = ['<TITLE>The World Wide Web project</TITLE>', '<H1>World Wide Web</H1>', '<A HREF="WhatIs.html">hypermedia</A> …'];
/* ---------- 网站数量 ---------- */
const SITES = [[1991, 1, '1'], [1992, 10, '10'], [1993, 130, '130'], [1994, 2738, '2 738'], [1995, 23500, '2.35 万'], [1996, 257601, '25.8 万'], [2000, 1.7e7, '1 700 万'], [2014, 1e9, '10 亿'], [2026, 1.49e9, '约 14.9 亿']];
const GR = { x0: 400, x1: 1500, y0: 790, y1: 300, yr0: 1990, yr1: 2027, lg1: 10 };
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
    const noteAt = OF.proposal.localToWorld(V(.057, .123, 0)), labelAt = OF.cube.localToWorld(V(.02, .2, .154)), screenAt = OF.screen.getWorldPosition(V()), stmtAt = OF.statement.getWorldPosition(V());

    /* ================= A · 提案 ================= */
    const camA = KIT.cam(30, .01, 50), P0 = OF.proposal.getWorldPosition(V());
    // 3 s 起已经推到能看清页首批注的距离，批注框从 2.9 s 一直停到镜头结束
    const pA = camPath([[0, [P0.x + .18, Y + .5, P0.z + .4], [P0.x, Y, P0.z + .02], 30], [3.2, [P0.x + .12, Y + .36, P0.z + .26], [P0.x + .02, Y, P0.z - .02], 28], [7.8, [noteAt.x + .06, Y + .24, noteAt.z + .16], [noteAt.x - .01, Y, noteAt.z], 26]]);
    const shA = ctx.shot({ name: '12.A 提案', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: OF.scene, camera: camA,
      post: { exposure: 1.05, ao: { radius: .02, intensity: .8 }, dof: { focus: .5, aperture: .002, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .38 },
      update(t) { OF.proposal.visible = true; OF.statement.visible = false; const c = pA(t); applyCam(camA, c, t, .0004); shA.post.dof.focus = camA.position.distanceTo(c.l); } });
    ctx.lower({ t0: .8, t1: 5.2, name: '《Information Management: A Proposal》', credit: '按原件首页版式排印复原（下半页的图为示意）' });
    // 批注框：手写字在纸上的范围（纸面局部坐标，米）投影成四边形，跟着纸的透视走；说明框放在它正下方
    const NOTE = [[.019, .133], [.093, .133], [.093, .118], [.019, .118]].map(([x, y]) => OF.proposal.localToWorld(V(x, y, .001)));
    ctx.draw2d({ shot: shA, t0: 2.9, t1: 7.6, draw(g, t, a, proj) {
      const Q = NOTE.map(proj); if (Q.some(q => !q)) return;
      g.save(); g.globalAlpha *= ss(2.9, 3.2, t); g.strokeStyle = ink.accent; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); Q.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); g.stroke(); g.restore();
      const x0 = clamp(Math.min(...Q.map(q => q.x)), 40, 1880 - 460), y0 = Math.max(...Q.map(q => q.y)) + 18;
      g.save(); g.globalAlpha *= ss(3.0, 3.3, t);
      panelBox(g, x0, y0, 460, 104, ink.accent);
      ink.text(g, '「含糊，但令人兴奋」', x0 + 24, y0 + 44, { font: ink.sans(32, 600), color: ink.accent });
      ink.text(g, '上司的手写批注', x0 + 24, y0 + 84, { font: ink.sans(24), color: TXT });
      g.restore();
    } });

    /* ================= B · NeXT ================= */
    const camB = KIT.cam(32, .01, 50);
    const pB = camPath([[7.0, [-.75, Y + .55, 1.35], [-.3, Y + .22, -.12], 32], [13.6, [.15, Y + .42, 1.0], [-.2, Y + .26, -.12], 30]]);
    const shB = ctx.shot({ name: '12.B NeXT', t0: 7.0, in: { type: 'dissolve', dur: .8 }, scene: OF.scene, camera: camB,
      post: { exposure: 1.12, ao: { radius: .05, intensity: .9 }, dof: { focus: 1.2, aperture: .0018, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .34, bloom: { strength: .1 } },
      update(t) { OF.proposal.visible = true; OF.statement.visible = false; const c = pB(t); applyCam(camB, c, t, .0004); shB.post.dof.focus = camB.position.distanceTo(screenAt); } });
    // 两个标注：机箱（指着那张「这是服务器，别关机」的手写标签）+ 屏幕
    ctx.callout({ shot: shB, at: labelAt, title: 'NeXT 电脑', sub: '第一台网页服务器', t0: 7.7, t1: 13.6, side: 'left', dx: -150, dy: -250, style: 'accent' });
    ctx.callout({ shot: shB, at: screenAt, title: '第一个浏览器', sub: '屏幕上是第一个网页（复原）', t0: 8.7, t1: 13.6, side: 'right', dx: 170, dy: -200 });

    /* ================= C · 一次点击 ================= */
    const camC = KIT.cam(28, .01, 50);
    const pC = camPath([[13.4, [-.1, Y + .38, .62], [-.03, Y + .33, -.08], 28], [33.2, [.06, Y + .34, .52], [-.01, Y + .33, -.08], 28]]);
    const shC = ctx.shot({ name: '12.C 一次点击', t0: 13.4, in: { type: 'blur', dur: 1.0, params: [6] }, scene: OF.scene, camera: camC,
      post: { exposure: .62, dof: { focus: .3, aperture: .02, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .45 },
      update(t) { applyCam(camC, pC(t), t, .0003); } });
    // 浏览器排版出的页面（第一个网页的上半截）
    const PW = 800, PH = 380, PS = .5;
    const pageCanvas = document.createElement('canvas'); pageCanvas.width = PW; pageCanvas.height = PH;
    const pg = pageCanvas.getContext('2d'); pg.fillStyle = '#fff'; pg.fillRect(0, 0, PW, PH); const pLinks = drawFirstPage(pg, 24, 8, PW - 48, { size: 21 });
    const clickLink = pLinks.find(l => /What/.test(l.text)) || pLinks[0];
    ctx.draw2d({ shot: shC, t0: 13.8, t1: 33.0, fade: .4, draw(g, t) {
      // 整幅压暗：背后虚化的显示器只当背景，时序图要一眼看清
      g.fillStyle = 'rgba(6,8,11,.5)'; g.fillRect(0, 0, 1920, 1080);
      // ① 网址拆解（13.8–20.9）
      const uOn = 1 - ss(20.5, 20.9, t);
      if (uOn > 0) {
        g.save(); g.globalAlpha *= uOn;
        const url = ['http://', 'info.cern.ch', '/hypertext/WWW/TheProject.html'], cols = [C_REQ, C_BLUE, C_OK], lab = ['协议：怎么取', '主机：哪台机器', '路径：机器里的哪个位置'];
        g.font = ink.mono(40, 600); const uw = g.measureText(url.join('')).width; let x = 960 - uw / 2; const uy = 164;
        panelBox(g, x - 32, 100, uw + 64, 162);
        url.forEach((s, i) => {
          g.font = ink.mono(40, 600); const w = g.measureText(s).width, k = ss(14.0 + i * .8, 14.4 + i * .8, t);
          ink.text(g, s, x, uy, { font: ink.mono(40, 600), color: k > .5 ? cols[i] : TXT });
          if (k > 0) { g.save(); g.globalAlpha *= k; ink.line(g, [[x + 2, uy + 16], [x + w - 2, uy + 16]], cols[i], 3); ink.text(g, lab[i], x + w / 2, uy + 64, { font: ink.sans(26, 600), color: cols[i], align: 'center' }); g.restore(); }
          x += w;
        });
        g.restore();
      }
      // ② 泳道（16.0 起；第 4 条 26.8 起）
      LANES.forEach(([n, d, lx], i) => {
        const k = i === 3 ? ss(26.8, 27.2, t) : ss(16.0, 16.4, t); if (k <= 0) return;
        g.save(); g.globalAlpha *= k;
        const h = d ? 84 : 60; panelBox(g, lx - 150, 296, 300, h, 'rgba(235,235,230,.35)');
        ink.text(g, n, lx, 336, { font: ink.sans(28, 600), color: TXT, align: 'center' });
        if (d) ink.text(g, d, lx, 368, { font: ink.sans(21), color: TXT2, align: 'center' });
        g.setLineDash([5, 7]); ink.line(g, [[lx, 296 + h + 4], [lx, 590]], 'rgba(235,235,230,.35)', 1.5); g.setLineDash([]);
        g.restore();
      });
      // ③ 消息箭头 + 飞行中的小包（同一组往返用同两行，下一组来之前淡出）
      MSGS.forEach(([t0, a, b, row, text, col, tOut]) => {
        if (t < t0) return; const k = ss(t0, t0 + .25, t) * (1 - ss(tOut - .4, tOut, t)); if (k <= 0) return;
        const y = ROWS[row], xa = LANES[a][2], xb = LANES[b][2], u = clamp((t - t0) / FLY), xe = lerp(xa, xb, easeIO(u)), dir = Math.sign(xb - xa);
        g.save(); g.globalAlpha *= k;
        ink.line(g, [[xa, y], [xe, y]], col, 3);
        if (u >= 1) arrowHead(g, xb, y, dir, col); else { g.fillStyle = col; g.beginPath(); g.arc(xe, y, 8, 0, 7); g.fill(); }
        g.font = ink.sans(26, 600); const tw = g.measureText(text).width, cx = (xa + xb) / 2;
        g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(cx - tw / 2 - 14, y - 46, tw + 28, 36);
        ink.text(g, text, cx, y - 18, { font: ink.sans(26, 600), color: col, align: 'center' });
        g.restore();
      });
      // ④ 服务器送回的 HTML（网页服务器下方，22.6–26.9）
      { const k = ss(22.6, 22.9, t) * (1 - ss(26.6, 26.9, t)); if (k > 0) {
        const x0 = 950, y0 = 610; g.save(); g.globalAlpha *= k;
        panelBox(g, x0, y0, 560, 186, C_OK + 'aa');
        ink.text(g, '服务器送回的 HTML 文本', x0 + 24, y0 + 38, { font: ink.sans(24, 600), color: C_OK });
        HTML.forEach((l, i) => { g.save(); g.globalAlpha *= ss(22.6 + i * .1, 22.9 + i * .1, t); ink.text(g, l, x0 + 24, y0 + 82 + i * 36, { font: ink.mono(20), color: TXT }); g.restore(); });
        g.restore();
      } }
      // ⑤ 浏览器排好的页面（浏览器下方，24.4 起）+ 排版箭头 + 点击超链接
      if (t > 24.4) {
        const k = ss(24.4, 24.8, t), x0 = 150, y0 = 610, pw = PW * PS, ph = PH * PS;
        g.save(); g.globalAlpha *= k;
        panelBox(g, x0 - 14, y0, pw + 28, ph + 82);
        ink.text(g, '浏览器排版后的页面', x0, y0 + 38, { font: ink.sans(24, 600), color: TXT });
        g.fillStyle = '#000'; g.fillRect(x0, y0 + 54, pw, 14);
        g.drawImage(pageCanvas, 0, 0, PW, PH, x0, y0 + 68, pw, ph);
        // HTML → 页面：一支绿色箭头（HTML 面板在场时）
        const ka = ss(24.4, 24.9, t) * (1 - ss(26.6, 26.9, t)); if (ka > 0) { g.save(); g.globalAlpha *= ka; const xs = 940, xe2 = lerp(xs, x0 + pw + 26, ss(24.4, 24.9, t)); ink.line(g, [[xs, 720], [xe2, 720]], C_OK, 3); arrowHead(g, xe2, 720, -1, C_OK); g.restore(); }
        if (t > 26.6) {
          const L = clickLink, ly = y0 + 68, cxp = x0 + (L.x + L.w / 2) * PS, cyp = ly + (L.y + L.h * .7) * PS, flash = ss(27.25, 27.35, t) * (1 - ss(27.35, 27.9, t));
          g.fillStyle = `rgba(255,154,74,${.3 + .5 * flash})`; g.fillRect(x0 + (L.x - 4) * PS, ly + (L.y + 2) * PS, (L.w + 8) * PS, L.h * PS);
          const m = easeIO(ss(26.6, 27.2, t)), px = lerp(cxp + 120, cxp, m), py = lerp(cyp + 90, cyp, m);
          const rk = ss(27.3, 27.9, t); if (rk > 0 && rk < 1) { g.save(); g.globalAlpha *= 1 - rk; g.strokeStyle = ink.accent; g.lineWidth = 3; g.beginPath(); g.arc(cxp, cyp, 10 + 34 * rk, 0, 7); g.stroke(); g.restore(); }
          g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + 26); g.lineTo(px + 7, py + 19); g.lineTo(px + 13, py + 31); g.lineTo(px + 17, py + 29); g.lineTo(px + 11, py + 17); g.lineTo(px + 20, py + 17); g.closePath(); g.fill(); g.stroke();
        }
        g.restore();
      }
    } });

    /* ================= D · 开放 → 爆发 ================= */
    const camD = KIT.cam(30, .01, 50);
    const pD = camPath([[32.4, [stmtAt.x + .1, Y + .42, stmtAt.z + .34], [stmtAt.x, Y, stmtAt.z], 30], [36.2, [stmtAt.x + .05, Y + .3, stmtAt.z + .22], [stmtAt.x - .01, Y, stmtAt.z - .02], 28], [43.0, [stmtAt.x, Y + .5, stmtAt.z + .5], [stmtAt.x, Y, stmtAt.z], 30]]);
    const shD = ctx.shot({ name: '12.D 开放', t0: 32.4, in: { type: 'dissolve', dur: .8 }, scene: OF.scene, camera: camD,
      post: { exposure: 1.05, ao: { radius: .02, intensity: .8 }, dof: { focus: .5, aperture: .002, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .38 },
      update(t) { OF.proposal.visible = false; OF.statement.visible = true; const c = pD(t); applyCam(camD, c, t, .0004); shD.post.dof.focus = camD.position.distanceTo(c.l); shD.post.exposure = 1.08 - .5 * ss(36.5, 37.3, t); } });
    ctx.lower({ t0: 32.5, t1: 36.9, name: 'CERN 声明 · 1993 年 4 月 30 日', credit: '标题与日期按原件排印，正文以灰条示意' });
    // 网站数量：曲线 36.9–38.2 画完，终点数字从 38.2 起一直停到本章结束（旁白 38.4 起讲「从一个到近十五亿」）
    ctx.draw2d({ shot: shD, t0: 36.7, t1: 42.9, fade: .4, draw(g, t) {
      const P = { x: 180, y: 110, w: 1560, h: 770 }, yc = lerp(1990.5, 2026.6, easeIO(ss(36.9, 38.2, t)));
      panelBox(g, P.x, P.y, P.w, P.h);
      g.font = ink.sans(32, 600); const tw = g.measureText('开放之后，网站数量暴涨').width;
      ink.text(g, '开放之后，网站数量暴涨', P.x + 40, P.y + 60, { font: ink.sans(32, 600), color: TXT });
      ink.text(g, '纵轴每格 ×10', P.x + 64 + tw, P.y + 60, { font: ink.sans(22), color: TXT2 });
      for (let i = 0; i <= GR.lg1; i++) { const y = gy(Math.pow(10, i)); ink.line(g, [[GR.x0, y], [GR.x1, y]], i === 0 ? 'rgba(235,235,230,.5)' : 'rgba(235,235,230,.1)', 1); }
      // 纵轴不再逐格标数：三个读数直接写在点旁边，标题旁注明「每格 ×10」
      [1990, 2000, 2010, 2020].forEach(yr => { const x = gx(yr); ink.line(g, [[x, GR.y0], [x, GR.y0 + 8]], 'rgba(235,235,230,.5)', 1); ink.text(g, String(yr), x, GR.y0 + 38, { font: ink.mono(22), color: TXT2, align: 'center' }); });
      // 1993 年 4 月：免费开放
      const xo = gx(1993.33); g.save(); g.globalAlpha *= ss(37.0, 37.3, t); g.setLineDash([6, 6]); ink.line(g, [[xo, GR.y0], [xo, GR.y1]], 'rgba(255,122,48,.75)', 2); g.setLineDash([]); ink.text(g, '1993 年开放', xo + 12, GR.y1 + 6, { font: ink.sans(22, 600), color: ink.accent }); g.restore();
      const pts = SITES.filter(([yr]) => yr <= yc).map(([yr, n]) => [gx(yr), gy(n)]);
      const nxt = SITES.find(([yr]) => yr > yc); if (nxt && pts.length) { const prev = SITES[pts.length - 1], u = (yc - prev[0]) / (nxt[0] - prev[0]); pts.push([lerp(gx(prev[0]), gx(nxt[0]), u), lerp(gy(prev[1]), gy(nxt[1]), u)]); }
      if (pts.length > 1) ink.line(g, pts, ink.accent, 3.5);
      SITES.forEach(([yr, n], i) => { const k = clamp((yc - yr) / .5); if (k <= 0) return; const last = i === SITES.length - 1; g.save(); g.globalAlpha *= last ? ss(38.1, 38.3, t) : k; g.fillStyle = last ? ink.accent : TXT; g.beginPath(); g.arc(gx(yr), gy(n), last ? 9 : 6, 0, 7); g.fill(); g.restore(); });
      // 三个读数：起点、2000 年、终点（大字）
      g.save(); g.globalAlpha *= clamp((yc - 1991) / .5); g.font = ink.sans(26, 600); g.fillStyle = 'rgba(8,10,14,.92)'; g.fillRect(gx(1991) + 48, GR.y0 - 44, g.measureText('1991 年 · 1 个').width + 16, 40); ink.text(g, '1991 年 · 1 个', gx(1991) + 56, GR.y0 - 14, { font: ink.sans(26, 600), color: TXT }); g.restore();
      g.save(); g.globalAlpha *= clamp((yc - 2000) / .5); ink.text(g, '2000 年 · 1 700 万', gx(2000) + 16, gy(1.7e7) + 40, { font: ink.sans(26, 600), color: TXT }); g.restore();
      g.save(); g.globalAlpha *= ss(38.2, 38.45, t);
      ink.text(g, '约 14.9 亿', gx(2026) + 20, gy(1.49e9) - 66, { font: ink.cond(52, 600), color: ink.accent, align: 'right' });
      ink.text(g, '2026 年 · 其中活跃的约 2.2 亿', gx(2026) + 20, gy(1.49e9) - 28, { font: ink.sans(22), color: TXT2, align: 'right' });
      g.restore();
      ink.text(g, '数据：M. Gray（MIT）早期统计、Netcraft 网站调查（2026 年 7 月）', P.x + P.w - 28, P.y + P.h - 20, { font: ink.sans(17), color: 'rgba(238,238,232,.72)', align: 'right' });
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(2.9, 'tick', .6);
    ctx.cue(7.0, 'swoosh', .25); ctx.cue(7.7, 'tap', .6);
    ctx.cue(13.4, 'whoosh', 1.0, .22); for (let i = 0; i < 3; i++) ctx.cue(14.0 + i * .8, 'blip', 800 + i * 150, .04);
    for (const [t0] of MSGS) { ctx.cue(t0, 'tick', .6); ctx.cue(t0 + FLY, 'blip', 1000, .04); }
    ctx.cue(27.3, 'click', .6);
    ctx.cue(32.4, 'swoosh', .25); ctx.cue(36.7, 'riser', 1.6, .12); ctx.cue(38.2, 'chime', 880, .07);
  },
};
