/* 11 · 海底之光（1988 – 2026）
   A1 光纤端头微距：涂覆层剥开，0.125 mm 的玻璃包层，端面中心 9 µm 的纤芯射出红光；旁边一根头发
   A2 纵剖的纤芯：光以不到 5° 的掠射角射向边界，被全部反射，一路折返；太陡的光线穿出纤芯损失掉
   B  波分复用：六种颜色（示意色）经棱镜合进同一根纤芯，另一端再分开
   C1 深海光缆端头逐层剥开：护套 → 铜管 → 两层钢丝 → 不锈钢管 → 阻水膏里的 12 根彩色光纤
   C2 海床上的中继器；光功率曲线：沿途衰减，每隔几十公里放大一次
   D  1988 年的 TAT-8（按登陆点绘制的示意路由）
   E  全球在用海缆按经度逐片点亮，光脉冲沿缆流动；右侧统计
   道具在 src/props/11/fiber.js。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildFiberEnd, buildCore, zigzag, CORE, buildWDM, WDM_COLORS, buildCable, CABLE, buildRepeater } from '../props/11/fiber.js';

const RAY0 = 7.4, RAY1 = 12.4, STEEP = 9.6;
const TAT = { us: [39.60, -74.34], bu: [48.4, -12.0], uk: [50.78, -4.56], fr: [47.80, -4.37] };
const SWEEP0 = 39.0, SWEEP1 = 44.6;

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
      post: { exposure: 1.05, ao: { radius: .05, intensity: .8 }, dof: { focus: 3, aperture: .0025, maxBlur: 10 }, grade: ctx.grade.cool, vignette: .38, bloom: { strength: .3 } },
      update(t) { const c = pA(t); applyCam(camA, c, t, .0004); shA.post.dof.focus = camA.position.distanceTo(wl(fa.core)); const k = .8 + .2 * Math.sin(t * 5); FE.coreGlow.material.emissiveIntensity = 30 * k; FE.cone.material.uniforms.uOpacity.value = .5 * k; } });
    ctx.callout({ shot: shA, at: () => wl(fa.core), code: 'CORE', title: '纤芯', sub: '直径约 9 µm', t0: 1.0, t1: 6.6, side: 'right', dx: 130, dy: -120, style: 'accent' });
    ctx.callout({ shot: shA, at: () => wl(fa.clad), title: '玻璃包层', sub: '直径 0.125 mm', t0: 1.6, t1: 6.6, side: 'right', dx: 120, dy: 110 });
    ctx.callout({ shot: shA, at: () => wl(fa.coat), title: '涂覆层', sub: '外径 0.25 mm', t0: 2.2, t1: 6.6, side: 'left', dx: -110, dy: -110 });
    ctx.callout({ shot: shA, at: () => wl(fa.hair), title: '一根头发', sub: '约 0.07 mm', t0: 2.8, t1: 6.6, side: 'left', dx: -120, dy: 110 });

    /* ================= A2 · 全反射 ================= */
    const CO = buildCore(KIT);
    const main = zigzag(4, { x0: 0, z0: -.2 }), steep = zigzag(15, { x0: 30, len: 30 + 1.2 / Math.tan(15 * Math.PI / 180), z0: -.2 });
    const mainLine = KIT.pathLine(main.pts, { width: 3.2, color: 0xff5a3c, intensity: 2.2, head: 0, glowHead: 2.2 }); CO.scene.add(mainLine);
    // 太陡的光线：到达边界后折射穿出，进入包层，越来越暗
    const sp = steep.pts[1] || steep.pts[steep.pts.length - 1], esc = [steep.pts[0], sp, sp.clone().add(V(4.6, 0, 1.15)), sp.clone().add(V(9, 0, 2.1))];
    const steepLine = KIT.pathLine(esc, { width: 2.2, color: 0xffb08a, intensity: 1.3, head: 0, opacity: .8 }); CO.scene.add(steepLine);
    const hitArr = new Float32Array(main.hits.length * 3), hitA = new Float32Array(main.hits.length);
    main.hits.forEach((p, i) => p.toArray(hitArr, i * 3));
    const glints = KIT.points(hitArr, { size: 22, color: 0xffd2b8, intensity: 2.2, alphas: hitA, soft: .9, additive: true }); CO.scene.add(glints);
    const rayLen = main.pts.reduce((s, p, i) => i ? s + p.distanceTo(main.pts[i - 1]) : 0, 0);
    const headAt = t => easeIO(clamp((t - RAY0) / (RAY1 - RAY0)));
    const camB = KIT.cam(30, .05, 600);
    const pB = camPath([[6.8, [-16, 7.5, 2.2], [40, 0, 0], 30], [13.2, [60, 7.0, 2.6], [130, 0, 0], 30]]);
    const shB = ctx.shot({ name: '11.A2 全反射', t0: 6.8, in: { type: 'dissolve', dur: .8 }, scene: CO.scene, camera: camB,
      post: { exposure: 1.05, dof: { focus: 20, aperture: .0015, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .4, bloom: { strength: .35 } },
      update(t) {
        const h = headAt(t); mainLine.set({ head: h });
        let acc = 0; main.hits.forEach((p, i) => { acc = 0; for (let j = 1; j <= i + 1; j++) acc += main.pts[j].distanceTo(main.pts[j - 1]); const u = acc / rayLen; hitA[i] = h >= u ? .35 + .65 * Math.exp(-(h - u) * 18) : 0; });
        glints.geometry.attributes.aAlpha.needsUpdate = true;
        steepLine.set({ head: easeIO(clamp((t - STEEP) / 1.6)), opacity: .8 * (1 - ss(12.2, 13.0, t)) });
        const c = pB(t); applyCam(camB, c, t, .0003); shB.post.dof.focus = camB.position.distanceTo(c.l);
      } });
    ctx.draw2d({ shot: shB, t0: 7.4, t1: 13.2, draw(g, t, a, proj) {
      const x = 1300, y = 110, w = 520, h = 204;
      g.fillStyle = 'rgba(8,10,14,.78)'; g.fillRect(x, y, w, h); ink.corners(g, x, y, w, h, 12, ink.dim);
      ink.text(g, 'TOTAL INTERNAL REFLECTION · 全反射', x + 24, y + 36, { font: ink.mono(16), color: ink.dim });
      ink.text(g, `n 纤芯 ≈ ${CORE.nCore} · n 包层 ≈ ${CORE.nClad}（1550 nm）`, x + 24, y + 78, { font: ink.sans(19) });
      ink.text(g, '临界角 ≈ 85°', x + 24, y + 116, { font: ink.sans(22, 600), color: ink.accent });
      ink.text(g, '光线与轴的夹角 ≈ 4°（入射角 ≈ 86° > 临界角）', x + 24, y + 150, { font: ink.sans(16), color: ink.dim });
      ink.text(g, '射线示意 · 放大约 10 000 倍 · 红外光（示意色）', x + 24, y + 176, { font: ink.sans(16), color: ink.dim });
      const p0 = proj(V(8, 0, 1)), p1 = proj(V(8, 0, 1.9));
      if (p0) { g.save(); g.globalAlpha *= ss(7.6, 8.1, t); ink.text(g, '纤芯', p0.x, p0.y + 40, { font: ink.sans(18, 600), color: '#9fdcff', align: 'center' }); if (p1) ink.text(g, '包层', p1.x, p1.y - 6, { font: ink.sans(18, 600), color: ink.dim, align: 'center' }); g.restore(); }
      const q = proj(esc[2]); if (q && t > STEEP + .9) { g.save(); g.globalAlpha *= ss(STEEP + .9, STEEP + 1.3, t) * (1 - ss(12.2, 13, t)); ink.text(g, '角度太陡：穿出纤芯，损失掉', q.x + 10, q.y - 14, { font: ink.sans(17, 600), color: '#ffb08a' }); g.restore(); }
    } });

    /* ================= B · 波分复用 ================= */
    const WD = buildWDM(KIT);
    const camW = KIT.cam(30, .05, 200);
    const pW = camPath([[13.4, [-9.5, 2.6, 7.5], [-4.2, 0, 0], 30], [16.0, [-6, 2.4, 7.6], [-1.5, 0, 0], 30], [19.8, [4.5, 2.4, 8.2], [5.4, 0, 0], 30]]);
    ctx.shot({ name: '11.B 波分复用', t0: 13.4, in: { type: 'dissolve', dur: .8 }, scene: WD.scene, camera: camW,
      post: { exposure: 1.0, grade: ctx.grade.cool, vignette: .4, bloom: { strength: .4 } },
      update(t) {
        WD.beams.forEach((b, i) => { const on = ss(13.7 + i * .22, 14.1 + i * .22, t), out = ss(15.2 + i * .15, 15.6 + i * .15, t); b.inB.material.uniforms.uOpacity.value = .9 * on; b.strand.material.emissiveIntensity = 3 * on; b.strand.visible = on > .01; b.outB.material.uniforms.uOpacity.value = .9 * out; });
        applyCam(camW, pW(t), t, .0003);
      } });
    ctx.draw2d({ t0: 14.6, t1: 19.8, draw(g, t) {
      const x = 130, y = 120;
      g.fillStyle = 'rgba(8,10,14,.75)'; g.fillRect(x - 24, y - 40, 600, 128); ink.corners(g, x - 24, y - 40, 600, 128, 12, ink.dim);
      ink.text(g, 'WDM · 波分复用', x, y - 8, { font: ink.mono(16), color: ink.dim });
      ink.text(g, '一根纤芯里同时跑几十个波长', x, y + 32, { font: ink.sans(22, 600) });
      ink.text(g, '每个波长各载一路信号 · 颜色为示意（实际是红外光）', x, y + 66, { font: ink.sans(16), color: ink.dim });
      WDM_COLORS.forEach((c, i) => { g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.fillRect(x + 380 + i * 30, y + 16, 22, 22); });
    } });

    /* ================= C1 · 深海光缆 ================= */
    const CB = await buildCable(KIT), ca = CB.anchors;
    const camC = KIT.cam(28, 1, 3000);
    const pC = camPath([[20.0, [72, 34, 66], [9, 0, 0], 28], [26.4, [40, 20, 52], [13, 0, 0], 28]]);
    const shC = ctx.shot({ name: '11.C1 深海光缆', t0: 20.0, in: { type: 'dissolve', dur: .8 }, scene: CB.scene, camera: camC,
      post: { exposure: 1.05, ao: { radius: 2, intensity: .9 }, dof: { focus: 80, aperture: .0025, maxBlur: 10 }, grade: ctx.grade.neutral, vignette: .38, bloom: { strength: .1 } },
      update(t) { const c = pC(t); applyCam(camC, c, t, .0003); shC.post.dof.focus = camC.position.distanceTo(c.l); CB.group.rotation.x = .25 + t * .03; } });
    const wc = p => p.clone().applyAxisAngle(V(1, 0, 0), CB.group.rotation.x);
    [['fiber', '光纤', '12 根 · 颜色编码', 20.5, 'right', 120, -110, 'accent'], ['tube', '不锈钢管', '里面充满阻水膏', 21.2, 'right', 150, 90], ['w1', '钢丝（内层）', '绞合 · 承受拉力', 21.9, 'left', -130, -120], ['w2', '钢丝（外层）', '反向绞合', 22.5, 'left', -150, 70], ['cu', '铜管', '给中继器供电', 23.1, 'right', 110, 130], ['pe', '聚乙烯护套', '绝缘、防水', 23.7, 'left', -120, -90]]
      .forEach(([k, title, sub, t0, side, dx, dy, style]) => ctx.callout({ shot: shC, at: () => wc(ca[k]), title, sub, t0, t1: 26.3, side, dx, dy, style }));
    ctx.readout({ x: 64, y: 110, t0: 20.6, t1: 26.3, html: '<span class="a">深海光缆</span> · 外径约 17 mm <span class="k">（浅海段外面还要再缠一层铠装钢丝）</span>' });

    /* ================= C2 · 中继器 ================= */
    const RP = await buildRepeater(KIT);
    const camR = KIT.cam(32, .02, 200);
    const pR = camPath([[26.2, [2.4, .8, 2.9], [0, .12, 0], 32], [32.4, [-1.6, .7, 2.7], [0, .12, 0], 32]]);
    const shR = ctx.shot({ name: '11.C2 中继器', t0: 26.4, in: { type: 'dissolve', dur: .8 }, scene: RP.scene, camera: camR,
      post: { exposure: 1.1, ao: { radius: .2, intensity: .9 }, dof: { focus: 3, aperture: .002, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .45, grain: .03 },
      update(t) { const c = pR(t); applyCam(camR, c, t, .0006); shR.post.dof.focus = camR.position.distanceTo(c.l); RP.target.position.set(0, .1, 0); } });
    ctx.callout({ shot: shR, at: V(0, .3, 0), title: '海底中继器', sub: '里面是光放大器，靠铜管送来的电工作', t0: 27.0, t1: 32.2, side: 'right', dx: 120, dy: -150, style: 'accent' });
    ctx.draw2d({ shot: shR, t0: 27.6, t1: 32.3, draw(g, t) {
      const x = 1180, y = 600, w = 640, h = 190, span = 5, u = clamp((t - 27.8) / 3.6);
      g.fillStyle = 'rgba(6,10,14,.8)'; g.fillRect(x - 24, y - 50, w + 48, h + 96); ink.corners(g, x - 24, y - 50, w + 48, h + 96, 12, ink.dim);
      ink.text(g, '光功率 · 沿途衰减，每隔几十公里放大一次', x, y - 18, { font: ink.sans(17), color: ink.dim });
      ink.line(g, [[x, y + h], [x + w, y + h]], ink.faint, 1);
      const P = s => { const k = s * span, f = k - Math.floor(k); return .92 - .62 * f; }, pts = [];
      for (let i = 0; i <= w * u; i += 2) pts.push([x + i, y + h - h * P(i / w)]);
      if (pts.length > 1) ink.line(g, pts, '#ff7a30', 2.2);
      for (let k = 1; k < span; k++) { const xx = x + w * k / span; if (xx > x + w * u) break; ink.line(g, [[xx, y + h], [xx, y + 6]], 'rgba(143,216,255,.35)', 1); ink.text(g, '放大', xx, y + h + 22, { font: ink.sans(14), color: '#8fd8ff', align: 'center' }); }
      ink.text(g, '距离 →', x + w, y + h + 46, { font: ink.sans(14), color: ink.dim, align: 'right' });
    } });

    /* ================= D / E · 地球 ================= */
    const sE = new THREE.Scene();
    const E = await ctx.earth({ quality: '8k', nightIntensity: 2.4, cloudOpacity: .6 }); sE.add(E.group); await E.addStars(sE, .2);
    E.setSunFromUTC(Date.UTC(2026, 9, 18, 13, 0));
    const tatMain = E.path([TAT.us, TAT.bu], { width: 3.6, color: 0xffd7a8, intensity: 1.4, head: 0, glowHead: 2.2, alt: .004, maxDeg: .4 });
    const tatUK = E.path([TAT.bu, TAT.uk], { width: 3, color: 0xffd7a8, intensity: 1.4, head: 0, alt: .004, maxDeg: .3 });
    const tatFR = E.path([TAT.bu, TAT.fr], { width: 3, color: 0xffd7a8, intensity: 1.4, head: 0, alt: .004, maxDeg: .3 });
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
    ctx.lower({ t0: 33.2, t1: 36.4, name: 'TAT-8 · 第一条跨大西洋光缆', meta: '美国新泽西州塔克顿 → 英国怀德茅斯 / 法国庞马克 · 1988 年 12 月', credit: '路由为按登陆点绘制的示意（该缆已退役，不在现行海缆数据里）' });
    ctx.draw2d({ shot: shD, t0: 34.6, t1: 38.6, draw(g, t) {
      const x = 1340, y = 150;
      g.fillStyle = 'rgba(6,10,16,.78)'; g.fillRect(x - 24, y - 40, 500, 200); ink.corners(g, x - 24, y - 40, 500, 200, 12, ink.dim);
      ink.text(g, 'TAT-8 · 1988', x, y - 8, { font: ink.mono(16), color: ink.dim });
      ink.text(g, '280 Mb/s', x, y + 52, { font: ink.cond(58, 600), color: ink.accent });
      ink.text(g, '约 4 万路电话同时通话', x, y + 104, { font: ink.sans(21) });
      ink.text(g, '两对光纤 · 每对 140 Mb/s', x, y + 138, { font: ink.sans(16), color: ink.dim });
    } });
    const camE = KIT.cam(34, .01, 400);
    const pE = camPath([[38.8, LL(33, -34, 8.6), LL(46, -34), 34], [44.8, LL(15, 20, 14), LL(25, 30), 34], [52.4, LL(10, 100, 15.5), LL(20, 110), 34]]);
    const shE = ctx.shot({ name: '11.E 全球海缆', t0: 38.8, in: { type: 'cut' }, scene: sE, camera: camE,
      post: { exposure: 1.15, grade: ctx.grade.space, vignette: .28, grain: .02, bloom: { strength: .2 } },
      update(t) { applyCam(camE, pE(t), t, 0); setEarth(t, camE, 'E'); } });
    const nLive = live.size, kmLive = Object.values(details).filter(c => !c.is_planned).reduce((s, c) => { const m = /^([\d,.]+)/.exec(c.length || ''); return s + (m ? +m[1].replace(/,/g, '') : 0); }, 0);
    ctx.stat({ t0: 39.4, t1: 45.0, fmt: p => String(Math.round(nLive * p)), unit: '条在用海缆', label: `总长约 ${Math.round(kmLive / 1e4)} 万公里（有长度记录的 ${Object.values(details).filter(c => !c.is_planned && /^\d/.test(c.length || '')).length} 条合计）`, src: '数据：TeleGeography Submarine Cable Map', dur: 1.6 });
    ctx.stat({ t0: 45.6, t1: 51.8, fmt: p => (20 * p).toFixed(0), unit: '万 km/s', label: '光在玻璃里的速度（约为真空光速的 2/3）', src: '真空光速 ≈ 30 万 km/s · 玻璃折射率约 1.47', dur: 1.2 });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(1.0, 'blip', 880, .04);
    ctx.cue(6.8, 'whoosh', 1.0, .25); main.hits.forEach((p, i) => { let acc = 0; for (let j = 1; j <= i + 1; j++) acc += main.pts[j].distanceTo(main.pts[j - 1]); const u = acc / rayLen; let lo = RAY0, hi = RAY1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (headAt(m) < u) lo = m; else hi = m; } if (hi < RAY1) ctx.cue(hi, 'tick', .5); });
    ctx.cue(13.4, 'swoosh', .25); WDM_COLORS.forEach((c, i) => ctx.cue(13.8 + i * .22, 'blip', 600 + i * 120, .04));
    ctx.cue(20.0, 'whoosh', 1.0, .22); ctx.cue(26.4, 'sub', .25); ctx.cue(32.4, 'swoosh', .25); ctx.cue(35.6, 'chime', 660, .06);
    ctx.cue(39.0, 'riser', 5.4, .12); ctx.cue(45.4, 'chime', 880, .06);
  },
};
