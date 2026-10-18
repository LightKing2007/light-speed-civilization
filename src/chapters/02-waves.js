/* 02 · 看不见的波（1864 — 1888）
   镜头：A 麦克斯韦书桌（导线到此为止 → 1865 年论文首页）→ B1 法拉第：磁铁插入线圈 → B1' 麦克斯韦：电容器充放电（位移电流）
        → B2 E/B 环的接力 → 同相横波 → C 四个方程 · c = 1/√(μ₀ε₀) · 三行光速对照 · 光谱（光 = 电磁波）
        → D1 1887 卡尔斯鲁厄实验室 → D2 火花隙微距 → D3 几米外的接收环 → E1 剖示：电荷振荡与波前（慢放示意）
        → E2 锌板反射与驻波（剖切俯视）→ F 拉远，火花继续。
   道具在 src/props/02/（全部按真实尺寸以米建模）。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, easeOut, camPath, applyCam, fmtThin } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildStudy } from '../props/02/study.js';
import { buildBench, buildWave, WAVE, COL_E, COL_B, MAG, CAP, capQ } from '../props/02/fields.js';
import { buildLab, SPARKS, TRAINS, DY, RING_R, ZP, LAM, ringZ, standK, qTrain, FV } from '../props/02/lab.js';

const hex = c => '#' + new THREE.Color(c).getHexString();
const SERIF = '"Times New Roman", "Noto Serif SC", Georgia, serif';

export default {
  id: '02', slug: 'waves', title: '看不见的波', dur: 56,
  card: {"title": "看不见的波", "short": "看不见的波", "meta": "1864 — 1888 · 伦敦 / 卡尔斯鲁厄"},
  stamps: [[0, "1864"], [26, "1887"]],
  caps: [[0.4, 5.8, "电，一定要沿着导线走吗？1864 年，苏格兰物理学家麦克斯韦给出了答案。"], [6.2, 12.0, "法拉第发现磁能生电；麦克斯韦补上另一半：变化的电场也会产生磁场。"], [12.4, 18.4, "两者相互依存、彼此维系，就能脱离导线，以波的形式在空间中自行传播。"], [18.8, 25.6, "他算出这种波的速度，与当时实测的光速几乎一致。麦克斯韦大胆断言：光，本身就是一种电磁波。"], [26.0, 31.6, "这个预言等了二十多年。1887 年，德国的赫兹用感应线圈，让电火花在两个铜球之间来回跳跃。"], [32.0, 37.6, "几米之外，一个没有任何导线相连的金属环上，同时闪出了微弱的火花。"], [38.0, 43.4, "火花让电荷每秒振荡几千万到上亿次，向四周辐射电磁波。"], [43.8, 49.4, "他还用锌板反射电波、测出波长，算出波速与光速相当。频率的单位「赫兹」，就以他命名。"], [49.8, 55.6, "广播、雷达、手机、Wi-Fi、卫星——此后所有的无线通信，都从这一跳开始。"]],
  credits: [
    'assets/hdri/vintage_measuring_lab_2k.hdr',
    'assets/tex/dark_wood', 'assets/tex/brown_leather', 'assets/tex/acg_paper006_aged_paper',
    'assets/models/polyhaven/vintage_oil_lamp', 'assets/models/polyhaven/book_encyclopedia_set_01', 'assets/models/polyhaven/round_spectacles', 'assets/models/polyhaven/seadogs_compass',
    'assets/models/polyhaven/vintage_cabinet_01', 'assets/models/polyhaven/standing_chalkboard_01', 'assets/models/polyhaven/woodenchair_01', 'assets/models/polyhaven/chemistry_set',
  ],
  async build(ctx) {
    const { KIT } = ctx;
    { const cv = document.getElementById('hud2d'); if (cv && cv.width === 300 && cv.height === 150) { cv.width = 1920; cv.height = 1080; } }
    const [ST, BN, WV, LB] = await Promise.all([buildStudy(KIT), buildBench(KIT), buildWave(KIT), buildLab(KIT)]);

    /* ==================== A 麦克斯韦的书桌（0 – 6.05） ==================== */
    const cA = KIT.cam(24);
    const pA = camPath([[0, [.222, .024, .142], [.104, .005, .074], 22], [2.6, [.205, .07, .225], [.07, .003, .045], 25], [6.2, [.08, .33, .36], [-.045, 0, -.035], 28]]);
    ctx.shot({ t0: 0, name: 'A 麦克斯韦书桌', in: { type: 'luma', dur: 1.2 }, scene: ST.scene, camera: cA,
      post: { exposure: 1.06, ao: { radius: .012, intensity: 1 }, dof: { focus: .15, aperture: .007, maxBlur: 12 }, grade: ctx.grade.warm, vignette: .38, grain: .022 },
      update(t) { ST.update(t); const c = pA(t); applyCam(cA, c, t, .0009); this.post.dof.focus = cA.position.distanceTo(c.l); } });
    ctx.lower({ t0: 3.7, t1: 6.3, name: '詹姆斯·克拉克·麦克斯韦 · 1831–1879', meta: '《电磁场的动力学理论》· 1864 年 12 月在英国皇家学会宣读', credit: '论文页面按 Phil. Trans. 155 (1865) 原版式排印复原' });

    /* ==================== B1 法拉第 / 麦克斯韦（6.05 – 12.25） ==================== */
    const legend = (t0, t1) => ctx.draw2d({ t0, t1, draw(g) {
      const x = 1530, y = 112; g.fillStyle = 'rgba(8,10,12,.4)'; g.fillRect(x - 16, y - 24, 300, 66);
      g.fillStyle = hex(COL_E); g.fillRect(x, y - 6, 34, 3); ink.text(g, 'E  电场', x + 46, y, { font: ink.sans(17, 500) });
      g.fillStyle = hex(COL_B); g.fillRect(x, y + 22, 34, 3); ink.text(g, 'B  磁场', x + 46, y + 28, { font: ink.sans(17, 500) });
      ink.text(g, 'FIELD', x + 200, y, { font: ink.mono(12), color: ink.dim }); ink.text(g, 'LINES', x + 200, y + 28, { font: ink.mono(12), color: ink.dim });
    } });
    legend(6.4, 18.6);
    const cB1 = KIT.cam(30);
    const pB1 = camPath([[6.05, [-.47, .27, .66], [-.69, .115, 0], 30], [9.3, [-.6, .235, .6], [-.72, .12, 0], 29]]);
    const shB1 = ctx.shot({ t0: 6.05, name: 'B1 法拉第', in: { type: 'dissolve', dur: .8 }, scene: BN.scene, camera: cB1,
      post: { exposure: 1.0, ao: { radius: .04, intensity: 1 }, dof: { focus: .65, aperture: .012, maxBlur: 10 }, grade: ctx.grade.studio, vignette: .34 },
      update(t) { BN.update(t); const c = pB1(t); applyCam(cB1, c, t, .0006); this.post.dof.focus = cB1.position.distanceTo(BN.loopC); } });
    ctx.callout({ shot: shB1, at: BN.loopC.clone().add(V(0, .095, 0)), t0: 6.8, t1: 9.3, side: 'right', dx: 120, dy: -80, code: 'FARADAY · 1831', title: '变化的磁场 → 电场', sub: '感应电动势 ε = −dΦB/dt' });
    ctx.callout({ shot: shB1, at: t => BN.magnet.position.clone().add(V(-.05, .016, 0)), t0: 6.4, t1: 9.3, side: 'left', dx: 90, dy: -110, title: '条形磁铁', sub: 'N 端插入 → 磁通增加' });
    // 示波：线圈里的感应电动势（只在磁铁运动时出现，方向随进/出翻转）
    const emfMax = BN.emfMax / 1.3;
    ctx.draw2d({ shot: shB1, t0: 6.5, t1: 9.3, draw(g, t) {
      const x = 1340, y = 520, w = 440, h = 150, span = [6.05, 9.3];
      ink.scope(g, x, y, w, h, u => clamp(BN.emf(lerp(span[0], span[1], u)) / emfMax, -1, 1), { color: hex(COL_E), label: '线圈中的感应电动势 ε', head: clamp((t - span[0]) / (span[1] - span[0])) });
      ink.text(g, '磁铁静止 → ε = 0', x + w - 10, y + h + 22, { font: ink.mono(13), color: ink.dim, align: 'right' });
    } });
    ctx.cue(MAG.tIn0 + .05, 'swoosh', .25); ctx.cue(MAG.tOut0 + .05, 'swoosh', .2);

    const cB1b = KIT.cam(30);
    const pB1b = camPath([[9.3, [.66, .25, .6], [.55, .125, 0], 30], [12.3, [.56, .215, .5], [.55, .13, 0], 29]]);
    const shB1b = ctx.shot({ t0: 9.3, name: "B1' 麦克斯韦", in: { type: 'cut' }, scene: BN.scene, camera: cB1b,
      post: { exposure: 1.0, ao: { radius: .04, intensity: 1 }, dof: { focus: .6, aperture: .012, maxBlur: 10 }, grade: ctx.grade.studio, vignette: .34 },
      update(t) { BN.update(t); const c = pB1b(t); applyCam(cB1b, c, t, .0006); this.post.dof.focus = cB1b.position.distanceTo(BN.capC); } });
    ctx.callout({ shot: shB1b, at: BN.capC.clone().add(V(0, .12, 0)), t0: 9.75, t1: 12.25, side: 'right', dx: 120, dy: -60, code: 'MAXWELL · 1861', title: '变化的电场 → 磁场', sub: '位移电流 ε₀·dΦE/dt' });
    ctx.draw2d({ shot: shB1b, t0: 9.5, t1: 12.25, draw(g, t, a, P) {
      const x = 1340, y = 520, w = 440, h = 150, span = [9.3, 12.3], hd = clamp((t - span[0]) / (span[1] - span[0]));
      ink.scope(g, x, y, w, h, u => capQ(lerp(span[0], span[1], u)) * .9, { color: hex(COL_E), label: '板间电场 E', head: hd });
      ink.scope(g, x, y, w, h, u => { const tt = lerp(span[0], span[1], u); return clamp((capQ(tt + .01) - capQ(tt - .01)) / .02 / 1.9, -1, 1) * .9; }, { color: hex(COL_B), label: '', grid: false, head: hd });
      ink.text(g, '磁场 B ∝ dE/dt', x + 10, y + 40, { font: ink.mono(12), color: hex(COL_B) });
      const q = capQ(t); if (q > .05) { for (const [sg, s2, c] of [[-1, '+', ink.accent], [1, '−', ink.cyan]]) { const p = P(BN.capC.clone().add(V(sg * .021, .072, 0))); if (p) ink.text(g, s2, p.x, p.y, { font: ink.sans(30, 500), color: c, align: 'center' }); } }
    } });
    ctx.cue(CAP.c0, 'tick', .5); ctx.cue(CAP.d0, 'tick', .4);

    /* ==================== B2 接力 → 横波（12.25 – 18.65） ==================== */
    const cB2 = KIT.cam(34);
    const pB2 = camPath([[12.25, [-1.05, .46, 1.75], [-.55, 0, 0], 34], [15.1, [-.35, .6, 2.35], [.05, 0, 0], 34], [18.7, [.45, .78, 3.05], [.5, .02, 0], 33]]);
    const shB2 = ctx.shot({ t0: 12.25, name: 'B2 接力与横波', in: { type: 'dissolve', dur: .6 }, scene: WV.scene, camera: cB2,
      post: { exposure: 1.0, dof: { focus: 2.2, aperture: .025, maxBlur: 8 }, grade: ctx.grade.studio, vignette: .34 },
      update(t) { WV.update(t); const c = pB2(t); applyCam(cB2, c, t, .0005); this.post.dof.focus = cB2.position.distanceTo(c.l); } });
    const L0 = WV.links[0], L1 = WV.links[1];
    ctx.callout({ shot: shB2, at: L0.c.clone().add(V(-WV.R * .7, WV.R * .7, 0)), t0: 13.0, t1: 15.1, side: 'left', dx: 90, dy: -80, title: '变化的电场', sub: '→ 在周围激发磁场' });
    ctx.callout({ shot: shB2, at: L1.c.clone().add(V(0, 0, WV.R)), t0: 13.45, t1: 15.1, side: 'right', dx: 130, dy: 90, title: '变化的磁场', sub: '→ 又激发电场 · 一环扣一环' });
    WV.links.forEach(L => ctx.cue(L.t0, 'tick', .35));
    const crestE = t => V(WV.crest(t, .45), WAVE.A, 0), crestB = t => V(WV.crest(t, .45), 0, WAVE.A);
    ctx.callout({ shot: shB2, at: crestE, t0: 16.0, t1: 18.65, side: 'left', dx: 80, dy: -90, code: 'IN PHASE', title: '同相', sub: 'E 与 B 同时到达峰值' });
    ctx.callout({ shot: shB2, at: V(WAVE.x0, 0, 0), t0: 16.5, t1: 18.65, side: 'left', dx: 70, dy: 110, title: 'E ⟂ B ⟂ c', sub: '横波：振动方向垂直于传播方向' });
    ctx.measure({ shot: shB2, a: t => V(WV.crest(t, 1.25), WAVE.A + .03, 0), b: t => V(WV.crest(t, 1.25) + WAVE.lam, WAVE.A + .03, 0), t0: 16.9, t1: 18.65, label: 'λ  波长', off: -26 });
    ctx.draw2d({ shot: shB2, t0: 15.9, t1: 18.65, draw(g, t, a, P) {
      const pe = P(crestE(t)), pb = P(crestB(t)); if (!pe || !pb) return;
      g.setLineDash([5, 5]); ink.line(g, [[pe.x, pe.y], [pb.x, pb.y]], ink.white, 1.2); g.setLineDash([]);
      const pc = P(V(WAVE.x1 + .15, 0, 0)); if (pc) ink.text(g, 'c  传播方向', pc.x + 14, pc.y + 5, { font: ink.mono(14), color: ink.white });
      const pyE = P(V(WAVE.x0, .44, 0)), pyB = P(V(WAVE.x0, 0, .44)); if (pyE) ink.text(g, 'E', pyE.x - 6, pyE.y - 8, { font: ink.mono(16, 600), color: hex(COL_E) }); if (pyB) ink.text(g, 'B', pyB.x - 16, pyB.y + 18, { font: ink.mono(16, 600), color: hex(COL_B) });
    } });

    /* ==================== C 光速（18.65 – 25.95） ==================== */
    const cC = KIT.cam(30);
    const pC = camPath([[18.65, [-2.35, .34, 1.3], [1.25, .02, -.25], 30], [26, [-2.05, .3, 1.08], [1.45, .02, -.3], 30]]);
    const shC = ctx.shot({ t0: 18.65, name: 'C 光速', in: { type: 'cut' }, scene: WV.scene, camera: cC,
      post: { exposure: .6, dof: { focus: 2.4, aperture: .13, maxBlur: 16 }, grade: ctx.grade.studio, vignette: .42 },
      update(t) { WV.update(t); const c = pC(t); applyCam(cC, c, t, .0004); } });
    ctx.draw2d({ shot: shC, t0: 18.8, t1: 22.95, fade: .35, draw(g, t) {
      // —— 左：四个方程（亥维赛矢量形式） ——
      const X = 150, Y = 300;
      g.fillStyle = 'rgba(6,8,10,.5)'; g.fillRect(X - 30, Y - 92, 780, 420);
      ink.text(g, "MAXWELL'S EQUATIONS · 真空中", X, Y - 54, { font: ink.mono(13), color: ink.accent });
      const rows = [['∇·E = ρ / ε₀', '电荷产生电场'], ['∇·B = 0', '没有磁单极'], ['∇×E = −∂B/∂t', '变化的磁场 → 电场（法拉第）'], ['∇×B = μ₀J + ', '变化的电场 → 磁场（麦克斯韦）']];
      rows.forEach(([m, l], i) => { const a = ss(18.9 + i * .22, 19.3 + i * .22, t); if (a <= 0) return; g.globalAlpha *= a; const y = Y + i * 64; ink.text(g, m, X, y, { font: `italic 400 36px ${SERIF}` }); if (i === 3) { g.font = `italic 400 36px ${SERIF}`; const w0 = g.measureText(m).width; ink.text(g, 'μ₀ε₀ ∂E/∂t', X + w0, y, { font: `italic 400 36px ${SERIF}`, color: ink.accent }); } ink.text(g, l, X + 440, y - 4, { font: ink.sans(17), color: ink.dim }); g.globalAlpha /= a; });
      ink.line(g, [[X, Y + 230], [X + 720, Y + 230]], ink.faint, 1);
      ink.text(g, '亥维赛 1884 年整理的现代矢量形式；麦克斯韦原文是 20 个分量方程', X, Y + 260, { font: ink.mono(13), color: ink.dim });
      // —— 右：c = 1/√(μ₀ε₀) 与三行对照 ——
      const RX = 1060, RY = 300, a2 = ss(19.5, 19.9, t);
      if (a2 > 0) {
        g.globalAlpha *= a2;
        g.fillStyle = 'rgba(6,8,10,.5)'; g.fillRect(RX - 30, RY - 92, 760, 470);
        ink.text(g, 'WAVE SPEED · 由方程推出的波速', RX, RY - 54, { font: ink.mono(13), color: ink.accent });
        ink.text(g, 'c = 1 / √(μ₀ε₀)', RX, RY + 10, { font: `italic 400 52px ${SERIF}` });
        const s0 = 290000, s1 = 315000, x0 = RX + 10, x1 = RX + 690, sx = v => lerp(x0, x1, (v - s0) / (s1 - s0)), yS = RY + 300;
        ink.ticks(g, x0, yS, x1, yS, 5, 6, ink.dim);
        for (let k = 0; k <= 5; k++) ink.text(g, fmtThin(s0 + k * 5000), lerp(x0, x1, k / 5), yS + 24, { font: ink.mono(12), color: ink.dim, align: 'center' });
        ink.text(g, 'km/s', x1, yS + 44, { font: ink.mono(12), color: ink.dim, align: 'right' });
        const R3 = [[20.25, '麦克斯韦 1864 · 由电磁测量推算', '≈ 310 740', 310740, ink.accent], [20.85, '傅科 1862 · 实测光速', '≈ 298 000', 298000, ink.white], [21.45, '今值（定义值）', '299 792.458', 299792.458, ink.cyan]];
        R3.forEach(([t0, lab, val, v, col], i) => {
          const a = ss(t0, t0 + .35, t); if (a <= 0) return; g.globalAlpha *= a; const y = RY + 92 + i * 56;
          ink.text(g, lab, RX, y, { font: ink.sans(18) }); ink.text(g, val, RX + 690, y, { font: ink.mono(22, 600), color: col, align: 'right' });
          const xm = sx(v), yy = y + 14, p = easeOut(ss(t0, t0 + .5, t));
          g.setLineDash([2, 4]); ink.line(g, [[xm, yy], [xm, lerp(yy, yS - 4, p)]], col, 1); g.setLineDash([]);
          g.fillStyle = col; g.beginPath(); g.arc(xm, yS, 4, 0, Math.PI * 2); g.fill();
          g.globalAlpha /= a;
        });
        const a4 = ss(22.0, 22.3, t); if (a4 > 0) { g.globalAlpha *= a4; ink.text(g, '相差不到 4% —— 这种波的速度，就是光速', RX, RY + 400, { font: ink.sans(20, 500), color: ink.accent }); g.globalAlpha /= a4; }
        g.globalAlpha /= a2;
      }
    } });
    [20.25, 20.85, 21.45].forEach(t => ctx.cue(t, 'tick', .5));
    // 光谱：可见光只是电磁波谱里很窄的一段
    ctx.draw2d({ shot: shC, t0: 23.0, t1: 25.95, fade: .35, draw(g, t) {
      const x0 = 260, x1 = 1660, y = 360, hh = 26, lx = l => x0 + (3 - Math.log10(l)) / 15 * (x1 - x0);
      g.fillStyle = 'rgba(6,8,10,.5)'; g.fillRect(x0 - 40, y - 150, x1 - x0 + 80, 330);
      ink.text(g, 'ELECTROMAGNETIC SPECTRUM · 按波长排列', x0, y - 112, { font: ink.mono(13), color: ink.accent });
      const p = easeOut(ss(23.0, 23.9, t)), xr = lerp(x0, x1, p);
      g.save(); g.beginPath(); g.rect(x0, y - 100, xr - x0, 240); g.clip();
      const band = [[1e3, 1, '无线电波'], [1, 1e-3, '微波'], [1e-3, 750e-9, '红外'], [750e-9, 380e-9, ''], [380e-9, 1e-8, '紫外'], [1e-8, 1e-11, 'X 射线'], [1e-11, 1e-12, 'γ']];
      band.forEach(([a, b, n], i) => { const xa = lx(a), xb = lx(b); g.fillStyle = i % 2 ? 'rgba(235,235,230,.10)' : 'rgba(235,235,230,.05)'; g.fillRect(xa, y, xb - xa, hh); ink.rect(g, xa, y, xb - xa, hh, ink.faint, 1); if (n) ink.text(g, n, (xa + xb) / 2, y - 12, { font: ink.sans(16), color: ink.dim, align: 'center' }); });
      const va = lx(750e-9), vb = lx(380e-9), gr = g.createLinearGradient(va, 0, vb, 0);
      ['#b0201a', '#ff6a1e', '#ffd21e', '#4fd04a', '#2a8cff', '#6a3cff'].forEach((c, i) => gr.addColorStop(i / 5, c)); g.fillStyle = gr; g.fillRect(va, y - 3, vb - va, hh + 6);
      for (let e = 3; e >= -12; e--) { const x = lx(Math.pow(10, e)); ink.line(g, [[x, y + hh], [x, y + hh + (e % 3 ? 5 : 10)]], ink.dim, 1); }
      [[1e3, '1 km'], [1, '1 m'], [1e-3, '1 mm'], [1e-6, '1 µm'], [1e-9, '1 nm'], [1e-12, '1 pm']].forEach(([l, s]) => ink.text(g, s, lx(l), y + hh + 28, { font: ink.mono(12), color: ink.dim, align: 'center' }));
      g.restore();
      const a2 = ss(24.0, 24.4, t);
      if (a2 > 0) { g.globalAlpha *= a2; const xm = (va + vb) / 2; ink.line(g, [[xm, y - 6], [xm, y - 62], [xm + 40, y - 62]], ink.white, 1.2); ink.text(g, '光 = 电磁波', xm + 50, y - 70, { font: ink.sans(26, 500), color: ink.white }); ink.text(g, '可见光 · 380–750 nm', xm + 50, y - 44, { font: ink.mono(14), color: ink.dim }); g.globalAlpha /= a2; }
      const a3 = ss(24.6, 25.0, t);
      if (a3 > 0) { g.globalAlpha *= a3; const xh = lx(6); ink.line(g, [[xh, y + hh + 4], [xh, y + hh + 64], [xh + 30, y + hh + 64]], ink.accent, 1.2); ink.text(g, '20 多年后赫兹造出的电波：波长数米', xh + 38, y + hh + 70, { font: ink.sans(17), color: ink.accent }); g.globalAlpha /= a3; }
    } });
    ctx.cue(24.0, 'chime', 660, .1);

    /* ==================== D 赫兹实验室（25.95 – 38.0） ==================== */
    const labPost = (o = {}) => ({ exposure: 1.12, ao: { radius: .2, intensity: 1 }, grade: ctx.grade.warm, vignette: .38, grain: .02, ...o });
    const cD1 = KIT.cam(34);
    const pD1 = camPath([[25.95, [-1.95, 1.66, 2.85], [.12, 1.0, -.25], 35], [28.8, [-1.6, 1.56, 2.4], [.12, 1.02, -.25], 34]]);
    const shD1 = ctx.shot({ t0: 25.95, name: 'D1 实验室', in: { type: 'dip', dur: .9 }, scene: LB.scene, camera: cD1, post: labPost({ dof: { focus: 2.8, aperture: .035, maxBlur: 8 } }),
      update(t) { LB.update(t, { hallK: 8 }); const c = pD1(t); applyCam(cD1, c, t, .0007); this.post.dof.focus = cD1.position.distanceTo(LB.gap); } });
    ctx.lower({ t0: 26.35, t1: 28.75, name: '海因里希·赫兹 · 1857–1894', meta: '卡尔斯鲁厄工学院物理教授 · 1887 年', credit: '场景复原：据赫兹 1887–1888 年论文所述装置' });
    ctx.callout({ shot: shD1, at: LB.coilPt.clone().add(V(.05, .08, 0)), t0: 26.9, t1: 28.75, side: 'right', dx: 110, dy: -120, code: 'INDUCTION COIL', title: '感应线圈', sub: '把电池的几伏升到数万伏' });

    const cD2 = KIT.cam(26);
    const pD2 = camPath([[28.7, [.115, 1.2, .27], [-.004, 1.14, 0], 26], [32.1, [.08, 1.178, .205], [-.002, 1.14, 0], 25]]);
    const shD2 = ctx.shot({ t0: 28.7, name: 'D2 火花隙', in: { type: 'cut' }, scene: LB.scene, camera: cD2, post: labPost({ exposure: 1.05, ao: { radius: .02, intensity: 1 }, dof: { focus: .3, aperture: .006, maxBlur: 14 } }),
      update(t) { LB.update(t, { hallK: 8 }); const c = pD2(t); applyCam(cD2, c, t, .0005); this.post.dof.focus = cD2.position.distanceTo(LB.gap); } });
    ctx.callout({ shot: shD2, at: LB.gap.clone().add(V(-.012, .012, 0)), t0: 29.2, t1: 32.0, side: 'left', dx: 140, dy: -150, code: 'SPARK GAP', title: '火花隙', sub: '两颗抛光黄铜球 · 相距几毫米' });
    ctx.callout({ shot: shD2, at: V(.07, DY + .004, 0), t0: 29.9, t1: 32.0, side: 'right', dx: 110, dy: 120, title: '铜杆 · 约 1 米', sub: '外端各接一只空心锌球' });

    const cD3 = KIT.cam(30);
    const pD3 = camPath([[32.0, [.44, 1.31, 4.3], [0, 1.16, 1.2], 31], [34.7, [.3, 1.37, 3.9], [0, 1.24, 1.8], 30], [38.1, [.048, 1.5, 3.14], [0, DY + RING_R - .004, 3.0], 24]]);
    const shD3 = ctx.shot({ t0: 32.0, name: 'D3 接收环', in: { type: 'cut' }, scene: LB.scene, camera: cD3, post: labPost({ dof: { focus: 3.9, aperture: .02, maxBlur: 12 } }),
      update(t) {
        LB.update(t, { hallK: 8, ringKey: 3 }); const c = pD3(t); applyCam(cD3, c, t, .0006);
        const dFar = cD3.position.distanceTo(LB.gap), dNear = cD3.position.distanceTo(LB.ringTop());
        this.post.dof.focus = lerp(dFar, dNear, easeIO(ss(34.4, 36.0, t))); this.post.dof.aperture = lerp(.02, .006, ss(34.4, 36.4, t));
      } });
    ctx.measure({ shot: shD3, a: LB.gap.clone().add(V(0, -.05, 0)), b: V(0, DY - .05, 3.0), t0: 32.5, t1: 34.6, label: '≈ 3 m', off: 40 });
    ctx.callout({ shot: shD3, at: V(-RING_R * .72, DY + RING_R * .69, 3.0), t0: 32.9, t1: 34.9, side: 'left', dx: 100, dy: -70, title: '接收环', sub: '与振子之间没有任何导线' });
    ctx.callout({ shot: shD3, at: () => LB.ringTop().add(V(-.002, 0, 0)), t0: 36.0, t1: 38.0, side: 'left', dx: 150, dy: 130, code: 'RESONATOR GAP', title: '同一瞬间，微弱的火花', sub: '测微螺丝调节间隙' });

    /* ==================== E1 剖示：电荷振荡 → 辐射（38.0 – 43.7） ==================== */
    const cE1 = KIT.cam(34);
    const pE1 = camPath([[38.0, [2.75, 3.3, 4.7], [-.15, 1.0, 1.15], 34], [43.8, [2.25, 3.05, 4.35], [-.15, 1.0, 1.25], 33]]);
    const shE1 = ctx.shot({ t0: 38.0, name: 'E1 振荡与辐射', in: { type: 'dissolve', dur: .6 }, scene: LB.scene, camera: cE1, post: labPost({ exposure: 1.0, dof: { focus: 4.6, aperture: .03, maxBlur: 6 } }),
      update(t) { LB.update(t, { hallK: 14, train: true, charges: ss(38.1, 38.5, t), waves: true }); const c = pE1(t); applyCam(cE1, c, t, .0004); } });
    ctx.draw2d({ shot: shE1, t0: 38.3, t1: 43.7, draw(g, t, a, P) {
      const x = 1360, y = 118, w = 440, h = 140, span = [38.0, 43.7];
      ink.scope(g, x, y, w, h, u => clamp((qTrain(lerp(span[0], span[1], u) + .004) - qTrain(lerp(span[0], span[1], u) - .004)) / .008 / (Math.PI * 2 * FV), -1, 1), { color: ink.white, label: '振子中的电流 · 阻尼振荡', head: clamp((t - span[0]) / (span[1] - span[0])) });
      ink.text(g, 'f ≈ 10⁷ – 10⁸ Hz', x, y + h + 30, { font: ink.mono(18, 600) }); ink.text(g, '每秒几千万到上亿次', x + 210, y + h + 30, { font: ink.sans(16), color: ink.dim });
      ink.text(g, '慢放示意 · 画面放慢约 1 亿倍', x, y + h + 56, { font: ink.mono(13), color: ink.accent });
      const q = qTrain(t);
      for (const sg of [-1, 1]) { const rho = sg * q, p = P(LB.sphere(sg).add(V(0, .3, 0))); if (!p || Math.abs(rho) < .08) continue; g.globalAlpha *= clamp(Math.abs(rho) * 1.6); ink.text(g, rho > 0 ? '+' : '−', p.x, p.y, { font: ink.sans(40, 500), color: rho > 0 ? '#ff8a5c' : '#7ab8ff', align: 'center' }); g.globalAlpha /= clamp(Math.abs(rho) * 1.6) || 1; }
    } });
    ctx.callout({ shot: shE1, at: LB.gap.clone().add(V(0, .02, 0)), t0: 38.6, t1: 41.2, side: 'left', dx: 120, dy: -130, title: '火花接通两臂', sub: '电荷在两只锌球间来回奔涌' });
    ctx.callout({ shot: shE1, at: V(0, DY + 1.1, 2.3), t0: 40.6, t1: 43.7, side: 'right', dx: 110, dy: -60, code: 'EM WAVE', title: '电磁波向四周辐射', sub: '垂直于振子的方向最强' });
    TRAINS.forEach(T => { ctx.cue(T, 'spark', .7); ctx.cue(T + .02, 'whoosh', 1.2, .18); });

    /* ==================== E2 锌板反射 · 驻波（43.7 – 49.75） ==================== */
    const cE2 = KIT.cam(32);
    const pE2 = camPath([[43.7, [-13.2, 4.3, 3.4], [0, 1.25, 6.45], 31], [49.8, [-12.6, 4.0, 3.7], [0, 1.3, 6.4], 30.5]]);
    const shE2 = ctx.shot({ t0: 43.7, name: 'E2 驻波', in: { type: 'dissolve', dur: .7 }, scene: LB.scene, camera: cE2, post: labPost({ exposure: 1.15, ao: { radius: .4, intensity: 1 } }),
      update(t) { LB.update(t, { cut: true, hallK: 150, stand: ss(44.0, 44.6, t) }); const c = pE2(t); applyCam(cE2, c, t, .0003); } });
    ctx.callout({ shot: shE2, at: LB.platePt.clone().add(V(0, .8, 0)), t0: 44.1, t1: 49.75, side: 'left', dx: 120, dy: -60, code: 'REFLECTOR', title: '锌板 · 反射电波', sub: '入射波与反射波叠加 → 驻波' });
    ctx.callout({ shot: shE2, at: V(-1.15, DY + .16, 0), t0: 44.0, t1: 46.3, side: 'right', dx: 90, dy: -150, title: '振子', sub: '电波从这里发出' });
    ctx.callout({ shot: shE2, at: () => LB.ringC().add(V(0, -RING_R, 0)), t0: 44.6, t1: 49.75, side: 'right', dx: 60, dy: 170, title: '接收环', sub: '沿轴移动，找火花消失处' });
    ctx.measure({ shot: shE2, a: LB.nodes[1].clone().add(V(0, -.75, 0)), b: LB.nodes[2].clone().add(V(0, -.75, 0)), t0: 46.5, t1: 49.75, label: 'λ/2  相邻波节间距', off: 30 });
    ctx.draw2d({ shot: shE2, t0: 44.3, t1: 49.75, draw(g, t, a, P) {
      LB.nodes.forEach((n, i) => { const k = ss(i === 1 ? 46.4 : 44.8 + i * .3, (i === 1 ? 46.4 : 44.8 + i * .3) + .3, t); if (k <= 0) return; const p = P(n); if (!p) return; g.globalAlpha *= k; ink.line(g, [[p.x, p.y - 26], [p.x, p.y + 26]], ink.white, 1.4); ink.text(g, '波节', p.x, p.y - 36, { font: ink.sans(16, 500), align: 'center' }); g.globalAlpha /= k; });
      const pi = P(V(0, DY + .9, 1.6)), pr = P(V(0, DY + .9, 11.2));
      if (pi) ink.text(g, '入射波 →', pi.x, pi.y, { font: ink.mono(14), color: ink.dim, align: 'center' });
      if (pr && t > 44.9) ink.text(g, '← 反射波', pr.x, pr.y, { font: ink.mono(14), color: ink.dim, align: 'center' });
      // 接收环火花强度计
      const rz = ringZ(t), pk = P(V(0, DY + RING_R + .5, rz)); if (pk) { const v = standK(rz) ** 2; g.fillStyle = 'rgba(8,10,12,.55)'; g.fillRect(pk.x - 60, pk.y - 40, 120, 30); g.fillStyle = ink.accent; g.fillRect(pk.x - 52, pk.y - 22, 104 * v, 6); ink.rect(g, pk.x - 52, pk.y - 22, 104, 6, ink.faint, 1); ink.text(g, '接收环火花', pk.x - 52, pk.y - 28, { font: ink.mono(11), color: ink.dim }); }
      // 推算
      const a2 = ss(47.0, 47.4, t), X = 1290, Y = 120;
      if (a2 > 0) { g.globalAlpha *= a2; g.fillStyle = 'rgba(6,8,10,.55)'; g.fillRect(X - 24, Y - 34, 560, 178); ink.text(g, 'λ（实测）≈ 数米', X, Y, { font: ink.sans(20, 500) }); ink.text(g, '× f（由振子尺寸推算）', X, Y + 36, { font: ink.sans(20, 500) }); ink.line(g, [[X, Y + 54], [X + 500, Y + 54]], ink.faint, 1); ink.text(g, '= v ≈ 3 × 10⁸ m/s', X, Y + 92, { font: ink.mono(26, 600), color: ink.accent }); ink.text(g, '≈ 光速', X + 330, Y + 92, { font: ink.sans(22, 500), color: ink.accent }); ink.text(g, '电波与光，速度相同', X, Y + 124, { font: ink.mono(13), color: ink.dim }); g.globalAlpha /= a2; }
    } });
    ctx.readout({ x: 1290, y: 330, t0: 48.3, t1: 49.75, html: () => '<span class="k">频率单位</span>&nbsp; 1 Hz = 每秒振荡 1 次' });
    ctx.cue(47.05, 'tick', .5); ctx.cue(46.9, 'blip', 900, .08);

    /* ==================== F 一切由此开始（49.75 – 56） ==================== */
    const cF = KIT.cam(32);
    const pF = camPath([[49.75, [.95, 1.42, 1.55], [0, 1.12, 0], 30], [53, [-.6, 1.9, 3.7], [.05, 1.06, -.1], 32], [56.2, [-2.5, 2.55, 6.4], [.1, 1.0, -.2], 34]]);
    const shF = ctx.shot({ t0: 49.75, name: 'F 一切由此开始', in: { type: 'dissolve', dur: .8 }, scene: LB.scene, camera: cF, post: labPost({ dof: { focus: 2, aperture: .02, maxBlur: 8 } }),
      update(t) { LB.update(t, { hallK: 10, waves: .32, trains: [50.1, 52.0], maxR: 7 }); const c = pF(t); applyCam(cF, c, t, .0006); this.post.dof.focus = cF.position.distanceTo(LB.gap); } });
    ctx.stat({ t0: 50.3, t1: 55.7, fmt: p => fmtThin(299792 * p), unit: 'km/s', label: '电磁波的速度 = 光速', src: '麦克斯韦 1864 预言 · 赫兹 1887–1888 证实', dur: 1.6 });
    ctx.draw2d({ shot: shF, t0: 50.4, t1: 55.8, fade: .4, draw(g, t) {
      const x0 = 470, x1 = 1270, y = 196, lf = f => lerp(x0, x1, (Math.log10(f) - 5) / 6);
      g.fillStyle = 'rgba(6,8,10,.45)'; g.fillRect(x0 - 40, y - 102, x1 - x0 + 80, 176);
      ink.text(g, 'FREQUENCY · 此后的无线电', x0, y - 74, { font: ink.mono(13), color: ink.accent });
      const p = easeOut(ss(50.4, 51.4, t)); ink.ticks(g, x0, y, lerp(x0, x1, p), y, Math.round(6 * p), 6, ink.dim);
      const FL = { 5: '100 kHz', 6: '1 MHz', 7: '10 MHz', 8: '100 MHz', 9: '1 GHz', 10: '10 GHz', 11: '100 GHz' };
      for (let e = 5; e <= 11; e++) if ((e - 5) / 6 <= p + .001) ink.text(g, FL[e], lf(Math.pow(10, e)), y + 24, { font: ink.mono(12), color: ink.dim, align: 'center' });
      const items = [[1e6, 1e6, '调幅广播', -1, 51.0], [5e7, 5e7, '赫兹 1887', 1, 50.8, true], [1e8, 1e8, '调频广播', -2, 51.4], [7e8, 3.5e9, '手机', -1, 52.0], [2.4e9, 5e9, 'Wi-Fi', 1, 52.6], [1e9, 1e10, '雷达', -3, 52.3], [1.2e10, 1.2e10, '卫星', 2, 53.0]];
      items.forEach(([fa, fb, n, row, t0, acc]) => { const k = ss(t0, t0 + .35, t); if (k <= 0) return; g.globalAlpha *= k; const xa = lf(fa), xb = lf(fb), yy = y + (row < 0 ? -10 + row * 18 : 36 + row * 2); const col = acc ? ink.accent : ink.white; if (xb - xa > 2) { g.fillStyle = col; g.fillRect(xa, yy - 2, xb - xa, 3); } else { g.fillStyle = col; g.beginPath(); g.arc(xa, yy - 1, 3.2, 0, Math.PI * 2); g.fill(); } ink.line(g, [[(xa + xb) / 2, yy], [(xa + xb) / 2, y]], acc ? ink.accent : ink.faint, 1); ink.text(g, n, (xa + xb) / 2 + 8, yy - 6 + (row > 0 ? 22 : 0), { font: ink.sans(15, 500), color: col }); g.globalAlpha /= k; });
    } });

    /* ---------- 火花音效 ---------- */
    for (const ts of SPARKS) { if (ts > 38.0 && ts < 43.7) continue; const v = ts < 28.7 ? .45 : ts < 32 ? .8 : ts < 38 ? .5 : ts < 49.75 ? .32 : .42; ctx.cue(ts, 'spark', v); }
    ctx.cue(49.85, 'sub', .35);
  },
};
