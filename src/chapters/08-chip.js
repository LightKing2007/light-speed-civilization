/* 08 · 硅上的城市（1958 – 2024）
   A  基尔比的锗片集成电路（1958）→ 诺伊斯的平面工艺硅片（1959 申请专利）：两件复原道具
   B  光刻：光源 → 掩模 → 投影物镜 → 晶圆；工件台带着晶圆一格一格步进曝光，然后显影、刻蚀、掺杂、沉积，再重复
   C  Intel 4004：白色陶瓷 16 针封装，掀开金色盖板露出裸片
   D  摩尔定律：对数坐标图（背景散点为 Karl Rupp 整理的历年处理器数据），七个标注点，趋势线逐段画出
   E1 纳米尺度：环栅纳米片晶体管 + 铜互连，旁边是约 100 nm 的病毒（示意）
   E2 一颗现代芯片放在 ENIAC 的照片上：当年一整个房间 → 今天指甲盖大小
   道具在 src/props/08/chips.js。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildFirstICs, buildLitho, buildPackages, buildNano } from '../props/08/chips.js';

/* ---------- 光刻节奏 ---------- */
const STEP0 = 7.6, STEP1 = 11.0, FILL1 = 12.6;          // 步进曝光前 10 格 → 延时：其余格子填满
const stepF = t => 10 * Math.pow(clamp((t - STEP0) / (STEP1 - STEP0)), 1.4);
const PROC = [['曝光', STEP0, 12.9, '紫外光穿过掩模，把图形印在光刻胶上'], ['显影', 13.2, 14.15, '洗掉感光的胶，露出下面的硅'], ['刻蚀', 14.15, 15.1, '把露出来的部分蚀刻掉'], ['掺杂', 15.1, 16.05, '打进杂质原子，改变导电性'], ['沉积', 16.05, 17.0, '铺上新的绝缘层或金属层'], ['重复', 17.0, 18.8, '一颗芯片要这样重复几十次']];

/* ---------- 摩尔定律图 ---------- */
const MOORE = [
  ['Intel 4004', 1971, 2300, '2 300'], ['Intel 8086', 1978, 29000, '2.9 万'], ['Intel 80486', 1989, 1.18e6, '118 万'],
  ['Pentium 4', 2000, 4.2e7, '4 200 万'], ['Core i7（四核）', 2008, 7.31e8, '7.31 亿'], ['Apple M1', 2020, 1.6e10, '160 亿'], ['NVIDIA B200', 2024, 2.08e11, '2 080 亿'],
];
const CH = { x0: 300, x1: 1600, y0: 840, y1: 200, yr0: 1968, yr1: 2026, lg0: 2, lg1: 12 };
const cx = yr => lerp(CH.x0, CH.x1, (yr - CH.yr0) / (CH.yr1 - CH.yr0));
const cy = n => lerp(CH.y0, CH.y1, (Math.log10(n) - CH.lg0) / (CH.lg1 - CH.lg0));
const trend = yr => 2300 * Math.pow(2, (yr - 1971) / 2);
const CUR0 = 25.8, CUR1 = 31.2;
const cursor = t => lerp(1969, 2024.8, ss(CUR0, CUR1, t) * .3 + clamp((t - CUR0) / (CUR1 - CUR0)) * .7);
const DECADE = ['100', '1 千', '1 万', '10 万', '100 万', '1 000 万', '1 亿', '10 亿', '100 亿', '1 000 亿', '1 万亿'];

