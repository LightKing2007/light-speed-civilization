/* 13 · 口袋里的电波（1979 – 2019）
   A  车载电话（复原示意）：听筒、按键、卷曲电话线
   B  黄昏城市的航拍：地面上出现六边形小区网格，每格附近的楼顶一座三扇区基站；7 种颜色（频率组），同色的小区彼此不相邻
   C  俯视「地图」：一辆车沿街穿过小区边界，连接从基站 A 跳到基站 B ——「切换」
   D1 星座图：QPSK / 16QAM / 256QAM 并排，点越密，每个点携带的比特越多
   D2 楼顶的 5G 大规模天线阵列（8 × 8 交叉振子 = 128 个单元）：先特写面板，再拉远看几束窄波束分别对准街上的手机
   E  代际速率对数阶梯：2G 9.6 kb/s → 5G 20 Gb/s（标准峰值，非实测），约两百万倍
   道具在 src/props/13/cell.js。所有动画都是 t 的纯函数。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildCarPhone, buildCity, HEX, GROUP_COLORS, aimBeam } from '../props/13/cell.js';

/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.92)', CYAN = '#9fdcff';
const panelBox = (g, x, y, w, h, edge = 'rgba(235,235,230,.22)') => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, edge, 1); };
/** 小区六边形描边（世界坐标的 6 个角投影到屏幕） */
const strokeHex = (g, proj, c, color, lw) => {
  const P = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3, p = proj(V(c.x + Math.cos(a) * HEX.R, .1, c.z + Math.sin(a) * HEX.R)); if (!p) return; P.push(p); }
  g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.stroke();
};
/** 带底板的小标签（居中） */
const tag = (g, s, x, y, { font = ink.sans(26, 600), color = TXT, edge = 'rgba(235,235,230,.3)' } = {}) => {
  g.font = font; const w = g.measureText(s).width + 28; g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x - w / 2, y - 22, w, 42); ink.rect(g, x - w / 2, y - 22, w, 42, edge, 1.2);
  ink.text(g, s, x, y + 9, { font, color, align: 'center' });
};

/* ---------- C · 切换 ---------- */
const CAR0 = 19.6, CAR1 = 25.8, ROUTE = [V(4, 0, 5.6), V(24, 0, 5.6)];   // 街道 z = 5.6；车在 ~21.8 s 越过 A / B 两个小区的边界
const carAt = t => ROUTE[0].clone().lerp(ROUTE[1], clamp((t - CAR0) / (CAR1 - CAR0)));
/* ---------- D1 · 星座图 ---------- */
const QAM = [[26.2, 4, 'QPSK', 2], [27.0, 16, '16QAM', 4], [27.8, 256, '256QAM', 8]];
/* ---------- E · 代际 ---------- */
const GENS = [['1G', 1979, null, '模拟语音'], ['2G', 1991, 9.6e3, '9.6 kb/s'], ['3G', 2001, 2e6, '2 Mb/s'], ['4G', 2009, 1e9, '1 Gb/s'], ['5G', 2019, 2e10, '20 Gb/s']];

