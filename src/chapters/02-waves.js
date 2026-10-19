/* 02 · 看不见的波（1864 — 1888）
   镜头：A 麦克斯韦书桌（导线到此为止 → 1865 年论文首页）→ B1 法拉第：磁铁插入线圈 → B1' 麦克斯韦：电容器充放电（位移电流）
        → B2 E/B 环的接力 → 同相横波 → C 算出的波速 ≈ 光速 · 光谱（光 = 电磁波）
        → D1 1887 卡尔斯鲁厄实验室 → D2 火花隙微距 → D3 几米外的接收环 → E1 剖示：电荷振荡与波前（慢放示意）
        → E2 锌板反射与驻波（剖切俯视）→ F 拉远，火花继续。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒；
   面板底色不透明度 ≥ .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」。
   道具在 src/props/02/（全部按真实尺寸以米建模）。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, easeOut, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildStudy } from '../props/02/study.js';
import { buildBench, buildWave, WAVE, COL_E, COL_B, MAG, CAP, capQ } from '../props/02/fields.js';
import { buildLab, SPARKS, TRAINS, DY, RING_R, ZP, LAM, ringZ, standK, qTrain, FV } from '../props/02/lab.js';

const hex = c => '#' + new THREE.Color(c).getHexString();
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
/** 信息面板底板：深色、不透明度 .86，细边框 */
const box = (g, x, y, w, h) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, 'rgba(235,235,230,.2)', 1); };
/** 分段着色的一行字：segs = [[文字, 颜色], ...] */
/** 署名条（左下）后面的柔和暗底：画在 2D 层（在署名条文字之下），浅色画面上也看得清 */
const scrim = (g, a = .62) => { g.save(); g.translate(540, 792); g.scale(1, .27); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 600); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.62, `rgba(0,0,0,${a * .75})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-620, -620, 1240, 1240); g.restore(); };
const rich = (g, segs, x, y, font) => { g.font = font; let cx = x; for (const [s, c] of segs) { ink.text(g, s, cx, y, { font, color: c }); cx += g.measureText(s).width; } return cx - x; };

export default {
  id: '02', status: 'implemented', slug: 'waves', title: '看不见的波', dur: 56,
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
    const cE = hex(COL_E), cB = hex(COL_B);

    /* ==================== A 麦克斯韦的书桌（0 – 6.4） ==================== */
    const cA = KIT.cam(24);
    const pA = camPath([[0, [.222, .024, .142], [.104, .005, .074], 22], [2.6, [.205, .07, .225], [.07, .003, .045], 25], [7.2, [.08, .33, .36], [-.045, 0, -.035], 28]]);
    ctx.shot({ t0: 0, name: 'A 麦克斯韦书桌', in: { type: 'luma', dur: 1.2 }, scene: ST.scene, camera: cA,
      post: { exposure: 1.16, ao: { radius: .012, intensity: 1 }, dof: { focus: .15, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .34, grain: .022 },
      update(t) { ST.update(t); const c = pA(t); applyCam(cA, c, t, .0009); this.post.dof.focus = cA.position.distanceTo(c.l); } });
    // 章节卡 3.1–3.6 淡出时接上署名条（两者上下错开，不重叠）
    ctx.draw2d({ t0: 3.0, t1: 7.3, fade: .4, draw(g) { scrim(g, .74); } });
    ctx.lower({ t0: 3.0, t1: 7.3, name: '詹姆斯·克拉克·麦克斯韦 · 1831–1879', meta: '论文《电磁场的动力学理论》· 1864 年', credit: '论文页面为按原版式复原' });

    /* ==================== B1 法拉第 / B1' 麦克斯韦（6.4 – 12.5） ==================== */
    // 一块面板贯穿 B1 → B1' → B2 接力：两条规律逐条出现，「电场 / 磁场」用画面里的同色（橙 / 蓝）
    ctx.draw2d({ t0: 7.0, t1: 15.45, fade: .35, draw(g, t) {
      const x = 1400, y = 58, w = 460, k2 = ss(9.95, 10.3, t), h = 118 + 100 * k2;
      box(g, x, y, w, h);
      const row = (i, a, who, segs) => { if (a <= 0) return; g.save(); g.globalAlpha *= a; const yy = y + 42 + i * 100; ink.text(g, who, x + 26, yy, { font: ink.sans(19, 500), color: ink.accent }); rich(g, segs, x + 26, yy + 46, ink.sans(32, 500)); g.restore(); };
      row(0, 1, '法拉第 · 1831', [['磁场', cB], ['变化 → 产生', TXT], ['电场', cE]]);
      row(1, ss(10.1, 10.45, t), '麦克斯韦 · 1861', [['电场', cE], ['变化 → 产生', TXT], ['磁场', cB]]);
    } });

    const cB1 = KIT.cam(30);
    const pB1 = camPath([[6.4, [-.47, .27, .66], [-.69, .115, 0], 30], [9.8, [-.6, .235, .6], [-.72, .12, 0], 29]]);
    ctx.shot({ t0: 6.4, name: 'B1 法拉第', in: { type: 'dissolve', dur: .8 }, scene: BN.scene, camera: cB1,
      post: { exposure: 1.18, ao: { radius: .04, intensity: 1 }, dof: { focus: .65, aperture: .003, maxBlur: 6 }, grade: ctx.grade.studio, vignette: .3 },
      update(t) { BN.update(t); const c = pB1(t); applyCam(cB1, c, t, .0006); this.post.dof.focus = cB1.position.distanceTo(BN.loopC); } });
    ctx.cue(MAG.tIn0 + .05, 'swoosh', .25); ctx.cue(MAG.tOut0 + .05, 'swoosh', .2);

    const cB1b = KIT.cam(30);
    const pB1b = camPath([[9.75, [.66, .25, .6], [.55, .125, 0], 30], [13.1, [.56, .215, .5], [.55, .13, 0], 29]]);
    const shB1b = ctx.shot({ t0: 9.75, name: "B1' 麦克斯韦", in: { type: 'cut' }, scene: BN.scene, camera: cB1b,
      post: { exposure: 1.18, ao: { radius: .04, intensity: 1 }, dof: { focus: .6, aperture: .003, maxBlur: 6 }, grade: ctx.grade.studio, vignette: .3 },   // 景深收小：电容板、电场线、磁场环都要清楚
      update(t) { BN.update(t); const c = pB1b(t); applyCam(cB1b, c, t, .0006); this.post.dof.focus = cB1b.position.distanceTo(BN.capC); } });
    // 两块极板上的 + / − ：充电时出现，看得出「电场在变」
    ctx.draw2d({ shot: shB1b, t0: 9.9, t1: 12.6, draw(g, t, a, P) {
      const q = capQ(t); if (q <= .05) return;
      g.save(); g.globalAlpha *= clamp((q - .05) * 4);
      for (const [sg, s2, c] of [[-1, '+', ink.accent], [1, '−', ink.cyan]]) { const p = P(BN.capC.clone().add(V(sg * .021, .072, 0))); if (p) ink.text(g, s2, p.x, p.y, { font: ink.sans(44, 600), color: c, align: 'center' }); }
      g.restore();
    } });
    ctx.cue(CAP.c0, 'tick', .5); ctx.cue(CAP.d0, 'tick', .4);

    /* ==================== B2 接力 → 横波（12.5 – 19.5） ==================== */
    const cB2 = KIT.cam(34);
    const pB2 = camPath([[12.5, [-1.05, .46, 1.75], [-.55, 0, 0], 34], [15.3, [-.35, .6, 2.35], [.05, 0, 0], 34], [19.5, [.45, .78, 3.05], [.5, .02, 0], 33]]);
    const shB2 = ctx.shot({ t0: 12.5, name: 'B2 接力与横波', in: { type: 'dissolve', dur: .6 }, scene: WV.scene, camera: cB2,
      post: { exposure: 1.16, dof: { focus: 2.2, aperture: .008, maxBlur: 6 }, grade: ctx.grade.studio, vignette: .3 },
      update(t) { WV.update(t); const c = pB2(t); applyCam(cB2, c, t, .0005); this.post.dof.focus = cB2.position.distanceTo(c.l); } });
    WV.links.forEach(L => ctx.cue(L.t0, 'tick', .35));
    // 横波：直接在曲线旁写「电场 / 磁场 / 传播方向」，代替图例
    ctx.draw2d({ shot: shB2, t0: 15.75, t1: 19.8, fade: .3, draw(g, t, a, P) {
      const lab = (p3, s, c, al = 'left') => { const p = P(p3); if (!p) return; g.font = ink.sans(30, 600); const tw = g.measureText(s).width, x0 = al === 'left' ? p.x : p.x - tw; g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x0 - 12, p.y - 32, tw + 24, 44); ink.text(g, s, p.x, p.y, { font: ink.sans(30, 600), color: c, align: al }); };
      lab(V(-.62, WAVE.A + .1, 0), '电场 E', cE);
      lab(V(-.2, -.04, WAVE.A + .12), '磁场 B', cB);
      const pa = P(V(.7, -.42, 0)), pb = P(V(1.3, -.42, 0));
      if (pa && pb) { ink.line(g, [[pa.x, pa.y], [pb.x, pb.y]], TXT, 3); const an = Math.atan2(pb.y - pa.y, pb.x - pa.x); g.fillStyle = TXT; g.beginPath(); g.moveTo(pb.x + 4 * Math.cos(an), pb.y + 4 * Math.sin(an)); g.lineTo(pb.x - 20 * Math.cos(an - .4), pb.y - 20 * Math.sin(an - .4)); g.lineTo(pb.x - 20 * Math.cos(an + .4), pb.y - 20 * Math.sin(an + .4)); g.fill(); const q = pa; g.font = ink.sans(30, 600); const tw = g.measureText('传播方向').width; g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(q.x - 24 - tw - 12, q.y - 22, tw + 24, 44); ink.text(g, '传播方向', q.x - 24, q.y + 10, { font: ink.sans(30, 600), color: TXT, align: 'right' }); }
    } });

    /* ==================== C 光速（19.5 – 26.0） ==================== */
    const cC = KIT.cam(30);
    const pC = camPath([[19.5, [-2.35, .34, 1.3], [1.25, .02, -.25], 30], [26.9, [-2.05, .3, 1.08], [1.45, .02, -.3], 30]]);
    const shC = ctx.shot({ t0: 19.5, name: 'C 光速', in: { type: 'cut' }, scene: WV.scene, camera: cC,
      post: { exposure: .7, dof: { focus: 2.4, aperture: .08, maxBlur: 8 }, grade: ctx.grade.studio, vignette: .42 },
      update(t) { WV.update(t); const c = pC(t); applyCam(cC, c, t, .0004); } });
    // 一块面板分两段：上段「算出的波速 ≈ 实测光速」（长条从 0 画起，长度几乎一样），下段「光也是电磁波」（光谱）
    ctx.draw2d({ shot: shC, t0: 19.6, t1: 26.9, fade: .35, draw(g, t) {
      const X = 170, W = 1580, Y = 150, H1 = 310;
      box(g, X, Y, W, H1);
      ink.text(g, '算出的波速，几乎就是光速', X + 44, Y + 66, { font: ink.sans(36, 500), color: TXT });
      const rows = [[20.1, '麦克斯韦算出的电磁波速度', 310740, '≈ 310 740 km/s', ink.accent], [20.9, '当时实测的光速（傅科，1862）', 298000, '≈ 298 000 km/s', TXT]];
      rows.forEach(([t0, lab, v, val, col], i) => {
        const a = ss(t0, t0 + .35, t); if (a <= 0) return; g.save(); g.globalAlpha *= a;
        const y = Y + 148 + i * 100;
        ink.text(g, lab, X + 44, y, { font: ink.sans(28), color: TXT });
        ink.text(g, val, X + W - 44, y, { font: ink.mono(36, 600), color: col, align: 'right' });
        g.fillStyle = col; g.fillRect(X + 44, y + 20, (W - 88) * v / 320000 * easeOut(ss(t0, t0 + .9, t)), 14);
        g.restore();
      });
      const a2 = ss(22.3, 22.7, t); if (a2 <= 0) return;
      g.save(); g.globalAlpha *= a2;
      const Y2 = 490, H2 = 340; box(g, X, Y2, W, H2);
      ink.text(g, '光，也是一种电磁波', X + 44, Y2 + 66, { font: ink.sans(36, 500), color: TXT });
      const x0 = X + 60, x1 = X + W - 60, ys = Y2 + 170, hh = 40, lx = l => x0 + (3 - Math.log10(l)) / 14 * (x1 - x0);
      const p = easeOut(ss(22.3, 23.1, t)), xr = lerp(x0, x1, p);
      g.save(); g.beginPath(); g.rect(x0 - 2, ys - 60, xr - x0 + 4, 200); g.clip();
      const band = [[1e3, 1, '无线电波'], [1, 1e-3, '微波'], [1e-3, 750e-9, '红外'], [750e-9, 380e-9, ''], [380e-9, 1e-8, '紫外'], [1e-8, 1e-11, 'X 射线']];
      band.forEach(([a, b, n], i) => { const xa = lx(a), xb = lx(b); g.fillStyle = i % 2 ? 'rgba(235,235,230,.16)' : 'rgba(235,235,230,.08)'; g.fillRect(xa, ys, xb - xa, hh); ink.rect(g, xa, ys, xb - xa, hh, 'rgba(235,235,230,.35)', 1); if (n) ink.text(g, n, (xa + xb) / 2, ys - 16, { font: ink.sans(26), color: TXT2, align: 'center' }); });
      const va = lx(750e-9), vb = lx(380e-9), gr = g.createLinearGradient(va, 0, vb, 0);
      ['#b0201a', '#ff6a1e', '#ffd21e', '#4fd04a', '#2a8cff', '#6a3cff'].forEach((c, i) => gr.addColorStop(i / 5, c)); g.fillStyle = gr; g.fillRect(va, ys - 4, vb - va, hh + 8);
      g.restore();
      const a3 = ss(22.9, 23.3, t);
      if (a3 > 0) { g.save(); g.globalAlpha *= a3; const xm = (va + vb) / 2; ink.line(g, [[xm, ys + hh + 6], [xm, ys + hh + 52]], ink.accent, 2); ink.text(g, '可见光', xm, ys + hh + 90, { font: ink.sans(32, 600), color: ink.accent, align: 'center' }); g.restore(); }
      ink.text(g, '← 波长更长', x0, Y2 + H2 - 30, { font: ink.sans(22), color: TXT2 });
      ink.text(g, '波长更短 →', x1, Y2 + H2 - 30, { font: ink.sans(22), color: TXT2, align: 'right' });
      g.restore();
    } });
    [20.1, 20.9].forEach(t => ctx.cue(t, 'tick', .5));
    ctx.cue(22.95, 'chime', 660, .1);

    /* ==================== D 赫兹实验室（26.0 – 38.0） ==================== */
    const labPost = (o = {}) => ({ exposure: 1.26, ao: { radius: .2, intensity: 1 }, grade: ctx.grade.warm, vignette: .34, grain: .02, ...o });
    const cD1 = KIT.cam(34);
    const pD1 = camPath([[26.0, [-1.95, 1.66, 2.85], [.12, 1.0, -.25], 35], [28.5, [-1.62, 1.56, 2.42], [.12, 1.02, -.25], 34]]);
    ctx.shot({ t0: 26.0, name: 'D1 实验室', in: { type: 'dip', dur: .9 }, scene: LB.scene, camera: cD1, post: labPost({ dof: { focus: 2.8, aperture: .012, maxBlur: 6 } }),
      update(t) { LB.update(t, { hallK: 8 }); const c = pD1(t); applyCam(cD1, c, t, .0007); this.post.dof.focus = cD1.position.distanceTo(LB.gap); } });
    // 署名条跨 D1（全景）与 D2（火花隙特写）
    ctx.draw2d({ t0: 26.5, t1: 30.9, fade: .4, draw(g) { scrim(g, .5); } });
    ctx.lower({ t0: 26.5, t1: 30.9, name: '海因里希·赫兹 · 1857–1894', meta: '卡尔斯鲁厄工学院 · 1887 年', credit: '实验装置据赫兹论文复原' });

    const cD2 = KIT.cam(26);
    const pD2 = camPath([[28.4, [.115, 1.2, .27], [-.004, 1.14, 0], 26], [32.9, [.08, 1.178, .205], [-.002, 1.14, 0], 25]]);
    const shD2 = ctx.shot({ t0: 28.4, name: 'D2 火花隙', in: { type: 'cut' }, scene: LB.scene, camera: cD2, post: labPost({ exposure: 1.18, ao: { radius: .02, intensity: 1 }, dof: { focus: .3, aperture: .003, maxBlur: 8 } }),
      update(t) { LB.update(t, { hallK: 8 }); const c = pD2(t); applyCam(cD2, c, t, .0005); this.post.dof.focus = cD2.position.distanceTo(LB.gap); } });
    ctx.callout({ shot: shD2, at: LB.gap.clone().add(V(-.012, .012, 0)), t0: 28.45, t1: 32.95, side: 'left', dx: 150, dy: -170, title: '火花隙', sub: '两颗铜球，相距几毫米' });

    const cD3 = KIT.cam(30);
    const pD3 = camPath([[32.9, [.44, 1.31, 4.3], [0, 1.16, 1.2], 31], [35.2, [.3, 1.37, 3.9], [0, 1.24, 1.8], 30], [38.6, [.048, 1.5, 3.14], [0, DY + RING_R - .004, 3.0], 24]]);
    const shD3 = ctx.shot({ t0: 32.9, name: 'D3 接收环', in: { type: 'cut' }, scene: LB.scene, camera: cD3, post: labPost({ dof: { focus: 1.2, aperture: .005, maxBlur: 7 } }),
      update(t) { LB.update(t, { hallK: 8, ringKey: 3 }); const c = pD3(t); applyCam(cD3, c, t, .0006); this.post.dof.focus = cD3.position.distanceTo(LB.ringTop()); } });
    ctx.callout({ shot: shD3, at: () => LB.ringTop().add(V(-.004, 0, 0)), t0: 33.2, t1: 38.3, side: 'left', dx: 150, dy: 110, title: '接收环', sub: '没接导线，也闪出火花' });

    /* ==================== E1 剖示：电荷振荡 → 辐射（38.0 – 44.1） ==================== */
    const cE1 = KIT.cam(34);
    const pE1 = camPath([[38.0, [2.75, 3.3, 4.7], [-.15, 1.0, 1.15], 34], [44.8, [2.2, 3.03, 4.32], [-.15, 1.0, 1.25], 33]]);
    const shE1 = ctx.shot({ t0: 38.0, name: 'E1 振荡与辐射', in: { type: 'dissolve', dur: .6 }, scene: LB.scene, camera: cE1, post: labPost({ exposure: 1.24, dof: { focus: 4.6, aperture: .01, maxBlur: 5 } }),
      update(t) { LB.update(t, { hallK: 14, train: true, charges: ss(38.1, 38.5, t), waves: true }); const c = pE1(t); applyCam(cE1, c, t, .0004); } });
    // 右上角：慢放说明 + 振子电流的阻尼振荡
    ctx.draw2d({ shot: shE1, t0: 38.35, t1: 44.5, draw(g, t, a, P) {
      const x = 1360, y = 70, w = 500, span = [38.0, 44.1];
      box(g, x, y, w, 222);
      ink.text(g, '慢放示意：放慢约 1 亿倍', x + 24, y + 44, { font: ink.sans(26, 500), color: ink.accent });
      ink.scope(g, x + 24, y + 66, w - 48, 132, u => clamp((qTrain(lerp(span[0], span[1], u) + .004) - qTrain(lerp(span[0], span[1], u) - .004)) / .008 / (Math.PI * 2 * FV), -1, 1), { color: TXT, head: clamp((t - span[0]) / (span[1] - span[0])), lw: 2.4 });
      // 两只锌球上的正负电荷（随振荡交替）
      const q = qTrain(t);
      for (const sg of [-1, 1]) { const rho = sg * q, p = P(LB.sphere(sg).add(V(0, .3, 0))); if (!p || Math.abs(rho) < .08) continue; g.save(); g.globalAlpha *= clamp(Math.abs(rho) * 1.6); ink.text(g, rho > 0 ? '+' : '−', p.x, p.y, { font: ink.sans(56, 600), color: rho > 0 ? '#ff8a5c' : '#7ab8ff', align: 'center' }); g.restore(); }
    } });
    ctx.callout({ shot: shE1, at: LB.sphere(-1).add(V(0, .17, 0)), t0: 39.15, t1: 44.5, side: 'left', dx: 170, dy: 150, title: '电荷来回振荡', sub: '两只锌球轮流带正、负电' });
    ctx.callout({ shot: shE1, at: V(-.3, DY, 2.6), t0: 39.95, t1: 44.5, side: 'left', dx: 90, dy: -40, title: '电磁波向外扩散', sub: '一圈圈传向四周' });
    TRAINS.forEach(T => { ctx.cue(T, 'spark', .7); ctx.cue(T + .02, 'whoosh', 1.2, .18); });

    /* ==================== E2 锌板反射 · 驻波（44.1 – 49.9） ==================== */
    const cE2 = KIT.cam(32);
    const pE2 = camPath([[44.1, [-13.2, 4.3, 3.4], [0, 1.25, 6.45], 31], [50.7, [-12.55, 3.97, 3.73], [0, 1.3, 6.4], 30.5]]);
    const shE2 = ctx.shot({ t0: 44.1, name: 'E2 驻波', in: { type: 'dissolve', dur: .7 }, scene: LB.scene, camera: cE2, post: labPost({ exposure: 1.32, ao: { radius: .4, intensity: 1 } }),
      update(t) { LB.update(t, { cut: true, hallK: 150, stand: ss(44.3, 44.9, t) }); const c = pE2(t); applyCam(cE2, c, t, .0003); } });
    ctx.callout({ shot: shE2, at: LB.platePt.clone().add(V(0, .8, 0)), t0: 44.6, t1: 50.2, side: 'left', dx: 120, dy: -40, title: '锌板', sub: '把电波反射回来' });
    ctx.callout({ shot: shE2, at: () => LB.ringC().add(V(0, -RING_R, 0)), t0: 45.4, t1: 50.2, side: 'right', dx: 60, dy: 150, title: '接收环', sub: '找出火花消失的位置' });
    ctx.draw2d({ shot: shE2, t0: 44.9, t1: 50.5, draw(g, t, a, P) {
      // 波节（火花消失处）：只画竖线，不加文字
      LB.nodes.forEach((n, i) => { const k = ss(45.0 + i * .25, 45.3 + i * .25, t); if (k <= 0) return; const p = P(n); if (!p) return; g.save(); g.globalAlpha *= k; ink.line(g, [[p.x, p.y - 34], [p.x, p.y + 34]], TXT, 2.4); g.restore(); });
      // 结论面板（左上）
      const a2 = ss(46.2, 46.55, t); if (a2 <= 0) return;
      g.save(); g.globalAlpha *= a2; const X = 110, Y = 120; box(g, X, Y, 520, 196);
      ink.text(g, '电波的速度 ≈ 光速', X + 28, Y + 54, { font: ink.sans(34, 500), color: TXT });
      ink.text(g, '测出的波长 × 频率 =', X + 28, Y + 104, { font: ink.sans(26), color: TXT2 });
      ink.text(g, '约 30 万公里 / 秒', X + 28, Y + 160, { font: ink.sans(38, 600), color: ink.accent });
      g.restore();
    } });
    ctx.cue(46.25, 'tick', .5); ctx.cue(47.35, 'blip', 900, .08);

    /* ==================== F 一切由此开始（49.9 – 56） ==================== */
    const cF = KIT.cam(32);
    const pF = camPath([[49.9, [.95, 1.42, 1.55], [0, 1.12, 0], 30], [53.1, [-.6, 1.9, 3.7], [.05, 1.06, -.1], 32], [56.2, [-2.5, 2.55, 6.4], [.1, 1.0, -.2], 34]]);
    const shF = ctx.shot({ t0: 49.9, name: 'F 一切由此开始', in: { type: 'dissolve', dur: .8 }, scene: LB.scene, camera: cF, post: labPost({ dof: { focus: 2, aperture: .01, maxBlur: 6 } }),
      update(t) { LB.update(t, { hallK: 10, waves: .32, trains: [50.1, 52.0], maxR: 7 }); const c = pF(t); applyCam(cF, c, t, .0006); this.post.dof.focus = cF.position.distanceTo(LB.gap); } });
    // 频率轴：此后的无线通信都用电磁波，只是频率不同
    ctx.draw2d({ shot: shF, t0: 50.3, t1: 55.9, fade: .4, draw(g, t) {
      const X = 380, W = 1180, Y = 58, x0 = 450, x1 = 1490, y = 250, lf = f => lerp(x0, x1, (Math.log10(f) - 5) / 6);
      box(g, X, Y, W, 330);
      ink.text(g, '它们用的都是电磁波', X + 30, Y + 52, { font: ink.sans(34, 500), color: TXT });
      ink.text(g, '频率（单位：赫兹）→', X + W - 30, Y + 52, { font: ink.sans(22), color: TXT2, align: 'right' });
      const p = easeOut(ss(50.3, 51.1, t)); ink.ticks(g, x0, y, lerp(x0, x1, p), y, Math.round(6 * p), 8, 'rgba(238,238,232,.7)');
      // [起, 止, 名称, 行（负 = 轴上方，正 = 轴下方）, 出现时刻, 强调]：频段画成一小段横条（单一频率画成圆点），竖线连回频率轴
      // 连线位置 cx（0–1，沿频段）避开下面一行的横条
      const items = [[5e7, 5e7, '赫兹 1887', 1, 50.5, true], [1e6, 1e6, '调幅广播', -1, 50.75], [1e8, 1e8, '调频广播', -1, 50.75], [1e9, 1e10, '雷达', -2, 51.0, false, .93], [7e8, 3.5e9, '手机', -1, 51.25], [2.4e9, 5e9, 'Wi-Fi', 1, 51.5], [1.2e10, 1.2e10, '卫星', 2, 51.75]];
      items.forEach(([fa, fb, n, row, t0, acc, cx = .5]) => {
        const k = ss(t0, t0 + .35, t); if (k <= 0) return; g.save(); g.globalAlpha *= k;
        const xa = lf(fa), xb = lf(fb), xm = (xa + xb) / 2, col = acc ? ink.accent : TXT;
        const yb = row < 0 ? y - 22 - (-row - 1) * 46 : y + 24 + (row - 1) * 46, yl = row < 0 ? yb - 12 : yb + 34;
        ink.line(g, [[lerp(xa, xb, cx), yb], [lerp(xa, xb, cx), y]], acc ? ink.accent : 'rgba(235,235,230,.5)', 1.5);
        g.fillStyle = col; if (xb - xa > 2) g.fillRect(xa, yb - 3, xb - xa, 6); else { g.beginPath(); g.arc(xa, yb, 6, 0, Math.PI * 2); g.fill(); }
        ink.text(g, n, xm, yl, { font: ink.sans(26, 500), color: col, align: 'center' });
        g.restore();
      });
    } });

    /* ---------- 火花音效 ---------- */
    for (const ts of SPARKS) { if (ts > 38.0 && ts < 44.1) continue; const v = ts < 28.4 ? .45 : ts < 32.9 ? .8 : ts < 38 ? .5 : ts < 49.9 ? .32 : .42; ctx.cue(ts, 'spark', v); }
    ctx.cue(49.95, 'sub', .35);
  },
};
