/* 11 · 海底之光（1988 – 2026）
   A1 光纤端头微距：涂覆层剥开，0.125 mm 的玻璃包层，端面中心 9 µm 的纤芯射出红光；旁边一根头发
   A2 纵剖的纤芯：光以不到 5° 的掠射角射向边界，被全部反射，一路折返；太陡的光线穿出纤芯损失掉
   B  波分复用：六种颜色（示意色）经棱镜合进同一根纤芯，另一端再分开
   C1 深海光缆端头逐层剥开：护套 → 铜管 → 两层钢丝 → 不锈钢管 → 阻水膏里的 12 根彩色光纤
   C2 海床上的中继器；光功率曲线：沿途衰减，每隔几十公里放大一次
   D  1988 年的 TAT-8（按登陆点绘制的示意路由）
   E  全球在用海缆按经度逐片点亮，光脉冲沿缆流动；右侧统计
   道具在 src/props/11/fiber.js。所有动画都是 t 的纯函数。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。
   A1 只比「玻璃丝」和「头发」两样（字幕讲的就是这个对比）；A2 换成斜侧方的低机位，纤芯 / 包层在近处标名字，
      太陡的光线提前出现、改成黄色，面板只写结论；B 改成能同时看见两个棱镜的全景，标「一根纤芯」；
   C1 六个标注减到「光纤」「铜管」两个 + 一行「直径约 17 mm」，镜头延长到字幕讲「铜管供电」时（27.4 s）再切中继器；
   C2 标注与功率曲线挪开、不压住中继器；D 署名条停够 4.6 秒；E 两个统计数字去掉过细的说明，并在后面加暗底。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildFiberEnd, buildCore, zigzag, CORE, buildWDM, WDM_COLORS, buildCable, CABLE, buildRepeater } from '../props/11/fiber.js';
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h, edge = 'rgba(235,235,230,.22)', lw = 1) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, edge, lw); };
/** 带暗底的一行字（画面里部件旁边的名字） */
const tag = (g, s, x, y, { font = ink.sans(26, 600), color = TXT, align = 'left', h = 26 } = {}) => {
  g.font = font; const w = g.measureText(s).width, x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  g.fillStyle = 'rgba(8,10,14,.84)'; g.fillRect(x0 - 10, y - h - 5, w + 20, h + 16); ink.text(g, s, x, y, { font, color, align });
};
/** 署名条（左下，约 x 132–，y 720–850）后面的暗底：画在 Canvas 层，位于署名条 DOM 之下 */
const lowerScrim = (ctx, t0, t1, w) => ctx.draw2d({ t0, t1, fade: .4, draw(g) { const gr = g.createLinearGradient(100, 0, 100 + w, 0); gr.addColorStop(0, 'rgba(6,8,10,.8)'); gr.addColorStop(.75, 'rgba(6,8,10,.62)'); gr.addColorStop(1, 'rgba(6,8,10,0)'); g.fillStyle = gr; g.fillRect(100, 706, w, 160); } });
/** 右侧大数字（stat）后面的暗底：地球和海缆很碎时保证数字和说明看得清 */
const statScrim = (ctx, t0, t1) => ctx.draw2d({ t0, t1, fade: .45, draw(g) {
  g.save(); g.translate(1640, 535); g.scale(1.75, 1);   // 椭圆形的柔边暗底，边缘完全透明（不留硬边）
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 260); gr.addColorStop(0, 'rgba(4,6,10,.7)'); gr.addColorStop(.55, 'rgba(4,6,10,.6)'); gr.addColorStop(1, 'rgba(4,6,10,0)');
  g.fillStyle = gr; g.fillRect(-260, -260, 520, 520); g.restore();
} });

const RAY0 = 7.4, RAY1 = 12.4, STEEP = 8.3;
const TAT = { us: [39.60, -74.34], bu: [48.4, -12.0], uk: [50.78, -4.56], fr: [47.80, -4.37] };
const SWEEP0 = 39.0, SWEEP1 = 44.6;
const C2 = 27.4;   // 从光缆切到中继器（字幕讲完「铜管给…供电」的「铜管」之后）