export default {
  id: '13', status: 'implemented', slug: 'cellular', title: '口袋里的电波', dur: 46,
  card: {"title": "口袋里的电波", "short": "口袋里的电波", "meta": "蜂窝网络 · 1979 — 2019"},
  stamps: [[0, "1979"], [38.8, "2019"]],
  caps: [[0.4, 6.4, "电波也在走进口袋。早在 1979 年，东京就开通了第一代商用蜂窝网络——起初装在汽车里。"], [6.8, 13.0, "频谱有限，怎样让成千上万人同时通话？办法是把城市切成许多「蜂窝」小区："], [13.4, 19.4, "每个小区一座基站，用较低的功率只覆盖一小片；相隔足够远的小区，可以重复使用同一段频率。"], [19.8, 25.4, "你移动时，通话会被无缝交给下一座基站——这叫「切换」。"], [25.8, 32.0, "从模拟到数字，每一代都在榨取频谱：把更多比特编进电波的振幅和相位里；"], [32.4, 38.4, "再用上百个天线单元组成阵列，把波束精确地对准每一部手机。"], [38.8, 45.6, "从 2G 的每秒 9.6 千比特，到 5G 标准峰值的每秒 20 吉比特，不到三十年，无线速率提升了约两百万倍。"]],
  credits: ['assets/tex/brown_leather', 'assets/tex/asphalt_02', 'assets/hdri/shanghai_bund_2k.hdr'],
  async build(ctx) {
    const { KIT } = ctx;

    /* ================= A · 车载电话 ================= */
    const CP = await buildCarPhone(KIT);
    const camA = KIT.cam(30, .005, 20);
    // 听筒放在画面中心偏右：开头左侧 40% 留给章节卡，左下留给署名条
    const pA = camPath([[0, [.3, .34, .42], [-.03, .1, .035], 30], [7.0, [.15, .26, .27], [-.015, .12, .008], 28]]);
    const shA = ctx.shot({ name: '13.A 车载电话', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: CP.scene, camera: camA,
      post: { exposure: 1.1, ao: { radius: .01, intensity: .9 }, dof: { focus: .4, aperture: .002, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .36 },
      update(t) { const c = pA(t); applyCam(camA, c, t, .0004); shA.post.dof.focus = camA.position.distanceTo(CP.anchors.keys); } });
    ctx.lower({ t0: .9, t1: 6.5, name: '车载电话（复原示意）', credit: '按公开资料复原，并非原物照片' });

    /* ================= B · 蜂窝 ================= */
    const CT = await buildCity(KIT);
    const sitesAll = CT.sites;
    const setCity = (t, mode) => {
      CT.hexMat.uniforms.uReveal.value = mode === 'B' ? lerp(0, 130, easeIO(ss(7.0, 11.8, t))) : 130;
      CT.hexMat.uniforms.uFill.value = mode === 'B' ? ss(13.4, 14.4, t) : mode === 'C' ? .55 : .35;
      CT.hexMat.uniforms.uOp.value = mode === 'D2' ? .25 : 1;
      sitesAll.forEach((s, i) => { s.led.material.emissiveIntensity = Math.sin(t * 3 + i * 1.7) > .6 ? 3 : .4; s.group.visible = mode !== 'B' || Math.hypot(s.top.x, s.top.z) < lerp(0, 130, easeIO(ss(7.0, 11.8, t))) - 4; });
      CT.car.visible = mode === 'C';
      CT.links.forEach(m => { m.visible = false; });
      CT.mimo.forEach(m => { m.visible = mode === 'D2'; }); CT.phonePts.visible = mode === 'D2';
      if (mode === 'D2') nearAAU.forEach(s => { s.group.visible = false; });   // 5G 面板同一栋楼顶上的普通基站：特写时会被误认成面板，藏起来
    };
    const site0 = sitesAll.find(s => s.q === 0 && s.r === 0);
    CT.scene.updateMatrixWorld(true);
    const aauAt = CT.aau.getWorldPosition(V()), nearAAU = sitesAll.filter(s => Math.hypot(s.top.x - aauAt.x, s.top.z - aauAt.z) < 8);
    const camB = KIT.cam(36, .5, 2000);
    // 航拍 → 从东南方高处推近中心那座基站（13.4–15.8：俯角约 66°，楼顶的基站落在它那一格的描边里，整格小区都在画面中）
    // → 升高拉远，7 个同色（橙色）小区都在画面里
    const pB = camPath([
      [6.8, [70, 100, 150], [0, 0, 10], 36],
      [12.4, [46, 70, 70], [0, 4, 6], 36],
      [14.0, [10, 62, 24], [-1, 3, 1], 34],
      [15.8, [9, 61, 22], [-1, 3, 1], 34],
      [17.8, [20, 150, 110], [0, 0, 4], 36],
      [20.6, [4, 152, 104], [0, 0, 4], 36]]);
    const shB = ctx.shot({ name: '13.B 蜂窝', t0: 6.8, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camB,
      post: { exposure: 1.5, ao: { radius: 2, intensity: .7 }, grade: ctx.grade.night, vignette: .26, bloom: { strength: .2 } },
      update(t) { setCity(t, 'B'); applyCam(camB, pB(t), t, .0002); } });
    ctx.callout({ shot: shB, at: site0.top, title: '基站', sub: '功率低，只覆盖这一格', t0: 13.4, t1: 17.9, side: 'right', dx: 140, dy: -110, style: 'accent' });
    // 这一格（中心小区）描边闪动
    ctx.draw2d({ shot: shB, t0: 13.4, t1: 17.9, draw(g, t, a, proj) { strokeHex(g, proj, site0.center, ink.accent, 3 + 1.5 * (.5 + .5 * Math.sin(t * 5))); } });
    // 频率复用：所有橙色组小区描边 + 右上角说明
    ctx.draw2d({ shot: shB, t0: 15.9, t1: 20.6, draw(g, t, a, proj) {
      const pulse = .65 + .35 * Math.sin((t - 15.9) * 4);
      g.save(); g.globalAlpha *= pulse; for (const s of sitesAll) if (s.group7 === 0) strokeHex(g, proj, s.center, GROUP_COLORS[0], 4); g.restore();
      const X = 1316, Y = 108, Wd = 548;
      panelBox(g, X, Y, Wd, 132);
      ink.text(g, '颜色相同 = 频率相同', X + 26, Y + 54, { font: ink.sans(32, 600), color: TXT });
      ink.text(g, '隔得够远，就能重复使用', X + 26, Y + 100, { font: ink.sans(24), color: GROUP_COLORS[0] });
    } });

    /* ================= C · 切换 ================= */
    // 每个时刻离车最近的基站 = 服务基站；第一次换基站的时刻 = 切换时刻
    const nearest = p => sitesAll.reduce((b, s) => (Math.hypot(s.top.x - p.x, s.top.z - p.z) < Math.hypot(b.top.x - p.x, b.top.z - p.z) ? s : b), sitesAll[0]);
    let HO = null; for (let t = CAR0; t <= CAR1; t += .02) if (nearest(carAt(t)) !== nearest(carAt(CAR0))) { HO = t; break; }
    if (HO == null) throw new Error('切换路线没有穿过小区边界');
    const S0 = nearest(carAt(CAR0)), S1 = nearest(carAt(CAR1));
    const camC = KIT.cam(34, .1, 2000);
    const shC = ctx.shot({ name: '13.C 切换', t0: 19.8, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camC,
      post: { exposure: 1.4, ao: { radius: 1, intensity: .8 }, grade: ctx.grade.night, vignette: .28, bloom: { strength: .25 } },
      update(t) {
        setCity(t, 'C'); const p = carAt(t); CT.car.position.copy(p); CT.car.rotation.y = 0;
        const roof = p.clone().add(V(0, .35, 0)), k = ss(HO - .15, HO + .25, t);
        [[S0, 1 - k], [S1, k]].forEach(([s, a], i) => { const m = CT.links[i]; m.visible = a > .01; if (m.visible) { aimBeam(m, s.top, roof); m.material.uniforms.uOpacity.value = a; } });
        // 几乎正上方俯视、正对街道：两旁的楼挡不住街上的车；两座基站在画面上方左右两侧，车从左往右开过小区分界线
        const x = lerp(10.5, 12.5, clamp((t - 19.8) / 6.6));
        camC.position.set(x, 46, 7); camC.lookAt(x, 0, 4);
      } });
    ctx.callout({ shot: shC, at: t => carAt(t).add(V(0, .4, 0)), title: '你的手机', sub: '在车里，边走边通话', t0: 20.9, t1: 26.2, side: 'right', dx: 120, dy: 120 });
    ctx.draw2d({ shot: shC, t0: 20.1, t1: 26.4, draw(g, t, a, proj) {
      for (const [s, n] of [[S0, 'A'], [S1, 'B']]) {
        const p = proj(s.top.clone().add(V(0, .8, 0))); if (!p) continue; const on = (n === 'A') === (t < HO);
        tag(g, '基站 ' + n, p.x, p.y - 44, { color: on ? CYAN : TXT, edge: on ? CYAN : 'rgba(235,235,230,.3)' });
      }
    } });
    ctx.draw2d({ shot: shC, t0: HO - .1, t1: 26.4, draw(g) {
      const X = 960, Y = 112, Wd = 470; panelBox(g, X - Wd / 2, Y, Wd, 84, ink.accent);
      g.font = ink.sans(32, 600); const a = '切换：', b = '从基站 A 到基站 B', wa = g.measureText(a).width, wb = g.measureText(b).width, x0 = X - (wa + wb) / 2;
      ink.text(g, a, x0, Y + 54, { font: ink.sans(32, 600), color: ink.accent }); ink.text(g, b, x0 + wa, Y + 54, { font: ink.sans(32, 600), color: TXT });
    } });

    /* ================= D1 · 星座图 ================= */
    const camD = KIT.cam(36, .5, 2000);
    const pD = camPath([[25.8, [60, 70, 90], [0, 0, 0], 36], [33.2, [80, 60, 60], [0, 0, 0], 36]]);
    const shD = ctx.shot({ name: '13.D1 星座图', t0: 25.8, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camD,
      post: { exposure: .6, dof: { focus: 20, aperture: .01, maxBlur: 8 }, grade: ctx.grade.night, vignette: .45 },
      update(t) { setCity(t, 'D1'); applyCam(camD, pD(t), t, .0002); } });
    ctx.draw2d({ shot: shD, t0: 26.0, t1: 33.2, draw(g, t) {
      const P = { x: 150, y: 116, w: 1620, h: 750 }, S = 400, cy = 474;
      panelBox(g, P.x, P.y, P.w, P.h);
      ink.text(g, '点越密，每个点带的比特越多', P.x + 40, P.y + 60, { font: ink.sans(32, 600), color: TXT });
      QAM.forEach(([t0, M, name, bits], q) => {
        const k = ss(t0, t0 + .3, t); if (k <= 0) return;
        const m = Math.sqrt(M), cx = 960 + (q - 1) * 540, x0 = cx - S / 2, y0 = cy - S / 2;
        g.save(); g.globalAlpha *= k;
        g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x0, y0, S, S);
        ink.line(g, [[x0, cy], [x0 + S, cy]], 'rgba(235,235,230,.32)', 1); ink.line(g, [[cx, y0], [cx, y0 + S]], 'rgba(235,235,230,.32)', 1);
        const sel = Math.floor((t - t0) * 2.2 + q * 5) % M, r = M === 4 ? 15 : M === 16 ? 10 : 4.6;
        for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) { const px = x0 + S * (i + .5) / m, py = y0 + S * (j + .5) / m; if (i * m + j === sel) continue; g.fillStyle = CYAN; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
        // 当前发送的这个点：一根箭头从原点指向它（长短 = 振幅，方向 = 相位）
        const si = Math.floor(sel / m), sj = sel % m, sx = x0 + S * (si + .5) / m, sy = y0 + S * (sj + .5) / m, ang = Math.atan2(sy - cy, sx - cx);
        ink.line(g, [[cx, cy], [sx, sy]], ink.accent, 2.6); g.fillStyle = ink.accent; g.beginPath(); g.arc(sx, sy, Math.max(r * 1.5, 8), 0, 7); g.fill();
        g.beginPath(); g.moveTo(sx - Math.cos(ang) * 4, sy - Math.sin(ang) * 4); g.lineTo(sx - Math.cos(ang - .4) * 22, sy - Math.sin(ang - .4) * 22); g.lineTo(sx - Math.cos(ang + .4) * 22, sy - Math.sin(ang + .4) * 22); g.closePath(); g.fill();
        ink.text(g, name, cx, y0 + S + 52, { font: ink.cond(40, 600), color: ink.accent, align: 'center' });
        ink.text(g, `每个点 ${bits} 比特`, cx, y0 + S + 90, { font: ink.sans(26, 600), color: TXT, align: 'center' });
        g.restore();
      });
      g.save(); g.globalAlpha *= ss(28.6, 28.9, t);   // 旁白讲到「振幅和相位」时出现
      ink.text(g, '橙色箭头：长短 = 振幅，方向 = 相位', P.x + P.w - 40, P.y + 60, { font: ink.sans(24), color: TXT2, align: 'right' });
      g.restore();
    } });

    /* ================= D2 · 大规模天线阵列 ================= */
    CT.scene.updateMatrixWorld(true);
    const face = CT.aauFace.getWorldPosition(V()), nrm = V(0, 0, 1).applyQuaternion(CT.aau.quaternion);
    // 4 部手机都在面板前方、拉远后的镜头看得见的街面上（东西向街道 z ≈ 39.2 与南北向街道 x ≈ ±5.6 的路口附近），沿街慢慢走
    const PH = [[V(-4.5, .2, 39.2), 'x'], [V(5.6, .2, 39.6), 'x'], [V(10, .2, 39.0), 'x'], [V(-5.6, .2, 45.5), 'z']];
    const phoneAt = (i, t) => { const [p, d] = PH[i], u = Math.sin(t * .5 + i * 2), w = Math.cos(t * .4 + i) * .2; return p.clone().add(d === 'x' ? V(u, 0, w) : V(w, 0, u)); };
    const camE = KIT.cam(40, .05, 2000);
    // 先特写面板（看得清 8 × 8 个十字振子），33.4 起向后上方拉远：面板留在画面上方，几束波从它出发分别落到街上的手机
    const pE = camPath([
      [32.4, [face.x - 1.25, face.y + .2, face.z + 3.1], [face.x + .55, face.y - .12, face.z + .5], 36],
      [33.6, [face.x - 1.4, face.y + .3, face.z + 3.4], [face.x + .55, face.y - .14, face.z + .5], 36],
      [35.8, [4, 20, 57], [3, 1.5, 40], 40],
      [39.6, [4.6, 21, 59], [3.2, 1.5, 40], 40]]);
    const shE = ctx.shot({ name: '13.D2 大规模天线', t0: 32.4, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camE,
      post: { exposure: 1.3, ao: { radius: .5, intensity: .8 }, dof: { focus: 4, aperture: .001, maxBlur: 6 }, grade: ctx.grade.night, vignette: .3, bloom: { strength: .28 } },
      update(t) {
        setCity(t, 'D2');
        PH.forEach((_, i) => { const p = phoneAt(i, t); p.toArray(CT.phones, i * 3); CT.phoneA[i] = ss(32.8 + i * .4, 33.2 + i * .4, t); const m = CT.mimo[i]; aimBeam(m, face.clone().add(nrm.clone().multiplyScalar(.05)), p); m.material.uniforms.uOpacity.value = .3 * CT.phoneA[i]; });
        CT.phonePts.geometry.attributes.position.needsUpdate = true; CT.phonePts.geometry.attributes.aAlpha.needsUpdate = true;
        const c = pE(t); applyCam(camE, c, t, .0002); shE.post.dof.focus = camE.position.distanceTo(face);
      } });
    ctx.callout({ shot: shE, at: face, title: '5G 天线阵列', sub: '共 128 个天线单元', t0: 33.2, t1: 37.8, side: 'right', dx: 150, dy: -90, style: 'accent' });
    ctx.callout({ shot: shE, at: t => phoneAt(1, t), title: '每部手机', sub: '各有一束波对准它（示意）', t0: 34.6, t1: 39.4, side: 'left', dx: 150, dy: 120 });

    /* ================= E · 代际速率 ================= */
    const camF = KIT.cam(36, .5, 2000);
    const pF = camPath([[38.8, [-90, 70, 80], [0, 0, 0], 36], [47.4, [-110, 60, 40], [0, 0, 0], 36]]);
    const shF = ctx.shot({ name: '13.E 代际', t0: 38.8, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camF,
      post: { exposure: .6, dof: { focus: 20, aperture: .01, maxBlur: 8 }, grade: ctx.grade.night, vignette: .45 },
      update(t) { setCity(t, 'E'); applyCam(camF, pF(t), t, .0002); } });
    ctx.draw2d({ shot: shF, t0: 39.0, t1: 46.6, fade: .5, draw(g, t) {
      const P = { x: 170, y: 112, w: 1580, h: 768 }, X0 = 420, X1 = 1300, Y0 = 760, Y1 = 280, lg = n => (Math.log10(n) - 3) / (11 - 3);
      panelBox(g, P.x, P.y, P.w, P.h);
      ink.text(g, '各代标准规定的峰值速率（非实测）· 纵轴每格 ×10', P.x + 40, P.y + 50, { font: ink.sans(22), color: TXT2 });
      for (let i = 0; i <= 8; i++) { const y = lerp(Y0, Y1, i / 8); ink.line(g, [[X0, y], [X1, y]], i ? 'rgba(235,235,230,.1)' : 'rgba(235,235,230,.5)', 1); }
      // 纵轴不再逐格标数：每根柱子顶上直接写速率，眉题注明「每格 ×10」
      const bw = (X1 - X0) / GENS.length * .6;
      GENS.forEach(([n, yr, v, d], i) => {
        const x = X0 + (X1 - X0) * (i + .5) / GENS.length, k = easeIO(ss(39.4 + i * .5, 39.9 + i * .5, t)), hi = i === 4;
        ink.text(g, n, x, Y0 + 44, { font: ink.cond(36, 600), align: 'center', color: hi ? ink.accent : TXT }); ink.text(g, String(yr), x, Y0 + 76, { font: ink.mono(20), color: TXT2, align: 'center' });
        if (!v) { g.save(); g.globalAlpha *= k; ink.text(g, d, x, Y0 - 22, { font: ink.sans(24), color: TXT2, align: 'center' }); g.restore(); return; }
        const top = lerp(Y0, Y1, lg(v) * k); g.fillStyle = hi ? 'rgba(255,122,48,.9)' : 'rgba(159,220,255,.78)'; g.fillRect(x - bw / 2, top, bw, Y0 - top);
        g.save(); g.globalAlpha *= ss(.6, 1, k); ink.text(g, d, x, top - 16, { font: ink.mono(26, 600), align: 'center', color: hi ? ink.accent : TXT }); g.restore();
      });
      const ks = ss(41.9, 42.3, t); g.save(); g.globalAlpha *= ks;
      ink.text(g, '2G → 5G', 1376, 420, { font: ink.sans(30, 600), color: TXT });
      ink.text(g, '约 200 万倍', 1372, 500, { font: ink.cond(72, 600), color: ink.accent });
      g.restore();
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(2.2, 'tap', .6); ctx.cue(2.5, 'tap', .6); ctx.cue(2.8, 'tap', .6);
    ctx.cue(6.8, 'whoosh', 1.2, .25); ctx.cue(7.2, 'riser', 4.4, .1); ctx.cue(13.4, 'chime', 660, .06); ctx.cue(15.9, 'blip', 900, .05);
    ctx.cue(19.8, 'swoosh', .25); ctx.cue(HO, 'ding', .5);
    ctx.cue(25.8, 'swoosh', .25); for (const [t0] of QAM) ctx.cue(t0, 'blip', 700, .05);
    ctx.cue(32.4, 'whoosh', 1.0, .22); for (let i = 0; i < 4; i++) ctx.cue(32.8 + i * .4, 'tick', .6);
    ctx.cue(38.8, 'swoosh', .25); for (let i = 0; i < 5; i++) ctx.cue(39.4 + i * .5, 'tick', .6); ctx.cue(41.9, 'chime', 880, .07);
  },
};
