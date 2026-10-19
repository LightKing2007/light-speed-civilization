/* 08 · 硅上的城市（1958 – 2024）
   A  基尔比的锗片集成电路（1958）→ 诺伊斯的平面工艺硅片（1959 申请专利）：两件复原道具，中段两块同框
   B  光刻：光源 → 掩模 → 投影物镜 → 晶圆；工件台带着晶圆一格一格步进曝光，然后显影、刻蚀、掺杂、沉积，再重复
   C  Intel 4004：白色陶瓷 16 针封装，掀开金色盖板露出裸片
   D  摩尔定律：对数坐标图（背景散点为 Karl Rupp 整理的历年处理器数据），七个点，趋势线逐段画出
   E1 纳米尺度：环栅纳米片晶体管 + 铜互连，旁边是约 100 nm 的病毒（示意）
   E2 一颗现代芯片放在 ENIAC 的照片上：当年一整个房间 → 今天指甲盖大小
   道具在 src/props/08/chips.js。所有动画都是 t 的纯函数。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。
   A 中段改成两块芯片同框（基尔比、诺伊斯两个标注都停够时间）；B 先用全景把整台光刻机放在字幕区之上，再下探到晶圆；
   C 偏俯视取景，白色陶瓷封装在画面中上部、不压在字幕后面；E2 的亮照片上字幕背后垫一层柔和暗带。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildFirstICs, buildLitho, buildPackages, buildNano } from '../props/08/chips.js';
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, 'rgba(235,235,230,.22)', 1); };
/** 亮画面（照片、白色陶瓷）上字幕背后的柔和暗带：画在 Canvas 层，位于字幕 DOM 之下，不加框 */
const capScrim = (ctx, shot, t0, t1, k = .55) => ctx.draw2d({ shot, t0, t1, fade: .4, draw(g) {
  g.save(); g.translate(960, 972); g.scale(1, .14); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1000);
  gr.addColorStop(0, `rgba(6,7,9,${k})`); gr.addColorStop(.6, `rgba(6,7,9,${k * .72})`); gr.addColorStop(1, 'rgba(6,7,9,0)'); g.fillStyle = gr; g.fillRect(-1000, -1000, 2000, 2000); g.restore(); } });
/** 署名条（左下，约 x 132–，y 720–850）后面的暗底：画在 Canvas 层，位于署名条 DOM 之下 */
const lowerScrim = (ctx, t0, t1, w) => ctx.draw2d({ t0, t1, fade: .4, draw(g) { const gr = g.createLinearGradient(100, 0, 100 + w, 0); gr.addColorStop(0, 'rgba(6,8,10,.78)'); gr.addColorStop(.75, 'rgba(6,8,10,.6)'); gr.addColorStop(1, 'rgba(6,8,10,0)'); g.fillStyle = gr; g.fillRect(100, 706, w, 160); } });

/* ---------- 光刻节奏 ---------- */
const B0 = 7.5;                                          // 光刻镜头开始（A 的诺伊斯标注要停够 3.5 秒）
const STEP0 = 8.4, STEP1 = 11.8, FILL1 = 12.9;          // 步进曝光前 10 格 → 延时：其余格子填满
const stepF = t => 10 * Math.pow(clamp((t - STEP0) / (STEP1 - STEP0)), 1.4);
const PROC = [['曝光', STEP0, 12.9], ['显影', 13.2, 14.15], ['刻蚀', 14.15, 15.1], ['掺杂', 15.1, 16.05], ['沉积', 16.05, 17.0], ['重复', 17.0, 18.8]];