export default {
  id: '11', status: 'implemented', slug: 'fiber', title: '海底之光', dur: 52,
  card: {"title": "海底之光", "short": "海底之光", "meta": "光纤与海缆 · 1988 — 2026"},
  stamps: [[0, "1988"], [38.8, "2026"]],
  caps: [[0.4, 6.4, "电信号在铜线里衰减得太快。光纤把信号换成光，在和头发丝差不多粗的玻璃丝里传输。"], [6.8, 13.0, "纤芯的折射率比外面的包层略高，光几乎贴着边界掠过时，会被全部反射回来，一路折返向前。"], [13.4, 19.6, "再让几十种波长略有不同的红外光共用一根纤芯，各载一路信号，容量就成倍增长。"], [20.0, 26.0, "跨洋光缆其实只有水管粗细：中心是几对到十几对光纤，外面是钢丝、铜管和聚乙烯护套。"], [26.4, 32.0, "铜管给沿途的海底中继器供电，每隔几十公里，就把变弱的光重新放大一次。"], [32.4, 38.4, "1988 年，第一条跨大西洋光缆 TAT-8 投入使用，可同时承载约四万路电话。"], [38.8, 45.0, "如今，六百多条海底光缆纵横洋底，总长超过一百五十万公里。"], [45.4, 51.6, "你发出的跨洋数据，绝大多数不经过卫星，而是沿着这些海底的玻璃丝，以每秒约二十万公里飞驰。"]],
  credits: ['assets/data/telegeography/cable-geo.json', 'assets/data/telegeography/cables-all-details.json', 'assets/tex/damp_sand', 'assets/earth/earth_day_8k.jpg', 'assets/earth/earth_clouds_8k.jpg', 'assets/earth/earth_lights_8k.jpg', 'assets/earth/earth_normal_4k.png', 'assets/earth/stars_8k.jpg'],
  async build(ctx) {
    const { KIT, A } = ctx;

    /* ================= A1 · 光纤端头 ================= */
    const FE = buildFiberEnd(KIT), fa = FE.anchors;
    const wl = p => p.clone().applyMatrix4(FE.group.matrixWorld);
    FE.group.updateMatrixWorld(true);
    const camA = KIT.cam(30, .02, 200);
    const pA = camPath([[0, [-.2, 1.1, 3.6], [-.4, 0, .1], 30], [6.8, [1.1, .7, 2.6], [.1, 0, .1], 30]]);
    const shA = ctx.shot({ name: '11.A1 光纤端头', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: FE.scene, camera: camA,
      post: { exposure: 1.12, ao: { radius: .05, intensity: .8 }, dof: { focus: 3, aperture: .002, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .34, bloom: { strength: .3 } },
      update(t) { const c = pA(t); applyCam(camA, c, t, .0004); shA.post.dof.focus = camA.position.distanceTo(wl(fa.clad)); const k = .8 + .2 * Math.sin(t * 5); FE.coreGlow.material.emissiveIntensity = 30 * k; FE.cone.material.uniforms.uOpacity.value = .5 * k; } });
    // 字幕讲的是「和头发丝差不多粗的玻璃丝」：只标这两样，同时留到镜头结束
    ctx.callout({ shot: shA, at: () => wl(fa.clad), title: '玻璃丝', sub: '直径 0.125 mm', t0: 1.2, t1: 6.6, side: 'right', dx: 130, dy: -140, style: 'accent' });
    ctx.callout({ shot: shA, at: () => wl(fa.hair), title: '一根头发', sub: '约 0.07 mm', t0: 2.1, t1: 6.6, side: 'left', dx: -110, dy: 170 });

    /* ================= A2 · 全反射 ================= */
    const CO = buildCore(KIT);
    const main = zigzag(4, { x0: 0, z0: -.2 }), steep = zigzag(15, { x0: 4, len: 4 + 1.4 / Math.tan(15 * Math.PI / 180), z0: -.4 });
    const mainLine = KIT.pathLine(main.pts, { width: 3.6, color: 0xff5a3c, intensity: 2.2, head: 0, glowHead: 2.2 }); CO.scene.add(mainLine);
    // 太陡的光线（黄色，和主光线区分开）：到达边界后折射穿出，进入包层
    const sp = steep.pts[1] || steep.pts[steep.pts.length - 1], esc = [steep.pts[0], sp, sp.clone().add(V(4.6, 0, 1.15)), sp.clone().add(V(9, 0, 2.1))];
    const steepLine = KIT.pathLine(esc, { width: 3, color: 0xffd36a, intensity: 1.5, head: 0, opacity: .9 }); CO.scene.add(steepLine);
    const hitArr = new Float32Array(main.hits.length * 3), hitA = new Float32Array(main.hits.length);
    main.hits.forEach((p, i) => p.toArray(hitArr, i * 3));
    const glints = KIT.points(hitArr, { size: 22, color: 0xffd2b8, intensity: 2.2, alphas: hitA, soft: .9, additive: true }); CO.scene.add(glints);
    const rayLen = main.pts.reduce((s, p, i) => i ? s + p.distanceTo(main.pts[i - 1]) : 0, 0);
    // 先慢后快：前两次反射发生在镜头近处（约 2 秒），之后光线加速冲向远方
    const headAt = t => Math.pow(clamp((t - RAY0) / (RAY1 - RAY0)), 2);
    const camB = KIT.cam(30, .05, 600);
    // 斜侧方的低机位：纤芯带从左下斜伸向右上，近处够宽，反射点看得清
    const pB = camPath([[6.8, [-10, 5, 4], [16, 0, -.4], 30], [13.4, [0, 4.6, 3.6], [26, 0, -.4], 30]]);
    const nearX = t => pB(t).p.x + 18;   // 近处标注的位置：始终在镜头前方 18 个单位
    const shB = ctx.shot({ name: '11.A2 全反射', t0: 6.8, in: { type: 'dissolve', dur: .8 }, scene: CO.scene, camera: camB,
      post: { exposure: 1.12, dof: { focus: 20, aperture: .0012, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .36, bloom: { strength: .3 } },
      update(t) {
        const h = headAt(t); mainLine.set({ head: h });
        let acc = 0; main.hits.forEach((p, i) => { acc = 0; for (let j = 1; j <= i + 1; j++) acc += main.pts[j].distanceTo(main.pts[j - 1]); const u = acc / rayLen; hitA[i] = h >= u ? .35 + .65 * Math.exp(-(h - u) * 18) : 0; });
        glints.geometry.attributes.aAlpha.needsUpdate = true;
        steepLine.set({ head: easeIO(clamp((t - STEEP) / 1.6)), opacity: .9 * (1 - ss(13.1, 13.5, t)) });
        const c = pB(t); applyCam(camB, c, t, .0003); shB.post.dof.focus = camB.position.distanceTo(V(nearX(t), 0, 0));
      } });
    ctx.callout({ shot: shB, at: t => V(nearX(t), .02, -.15), title: '纤芯', sub: '折射率略高', t0: 7.6, t1: 13.3, side: 'left', dx: -150, dy: -110, style: 'accent' });
    ctx.callout({ shot: shB, at: t => V(nearX(t), .02, 2.3), title: '包层', sub: '折射率略低', t0: 8.4, t1: 13.3, side: 'right', dx: 150, dy: 80 });
    ctx.draw2d({ shot: shB, t0: 9.2, t1: 13.35, draw(g, t) {
      const X = 1320, Y = 110, Wd = 540, sw = ss(STEEP + .7, STEEP + 1.0, t);
      panelBox(g, X, Y, Wd, 168);
      ink.text(g, '贴着边界的光：全部反射回来', X + 24, Y + 48, { font: ink.sans(26, 600), color: TXT });
      g.save(); g.globalAlpha *= sw; ink.line(g, [[X + 24, Y + 90], [X + 60, Y + 90]], '#ffd36a', 4); ink.text(g, '太陡的光：穿出纤芯，损失掉', X + 72, Y + 98, { font: ink.sans(24, 600), color: '#ffd36a' }); g.restore();
      ink.text(g, '示意图 · 实际是红外光', X + 24, Y + 144, { font: ink.sans(20), color: TXT2 });
    } });

    /* ================= B · 波分复用 ================= */
    const WD = buildWDM(KIT);
    const camW = KIT.cam(30, .05, 200);
    // 全景：两个棱镜和中间的纤芯同时在画面里，慢慢推近
    const pW = camPath([[13.4, [-1.2, 3.2, 15.5], [0, 0, 0], 30], [20.2, [1.0, 2.8, 13.6], [.3, 0, 0], 30]]);
    const shW = ctx.shot({ name: '11.B 波分复用', t0: 13.4, in: { type: 'dissolve', dur: .8 }, scene: WD.scene, camera: camW,
      post: { exposure: 1.06, grade: ctx.grade.cool, vignette: .36, bloom: { strength: .4 } },
      update(t) {
        WD.beams.forEach((b, i) => { const on = ss(13.7 + i * .22, 14.1 + i * .22, t), out = ss(15.2 + i * .15, 15.6 + i * .15, t); b.inB.material.uniforms.uOpacity.value = .9 * on; b.strand.material.emissiveIntensity = 3 * on; b.strand.visible = on > .01; b.outB.material.uniforms.uOpacity.value = .9 * out; });
        applyCam(camW, pW(t), t, .0003);
      } });
    ctx.callout({ shot: shW, at: V(.8, .1, 0), title: '一根纤芯', sub: '6 种颜色的光同时传', t0: 14.4, t1: 19.85, side: 'right', dx: 120, dy: -170, style: 'accent' });
    ctx.draw2d({ shot: shW, t0: 15.2, t1: 19.85, draw(g) {
      const X = 100, Y = 110, Wd = 560;
      panelBox(g, X, Y, Wd, 124);
      ink.text(g, '每种颜色 = 一路信号', X + 24, Y + 48, { font: ink.sans(26, 600), color: TXT });
      WDM_COLORS.forEach((c, i) => { g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.fillRect(X + 330 + i * 34, Y + 26, 24, 24); });
      ink.text(g, '颜色为示意，实际是红外光', X + 24, Y + 96, { font: ink.sans(21), color: TXT2 });
    } });

    /* ================= C1 · 深海光缆 ================= */
    const CB = await buildCable(KIT), ca = CB.anchors;
    const camC = KIT.cam(28, 1, 3000);
    const pC = camPath([[20.0, [72, 34, 66], [9, 0, 0], 28], [26.4, [40, 20, 52], [13, 0, 0], 28], [C2 + .8, [36, 18.5, 49], [13, 0, 0], 28]]);
    const shC = ctx.shot({ name: '11.C1 深海光缆', t0: 20.0, in: { type: 'dissolve', dur: .8 }, scene: CB.scene, camera: camC,
      post: { exposure: 1.12, ao: { radius: 2, intensity: .9 }, dof: { focus: 80, aperture: .0018, maxBlur: 8 }, grade: ctx.grade.neutral, vignette: .34, bloom: { strength: .1 } },
      update(t) { const c = pC(t); applyCam(camC, c, t, .0003); shC.post.dof.focus = camC.position.distanceTo(c.l); CB.group.rotation.x = .25 + t * .03; } });
    const wc = p => p.clone().applyAxisAngle(V(1, 0, 0), CB.group.rotation.x);
    // 只标两处：中心的光纤（字幕先讲），铜管（留到下一句「铜管给中继器供电」）；钢丝和护套一眼可辨，不再逐层标
    ctx.callout({ shot: shC, at: () => wc(ca.fiber), title: '光纤', sub: '12 根，颜色各不同', t0: 21.1, t1: 25.6, side: 'right', dx: 120, dy: -110, style: 'accent' });
    ctx.callout({ shot: shC, at: () => wc(ca.cu), title: '铜管', sub: '给海底中继器送电', t0: 22.8, t1: C2 - .1, side: 'left', dx: -150, dy: 160 });
    ctx.draw2d({ shot: shC, t0: 20.3, t1: 24.9, draw(g) {
      const X = 1920 - 64 - 420, Y = 108;   // 右上角是空的黑背景，不压住光缆
      panelBox(g, X, Y, 420, 68);
      ink.text(g, '深海光缆 · 直径约 17 mm', X + 22, Y + 44, { font: ink.sans(26, 600), color: TXT });
    } });

    /* ================= C2 · 中继器 ================= */
    const RP = await buildRepeater(KIT);
    const camR = KIT.cam(32, .02, 200);
    const pR = camPath([[C2 - .2, [2.4, .8, 2.9], [0, .12, 0], 32], [32.4, [-1.6, .7, 2.7], [0, .12, 0], 32]]);
    const shR = ctx.shot({ name: '11.C2 中继器', t0: C2, in: { type: 'dissolve', dur: .8 }, scene: RP.scene, camera: camR,
      post: { exposure: 1.22, ao: { radius: .2, intensity: .9 }, dof: { focus: 3, aperture: .0018, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .4, grain: .03 },
      update(t) { const c = pR(t); applyCam(camR, c, t, .0006); shR.post.dof.focus = camR.position.distanceTo(c.l); RP.target.position.set(0, .1, 0); } });
    ctx.callout({ shot: shR, at: V(0, .3, 0), title: '海底中继器', sub: '靠铜管送来的电工作', t0: C2 + .1, t1: 32.3, side: 'left', dx: -130, dy: -150, style: 'accent' });
    // 光功率曲线（右上，不压住中继器）：一路变弱，每到一个中继器跳回去
    ctx.draw2d({ shot: shR, t0: C2 + .9, t1: 32.4, draw(g, t) {
      const X = 1250, Y = 110, Wd = 610, x = X + 26, w = Wd - 52, y = Y + 78, h = 150, span = 4, u = clamp((t - (C2 + 1.0)) / 3.0);
      panelBox(g, X, Y, Wd, 290);
      ink.text(g, '光一路变弱，中继器再把它放大', X + 26, Y + 48, { font: ink.sans(26, 600), color: TXT });
      ink.line(g, [[x, y + h], [x + w, y + h]], 'rgba(235,235,230,.4)', 1.2);
      const P = s => { const k = s * span, f = k - Math.floor(k); return .92 - .62 * f; }, pts = [];
      for (let i = 0; i <= w * u; i += 2) pts.push([x + i, y + h - h * P(i / w)]);
      if (pts.length > 1) ink.line(g, pts, '#ff7a30', 3);
      for (let k = 1; k < span; k++) { const xx = x + w * k / span; if (xx > x + w * u) break; g.fillStyle = '#8fd8ff'; g.beginPath(); g.moveTo(xx, y + h + 4); g.lineTo(xx - 9, y + h + 20); g.lineTo(xx + 9, y + h + 20); g.closePath(); g.fill(); if (k === 1) ink.text(g, '中继器', xx, y + h + 46, { font: ink.sans(20, 600), color: '#8fd8ff', align: 'center' }); }
      ink.text(g, '距离 →', x + w, y + h + 46, { font: ink.sans(20), color: TXT2, align: 'right' });
    } });

    /* ================= D / E · 地球 ================= */
    const sE = new THREE.Scene();
    const E = await ctx.earth({ quality: '8k', nightIntensity: 2.4, cloudOpacity: .6 }); sE.add(E.group); await E.addStars(sE, .2);
    E.setSunFromUTC(Date.UTC(2026, 9, 18, 13, 0));
    const tatMain = E.path([TAT.us, TAT.bu], { width: 4.2, color: 0xffd7a8, intensity: 1.4, head: 0, glowHead: 2.2, alt: .004, maxDeg: .4 });
    const tatUK = E.path([TAT.bu, TAT.uk], { width: 3.4, color: 0xffd7a8, intensity: 1.4, head: 0, alt: .004, maxDeg: .3 });
    const tatFR = E.path([TAT.bu, TAT.fr], { width: 3.4, color: 0xffd7a8, intensity: 1.4, head: 0, alt: .004, maxDeg: .3 });
    const details = await A.json('assets/data/telegeography/cables-all-details.json');
    const live = new Set(Object.values(details).filter(c => !c.is_planned).map(c => c.id));
    const cables = await E.cables(f => live.has(f.properties && f.properties.id), { width: 1.5, opacity: .95, intensity: 1.4 });
    if (cables.lines.length < 300) throw new Error('海缆数据不完整：' + cables.lines.length);
    // 每条线按平均经度决定点亮时刻（从美洲往东扫过一圈）
    cables.lines.forEach(l => { const cs = l.feature.geometry.type === 'MultiLineString' ? l.feature.geometry.coordinates.flat() : l.feature.geometry.coordinates; let lon = cs.reduce((s, c) => s + c[0], 0) / cs.length; lon = ((lon + 100 + 360) % 360); l.at = SWEEP0 + (SWEEP1 - SWEEP0) * lon / 360; l.ph = (lon * 7.3) % 1; });
    const LL = (a, b, h = 0) => E.ll(a, b, h).toArray();
    const setEarth = (t, cam, mode) => {
      E.update(t, cam);
      const tat = mode === 'D';
      tatMain.visible = tatUK.visible = tatFR.visible = tat || t < 40;
      tatMain.set({ head: easeIO(ss(33.0, 35.6, t)), opacity: tat ? 1 : 1 - ss(38.8, 39.6, t) });
      tatUK.set({ head: easeIO(ss(35.5, 36.3, t)), opacity: tat ? 1 : 1 - ss(38.8, 39.6, t) }); tatFR.set({ head: easeIO(ss(35.5, 36.3, t)), opacity: tat ? 1 : 1 - ss(38.8, 39.6, t) });
      cables.group.visible = !tat;
      if (!tat) cables.lines.forEach(l => { const k = ss(l.at, l.at + .6, t); l.mesh.visible = k > 0; l.mesh.set({ head: k, pulse: 1.4 * ss(45.2, 46.0, t), pulseSpeed: .35, pulseLen: .06, time: t + l.ph * 3 }); });
    };
    const camD = KIT.cam(34, .01, 400);
    const pD = camPath([[32.4, LL(30, -44, 9.5), LL(45, -40), 34], [38.8, LL(33, -34, 8.6), LL(46, -34), 34]]);
    const shD = ctx.shot({ name: '11.D TAT-8', t0: 32.4, in: { type: 'dissolve', dur: .8 }, scene: sE, camera: camD,
      post: { exposure: 1.15, grade: ctx.grade.space, vignette: .28, grain: .02, bloom: { strength: .18 } },
      update(t) { applyCam(camD, pD(t), t, 0); setEarth(t, camD, 'D'); } });
    lowerScrim(ctx, 33.0, 37.6, 1060);
    ctx.lower({ t0: 33.0, t1: 37.6, name: 'TAT-8 · 第一条跨大西洋光缆', meta: '美国新泽西 → 英国 / 法国 · 1988 年 12 月', credit: '路由为按登陆点绘制的示意（该缆已退役）' });
    ctx.draw2d({ shot: shD, t0: 34.4, t1: 38.6, draw(g) {
      const X = 1380, Y = 110, Wd = 440;
      panelBox(g, X, Y, Wd, 158);
      ink.text(g, '280 Mb/s', X + 26, Y + 84, { font: ink.cond(66, 600), color: ink.accent });
      ink.text(g, '总容量 · 约 4 万路电话', X + 26, Y + 132, { font: ink.sans(24, 600), color: TXT });
    } });
    const camE = KIT.cam(34, .01, 400);
    const pE = camPath([[38.8, LL(33, -34, 8.6), LL(46, -34), 34], [44.8, LL(15, 20, 14), LL(25, 30), 34], [52.4, LL(10, 100, 15.5), LL(20, 110), 34]]);
    const shE = ctx.shot({ name: '11.E 全球海缆', t0: 38.8, in: { type: 'cut' }, scene: sE, camera: camE,
      post: { exposure: 1.15, grade: ctx.grade.space, vignette: .28, grain: .02, bloom: { strength: .2 } },
      update(t) { applyCam(camE, pE(t), t, 0); setEarth(t, camE, 'E'); } });
    const nLive = live.size, kmLive = Object.values(details).filter(c => !c.is_planned).reduce((s, c) => { const m = /^([\d,.]+)/.exec(c.length || ''); return s + (m ? +m[1].replace(/,/g, '') : 0); }, 0);
    // 总长 = 有长度记录的在用海缆之和（其余没有长度记录），所以写「约」
    statScrim(ctx, 39.2, 52.0);
    ctx.stat({ t0: 39.4, t1: 45.0, fmt: p => String(Math.round(nLive * p)), unit: '条在用海缆', label: `总长约 ${Math.round(kmLive / 1e4)} 万公里`, src: '数据：TeleGeography Submarine Cable Map', dur: 1.6 });
    ctx.stat({ t0: 45.6, t1: 51.8, fmt: p => (20 * p).toFixed(0), unit: '万 km/s', label: '光在玻璃里的速度，约为真空中的 2/3', dur: 1.2 });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(1.2, 'blip', 880, .04);
    ctx.cue(6.8, 'whoosh', 1.0, .25); main.hits.forEach((p, i) => { let acc = 0; for (let j = 1; j <= i + 1; j++) acc += main.pts[j].distanceTo(main.pts[j - 1]); const u = acc / rayLen; let lo = RAY0, hi = RAY1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (headAt(m) < u) lo = m; else hi = m; } if (hi < RAY1) ctx.cue(hi, 'tick', .5); });
    ctx.cue(13.4, 'swoosh', .25); WDM_COLORS.forEach((c, i) => ctx.cue(13.8 + i * .22, 'blip', 600 + i * 120, .04));
    ctx.cue(20.0, 'whoosh', 1.0, .22); ctx.cue(C2, 'sub', .25); ctx.cue(32.4, 'swoosh', .25); ctx.cue(35.6, 'chime', 660, .06);
    ctx.cue(39.0, 'riser', 5.4, .12); ctx.cue(45.4, 'chime', 880, .06);
  },
};
