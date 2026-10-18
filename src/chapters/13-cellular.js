/* 13 · 口袋里的电波（1979 – 2019）
   A  车载电话（复原示意）：听筒、按键、卷曲电话线
   B  黄昏城市的航拍：地面上出现六边形小区网格，每格中心一座三扇区基站；7 种颜色（频率组），同色的小区彼此不相邻
   C  一辆车沿街穿过小区边界，连接从一座基站跳到下一座 ——「切换 HANDOVER」
   D1 星座图：QPSK → 16QAM → 64QAM → 256QAM，每个点 = 一种振幅 + 相位，携带的比特越来越多
   D2 楼顶的 5G 大规模天线阵列（8 × 8 交叉振子 = 128 个单元），几束窄波束分别对准街上的手机
   E  代际速率对数阶梯：2G 9.6 kb/s → 5G 20 Gb/s（标准峰值，非实测），约两百万倍
   道具在 src/props/13/cell.js。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildCarPhone, buildCity, hexCenter, reuse, GROUP_COLORS, aimBeam } from '../props/13/cell.js';

/* ---------- C · 切换 ---------- */
const CAR0 = 19.6, CAR1 = 25.8, ROUTE = [V(1, 0, 5.6), V(21.5, 0, 5.6)];
const carAt = t => ROUTE[0].clone().lerp(ROUTE[1], clamp((t - CAR0) / (CAR1 - CAR0)));
/* ---------- D1 · 星座图 ---------- */
const QAM = [[25.9, 4, 'QPSK', 2], [27.4, 16, '16QAM', 4], [28.9, 64, '64QAM', 6], [30.4, 256, '256QAM', 8]];
/* ---------- E · 代际 ---------- */
const GENS = [['1G', 1979, null, '模拟语音'], ['2G', 1991, 9.6e3, '9.6 kb/s · GSM'], ['3G', 2001, 2e6, '2 Mb/s · IMT-2000'], ['4G', 2009, 1e9, '1 Gb/s · IMT-Advanced'], ['5G', 2019, 2e10, '20 Gb/s · IMT-2020']];

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
    const pA = camPath([[0, [.3, .34, .42], [.02, .1, 0], 30], [7.0, [.15, .26, .27], [.02, .12, -.01], 28]]);
    const shA = ctx.shot({ name: '13.A 车载电话', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: CP.scene, camera: camA,
      post: { exposure: 1.05, ao: { radius: .01, intensity: .9 }, dof: { focus: .4, aperture: .0025, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .4 },
      update(t) { const c = pA(t); applyCam(camA, c, t, .0004); shA.post.dof.focus = camA.position.distanceTo(CP.anchors.keys); } });
    ctx.lower({ t0: 1.0, t1: 6.4, name: '车载电话（复原示意）', meta: '日本电电公社（NTT）· 1979 年 12 月 · 东京 · 第一个商用蜂窝网络', credit: '按公开资料复原，并非原物照片' });

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
    };
    const camB = KIT.cam(36, .5, 2000);
    const pB = camPath([[6.8, [-60, 95, 150], [0, 0, 10], 36], [13.4, [-20, 85, 125], [0, 0, 5], 36], [19.8, [40, 80, 110], [5, 0, 5], 36]]);
    const shB = ctx.shot({ name: '13.B 蜂窝', t0: 6.8, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camB,
      post: { exposure: 1.1, ao: { radius: 2, intensity: .7 }, grade: ctx.grade.night, vignette: .32, bloom: { strength: .22 } },
      update(t) { setCity(t, 'B'); applyCam(camB, pB(t), t, .0002); } });
    const site0 = sitesAll.find(s => s.q === 0 && s.r === 0);
    ctx.callout({ shot: shB, at: site0.top, title: '基站', sub: '三个扇区天线 · 只覆盖一小片', t0: 11.0, t1: 13.2, side: 'right', dx: 130, dy: -120, style: 'accent' });
    ctx.draw2d({ shot: shB, t0: 13.6, t1: 19.8, draw(g, t, a, proj) {
      const x = 1340, y = 130;
      g.fillStyle = 'rgba(8,10,14,.78)'; g.fillRect(x - 24, y - 40, 520, 150); ink.corners(g, x - 24, y - 40, 520, 150, 12, ink.dim);
      ink.text(g, 'FREQUENCY REUSE · 频率复用', x, y - 8, { font: ink.mono(16), color: ink.dim });
      GROUP_COLORS.forEach((c, i) => { g.fillStyle = c; g.fillRect(x + i * 40, y + 14, 30, 30); });
      ink.text(g, '7 种颜色 = 7 段频率 · 相邻小区颜色都不同', x, y + 84, { font: ink.sans(18) });
      // 同一种颜色（橙色组）的小区：画圈并标出
      const k = ss(15.4, 15.9, t);
      if (k > 0) for (const s of sitesAll) { if (s.group7 !== 0) continue; const p = proj(V(s.top.x, 0, s.top.z)); if (!p) continue; const u = ((t - 15.4) % 1.4) / 1.4; g.save(); g.globalAlpha *= k; g.strokeStyle = GROUP_COLORS[0]; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y, 16 + 18 * u, 0, 7); g.stroke(); ink.text(g, '同频', p.x, p.y - 26, { font: ink.sans(16, 600), color: GROUP_COLORS[0], align: 'center' }); g.restore(); }
    } });

    /* ================= C · 切换 ================= */
    // 每个时刻离车最近的基站 = 服务基站；第一次换基站的时刻 = 切换时刻
    const nearest = p => sitesAll.reduce((b, s) => (Math.hypot(s.top.x - p.x, s.top.z - p.z) < Math.hypot(b.top.x - p.x, b.top.z - p.z) ? s : b), sitesAll[0]);
    let HO = null; for (let t = CAR0; t <= CAR1; t += .02) if (nearest(carAt(t)) !== nearest(carAt(CAR0))) { HO = t; break; }
    if (HO == null) throw new Error('切换路线没有穿过小区边界');
    const S0 = nearest(carAt(CAR0)), S1 = nearest(carAt(CAR1));
    const camC = KIT.cam(34, .1, 2000);
    const shC = ctx.shot({ name: '13.C 切换', t0: 19.8, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camC,
      post: { exposure: 1.1, ao: { radius: 1, intensity: .8 }, grade: ctx.grade.night, vignette: .34, bloom: { strength: .25 } },
      update(t) {
        setCity(t, 'C'); const p = carAt(t); CT.car.position.copy(p); CT.car.rotation.y = 0;
        const roof = p.clone().add(V(0, .35, 0)), k = ss(HO - .15, HO + .25, t);
        [[S0, 1 - k], [S1, k]].forEach(([s, a], i) => { const m = CT.links[i]; m.visible = a > .01; if (m.visible) { aimBeam(m, s.top, roof); m.material.uniforms.uOpacity.value = a; } });
        camC.position.set(p.x - 4, 68, p.z + 22); camC.lookAt(p.x + 2, 0, p.z - 2);   // 接近正俯视的「地图」视角：街道里的车、小区边界、两座基站都看得见
      } });
    ctx.draw2d({ shot: shC, t0: 20.2, t1: 25.8, draw(g, t, a, proj) {
      const on = ss(HO - .1, HO + .2, t) * (1 - ss(HO + 2.6, HO + 3.2, t));
      for (const [s, n] of [[S0, 'A'], [S1, 'B']]) { const p = proj(s.top.clone().add(V(0, .8, 0))); if (p) ink.text(g, '基站 ' + n, p.x, p.y - 12, { font: ink.sans(24, 600), align: 'center', color: (n === 'A') === (t < HO) ? '#9fdcff' : ink.dim }); }
      const pc = proj(carAt(t).add(V(0, .4, 0))); if (pc) { ink.text(g, '你的手机（在车里）', pc.x + 34, pc.y + 8, { font: ink.sans(20, 600), color: '#9fdcff' }); }
      if (on > 0) { g.save(); g.globalAlpha *= on; const x = 960, y = 150; g.fillStyle = 'rgba(8,10,14,.8)'; g.fillRect(x - 240, y - 50, 480, 112); ink.corners(g, x - 240, y - 50, 480, 112, 12, ink.accent); ink.text(g, 'HANDOVER · 切换', x, y - 12, { font: ink.mono(18, 600), color: ink.accent, align: 'center' }); ink.text(g, '基站 A  →  基站 B', x, y + 34, { font: ink.sans(26, 600), align: 'center' }); g.restore(); }
    } });

    /* ================= D1 · 星座图 ================= */
    const camD = KIT.cam(36, .5, 2000);
    const pD = camPath([[25.8, [60, 70, 90], [0, 0, 0], 36], [32.6, [80, 60, 60], [0, 0, 0], 36]]);
    const shD = ctx.shot({ name: '13.D1 星座图', t0: 25.8, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camD,
      post: { exposure: .5, dof: { focus: 20, aperture: .01, maxBlur: 14 }, grade: ctx.grade.night, vignette: .5 },
      update(t) { setCity(t, 'D1'); applyCam(camD, pD(t), t, .0002); } });
    ctx.draw2d({ shot: shD, t0: 26.0, t1: 32.4, draw(g, t) {
      let cur = 0; QAM.forEach((q, i) => { if (t >= q[0]) cur = i; }); const [t0, M, name, bits] = QAM[cur], m = Math.sqrt(M), k = ss(t0, t0 + .35, t);
      const cx = 1180, cy = 520, S = 560, x0 = cx - S / 2, y0 = cy - S / 2;
      g.fillStyle = 'rgba(8,10,14,.82)'; g.fillRect(x0 - 40, y0 - 70, S + 80, S + 120); ink.corners(g, x0 - 40, y0 - 70, S + 80, S + 120, 14, ink.dim);
      ink.line(g, [[x0, cy], [x0 + S, cy]], ink.faint, 1); ink.line(g, [[cx, y0], [cx, y0 + S]], ink.faint, 1);
      ink.text(g, '同相 I', x0 + S, cy - 10, { font: ink.sans(15), color: ink.dim, align: 'right' }); ink.text(g, '正交 Q', cx + 10, y0 + 16, { font: ink.sans(15), color: ink.dim });
      ink.text(g, name, x0 - 10, y0 - 30, { font: ink.cond(40, 600), color: ink.accent });
      ink.text(g, `${M} 个点 · 每个符号携带 ${bits} 比特`, x0 + 160, y0 - 34, { font: ink.sans(20, 600) });
      const sel = Math.floor(t * 3.3) % M;
      for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) { const px = x0 + S * (i + .5) / m, py = y0 + S * (j + .5) / m, idx = i * m + j, on = idx === sel; g.save(); g.globalAlpha *= k; g.fillStyle = on ? ink.accent : '#9fdcff'; g.beginPath(); g.arc(px, py, on ? Math.max(6, 22 / m * 2) : Math.max(3, 16 / m * 2), 0, 7); g.fill(); g.restore(); }
      const si = Math.floor(sel / m), sj = sel % m, sx = x0 + S * (si + .5) / m, sy = y0 + S * (sj + .5) / m;
      g.save(); g.globalAlpha *= k; ink.line(g, [[cx, cy], [sx, sy]], 'rgba(255,122,48,.6)', 1.5); ink.text(g, sel.toString(2).padStart(bits, '0'), sx + 12, sy - 12, { font: ink.mono(18, 600), color: ink.accent }); g.restore();
      ink.text(g, '每个点 = 一种振幅 + 相位的组合', x0, y0 + S + 34, { font: ink.sans(18), color: ink.dim });
    } });

    /* ================= D2 · 大规模天线阵列 ================= */
    CT.scene.updateMatrixWorld(true);
    const face = CT.aauFace.getWorldPosition(V()), nrm = V(0, 0, 1).applyQuaternion(CT.aau.quaternion);
    const PH = [V(8, .2, 50.4), V(-5.6, .2, 45), V(16.8, .2, 44), V(1, .2, 50.4)];
    const phoneAt = (i, t) => PH[i].clone().add(V(Math.sin(t * .5 + i * 2) * 1.2, 0, Math.cos(t * .4 + i) * .8));
    const camE = KIT.cam(40, .05, 2000);
    const shE = ctx.shot({ name: '13.D2 大规模天线', t0: 32.4, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camE,
      post: { exposure: 1.1, ao: { radius: .5, intensity: .8 }, dof: { focus: 4, aperture: .001, maxBlur: 6 }, grade: ctx.grade.night, vignette: .36, bloom: { strength: .28 } },
      update(t) {
        setCity(t, 'D2');
        PH.forEach((_, i) => { const p = phoneAt(i, t); p.toArray(CT.phones, i * 3); CT.phoneA[i] = ss(32.8 + i * .4, 33.2 + i * .4, t); const m = CT.mimo[i]; aimBeam(m, face.clone().add(nrm.clone().multiplyScalar(.05)), p); m.material.uniforms.uOpacity.value = .3 * CT.phoneA[i]; });
        CT.phonePts.geometry.attributes.position.needsUpdate = true; CT.phonePts.geometry.attributes.aAlpha.needsUpdate = true;
        const u = easeIO(clamp((t - 32.4) / 6.2)), side = V(-nrm.z, 0, nrm.x);
        camE.position.copy(face).add(nrm.clone().multiplyScalar(lerp(3.2, 4.2, u))).add(side.clone().multiplyScalar(lerp(2.6, 1.8, u))).add(V(0, lerp(.5, .9, u), 0));
        camE.lookAt(face.clone().add(nrm.clone().multiplyScalar(1.4)).add(V(0, -.7, 0)));   // 回看面板：波束从面板正面出发，朝镜头下方的街道散开
        shE.post.dof.focus = camE.position.distanceTo(face);
      } });
    ctx.draw2d({ shot: shE, t0: 33.0, t1: 38.6, draw(g, t) {
      const x = 110, y = 140;
      g.fillStyle = 'rgba(8,10,14,.78)'; g.fillRect(x - 24, y - 40, 560, 150); ink.corners(g, x - 24, y - 40, 560, 150, 12, ink.dim);
      ink.text(g, 'MASSIVE MIMO · 大规模天线阵列', x, y - 8, { font: ink.mono(16), color: ink.dim });
      ink.text(g, '8 × 8 个交叉振子 = 128 个天线单元', x, y + 34, { font: ink.sans(22, 600) });
      ink.text(g, '每束波只对准一部手机（示意）', x, y + 72, { font: ink.sans(17), color: ink.dim });
    } });

    /* ================= E · 代际速率 ================= */
    const camF = KIT.cam(36, .5, 2000);
    const pF = camPath([[38.8, [-90, 70, 80], [0, 0, 0], 36], [46.4, [-110, 60, 40], [0, 0, 0], 36]]);
    ctx.shot({ name: '13.E 代际', t0: 38.8, in: { type: 'dissolve', dur: .8 }, scene: CT.scene, camera: camF,
      post: { exposure: .5, dof: { focus: 20, aperture: .01, maxBlur: 14 }, grade: ctx.grade.night, vignette: .5 },
      update(t) { setCity(t, 'E'); applyCam(camF, pF(t), t, .0002); } });
    ctx.draw2d({ t0: 39.2, t1: 46.0, fade: .5, draw(g, t) {
      const P = { x: 170, y: 140, w: 1580, h: 760 }, X0 = 360, X1 = 1300, Y0 = 820, Y1 = 260, lg = n => (Math.log10(n) - 3) / (11 - 3);
      g.fillStyle = 'rgba(8,10,14,.84)'; g.fillRect(P.x, P.y, P.w, P.h); ink.corners(g, P.x, P.y, P.w, P.h, 16, ink.dim);
      ink.text(g, 'PEAK DATA RATE · 各代标准规定的峰值速率 · 对数坐标', P.x + 30, P.y + 42, { font: ink.mono(16), color: ink.dim });
      ['1 kb/s', '10 kb/s', '100 kb/s', '1 Mb/s', '10 Mb/s', '100 Mb/s', '1 Gb/s', '10 Gb/s', '100 Gb/s'].forEach((s, i) => { const y = lerp(Y0, Y1, i / 8); ink.line(g, [[X0, y], [X1, y]], i ? 'rgba(235,235,230,.07)' : ink.dim, 1); ink.text(g, s, X0 - 14, y + 5, { font: ink.mono(15), color: ink.dim, align: 'right' }); });
      const bw = (X1 - X0) / GENS.length * .62;
      GENS.forEach(([n, yr, v, d], i) => {
        const x = X0 + (X1 - X0) * (i + .5) / GENS.length, k = easeIO(ss(39.5 + i * .5, 40.0 + i * .5, t));
        ink.text(g, n, x, Y0 + 36, { font: ink.cond(30, 600), align: 'center', color: i === 4 ? ink.accent : ink.white }); ink.text(g, String(yr), x, Y0 + 62, { font: ink.mono(15), color: ink.dim, align: 'center' });
        if (!v) { g.save(); g.globalAlpha *= k; ink.text(g, d, x, Y0 - 20, { font: ink.sans(16), color: ink.dim, align: 'center' }); g.restore(); return; }
        const top = lerp(Y0, Y1, lg(v) * k); g.fillStyle = i === 4 ? 'rgba(255,122,48,.85)' : 'rgba(159,220,255,.7)'; g.fillRect(x - bw / 2, top, bw, Y0 - top);
        g.save(); g.globalAlpha *= ss(.6, 1, k); ink.text(g, d, x, top - 14, { font: ink.sans(16, 600), align: 'center' }); g.restore();
      });
      const ks = ss(42.4, 43.0, t); g.save(); g.globalAlpha *= ks;
      ink.text(g, '约 200 万倍', 1400, 470, { font: ink.cond(64, 600), color: ink.accent });
      ink.text(g, '20 Gb/s ÷ 9.6 kb/s ≈ 208 万', 1402, 516, { font: ink.sans(18), color: ink.dim });
      ink.text(g, '标准峰值，非实测', 1402, 548, { font: ink.sans(17), color: ink.dim });
      g.restore();
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(2.2, 'tap', .6); ctx.cue(2.5, 'tap', .6); ctx.cue(2.8, 'tap', .6);
    ctx.cue(6.8, 'whoosh', 1.2, .25); ctx.cue(7.2, 'riser', 4.4, .1); ctx.cue(13.4, 'chime', 660, .06); ctx.cue(15.4, 'blip', 900, .05);
    ctx.cue(19.8, 'swoosh', .25); ctx.cue(HO, 'ding', .5);
    ctx.cue(25.8, 'swoosh', .25); for (const [t0] of QAM) ctx.cue(t0, 'blip', 700, .05);
    ctx.cue(32.4, 'whoosh', 1.0, .22); for (let i = 0; i < 4; i++) ctx.cue(32.8 + i * .4, 'tick', .6);
    ctx.cue(38.8, 'swoosh', .25); for (let i = 0; i < 5; i++) ctx.cue(39.5 + i * .5, 'tick', .6); ctx.cue(42.4, 'chime', 880, .07);
  },
};