/* ---------- 摩尔定律图 ---------- */
const MOORE = [
  ['Intel 4004', 1971, 2300, '2 300 个'], ['Intel 8086', 1978, 29000], ['Intel 80486', 1989, 1.18e6],
  ['Pentium 4', 2000, 4.2e7], ['Core i7（四核）', 2008, 7.31e8], ['Apple M1', 2020, 1.6e10], ['NVIDIA B200', 2024, 2.08e11, '2 080 亿个'],
];
const PNL = { x: 110, y: 92, w: 1700, h: 790 };                                   // 面板：底边 882，在字幕区之上
const CH = { x0: 310, x1: 1470, y0: 760, y1: 230, yr0: 1968, yr1: 2026, lg0: 2, lg1: 12 };
const cx = yr => lerp(CH.x0, CH.x1, (yr - CH.yr0) / (CH.yr1 - CH.yr0));
const cy = n => lerp(CH.y0, CH.y1, (Math.log10(n) - CH.lg0) / (CH.lg1 - CH.lg0));
const trend = yr => 2300 * Math.pow(2, (yr - 1971) / 2);
const CUR0 = 25.8, CUR1 = 31.2;
const cursor = t => lerp(1969, 2024.8, ss(CUR0, CUR1, t) * .3 + clamp((t - CUR0) / (CUR1 - CUR0)) * .7);
const DECADE = { 2: '100', 4: '1 万', 6: '100 万', 8: '1 亿', 10: '100 亿', 12: '1 万亿' };   // 纵轴每两格（×100）标一次

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
    // 0–2.2 基尔比特写（主体偏右，左边留给章节卡）→ 3.5 从右前方拉成两块同框（两个标注都在中间的空处）→ 5.2 起推向诺伊斯
    const pA = camPath([[0, [-.036, .026, .044], [-.026, .0012, 0], 30], [2.2, [-.031, .024, .041], [-.025, .0014, 0], 30], [3.5, [.012, .036, .07], [0, .001, 0], 30], [5.2, [.016, .035, .066], [.003, .0012, 0], 30], [8.3, [.03, .017, .028], [.024, .0046, 0], 27]]);
    const shA = ctx.shot({ name: '08.A 第一批集成电路', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: IC.scene, camera: camA,
      post: { exposure: 1.2, ao: { radius: .002, intensity: .9 }, dof: { focus: .045, aperture: .0008, maxBlur: 6 }, grade: ctx.grade.warm, vignette: .34, bloom: { strength: .06 } },
      update(t) { const c = pA(t); applyCam(camA, c, t, .0005); shA.post.dof.focus = camA.position.distanceTo(c.l); } });
    ctx.callout({ shot: shA, at: ia.kilbyBar, title: '基尔比的锗片', sub: '复原 · 元件之间靠金丝相连', t0: .6, t1: 5.2, side: 'right', dx: 120, dy: -130, style: 'accent' });
    ctx.callout({ shot: shA, at: ia.noyceDie, title: '诺伊斯的硅片', sub: '复原 · 连线直接做在表面', t0: 3.2, t1: B0 + .4, side: 'left', dx: 130, dy: -120, style: 'accent' });

    /* ================= B · 光刻 ================= */
    const LT = buildLitho(KIT), ND = LT.dies.length;
    const camB = KIT.cam(30, .01, 10);
    // 全景（整台机器都在字幕区之上）停到 11.8 → 下探到晶圆 → 抬高看各道工序扫过整片晶圆
    const pB = camPath([
      [B0, [1.3, 1.16, 1.86], [0, .26, 0], 30], [11.8, [1.25, 1.12, 1.79], [0, .26, 0], 30], [12.8, [.34, .2, .42], [0, .02, 0], 28],
      [13.8, [.3, .42, .44], [0, 0, 0], 30], [15.6, [.12, .46, .45], [0, 0, 0], 30], [19.6, [-.12, .45, .42], [0, 0, 0], 30],
    ]);
    /* 晶圆状态：步进曝光 → 延时填满 → 各道工序依次扫过整片晶圆 → 再曝光下一层 */
    const setWafer = t => {
      const sweep = (a, b) => Math.round(ND * ss(a, b, t));
      if (t < STEP1) { const f = stepF(t), u = f - Math.floor(f); LT.drawWafer(t < STEP0 ? 0 : Math.floor(f) + 1, 0); LT.aim(f, ss(STEP0 - .2, STEP0, t) * (.45 + .55 * (1 - ss(.4, .55, u)))); return; }
      if (t < 13.2) { LT.drawWafer(Math.round(lerp(11, ND, ss(STEP1, FILL1, t))), 0); LT.aim(10, .6 * (1 - ss(STEP1, STEP1 + .4, t)), ss(STEP1, 12.6, t)); return; }
      LT.aim(0, 0, 1);
      for (let i = 1; i < PROC.length - 1; i++) { const [, a, b] = PROC[i]; if (t < b) { LT.drawWafer(sweep(a, a + .7), i, i - 1); return; } }
      LT.drawWafer(sweep(17.4, 18.4), 0, 4); LT.aim(0, ss(17.0, 17.3, t), 1);
    };
    const shB = ctx.shot({ name: '08.B 光刻', t0: B0, in: { type: 'dissolve', dur: .8 }, scene: LT.scene, camera: camB,
      post: { exposure: 1.25, ao: { radius: .03, intensity: .8 }, dof: { focus: 1.2, aperture: .0015, maxBlur: 6 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .2 } },
      update(t) { setWafer(t); const c = pB(t); applyCam(camB, c, t, .0005); shB.post.dof.focus = camB.position.distanceTo(c.l); } });
    // 只标字幕讲到的两样：掩模（电路图形在这里）、晶圆上正在曝光的那一格（光斑始终在物镜正下方）
    ctx.callout({ shot: shB, at: V(-.06, .62, .06), title: '掩模', sub: '像底片，刻着电路图形', t0: B0 + .2, t1: 12.2, side: 'left', dx: 170, dy: -40, style: 'accent' });
    ctx.callout({ shot: shB, at: V(0, .002, 0), title: '硅晶圆', sub: '一格一格地曝光', t0: B0 + 1.1, t1: 13.4, side: 'right', dx: 190, dy: -70 });
    // 工序条：当前这一步亮起（字号放大，去掉每 0.9 秒换一次、来不及读的说明行）
    ctx.draw2d({ shot: shB, t0: 12.6, t1: 19.0, draw(g, t) {
      const bw = 128, gap = 34, h = 56, x0 = 960 - (PROC.length * bw + (PROC.length - 1) * gap) / 2, y = 96;
      let cur = 0; PROC.forEach((p, i) => { if (t >= p[1]) cur = i; });
      panelBox(g, x0 - 18, y - 16, PROC.length * bw + (PROC.length - 1) * gap + 36, h + 32);
      PROC.forEach(([name], i) => {
        const x = x0 + i * (bw + gap), on = i === cur, done = i < cur;
        g.fillStyle = on ? 'rgba(255,122,48,.32)' : 'rgba(255,255,255,.04)'; g.fillRect(x, y, bw, h);
        ink.rect(g, x, y, bw, h, on ? ink.accent : 'rgba(235,235,230,.35)', on ? 2.4 : 1.2);
        ink.text(g, name, x + bw / 2, y + 38, { font: ink.sans(26, on ? 700 : 500), color: on ? TXT : done ? TXT2 : 'rgba(238,238,232,.6)', align: 'center' });
        if (i < PROC.length - 1) ink.line(g, [[x + bw + 8, y + h / 2], [x + bw + gap - 8, y + h / 2]], 'rgba(235,235,230,.45)', 1.6);
      });
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
    // 盖板 19.6–20.8 掀开，之后推近裸片，裸片标注停够 3.5 秒；
    // 取景偏俯视、对焦点放在机身前沿之外，整块封装落在画面中上部，白色陶瓷不压在字幕后面
    const pC = camPath([[18.8, [-.03, .036, .04], [0, .0015, .003], 30], [20.4, [-.021, .033, .034], [.0008, .002, .0032], 29], [21.8, [-.005, .03, .025], [.0018, .003, .003], 27], [25.8, [.0024, .028, .018], [.0022, .0034, .0028], 26]]);
    const shC = ctx.shot({ name: '08.C Intel 4004', t0: 18.8, in: { type: 'dissolve', dur: .8 }, scene: PK.scene, camera: camC,
      post: { exposure: 1.06, ao: { radius: .002, intensity: .9 }, dof: { focus: .05, aperture: .0008, maxBlur: 5 }, grade: ctx.grade.warm, vignette: .34, bloom: { strength: .06 } },
      update(t) { print.visible = false; PK.modern.visible = false; setLid(ss(19.6, 20.8, t)); const c = pC(t); applyCam(camC, c, t, .0004); shC.post.dof.focus = camC.position.distanceTo(pa.die); } });
    ctx.callout({ shot: shC, at: pa.label, title: 'Intel 4004', sub: '复原 · 金色盖板下是芯片', t0: 19.2, t1: 23.8, side: 'left', dx: 120, dy: -120 });
    ctx.callout({ shot: shC, at: pa.die, title: '4004 裸片', sub: '真正的芯片 · 约 3×4 mm', t0: 20.6, t1: 25.4, side: 'right', dx: 150, dy: -130, style: 'accent' });

    /* ================= D · 摩尔定律 ================= */
    const rupp = (await A.text('assets/data/moore/rupp_50yrs_transistors.dat')).trim().split('\n').map(l => l.trim().split(/\s+/).map(Number)).filter(r => r.length === 2 && r[1] > 0).map(([y, k]) => [y, k * 1e3]);
    if (rupp.length < 50) throw new Error('摩尔定律背景数据不完整：' + rupp.length + ' 行');
    const camD = KIT.cam(30, .01, 10);
    const shD = ctx.shot({ name: '08.D 摩尔定律', t0: 25.0, in: { type: 'dissolve', dur: 1.0 }, scene: LT.scene, camera: camD,
      post: { exposure: .7, dof: { focus: .05, aperture: .006, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .5, bloom: { strength: .15 } },
      update(t) { LT.drawWafer(ND, 4); LT.aim(0, 0, 1); const a = .9 + t * .02; camD.position.set(Math.sin(a) * .28, .2, Math.cos(a) * .28); camD.lookAt(0, 0, 0); } });
    ctx.draw2d({ t0: 25.2, t1: 37.6, fade: .5, draw(g, t, a0) {
      const P = PNL, yc = cursor(t), ax = ss(25.2, 25.9, t);
      panelBox(g, P.x, P.y, P.w, P.h);
      ink.text(g, '芯片上的晶体管：大约每两年翻一番', P.x + 32, P.y + 56, { font: ink.sans(30, 600), color: TXT });
      // 坐标轴与网格（纵轴每格 ×10，每两格标一次数）
      g.save(); g.globalAlpha *= ax;
      for (let i = CH.lg0; i <= CH.lg1; i++) { const y = cy(Math.pow(10, i)); ink.line(g, [[CH.x0, y], [CH.x1, y]], i === CH.lg0 ? 'rgba(235,235,230,.55)' : 'rgba(235,235,230,.1)', 1); if (DECADE[i]) ink.text(g, DECADE[i], CH.x0 - 16, y + 7, { font: ink.sans(21), color: TXT2, align: 'right' }); }
      for (let yr = 1970; yr <= 2020; yr += 10) { const x = cx(yr); ink.line(g, [[x, CH.y0], [x, CH.y0 + 9]], 'rgba(235,235,230,.55)', 1); ink.line(g, [[x, CH.y1], [x, CH.y0]], 'rgba(235,235,230,.06)', 1); ink.text(g, String(yr), x, CH.y0 + 38, { font: ink.mono(21), color: TXT2, align: 'center' }); }
      g.restore();
      // 背景散点
      g.fillStyle = 'rgba(200,205,215,.5)';
      for (const [yr, n] of rupp) { if (yr > yc) continue; g.globalAlpha = a0 * ax * clamp((yc - yr) / 1.5); g.beginPath(); g.arc(cx(yr), cy(n), 3, 0, 7); g.fill(); }
      g.globalAlpha = a0;
      // 趋势线（画到当前年份）
      if (yc > 1971) { const pts = []; for (let yr = 1971; yr <= yc; yr += .5) pts.push([cx(yr), cy(trend(yr))]); pts.push([cx(yc), cy(trend(yc))]); g.setLineDash([12, 8]); ink.line(g, pts, ink.accent, 2.6); g.setLineDash([]); }
      // 七个点；只给起点（4004）和终点（B200）写字
      MOORE.forEach(([name, yr, n, txt], i) => {
        const k = clamp((yc - yr) / .6); if (k <= 0) return;
        const x = cx(yr), y = cy(n), first = i === 0, last = i === MOORE.length - 1, hi = last ? ss(31.6, 32.0, t) : 0;
        g.save(); g.globalAlpha *= k;
        g.fillStyle = last ? ink.accent : ink.white; g.beginPath(); g.arc(x, y, (first || last ? 8 : 6) + 2 * hi, 0, 7); g.fill();
        if (last && t > 31.6) { const u = ((t - 31.6) % 1.6) / 1.6; g.save(); g.globalAlpha *= 1 - u; g.strokeStyle = ink.accent; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 12 + 28 * u, 0, 7); g.stroke(); g.restore(); }
        if (first) { ink.text(g, `${name} · ${yr}`, x + 26, y + 38, { font: ink.sans(24, 600), color: TXT }); ink.text(g, txt, x + 248, y + 40, { font: ink.sans(32, 700), color: TXT }); }
        if (last) { ink.text(g, `${name} · ${yr}`, x - 24, y - 56, { font: ink.sans(24, 600), color: TXT, align: 'right' }); ink.text(g, txt, x - 24, y - 16, { font: ink.sans(32, 700), color: ink.accent, align: 'right' }); }
        g.restore();
      });
      // 4004 → B200：约 9 000 万倍
      const br = ss(31.9, 32.7, t);
      if (br > 0) {
        const x = 1560, ya = cy(2300), yb = cy(2.08e11), yt = lerp(ya, yb, br);
        g.save(); g.globalAlpha *= ss(31.9, 32.2, t);
        ink.line(g, [[x - 10, ya], [x + 10, ya]], ink.accent, 2.6); ink.line(g, [[x, ya], [x, yt]], ink.accent, 2.6); if (br > .98) ink.line(g, [[x - 10, yb], [x + 10, yb]], ink.accent, 2.6);
        g.setLineDash([3, 5]); ink.line(g, [[cx(1971) + 12, ya], [x - 14, ya]], 'rgba(255,122,48,.45)', 1.2); ink.line(g, [[cx(2024) + 14, yb], [x - 14, yb]], 'rgba(255,122,48,.45)', 1.2); g.setLineDash([]);
        g.globalAlpha *= ss(32.4, 32.9, t);
        ink.text(g, '约', x + 22, (ya + yb) / 2 - 26, { font: ink.sans(24), color: TXT2 });
        ink.text(g, '9 000 万倍', x + 22, (ya + yb) / 2 + 18, { font: ink.sans(34, 700), color: ink.accent });
        g.restore();
      }
      ink.text(g, '背景散点：K. Rupp, 50 Years of Microprocessor Trend Data · CC BY 4.0', P.x + P.w - 24, P.y + P.h - 18, { font: ink.sans(16), color: 'rgba(238,238,232,.62)', align: 'right' });
    } });

    /* ================= E1 · 纳米尺度 ================= */
    const NN = buildNano(KIT), na = NN.anchors;
    const camE = KIT.cam(30, .5, 300);
    const pE = camPath([[37.8, [4.6, 8.9, 18.3], [0, 2.5, 0], 30], [40.4, [9.2, 11.7, 24.8], [3, 3, 0], 30], [44.6, [14.8, 15.1, 33], [6.5, 3.5, 0], 30]]);
    const shE = ctx.shot({ name: '08.E1 纳米尺度', t0: 37.8, in: { type: 'blur', dur: 1.0, params: [6] }, scene: NN.scene, camera: camE,
      post: { exposure: 1.3, ao: { radius: .8, intensity: .9 }, dof: { focus: 18, aperture: .002, maxBlur: 6 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .1 } },
      update(t) { const c = pE(t); applyCam(camE, c, t, .0005); shE.post.dof.focus = camE.position.distanceTo(c.l); NN.virus.rotation.set(.2, .4 + t * .05, 0); } });
    // 只留两处对比：几纳米厚的沟道 ↔ 约 100 nm 的病毒；比例尺给出尺度
    ctx.callout({ shot: shE, at: V(.6, 2.0, 1.5), title: '纳米片沟道', sub: '电流通道，每片几纳米厚', t0: 38.6, t1: 44.7, side: 'right', dx: 140, dy: 110, style: 'accent' });
    ctx.callout({ shot: shE, at: V(10.2, 7.4, 1.6), title: '病毒（示意）', sub: '直径约 100 nm', t0: 40.2, t1: 44.7, side: 'right', dx: 130, dy: -110 });   // 锚点在病毒朝向镜头的左侧表面
    ctx.measure({ shot: shE, a: V(-4.5, 0, 2.3), b: V(-2.5, 0, 2.3), label: '20 nm', t0: 39.4, t1: 44.6, off: 28 });   // 底座上沿：比例尺不进字幕区

    /* ================= E2 · 一个房间 → 指甲盖 ================= */
    const camF = KIT.cam(30, .001, 2);
    const pF = camPath([[44.4, [.052, .05, .036], [.046, .0015, .002], 30], [47.4, [.05, .06, .06], [.047, .001, .003], 30], [52.6, [.044, .07, .095], [.046, .0005, .004], 30]]);
    const shF = ctx.shot({ name: '08.E2 从房间到指甲盖', t0: 44.4, in: { type: 'dissolve', dur: 1.0 }, scene: PK.scene, camera: camF,
      post: { exposure: .98, ao: { radius: .003, intensity: .85 }, dof: { focus: .07, aperture: .0012, maxBlur: 6 }, grade: ctx.grade.warm, vignette: .34, bloom: { strength: .06 } },
      update(t) { print.visible = true; PK.modern.visible = true; setLid(1); const c = pF(t); applyCam(camF, c, t, .0004); shF.post.dof.focus = camF.position.distanceTo(V(.05, .0015, .004)); } });
    lowerScrim(ctx, 45.0, 49.4, 560);   // 照片很亮：署名条后面垫一块渐隐的暗底
    capScrim(ctx, shF, 44.4, 52.2);     // 字幕背后也垫一层
    ctx.lower({ t0: 45.0, t1: 49.4, name: 'ENIAC · 1946', meta: '弹道研究实验室 · 占满一个大房间', credit: '照片：美国陆军 · 公有领域' });
    // 对比面板：标题直接给结论，两行对比，数字放大
    ctx.draw2d({ t0: 47.4, t1: 52.2, draw(g, t) {
      const X = 1290, Y = 590, Wd = 540, pad = 28;
      panelBox(g, X, Y, Wd, 250);
      ink.text(g, '快了上亿倍', X + pad, Y + 56, { font: ink.sans(34, 700), color: ink.accent });
      ink.line(g, [[X + pad, Y + 84], [X + Wd - pad, Y + 84]], 'rgba(235,235,230,.22)', 1);
      ink.text(g, 'ENIAC', X + pad, Y + 140, { font: ink.sans(25), color: TXT2 });
      ink.text(g, '每秒约 5 000 次', X + Wd - pad, Y + 142, { font: ink.sans(32, 600), color: TXT, align: 'right' });
      g.save(); g.globalAlpha *= ss(47.9, 48.3, t);
      ink.text(g, '今天的手机芯片', X + pad, Y + 206, { font: ink.sans(25), color: TXT2 });
      ink.text(g, '每秒数万亿次', X + Wd - pad, Y + 208, { font: ink.sans(32, 600), color: ink.accent, align: 'right' });
      g.restore();
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(2.3, 'swoosh', .25);
    ctx.cue(B0, 'whoosh', 1.0, .3);
    for (let i = 0; i < 10; i++) ctx.cue(STEP0 + (STEP1 - STEP0) * Math.pow(i / 10, 1 / 1.4), 'tick', .7);
    ctx.cue(STEP1, 'riser', 1.1, .14);
    for (const p of PROC.slice(1)) ctx.cue(p[1], 'click', .4);
    ctx.cue(18.8, 'swoosh', .3); ctx.cue(19.7, 'relay', .5);
    ctx.cue(25.0, 'whoosh', 1.0, .25);
    // 标注点出现的时刻：反解 cursor(t) = 年份
    for (const [, yr] of MOORE) { let lo = CUR0 - 1, hi = CUR1 + 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (cursor(m) < yr) lo = m; else hi = m; } ctx.cue(hi, 'blip', 900 + (yr - 1971) * 12, .05); }
    ctx.cue(31.6, 'chime', 660, .08);
    ctx.cue(37.8, 'whoosh', 1.1, .25); ctx.cue(44.4, 'swoosh', .25); ctx.cue(47.4, 'chime', 880, .06);
  },
};