export default {
  id: '08', status: 'implemented', slug: 'chip', title: '硅上的城市', dur: 52,
  card: {"title": "硅上的城市", "short": "硅上的城市", "meta": "1958 — 2024"},
  stamps: [[0, "1958"], [18.8, "1971"], [31.4, "2024"]],
  caps: [[0.4, 6.6, "1958 年基尔比把多个元件做进一块锗片，1959 年诺伊斯又把连线也做在硅片上——集成电路诞生了。"], [7.0, 12.8, "方法很像洗印照片：紫外光经过掩模，把电路图形缩小投射到涂着光刻胶的硅片上，"], [13.2, 18.4, "再经过刻蚀、掺杂、沉积，一层层「印」出成千上万个晶体管。"], [18.8, 24.6, "1971 年，英特尔 4004 把 2300 个晶体管装进指甲盖大小的芯片——第一款商用微处理器。"], [25.0, 31.0, "1965 年，摩尔预言芯片上的元件每年翻一番，十年后改为每两年——此后半个世纪大致如此。"], [31.4, 37.4, "2024 年，一颗双硅片 AI 芯片共有 2080 亿个晶体管，约是 4004 的九千万倍。"], [37.8, 44.0, "如今最精细的结构只有几十个原子宽，比大多数病毒还要小得多。"], [44.4, 51.6, "当年塞满一个房间的计算能力，如今被压缩进你的掌心，还快了上亿倍。"]],
  credits: ['assets/data/moore/rupp_50yrs_transistors.dat', 'assets/photos/act2/eniac_brl_left_side.jpg'],   // 其余为程序化建模
  async build(ctx) {
    const { KIT, A } = ctx;

    /* ================= A · 第一批集成电路 ================= */
    const IC = buildFirstICs(KIT), ia = IC.anchors;
    const camA = KIT.cam(30, .002, 2);
    const pA = camPath([[0, [-.036, .026, .044], [-.022, .0012, 0], 30], [3.3, [-.024, .021, .038], [-.021, .0014, 0], 28], [4.3, [.014, .022, .036], [.022, .004, 0], 28], [7.6, [.03, .016, .026], [.024, .0046, 0], 26]]);
    const shA = ctx.shot({ name: '08.A 第一批集成电路', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: IC.scene, camera: camA,
      post: { exposure: 1.08, ao: { radius: .002, intensity: .9 }, dof: { focus: .045, aperture: .0018, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .38, bloom: { strength: .06 } },
      update(t) { const c = pA(t); applyCam(camA, c, t, .0005); shA.post.dof.focus = camA.position.distanceTo(c.l); } });
    ctx.lower({ t0: .9, t1: 3.5, name: '基尔比的第一块集成电路（复原）', meta: '杰克·基尔比 · 德州仪器 · 1958 年 9 月 12 日', credit: '按公开照片与专利描述建模：锗片、金丝飞线、黑蜡' });
    ctx.callout({ shot: shA, at: ia.kilbyBar, title: '一块锗片', sub: '晶体管、电阻、电容做在同一块上', t0: 1.2, t1: 3.5, side: 'right', dx: 130, dy: -110, style: 'accent' });
    ctx.callout({ shot: shA, at: ia.kilbyWire, title: '金丝飞线', sub: '元件之间还要手工焊线', t0: 1.8, t1: 3.5, side: 'left', dx: -130, dy: -90 });
    ctx.lower({ t0: 4.1, t1: 6.9, name: '诺伊斯的平面集成电路（复原示意）', meta: '罗伯特·诺伊斯 · 仙童半导体 · 1959 年申请专利，1960 年做出实物', credit: '基于赫尔尼的平面工艺 · TO-5 管座' });
    ctx.callout({ shot: shA, at: ia.noyceDie, title: '连线也做在硅片上', sub: '表面蒸镀的铝膜代替了飞线', t0: 4.6, t1: 6.9, side: 'right', dx: 140, dy: -100, style: 'accent' });

    /* ================= B · 光刻 ================= */
    const LT = buildLitho(KIT), ND = LT.dies.length;
    const camB = KIT.cam(30, .01, 10);
    const pB = camPath([
      [7.0, [1.05, .6, 1.5], [0, .4, 0], 30], [9.2, [.92, .55, 1.32], [0, .38, 0], 30], [10.8, [.34, .17, .4], [0, .03, 0], 28],
      [11.2, [.33, .2, .41], [0, .02, 0], 28], [12.8, [.3, .42, .44], [0, 0, 0], 30], [15.6, [.12, .46, .45], [0, 0, 0], 30], [19.6, [-.12, .45, .42], [0, 0, 0], 30],
    ]);
    /* 晶圆状态：步进曝光 → 延时填满 → 各道工序依次扫过整片晶圆 → 再曝光下一层 */
    const setWafer = t => {
      const sweep = (a, b) => Math.round(ND * ss(a, b, t));
      if (t < STEP1) { const f = stepF(t), u = f - Math.floor(f); LT.drawWafer(t < STEP0 ? 0 : Math.floor(f) + 1, 0); LT.aim(f, ss(STEP0 - .2, STEP0, t) * (.45 + .55 * (1 - ss(.4, .55, u)))); return; }
      if (t < 13.2) { LT.drawWafer(Math.round(lerp(11, ND, ss(STEP1, FILL1, t))), 0); LT.aim(10, .6 * (1 - ss(STEP1, STEP1 + .4, t)), ss(STEP1, 11.8, t)); return; }
      LT.aim(0, 0, 1);
      for (let i = 1; i < PROC.length - 1; i++) { const [, a, b] = PROC[i]; if (t < b) { LT.drawWafer(sweep(a, a + .7), i, i - 1); return; } }
      LT.drawWafer(sweep(17.4, 18.4), 0, 4); LT.aim(0, ss(17.0, 17.3, t), 1);
    };
    const shB = ctx.shot({ name: '08.B 光刻', t0: 7.0, in: { type: 'dissolve', dur: .8 }, scene: LT.scene, camera: camB,
      post: { exposure: 1.05, ao: { radius: .03, intensity: .8 }, dof: { focus: 1.2, aperture: .0025, maxBlur: 10 }, grade: ctx.grade.cool, vignette: .34, bloom: { strength: .2 } },
      update(t) { setWafer(t); const c = pB(t); applyCam(camB, c, t, .0005); shB.post.dof.focus = camB.position.distanceTo(c.l); } });
    ctx.callout({ shot: shB, at: V(.06, .78, .06), title: '紫外光源', sub: '深紫外光 · 波长 193 nm', t0: 7.3, t1: 9.4, side: 'right', dx: 130, dy: -40 });
    ctx.callout({ shot: shB, at: V(.07, .62, .05), title: '掩模', sub: '石英板上的铬图形', t0: 7.6, t1: 9.4, side: 'left', dx: -150, dy: -30, style: 'accent' });
    ctx.callout({ shot: shB, at: V(.085, .36, .02), title: '投影物镜', sub: '把图形缩小 4 倍', t0: 7.9, t1: 9.4, side: 'right', dx: 140, dy: 20 });
    ctx.callout({ shot: shB, at: V(.11, .001, .09), title: '硅晶圆', sub: '直径 300 mm · 表面涂着光刻胶', t0: 8.2, t1: 9.4, side: 'left', dx: -140, dy: 60 });
    ctx.readout({ x: 64, y: 110, t0: STEP1 + .1, t1: 12.9, html: '<span class="k">延时 ·</span> 现代光刻机每小时可曝光上百片晶圆' });
    // 工序条
    ctx.draw2d({ t0: 9.3, t1: 18.7, draw(g, t) {
      const bw = 112, gap = 44, x0 = 960 - (PROC.length * bw + (PROC.length - 1) * gap) / 2, y = 96, h = 44;
      let cur = 0; PROC.forEach((p, i) => { if (t >= p[1]) cur = i; });
      PROC.forEach(([name], i) => {
        const x = x0 + i * (bw + gap), on = i === cur, done = i < cur;
        g.fillStyle = on ? 'rgba(255,122,48,.2)' : 'rgba(8,9,10,.6)'; g.fillRect(x, y, bw, h);
        ink.rect(g, x, y, bw, h, on ? ink.accent : done ? ink.dim : ink.faint, on ? 1.6 : 1);
        ink.text(g, name, x + bw / 2, y + 30, { font: ink.sans(20, on ? 600 : 400), color: on ? ink.white : done ? ink.dim : 'rgba(235,235,230,.35)', align: 'center' });
        if (i < PROC.length - 1) ink.line(g, [[x + bw + 10, y + h / 2], [x + bw + gap - 10, y + h / 2]], ink.faint, 1.25);
      });
      ink.text(g, PROC[cur][3], 960, y + h + 34, { font: ink.sans(19), color: ink.dim, align: 'center' });
    } });

    /* ================= C · Intel 4004 ================= */
    const PK = buildPackages(KIT), pa = PK.anchors;
    const eniac = await A.tex('assets/photos/act2/eniac_brl_left_side.jpg', { aniso: 16 });
    const print = KIT.photoPrint(eniac, { width: .072, border: .004, curl: 0, lift: .00006 });
    print.rotation.set(-Math.PI / 2, 0, -.06); print.position.set(.05, .0002, .004); PK.scene.add(print);
    PK.modern.position.y = .0003;
    const LID0 = PK.lid.position.clone();
    const setLid = k => { PK.lid.position.set(LID0.x + .011 * ss(.35, 1, k), LID0.y + .0045 * Math.sin(Math.PI * Math.min(1, k * 1.15)) + .0001 * k, LID0.z + .004 * ss(.35, 1, k)); PK.lid.rotation.set(-.35 * Math.sin(Math.PI * k), 0, -.5 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - k * .8)); };
    const camC = KIT.cam(30, .001, 2);
    const pC = camPath([[18.8, [-.03, .03, .042], [0, .002, 0], 30], [21.4, [-.018, .026, .034], [.001, .002, 0], 28], [23.0, [.0, .02, .02], [.0024, .0042, 0], 26], [25.8, [.006, .014, .011], [.0024, .0042, 0], 24]]);
    const shC = ctx.shot({ name: '08.C Intel 4004', t0: 18.8, in: { type: 'dissolve', dur: .8 }, scene: PK.scene, camera: camC,
      post: { exposure: .98, ao: { radius: .002, intensity: .9 }, dof: { focus: .05, aperture: .0035, maxBlur: 12 }, grade: ctx.grade.warm, vignette: .36, bloom: { strength: .06 } },
      update(t) { print.visible = false; PK.modern.visible = false; setLid(ss(20.4, 21.9, t)); const c = pC(t); applyCam(camC, c, t, .0004); shC.post.dof.focus = camC.position.distanceTo(c.l); } });
    ctx.lower({ t0: 19.3, t1: 21.9, name: 'Intel 4004 · 1971', meta: '第一款商用单片微处理器 · 费金、霍夫、马佐尔、岛正利', credit: '按 C4004 白色陶瓷封装复原 · 裸片图案为示意' });
    ctx.callout({ shot: shC, at: pa.die, title: '4004 裸片', sub: '约 3 × 4 mm', t0: 22.3, t1: 25.0, side: 'right', dx: 150, dy: -110, style: 'accent' });
    ctx.draw2d({ t0: 22.6, t1: 25.0, draw(g) {
      const x = 1290, y = 700, w = 540, h = 112;
      g.fillStyle = 'rgba(8,9,10,.78)'; g.fillRect(x, y, w, h); ink.corners(g, x, y, w, h, 12, ink.dim);
      ink.text(g, 'INTEL 4004 · 1971', x + 26, y + 38, { font: ink.mono(16), color: ink.dim });
      ink.text(g, '2 300', x + 26, y + 86, { font: ink.cond(44, 600), color: ink.accent });
      ink.text(g, '个晶体管 · 10 μm 工艺 · 740 kHz', x + 136, y + 82, { font: ink.sans(21) });
    } });

    /* ================= D · 摩尔定律 ================= */
    const rupp = (await A.text('assets/data/moore/rupp_50yrs_transistors.dat')).trim().split('\n').map(l => l.trim().split(/\s+/).map(Number)).filter(r => r.length === 2 && r[1] > 0).map(([y, k]) => [y, k * 1e3]);
    if (rupp.length < 50) throw new Error('摩尔定律背景数据不完整：' + rupp.length + ' 行');
    const camD = KIT.cam(30, .01, 10);
    const shD = ctx.shot({ name: '08.D 摩尔定律', t0: 25.0, in: { type: 'dissolve', dur: 1.0 }, scene: LT.scene, camera: camD,
      post: { exposure: .7, dof: { focus: .05, aperture: .006, maxBlur: 16 }, grade: ctx.grade.cool, vignette: .5, bloom: { strength: .15 } },
      update(t) { LT.drawWafer(ND, 4); LT.aim(0, 0, 1); const a = .9 + t * .02; camD.position.set(Math.sin(a) * .28, .2, Math.cos(a) * .28); camD.lookAt(0, 0, 0); } });
    ctx.draw2d({ t0: 25.2, t1: 37.6, fade: .5, draw(g, t, a0) {
      const P = { x: 170, y: 110, w: 1640, h: 810 }, yc = cursor(t), ax = ss(25.2, 25.9, t);
      g.fillStyle = 'rgba(8,9,10,.8)'; g.fillRect(P.x, P.y, P.w, P.h); ink.corners(g, P.x, P.y, P.w, P.h, 16, ink.dim);
      ink.text(g, 'TRANSISTORS PER CHIP · 每颗芯片上的晶体管数 · 对数坐标', P.x + 30, P.y + 42, { font: ink.mono(16), color: ink.dim });
      // 坐标轴与网格（纵轴每格 ×10）
      g.save(); g.globalAlpha *= ax;
      for (let i = 0; i <= CH.lg1 - CH.lg0; i++) { const y = cy(Math.pow(10, CH.lg0 + i)); ink.line(g, [[CH.x0, y], [CH.x1, y]], i === 0 ? ink.dim : 'rgba(235,235,230,.08)', 1); ink.text(g, DECADE[i], CH.x0 - 14, y + 5, { font: ink.sans(16), color: ink.dim, align: 'right' }); }
      for (let yr = 1970; yr <= 2020; yr += 10) { const x = cx(yr); ink.line(g, [[x, CH.y0], [x, CH.y0 + 8]], ink.dim, 1); ink.line(g, [[x, CH.y1], [x, CH.y0]], 'rgba(235,235,230,.05)', 1); ink.text(g, String(yr), x, CH.y0 + 32, { font: ink.mono(16), color: ink.dim, align: 'center' }); }
      ink.text(g, '纵轴每一格 ×10', CH.x0 - 14, CH.y1 - 26, { font: ink.sans(16), color: ink.dim, align: 'right' });
      g.restore();
      // 图例与摩尔的两次预言
      g.save(); g.globalAlpha *= ss(25.6, 26.2, t);
      ink.text(g, '1965 · 摩尔：每年翻一番', P.x + 30, P.y + 86, { font: ink.sans(20), color: ink.white });
      g.restore(); g.save(); g.globalAlpha *= ss(27.4, 28.0, t);
      ink.text(g, '1975 · 修正为：每两年翻一番', P.x + 30, P.y + 118, { font: ink.sans(20, 600), color: ink.accent });
      g.restore(); g.save(); g.globalAlpha *= ss(26.2, 26.8, t);
      g.setLineDash([8, 6]); ink.line(g, [[P.x + 30, P.y + 152], [P.x + 70, P.y + 152]], ink.accent, 2); g.setLineDash([]);
      ink.text(g, '每两年 ×2 的趋势', P.x + 82, P.y + 158, { font: ink.sans(16), color: ink.dim });
      g.fillStyle = 'rgba(200,205,215,.5)'; g.beginPath(); g.arc(P.x + 50, P.y + 184, 3, 0, 7); g.fill();
      ink.text(g, '历年处理器', P.x + 82, P.y + 190, { font: ink.sans(16), color: ink.dim });
      g.restore();
      // 背景散点
      g.fillStyle = 'rgba(200,205,215,.42)';
      for (const [yr, n] of rupp) { if (yr > yc) continue; g.globalAlpha = a0 * ax * clamp((yc - yr) / 1.5); g.beginPath(); g.arc(cx(yr), cy(n), 2.6, 0, 7); g.fill(); }
      g.globalAlpha = a0;
      // 趋势线（画到当前年份）
      if (yc > 1971) { const pts = []; for (let yr = 1971; yr <= yc; yr += .5) pts.push([cx(yr), cy(trend(yr))]); pts.push([cx(yc), cy(trend(yc))]); g.setLineDash([10, 7]); ink.line(g, pts, ink.accent, 2.2); g.setLineDash([]); }
      // 七个标注点
      MOORE.forEach(([name, yr, n, txt], i) => {
        const k = clamp((yc - yr) / 1.2); if (k <= 0) return;
        const x = cx(yr), y = cy(n), last = i === MOORE.length - 1, hi = last ? ss(31.6, 32.0, t) : 0;
        g.save(); g.globalAlpha *= k;
        g.fillStyle = last ? ink.accent : ink.white; g.beginPath(); g.arc(x, y, 6 + 2 * hi, 0, 7); g.fill();
        if (last && t > 31.6) { const u = ((t - 31.6) % 1.6) / 1.6; g.save(); g.globalAlpha *= 1 - u; g.strokeStyle = ink.accent; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 10 + 26 * u, 0, 7); g.stroke(); g.restore(); }
        if (last) { ink.text(g, name, x - 18, y - 40, { font: ink.sans(21, 600), color: ink.white, align: 'right' }); ink.text(g, `${yr} · ${txt}（双裸片）`, x - 18, y - 14, { font: ink.mono(17, 600), color: ink.accent, align: 'right' }); }
        else { ink.text(g, name, x + 14, y + 28, { font: ink.sans(18, 600), color: ink.white }); ink.text(g, `${yr} · ${txt}`, x + 14, y + 51, { font: ink.mono(16), color: ink.dim }); }
        g.restore();
      });
      // 4004 → B200：约 9 000 万倍
      const br = ss(31.9, 32.7, t);
      if (br > 0) {
        const x = 1660, ya = cy(2300), yb = cy(2.08e11), yt = lerp(ya, yb, br);
        g.save(); g.globalAlpha *= ss(31.9, 32.2, t);
        ink.line(g, [[x - 8, ya], [x + 8, ya]], ink.accent, 2); ink.line(g, [[x, ya], [x, yt]], ink.accent, 2); if (br > .98) ink.line(g, [[x - 8, yb], [x + 8, yb]], ink.accent, 2);
        g.setLineDash([3, 5]); ink.line(g, [[cx(1971) + 10, ya], [x - 12, ya]], 'rgba(255,122,48,.35)', 1); ink.line(g, [[cx(2024) + 12, yb], [x - 12, yb]], 'rgba(255,122,48,.35)', 1); g.setLineDash([]);
        g.globalAlpha *= ss(32.4, 32.9, t);
        ink.text(g, '约', x + 18, (ya + yb) / 2 - 16, { font: ink.sans(17), color: ink.dim });
        ink.text(g, '9 000 万倍', x + 18, (ya + yb) / 2 + 14, { font: ink.sans(24, 600), color: ink.accent });
        g.restore();
      }
      ink.text(g, '背景散点：K. Rupp, 50 Years of Microprocessor Trend Data · CC BY 4.0', P.x + P.w - 24, P.y + P.h - 16, { font: ink.mono(13), color: 'rgba(235,235,230,.45)', align: 'right' });
    } });

    /* ================= E1 · 纳米尺度 ================= */
    const NN = buildNano(KIT), na = NN.anchors;
    const camE = KIT.cam(30, .5, 300);
    const pE = camPath([[37.8, [4.6, 8.9, 18.3], [0, 2.5, 0], 30], [40.4, [9.2, 11.7, 24.8], [3, 3, 0], 30], [44.6, [14.8, 15.1, 33], [6.5, 3.5, 0], 30]]);
    const shE = ctx.shot({ name: '08.E1 纳米尺度', t0: 37.8, in: { type: 'blur', dur: 1.0, params: [6] }, scene: NN.scene, camera: camE,
      post: { exposure: 1.08, ao: { radius: .8, intensity: .9 }, dof: { focus: 18, aperture: .002, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .34, bloom: { strength: .1 } },
      update(t) { const c = pE(t); applyCam(camE, c, t, .0005); shE.post.dof.focus = camE.position.distanceTo(c.l); NN.virus.rotation.set(.2, .4 + t * .05, 0); } });
    ctx.callout({ shot: shE, at: na.sheets, title: '纳米片沟道', sub: '每片只有几纳米厚', t0: 38.6, t1: 44.3, side: 'right', dx: 140, dy: 110, style: 'accent' });
    ctx.callout({ shot: shE, at: na.gate, title: '栅极', sub: '从四面包住沟道（环栅）', t0: 39.1, t1: 44.3, side: 'left', dx: -150, dy: -90 });
    ctx.callout({ shot: shE, at: na.cu, title: '铜互连', sub: '芯片里有十几层这样的导线', t0: 39.6, t1: 44.3, side: 'left', dx: -130, dy: -60 });
    ctx.callout({ shot: shE, at: na.virus, title: '病毒（示意）', sub: '直径约 100 nm', t0: 41.0, t1: 44.3, side: 'right', dx: 120, dy: -80 });
    ctx.measure({ shot: shE, a: V(-4.5, -1.6, 2.4), b: V(-2.5, -1.6, 2.4), label: '20 nm', t0: 38.9, t1: 44.3, off: 26 });

    /* ================= E2 · 一个房间 → 指甲盖 ================= */
    const camF = KIT.cam(30, .001, 2);
    const pF = camPath([[44.4, [.052, .05, .036], [.046, .0015, .002], 30], [47.4, [.05, .06, .06], [.047, .001, .003], 30], [52.6, [.044, .07, .095], [.046, .0005, .004], 30]]);
    const shF = ctx.shot({ name: '08.E2 从房间到指甲盖', t0: 44.4, in: { type: 'dissolve', dur: 1.0 }, scene: PK.scene, camera: camF,
      post: { exposure: .92, ao: { radius: .003, intensity: .85 }, dof: { focus: .07, aperture: .002, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .38, bloom: { strength: .06 } },
      update(t) { print.visible = true; PK.modern.visible = true; setLid(1); const c = pF(t); applyCam(camF, c, t, .0004); shF.post.dof.focus = camF.position.distanceTo(V(.05, .0015, .004)); } });
    ctx.lower({ t0: 45.0, t1: 47.6, name: 'ENIAC · 1946', meta: '弹道研究实验室 · 占满一个大房间', credit: '照片：美国陆军 · 公有领域' });
    ctx.draw2d({ t0: 47.8, t1: 52.2, draw(g, t) {
      const x = 1290, y = 620, w = 520, h = 236;
      g.fillStyle = 'rgba(8,9,10,.74)'; g.fillRect(x, y, w, h); ink.corners(g, x, y, w, h, 12, ink.dim);
      ink.text(g, 'ENIAC · 1946', x + 28, y + 44, { font: ink.mono(15), color: ink.dim });
      ink.text(g, '一个房间 · 约 5 000 次加法 / 秒', x + 28, y + 76, { font: ink.sans(20) });
      ink.line(g, [[x + 28, y + 100], [x + w - 28, y + 100]], ink.faint, 1);
      g.save(); g.globalAlpha *= ss(48.6, 49.1, t);
      ink.text(g, '今天的手机芯片', x + 28, y + 134, { font: ink.mono(15), color: ink.dim });
      ink.text(g, '指甲盖大小 · 每秒数万亿次运算', x + 28, y + 166, { font: ink.sans(20) });
      g.restore(); g.save(); g.globalAlpha *= ss(49.6, 50.1, t);
      ink.text(g, '快了上亿倍', x + 28, y + 212, { font: ink.sans(26, 600), color: ink.accent });
      g.restore();
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(4.0, 'swoosh', .25);
    ctx.cue(7.0, 'whoosh', 1.0, .3);
    for (let i = 0; i < 10; i++) ctx.cue(STEP0 + (STEP1 - STEP0) * Math.pow(i / 10, 1 / 1.4), 'tick', .7);
    ctx.cue(STEP1, 'riser', 1.6, .14);
    for (const p of PROC.slice(1)) ctx.cue(p[1], 'click', .4);
    ctx.cue(18.8, 'swoosh', .3); ctx.cue(20.5, 'relay', .5);
    ctx.cue(25.0, 'whoosh', 1.0, .25);
    // 标注点出现的时刻：反解 cursor(t) = 年份
    for (const [, yr] of MOORE) { let lo = CUR0 - 1, hi = CUR1 + 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (cursor(m) < yr) lo = m; else hi = m; } ctx.cue(hi, 'blip', 900 + (yr - 1971) * 12, .05); }
    ctx.cue(31.6, 'chime', 660, .08);
    ctx.cue(37.8, 'whoosh', 1.1, .25); ctx.cue(44.4, 'swoosh', .25); ctx.cue(49.6, 'chime', 880, .06);
  },
};
