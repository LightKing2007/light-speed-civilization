/* 03 · 越过地平线（1901）
   镜头：A 马可尼式火花发射机（写实复原；发出「S」的三下火花 + 传输距离对数尺）
        → B1 波尔杜临时扇形天线（复原，真实悬崖 HDRI）→ B2 写实地球定位：波尔杜 → 信号山（1901-12-12 真实日照）
        → B3 信号山风筝天线（复原，暴风云）→ C 地球侧视：直线传播被地球曲率挡住（弦深 ≈ 230 km、切线到对岸上空 ≈ 1 000 km）
        → D1 听筒与金属屑检波器：三声「嗒」=「S」→ D2 大圆 3 425 km → D3 电离层 E 层两跳 + 海面反射
        → E 摩尔斯印字机纸带（结尾：纸带水平居中、从左向右移动，匹配剪辑到 04）。
   道具在 src/props/03/（器材按真实尺寸以米建模；地球单位 1 = 1000 km）。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, easeOut, prog, camPath, applyCam, hash, fbm1, Path } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { makeMats, buildKey, buildBattery, wire } from '../props/01/telegraph.js';
import { buildSparkCoil, buildCoherer, buildEarpiece, buildInker, buildTape, INK } from '../props/03/apparatus.js';
import { buildPoldhu, buildHut, buildGround, buildKite, stormSky, buildCabotTower } from '../props/03/sites.js';
import { sideBasis, sidePose, ionoShell, hopPath } from '../props/03/iono.js';

const POL = [50.0306, -5.2617], SIG = [47.5703, -52.6817];   // 波尔杜无线电站 / 信号山
const DOT = .12;
const DOTS_A = [1.25, 1.49, 1.73, 3.95, 4.19, 4.43].map(t => [t, t + DOT]);   // 发射机连发两个「S」
const CLICKS = [25.3, 25.62, 25.94];                                           // 听筒里的三声「嗒」
const pressAt = (t, iv) => { let a = 0; for (const [d, u] of iv) { if (t < d - .06 || t > u + .1) continue; a = Math.max(a, ss(d - .03, d, t) * (1 - ss(u, u + .03, t))); } return a; };
const inIv = (t, iv) => iv.some(([a, b]) => t >= a && t <= b);
const TAPE_V = .05;                                                            // 纸带速度 m/s

/** 原地更新 kit.pathLine 的点（不重建几何体） */
function setLinePts(line, pts) {
  const g = line.geometry, P = g.attributes.position.array, A = g.attributes.aPrev.array, N = g.attributes.aNext.array, n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    for (let s = 0; s < 2; s++) { const k = (i * 2 + s) * 3; P[k] = p.x; P[k + 1] = p.y; P[k + 2] = p.z; A[k] = a.x; A[k + 1] = a.y; A[k + 2] = a.z; N[k] = b.x; N[k + 1] = b.y; N[k + 2] = b.z; }
  }
  g.attributes.position.needsUpdate = g.attributes.aPrev.needsUpdate = g.attributes.aNext.needsUpdate = true;
}

export default {
  id: '03', status: 'implemented', slug: 'radio', title: '越过地平线', dur: 42,
  card: {"title": "越过地平线", "short": "越过地平线", "meta": "1901 · 波尔杜 → 信号山"},
  stamps: [[0, "1901"]],
  caps: [[0.4, 5.8, "赫兹的电波只飞过十几米。意大利青年马可尼，想让电波跨越整个大洋。"], [6.2, 11.6, "他在英格兰康沃尔的波尔杜建起巨大的发射站。"], [12.0, 17.6, "1901 年 12 月 12 日，在大洋彼岸纽芬兰的信号山上，助手们用风筝把天线送上了天空。"], [18.0, 23.6, "地球是圆的，电波沿直线传播，按理说早该被弯曲的海面挡住。"], [24.0, 30.0, "但马可尼报告说，耳机里传来了三声轻响——摩尔斯电码的「S」，跨越了约 3500 公里。"], [30.4, 36.6, "后来人们才弄明白：高空的电离层像一面镜子，能把无线电波折回地面，让它绕过地平线。"], [37.0, 41.8, "信息能在空中飞了。下一个问题是：能不能让机器替人处理信息？"]],
  credits: [
    'assets/hdri/vintage_measuring_lab_2k.hdr', 'assets/hdri/white_cliff_top_2k.hdr', 'assets/hdri/empty_warehouse_01_2k.hdr',
    'assets/tex/dark_wood', 'assets/tex/brown_leather', 'assets/tex/acg_paper006_aged_paper',
    'assets/models/polyhaven/vintage_oil_lamp', 'assets/models/polyhaven/pocket_watch',
    'assets/earth/earth_day_8k.jpg', 'assets/earth/earth_clouds_8k.jpg', 'assets/earth/earth_lights_8k.jpg', 'assets/earth/earth_normal_4k.png', 'assets/earth/earth_water_mask_4k.png', 'assets/earth/stars_8k.jpg',
  ],

  async build(ctx) {
    const { KIT } = ctx;
    // 与第 01 章相同的绕过：截图模式下 #hud2d 可能停在默认 300×150
    { const cv = document.getElementById('hud2d'); if (cv && cv.width === 300 && cv.height === 150) { cv.width = 1920; cv.height = 1080; } }
    const W_ = (grp, p) => { grp.updateMatrixWorld(true); return grp.localToWorld(p.clone()); };
    const wood = await KIT.pbr('dark_wood', { repeat: 2 });
    const mt = makeMats(KIT, wood); mt.steel = KIT.M.steel({ rough: .26 });
    const mahog = await KIT.pbr('dark_wood', { repeat: 1 }); mahog.color.setRGB(1, .64, .5);
    const deskMat = await KIT.pbr('dark_wood', { repeat: 3 }); deskMat.color.setRGB(.9, .78, .68);
    const prop = async (scene, id, size, p, ry = 0) => { try { const m = await KIT.model(`assets/models/polyhaven/${id}/${id}_1k.gltf`, { size }); m.position.set(...p); m.rotation.y = ry; scene.add(m); return m; } catch (e) { console.warn('[03] model', id, e); return null; } };
    const BLACK = new THREE.Color(0x000000);

    /* ================================================================
       A · 马可尼式火花发射机（工作台，单位：米）
       ================================================================ */
    const sA = new THREE.Scene();
    await KIT.hdri(sA, KIT.hdriFile('vintage_measuring_lab'), { intensity: .34, rotation: -1.0, background: true, bgBlur: .6, bgIntensity: .07 });
    const sunA = new THREE.DirectionalLight(0xffd4a4, 3.2); sunA.position.set(-.95, 1.2, .55); sunA.target.position.set(0, .15, 0); sunA.castShadow = true;
    Object.assign(sunA.shadow.camera, { left: -.9, right: .9, top: .9, bottom: -.9, near: .1, far: 4 }); sunA.shadow.mapSize.set(2048, 2048); sunA.shadow.bias = -.00015; sunA.shadow.normalBias = .0015; sunA.shadow.radius = 3;
    sA.add(sunA, sunA.target);
    const rimA = new THREE.SpotLight(0xd8e6ff, 5, 0, .6, .8, 2); rimA.position.set(.6, .85, -1.2); rimA.target.position.set(0, .25, 0); sA.add(rimA, rimA.target);
    const fillA = new THREE.PointLight(0xffc89a, .22, 0, 2); fillA.position.set(.5, .45, .9); sA.add(fillA);
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), deskMat); desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; sA.add(desk);
    const padMat = await KIT.pbr('brown_leather', { repeat: 2 }); padMat.color.setRGB(.55, .42, .34);
    const pad = new THREE.Mesh(KIT.rbox(1.15, .004, .62, .002), padMat); pad.position.set(0, .002, .03); pad.receiveShadow = true; sA.add(pad);
    const wallMat = await KIT.pbr('dark_wood', { repeat: [2.2, 1.4] }); wallMat.color.setRGB(.4, .31, .26);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.8), wallMat); wall.position.set(.1, .9, -.95); wall.receiveShadow = true; sA.add(wall);
    const coil = buildSparkCoil(mt, mahog); coil.group.position.set(0, .004, 0); coil.group.rotation.y = -.28; sA.add(coil.group);
    const key = buildKey(mt); key.group.position.set(.43, .004, .22); key.group.rotation.y = -.7; sA.add(key.group);
    const bat = buildBattery(mt, KIT); bat.group.position.set(-.5, .004, -.12); bat.group.rotation.y = .35; sA.add(bat.group);
    const gapW = W_(coil.group, coil.gap), antW = W_(coil.group, coil.antTop), earthW = W_(coil.group, coil.earth);
    const cp0 = W_(coil.group, coil.posts[0]), cp1 = W_(coil.group, coil.posts[1]);
    const kp0 = W_(key.group, key.posts[0]), kp1 = W_(key.group, key.posts[1]);
    const bP = W_(bat.group, bat.plus), bM = W_(bat.group, bat.minus);
    const PADY = .0075;
    for (const pts of [
      [bP, bP.clone().add(V(.012, .01, .014)), V(bP.x + .05, PADY, bP.z + .12), V(cp0.x - .09, PADY, cp0.z + .08), V(cp0.x - .03, .03, cp0.z + .02), cp0.clone().add(V(0, -.002, 0))],
      [cp1.clone().add(V(0, -.002, 0)), V(cp1.x - .02, .03, cp1.z + .04), V(cp1.x + .02, PADY, cp1.z + .16), V(.12, PADY, .26), V(kp0.x - .05, PADY, kp0.z + .03), kp0.clone().add(V(0, -.002, 0))],
      [kp1.clone().add(V(0, -.002, 0)), V(kp1.x - .03, PADY, kp1.z - .03), V(.2, PADY, -.2), V(-.1, PADY, -.24), V(bM.x + .06, PADY, bM.z + .04), bM.clone().add(V(0, .002, 0))],
    ]) sA.add(wire(mt, pts, .0017).mesh);
    // 天线（向上出画）与地线（沿桌面拖向后方）：马可尼的两项关键改进
    sA.add(wire(mt, [antW, antW.clone().add(V(.03, .015, 0)), antW.clone().add(V(.055, .22, -.03)), antW.clone().add(V(.07, .8, -.07)), antW.clone().add(V(.09, 2.2, -.14))], .0021).mesh);
    sA.add(wire(mt, [earthW, earthW.clone().add(V(-.03, -.015, 0)), V(earthW.x - .07, .09, earthW.z - .05), V(earthW.x - .1, PADY, earthW.z - .16), V(earthW.x - .16, .005, -.6), V(earthW.x - .2, .005, -1.0)], .0021).mesh);
    await prop(sA, 'vintage_oil_lamp', .42, [-.78, 0, -.5], .4);
    await prop(sA, 'pocket_watch', .055, [.66, .006, -.02], 1.2);
    const camA = KIT.cam(30);
    const g = gapW, coilC = W_(coil.group, V(0, .17, 0));
    const pA = camPath([
      [0, [g.x - .05, g.y + .035, g.z + .3], [g.x - .064, g.y - .006, g.z], 30],
      [2.9, [g.x - .015, g.y + .065, g.z + .43], [g.x - .072, g.y - .025, g.z], 31],
      [6.4, [g.x + .26, g.y + .27, g.z + 1.02], [g.x + .03, g.y - .19, g.z], 34],
    ]);
    const focA = t => gapW.clone().lerp(coilC, ss(2.6, 6, t));
    const shA = ctx.shot({ t0: 0, name: 'A 火花发射机', in: { type: 'dissolve', dur: 1.0 }, scene: sA, camera: camA,
      post: { exposure: 1.05, ao: true, dof: { focus: .3, aperture: .009, maxBlur: 12 }, grade: ctx.grade.warm, vignette: .32, grain: .03 },
      update(t) { applyCam(camA, pA(t), t, .0012); shA.post.dof.focus = camA.position.distanceTo(focA(t)); key.set(pressAt(t, DOTS_A)); coil.setSpark(inIv(t, DOTS_A), t); } });
    // 传输距离对数尺：赫兹 12 m → 马可尼 2.4 km → 英吉利海峡 50 km → 大西洋 3 500 km
    ctx.draw2d({ shot: shA, t0: .9, t1: 5.85, draw(g2, t) {
      const X0 = 1130, X1 = 1806, Y = 178, lx = v => X0 + (Math.log10(v) - 1) / 6 * (X1 - X0);
      const p = easeOut(ss(.9, 1.7, t)), xe = lerp(X0, X1, p);
      ink.text(g2, '传输距离 · 对数刻度', X0, Y - 82, { font: ink.mono(12), color: ink.dim });
      g2.strokeStyle = ink.dim; g2.lineWidth = 1; g2.beginPath(); g2.moveTo(X0, Y); g2.lineTo(xe, Y); g2.stroke();
      const lab = { 10: '10 m', 100: '100 m', 1e3: '1 km', 1e4: '10 km', 1e5: '100 km', 1e6: '1000 km', 1e7: '10⁴ km' };
      for (let e = 1; e <= 7; e++) for (let m = 1; m < 10; m++) {
        const v = m * 10 ** e; if (e === 7 && m > 1) break; const x = lx(v); if (x > xe) continue;
        g2.strokeStyle = m === 1 ? ink.dim : ink.faint; g2.beginPath(); g2.moveTo(x, Y); g2.lineTo(x, Y + (m === 1 ? 7 : 4)); g2.stroke();
        if (m === 1) ink.text(g2, lab[v], x, Y + 22, { font: ink.mono(11), color: ink.dim, align: 'center' });
      }
      const mk = [[12, 1.25, '赫兹 · 1888', '≈ 12 m', 'left'], [2400, 2.05, '马可尼 · 1895', '2.4 km', 'center'], [5e4, 2.75, '英吉利海峡 · 1899', '≈ 50 km', 'center'], [3.5e6, 3.45, '大西洋', '≈ 3 500 km', 'right']];
      mk.forEach(([v, tm, name, val, al], i) => {
        const a = ss(tm, tm + .35, t); if (a <= 0) return; const x = lx(v), acc = i === 3; g2.globalAlpha *= 1; g2.save(); g2.globalAlpha *= a;
        const c = acc ? ink.accent : ink.white;
        g2.fillStyle = c; g2.beginPath(); g2.arc(x, Y, acc ? 4.5 : 3.5, 0, 7); g2.fill();
        g2.strokeStyle = c; g2.lineWidth = 1; g2.beginPath(); g2.moveTo(x, Y - 6); g2.lineTo(x, Y - 22); g2.stroke();
        const tx = al === 'left' ? x - 4 : al === 'right' ? x + 4 : x;
        ink.text(g2, name, tx, Y - 48, { font: ink.sans(15, 500), color: c, align: al });
        ink.text(g2, val, tx, Y - 28, { font: ink.mono(13), color: acc ? ink.accent : ink.dim, align: al });
        g2.restore();
      });
      const b = ss(4.0, 4.5, t);
      if (b > 0) { g2.save(); g2.globalAlpha *= b; g2.setLineDash([3, 4]); g2.strokeStyle = ink.accent; g2.beginPath(); g2.moveTo(lx(12), Y + 40); g2.lineTo(lerp(lx(12), lx(3.5e6), easeOut(b)), Y + 40); g2.stroke(); g2.setLineDash([]);
        ink.text(g2, '≈ 赫兹实验的 30 万倍', lx(3.5e6), Y + 60, { font: ink.mono(13), color: ink.accent, align: 'right' }); g2.restore(); }
    } });
    ctx.lower({ t0: 3.75, t1: 5.95, name: '古列尔莫·马可尼 · 1874–1937', meta: '意大利发明家 · 1896 年在英国申请无线电报专利，时年 22 岁', credit: '画面为写实复原：感应线圈火花发射机 · 天线向上、地线入地' });

    /* ================================================================
       B1 · 波尔杜（真实悬崖 HDRI + 复原的扇形天线与机房）
       ================================================================ */
    const sB = new THREE.Scene();
    await KIT.hdri(sB, KIT.hdriFile('white_cliff_top'), { intensity: .85, rotation: 0, background: true, bgBlur: 0, bgIntensity: 1 });
    sB.fog = new THREE.Fog(0x8f989e, 160, 1100);
    const sunDirB = V(.65, .4, .65).normalize();
    const sunB = new THREE.DirectionalLight(0xfff0dc, 1.8); sunB.position.copy(sunDirB).multiplyScalar(120); sunB.castShadow = true;
    Object.assign(sunB.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 300 }); sunB.shadow.mapSize.set(2048, 2048); sunB.shadow.bias = -.0004; sunB.shadow.normalBias = .05; sunB.shadow.radius = 2;
    sB.add(sunB, sunB.target);
    const station = buildPoldhu(KIT, KIT.pathLine); station.group.rotation.y = .174; sB.add(station.group);
    const gB = buildGround(KIT, { size: 1400, amp: 1.0, color: '#4f5537', seed: 5 }); gB.position.y = -.06; sB.add(gB);
    const SL = p => W_(station.group, V(...p));
    const camB = KIT.cam(42); camB.far = 3000; camB.updateProjectionMatrix();
    const pB = camPath([[6.0, SL([-20, 1.7, -80]).toArray(), SL([-5, 17, 0]).toArray(), 42], [10.8, SL([-12, 2.1, -65]).toArray(), SL([-1, 22.5, 0]).toArray(), 40]]);
    const shB = ctx.shot({ t0: 6.0, name: 'B1 波尔杜', in: { type: 'dissolve', dur: .6 }, scene: sB, camera: camB,
      post: { exposure: 1.0, grade: ctx.grade.cool, vignette: .28, grain: .028 }, update(t) { applyCam(camB, pB(t), t, .0007); } });
    ctx.callout({ shot: shB, at: SL(station.fanMid.toArray()), title: '扇形天线', sub: '54 根铜线 · 挂在两根桅杆之间', t0: 7.0, t1: 10.6, side: 'right', dx: 130, dy: -90 });
    ctx.measure({ shot: shB, a: SL(station.mastBase.toArray()), b: SL(station.mastTop.toArray()), label: '≈ 48 m', t0: 7.6, t1: 10.6, off: 30 });
    ctx.callout({ shot: shB, at: SL(station.hut.toArray()), title: '发射机房', sub: '25 kW 交流发电机驱动火花放电', t0: 8.3, t1: 10.6, side: 'left', dx: 120, dy: -120 });
    ctx.lower({ t0: 6.5, t1: 10.4, name: '波尔杜无线电站（复原）', meta: '英格兰康沃尔 · 1901 年 12 月的临时扇形天线', credit: '原 20 根桅杆的环形天线阵于 1901 年 9 月毁于风暴 · 环境：Poly Haven「white_cliff_top」CC0' });

    /* ================================================================
       写实地球（B2 定位 / C 地球曲率 / D2 大圆 / D3 电离层 共用）
       ================================================================ */
    const sE = new THREE.Scene(); const E = await ctx.earth({ quality: '8k', cloudOpacity: .8 }); sE.add(E.group); await E.addStars(sE, .2);
    const starsBG = sE.background;
    E.setSunFromUTC(Date.UTC(1901, 11, 12, 16, 0));            // 信号山当地中午 12:30 ≈ 16:00 UTC：波尔杜正值日落
    E.group.updateMatrixWorld(true);
    const R = E.R, PA = E.ll(POL[0], POL[1]), PS = E.ll(SIG[0], SIG[1]);
    const S = sideBasis(PA, PS);
    const gcLine = E.path([POL, SIG], { width: 2.2, color: 0xffffff, opacity: .9, head: 0, alt: .006, maxDeg: .3 });
    const LO = { depthTest: false, renderOrder: 8 };
    const arcPts = (r, n = 120) => Array.from({ length: n + 1 }, (_, i) => S.P(lerp(S.phiA, S.phiB, i / n), r));
    const tanDir = S.M.clone().multiplyScalar(Math.sin(S.phiA)).sub(S.U.clone().multiplyScalar(Math.cos(S.phiA))).normalize();
    const tanLine = KIT.pathLine(Array.from({ length: 61 }, (_, i) => PA.clone().add(tanDir.clone().multiplyScalar(5 * i / 60))), { width: 2, color: 0xf2f2ee, head: 0, glowHead: 1.4, ...LO });
    const chordLine = KIT.pathLine(Array.from({ length: 61 }, (_, i) => PA.clone().lerp(PS, i / 60)), { width: 2, color: 0xff4d3d, dash: 46, head: 0, ...LO });
    const arcLine = KIT.pathLine(arcPts(R + .003), { width: 2.6, color: 0xff7a30, head: 0, glowHead: 1.2, ...LO });
    const msArc = KIT.pathLine(arcPts(R + .42), { width: 1.2, color: 0xf2f2ee, opacity: .75, head: 0, ...LO });
    const msT = [S.phiA, S.phiB].map(f => KIT.pathLine([S.P(f, R + .34), S.P(f, R + .5)], { width: 1.2, color: 0xf2f2ee, opacity: .75, ...LO }));
    const hop = hopPath(S, R, { hops: 2, H: .102 });
    const hopLine = KIT.pathLine(hop.pts, { width: 2.6, color: 0xff7a30, head: 0, glowHead: 1.6, ...LO });
    const hopP = new Path(hop.pts);
    const shell = ionoShell(R, { k: .3 }); sE.add(shell.mesh);
    const LINES = [gcLine, tanLine, chordLine, arcLine, msArc, ...msT, hopLine];
    for (const l of LINES) if (l !== gcLine) sE.add(l);
    const showOnly = (...on) => { for (const l of LINES) l.visible = on.includes(l); };
    const pin = (g2, P, p3, label, sub, right, a = 1) => {
      const p = P(p3); if (!p) return; g2.save(); g2.globalAlpha *= a;
      g2.fillStyle = ink.white; g2.beginPath(); g2.arc(p.x, p.y, 3.5, 0, 7); g2.fill(); g2.strokeStyle = ink.white; g2.lineWidth = 1; g2.beginPath(); g2.arc(p.x, p.y, 8, 0, 7); g2.stroke();
      const x = p.x + (right ? 16 : -16);
      ink.text(g2, label, x, p.y + 30, { font: ink.sans(18, 500), align: right ? 'left' : 'right' });
      if (sub) ink.text(g2, sub, x, p.y + 50, { font: ink.mono(12), color: ink.dim, align: right ? 'left' : 'right' });
      g2.restore();
    };

    /* ---------------- B2 · 地球定位：波尔杜 → 信号山 ---------------- */
    const camE2 = KIT.cam(34);
    const pE2 = camPath([[10.5, E.ll(32, -9, 5.4).toArray(), E.ll(49, -12, 0).toArray(), 34], [13.6, E.ll(30.5, -43, 5.0).toArray(), E.ll(48, -46, 0).toArray(), 33]]);
    const shE2 = ctx.shot({ t0: 10.5, name: 'B2 两岸定位', in: { type: 'dissolve', dur: .8 }, scene: sE, camera: camE2,
      post: { exposure: 1.15, grade: ctx.grade.space, vignette: .3 },
      update(t) { sE.background = starsBG; showOnly(gcLine); shell.set(0); gcLine.set({ head: prog(t, 11.1, 12.9) }); applyCam(camE2, pE2(t)); E.update(t, camE2); } });
    ctx.callout({ shot: shE2, at: () => E.ll(POL[0], POL[1]), title: '波尔杜', sub: '英格兰康沃尔 · 此刻正值日落', t0: 10.9, t1: 13.4, side: 'right', dx: 80, dy: -90, occlude: E.occlude });
    ctx.callout({ shot: shE2, at: () => E.ll(SIG[0], SIG[1]), title: '信号山', sub: '纽芬兰圣约翰斯 · 当地中午', t0: 12.1, t1: 13.4, side: 'left', dx: 90, dy: -100, occlude: E.occlude });

    /* ================================================================
       B3 · 信号山：风筝天线（复原）
       ================================================================ */
    const sC = new THREE.Scene();
    await KIT.hdri(sC, KIT.hdriFile('white_cliff_top'), { intensity: .5, rotation: 2.4 });
    sC.background = new THREE.Color(0x2a2c2f); sC.fog = new THREE.Fog(0x55595d, 120, 1300);
    const sky = stormSky(); sC.add(sky.mesh);
    sC.add(new THREE.HemisphereLight(0xb4bec8, 0x34332a, .55));
    const sunC = new THREE.DirectionalLight(0xdfe6ee, .9); sunC.position.set(-40, 80, 30); sunC.castShadow = true;
    Object.assign(sunC.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 200 }); sunC.shadow.mapSize.set(2048, 2048); sunC.shadow.bias = -.0004; sunC.shadow.normalBias = .04;
    sC.add(sunC, sunC.target);
    const gC = buildGround(KIT, { size: 1800, amp: 2.4, color: '#474832', rock: 1, seed: 9 }); gC.position.y = -.08; sC.add(gC);
    const hosp = buildHut(KIT, { w: 12, d: 7, h: 6.4, ridge: 2.6, floors: 2, winN: 4, seed: 31, color: '#c9c2b2' }); hosp.group.rotation.y = .3; sC.add(hosp.group);
    const tower = buildCabotTower(KIT); tower.position.set(-95, 6, -120); tower.rotation.y = .3; sC.add(tower);
    const kite = buildKite(KIT); sC.add(kite.group);
    const H0 = W_(hosp.group, V(1.5, 5.6, 3.55));
    const K0 = V(34, 108, -96);
    const kitePos = t => K0.clone().add(V(fbm1(t * .5 + 1) * 2.6, fbm1(t * .6 + 7) * 1.8, fbm1(t * .4 + 3) * 1.4));
    const poseKite = t => { const p = kitePos(t); kite.group.position.copy(p); kite.group.lookAt(V(0, -20, 30)); kite.group.rotateZ(fbm1(t * .9 + 5) * .26); kite.group.rotateX(-.15 + fbm1(t * .7 + 2) * .06); kite.group.updateMatrixWorld(true); return kite.group.localToWorld(kite.tow.clone()); };
    const NWP = 70, wirePts = Array.from({ length: NWP }, () => V());
    const wireAt = (t, u, out = V()) => { const T = poseKite(t); const sag = 11 + fbm1(t * .3) * 1.5; return out.copy(H0).lerp(T, u).add(V(sag * .25 * Math.sin(Math.PI * u), -sag * 4 * u * (1 - u), sag * .2 * Math.sin(Math.PI * u))); };
    const wireLine = KIT.pathLine(Array.from({ length: NWP }, (_, i) => H0.clone().lerp(K0, i / (NWP - 1))), { width: 1.7, color: 0x2b2420, opacity: .92 }); sC.add(wireLine);
    const updWire = t => { for (let i = 0; i < NWP; i++) wireAt(t, i / (NWP - 1), wirePts[i]); setLinePts(wireLine, wirePts); };
    const camC = KIT.cam(38); camC.far = 3000; camC.updateProjectionMatrix();
    const CP = [17, 1.65, 19];
    const pC = camPath([[13.3, CP, [4, 5.8, 2], 38], [14.7, CP, [8.5, 21, -15], 30], [16.5, CP, [25, 74, -66], 15], [18.1, CP, K0.toArray(), 6.8]]);
    const shC = ctx.shot({ t0: 13.3, name: 'B3 信号山风筝', in: { type: 'blur', dur: .8, params: [5] }, scene: sC, camera: camC,
      post: { exposure: 1.05, grade: ctx.grade.cool, vignette: .3, grain: .032 },
      update(t) { sky.set(t); updWire(t); applyCam(camC, pC(t), t, .0016); } });
    ctx.callout({ shot: shC, at: t => wireAt(t, .1), title: '天线导线', sub: '从风筝一直垂进接收室', t0: 14.0, t1: 15.7, side: 'right', dx: 120, dy: -60 });
    ctx.callout({ shot: shC, at: t => kitePos(t), title: '风筝天线', sub: '约 152 m 铜线 · 被风筝拉上高空', t0: 16.9, t1: 18.1, side: 'left', dx: 150, dy: 60 });
    ctx.lower({ t0: 13.8, t1: 17.9, name: '信号山（复原）', meta: '纽芬兰圣约翰斯 · 1901 年 12 月 12 日 · 狂风', credit: '场景为写实复原 · 远处为卡伯特塔（1900 年落成）' });

    /* ================================================================
       C · 地球侧视：直线传播会被地球曲率挡住
       ================================================================ */
    const camS = KIT.cam(5); camS.near = 5; camS.far = 80; camS.updateProjectionMatrix();
    const shCC = ctx.shot({ t0: 18.0, name: 'C 地球曲率', in: { type: 'dissolve', dur: .7 }, scene: sE, camera: camS,
      post: { exposure: 1.12, grade: ctx.grade.space, vignette: .3 },
      update(t) {
        sE.background = BLACK; shell.set(0); showOnly(tanLine, chordLine);
        tanLine.set({ head: prog(t, 19.6, 21.0, easeOut), opacity: 1 }); chordLine.set({ head: prog(t, 21.4, 22.4), opacity: 1 });
        sidePose(camS, S, R, lerp(.014, -.01, prog(t, 18, 24, x => x)), lerp(5.7, 5.35, prog(t, 18, 24)), 455); E.update(t, camS);
      } });
    ctx.draw2d({ shot: shCC, t0: 18.3, t1: 24.05, draw(g2, t, a, P) {
      pin(g2, P, PA, '波尔杜', '发射', true, ss(18.3, 18.7, t)); pin(g2, P, PS, '信号山', '接收', false, ss(18.5, 18.9, t));
    } });
    ctx.callout({ shot: shCC, at: S.P(0, R + .012), title: '地球曲率', sub: '两地相隔约 31° 圆心角', t0: 18.9, t1: 24.0, side: 'right', dx: 90, dy: -150 });
    ctx.callout({ shot: shCC, at: PA.clone().add(tanDir.clone().multiplyScalar(3.35)), title: '电波沿直线飞向太空', sub: '到纽芬兰上空已高出地面约 1 000 km', t0: 20.5, t1: 24.0, side: 'right', dx: 110, dy: -70 });
    ctx.callout({ shot: shCC, at: PA.clone().lerp(PS, .5), title: '直线连线要穿过地球', sub: '中点在海面以下约 230 km', t0: 22.0, t1: 24.0, side: 'right', dx: 120, dy: 120, style: 'warn' });

    /* ================================================================
       D1 · 信号山接收室：电话听筒 + 金属屑检波器
       ================================================================ */
    const sD = new THREE.Scene();
    await KIT.hdri(sD, KIT.hdriFile('empty_warehouse'), { intensity: .28, rotation: 1.4, background: true, bgBlur: .7, bgIntensity: .05 });
    const winD = new THREE.DirectionalLight(0xd2deef, 2.6); winD.position.set(-1, 1.15, -.55); winD.target.position.set(0, 0, 0); winD.castShadow = true;
    Object.assign(winD.shadow.camera, { left: -.5, right: .5, top: .5, bottom: -.5, near: .1, far: 4 }); winD.shadow.mapSize.set(2048, 2048); winD.shadow.bias = -.00015; winD.shadow.normalBias = .0012; winD.shadow.radius = 4;
    sD.add(winD, winD.target);
    const warmD = new THREE.PointLight(0xffc08a, .12, 0, 2); warmD.position.set(.5, .3, .5); sD.add(warmD);
    const tblMat = await KIT.pbr('dark_wood', { repeat: 2.5 }); tblMat.color.setRGB(.72, .66, .6);
    const tbl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), tblMat); tbl.rotation.x = -Math.PI / 2; tbl.receiveShadow = true; sD.add(tbl);
    const ear = buildEarpiece(mt); ear.group.position.set(0, .0318, .05); ear.group.rotation.set(0, 2.5, -Math.PI / 2 - .105); sD.add(ear.group);
    const coh = buildCoherer(mt); coh.group.position.set(-.05, 0, -.13); coh.group.rotation.y = .22; sD.add(coh.group);
    const box = new THREE.Mesh(KIT.rbox(.17, .075, .11, .004), mahog); box.position.set(.17, .0375, -.17); box.rotation.y = -.25; box.castShadow = box.receiveShadow = true; sD.add(box);
    const lid = new THREE.Mesh(KIT.rbox(.15, .004, .09, .002), mt.ebonite); lid.position.set(.17, .077, -.17); lid.rotation.y = -.25; lid.castShadow = true; sD.add(lid);
    const cordEnd = W_(ear.group, ear.cord), cohIn = W_(coh.group, V(.07, .03, -.018)), cohIn2 = W_(coh.group, V(-.07, .03, -.018));
    sD.add(wire(mt, [cordEnd, cordEnd.clone().add(V(-.02, -.012, -.02)), V(cordEnd.x - .03, .004, cordEnd.z - .07), V(cohIn.x + .05, .004, cohIn.z + .06), V(cohIn.x + .01, .012, cohIn.z + .01), cohIn], .0024).mesh);
    sD.add(wire(mt, [cohIn2, V(cohIn2.x - .02, .01, cohIn2.z - .02), V(cohIn2.x - .08, .004, cohIn2.z - .1), V(cohIn2.x - .3, .004, cohIn2.z - .3)], .0018).mesh);
    await prop(sD, 'pocket_watch', .055, [.15, .006, .12], 2.6);
    const camD = KIT.cam(32);
    const earC = W_(ear.group, V(0, .06, 0)), tubeW = W_(coh.group, coh.tube);
    const pD = camPath([[24.0, [.12, .12, .34], [-.01, .035, -.01], 32], [27.7, [.07, .1, .27], [-.025, .038, -.03], 31]]);
    const shD = ctx.shot({ t0: 24.0, name: 'D1 听筒', in: { type: 'cut' }, scene: sD, camera: camD,
      post: { exposure: 1.0, ao: true, dof: { focus: .3, aperture: .011, maxBlur: 12 }, grade: ctx.grade.cool, vignette: .34, grain: .03 },
      update(t) { applyCam(camD, pD(t), t, .001); shD.post.dof.focus = camD.position.distanceTo(earC.clone().lerp(tubeW, .35)); coh.setTap(pressAt(t, CLICKS.map(c => [c, c + .05]))); } });
    ctx.callout({ shot: shD, at: earC, title: '电话听筒', sub: '信号极弱，只能靠耳朵分辨', t0: 24.4, t1: 27.6, side: 'right', dx: 120, dy: 90 });
    ctx.callout({ shot: shD, at: tubeW, title: '金属屑检波器', sub: '电波一到，管里的金属屑就导通', t0: 24.9, t1: 27.6, side: 'left', dx: 110, dy: -110 });
    // 「S」读数：三点随三声「嗒」出现（跨 D1 / D2）
    ctx.draw2d({ t0: 24.3, t1: 30.3, draw(g2, t) {
      const x = 1508, y = 128;
      g2.fillStyle = 'rgba(8,10,12,.42)'; g2.fillRect(x - 18, y - 30, 330, 150); ink.corners(g2, x - 18, y - 30, 330, 150, 12, ink.faint, 1);
      ink.text(g2, '耳机里的信号', x, y - 6, { font: ink.mono(12), color: ink.dim });
      CLICKS.forEach((c, i) => { const a = ss(c - .01, c + .04, t); if (a <= 0) return; const fl = 1 - ss(c, c + .35, t); g2.fillStyle = fl > .02 ? `rgba(255,${Math.round(122 + 120 * (1 - fl))},${Math.round(48 + 190 * (1 - fl))},${a})` : ink.white; g2.beginPath(); g2.arc(x + 14 + i * 42, y + 48, 8 + 3 * fl, 0, 7); g2.fill(); });
      const s = ss(26.15, 26.5, t); if (s > 0) { g2.save(); g2.globalAlpha *= s; ink.text(g2, '=', x + 148, y + 60, { font: ink.mono(30), color: ink.dim }); ink.text(g2, 'S', x + 190, y + 76, { font: ink.cond(78, 600), color: ink.accent }); ink.text(g2, '摩尔斯「S」= 三短', x, y + 104, { font: ink.sans(15), color: ink.white }); g2.restore(); }
    } });

    /* ---------------- D2 · 3 425 km 的大圆 ---------------- */
    const shD2 = ctx.shot({ t0: 27.6, name: 'D2 约 3500 km', in: { type: 'dissolve', dur: .5 }, scene: sE, camera: camS,
      post: { exposure: 1.12, grade: ctx.grade.space, vignette: .3 },
      update(t) {
        sE.background = BLACK; shell.set(0); showOnly(chordLine, arcLine, msArc, ...msT);
        chordLine.set({ head: 1, opacity: .22 }); arcLine.set({ head: prog(t, 27.9, 29.1) });
        const m = prog(t, 28.6, 29.4); msArc.set({ head: m }); msT.forEach(l => l.set({ opacity: .75 * ss(28.5, 28.8, t) }));
        sidePose(camS, S, R, lerp(-.004, .004, prog(t, 27.6, 30.4, x => x)), lerp(5.4, 5.15, prog(t, 27.6, 30.4)), 470); E.update(t, camS);
      } });
    ctx.draw2d({ shot: shD2, t0: 27.75, t1: 30.45, draw(g2, t, a, P) {
      pin(g2, P, PA, '波尔杜', '', true); pin(g2, P, PS, '信号山', '', false);
      const m = ss(29.0, 29.4, t); const p = P(S.P(0, R + .5)); if (!p || m <= 0) return;
      g2.save(); g2.globalAlpha *= m; g2.fillStyle = 'rgba(0,0,0,.6)'; g2.fillRect(p.x - 130, p.y - 44, 260, 64);
      ink.text(g2, '≈ 3 500 km', p.x, p.y - 8, { font: ink.cond(40, 600), color: ink.white, align: 'center' });
      ink.text(g2, '大圆距离 3 425 km', p.x, p.y + 14, { font: ink.mono(13), color: ink.dim, align: 'center' }); g2.restore();
    } });

    /* ---------------- D3 · 电离层 E 层：两跳折返 + 海面反射 ---------------- */
    const camS3 = KIT.cam(5); camS3.near = 5; camS3.far = 80; camS3.updateProjectionMatrix();
    const HU = t => prog(t, 31.3, 34.9, x => x * x * (3 - 2 * x) * .7 + x * .3);
    const shD3 = ctx.shot({ t0: 30.4, name: 'D3 电离层', in: { type: 'cut' }, scene: sE, camera: camS3,
      post: { exposure: 1.12, grade: ctx.grade.space, vignette: .3 },
      update(t) {
        sE.background = BLACK; showOnly(hopLine, tanLine); shell.set(ss(30.45, 31.3, t));
        tanLine.set({ head: 1, opacity: .16 * ss(30.4, 30.8, t) });
        const u = HU(t); hopLine.set({ head: u });
        const ph = S.phiOf(hopP.at(Math.max(0, u - .03)));
        const k = ss(30.9, 31.8, t) * (1 - ss(34.7, 35.9, t));
        const phiW = lerp(.01, -.01, prog(t, 30.4, 37, x => x));
        sidePose(camS3, S, R, lerp(phiW, ph, k), lerp(5.1, 2.35, k), lerp(505, 590, k)); E.update(t, camS3);
      } });
    ctx.draw2d({ shot: shD3, t0: 30.5, t1: 37.05, draw(g2, t, a, P) {
      pin(g2, P, PA, '波尔杜', '', true); pin(g2, P, PS, '信号山', '', false, .6 + .4 * ss(34.85, 35.0, t));
      const arr = ss(34.9, 35.05, t) * (1 - ss(35.6, 36.2, t)); const p = P(PS);
      if (p && arr > 0) { g2.save(); g2.globalAlpha *= arr; g2.strokeStyle = ink.accent; g2.lineWidth = 1.5; g2.beginPath(); g2.arc(p.x, p.y, 8 + 26 * ss(34.9, 35.8, t), 0, 7); g2.stroke(); g2.restore(); }
      if (p) { const s = ss(35.1, 35.4, t); if (s > 0) { g2.save(); g2.globalAlpha *= s; ink.text(g2, '· · ·  S', p.x - 16, p.y - 22, { font: ink.mono(16), color: ink.accent, align: 'right' }); g2.restore(); } }
    } });
    ctx.callout({ shot: shD3, at: S.P(S.phiA - .07, R + .14), title: '电离层', sub: '高空被阳光电离的稀薄气体', t0: 30.9, t1: 32.2, side: 'right', dx: 110, dy: -110 });
    ctx.callout({ shot: shD3, at: hop.apex[0], title: 'E 层 · 约 100 km', sub: '肯内利—亥维赛层 · 把中波折回地面', t0: 32.05, t1: 36.9, side: 'right', dx: 90, dy: -120, style: 'accent' });
    ctx.callout({ shot: shD3, at: S.P(0, R + .004), title: '海面反射', sub: '导电的海水把电波再弹上去', t0: 33.05, t1: 36.9, side: 'left', dx: 100, dy: 110 });
    ctx.readout({ x: 1810, y: 96, align: 'right', t0: 33.6, t1: 36.9, html: () => '<span class="k">频段</span> 中/长波 · 约 500 kHz <span class="k">（未实测）</span>' });
    ctx.readout({ x: 1810, y: 132, align: 'right', t0: 34.0, t1: 36.9, html: () => '<span class="k">1902 年肯内利、亥维赛提出 · 1924 年阿普尔顿证实</span>' });

    /* ================================================================
       E · 摩尔斯印字机纸带（结尾构图与 04 开头匹配）
       ================================================================ */
    const sF = new THREE.Scene();
    await KIT.hdri(sF, KIT.hdriFile('vintage_measuring_lab'), { intensity: .26, rotation: 2.6, background: true, bgBlur: .7, bgIntensity: .04 });
    const lampF = new THREE.SpotLight(0xffe2bc, 26, 0, .6, .7, 2); lampF.position.set(-.25, .95, .4); lampF.target.position.set(.25, .08, 0); lampF.castShadow = true;
    lampF.shadow.mapSize.set(2048, 2048); lampF.shadow.bias = -.0001; lampF.shadow.normalBias = .001; lampF.shadow.radius = 5; lampF.shadow.camera.near = .2; lampF.shadow.camera.far = 3;
    sF.add(lampF, lampF.target);
    const fillF = new THREE.PointLight(0xffd0a0, .12, 0, 2); fillF.position.set(.7, .35, .6); sF.add(fillF);
    const deskF = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), deskMat); deskF.rotation.x = -Math.PI / 2; deskF.receiveShadow = true; sF.add(deskF);
    const inker = buildInker(mt, mahog); sF.add(inker.group);
    const tape = buildTape(KIT, { x0: 0, x1: 1.7, y: INK.TAPE_Y, curve: x => x > 1.0 ? -Math.min(.11, (x - 1.0) ** 2 * 1.6) : 0, seg: 320 }); sF.add(tape.group);
    // 远端导纸柱（出画外）
    const gp = new THREE.Mesh(new THREE.CylinderGeometry(.004, .005, INK.TAPE_Y - .006, 16), mt.brass); gp.position.set(1.0, (INK.TAPE_Y - .006) / 2, -.011); gp.castShadow = true; sF.add(gp);
    const camF = KIT.cam(32);
    const pF = camPath([[37.0, [.33, .25, .45], [.02, .1, 0], 32], [38.7, [.43, .26, .23], [.3, .112, 0], 31], [40.1, [.4, INK.TAPE_Y + .2015, .0001], [.4, INK.TAPE_Y, 0], 30], [42.3, [.4, INK.TAPE_Y + .2015, .0001], [.4, INK.TAPE_Y, 0], 30, 'hold']]);
    const UP0 = V(0, 1, 0), UP1 = V(0, 0, -1);
    const shF = ctx.shot({ t0: 37.0, name: 'E 印字机纸带', in: { type: 'dissolve', dur: .8 }, scene: sF, camera: camF,
      post: { exposure: 1.02, ao: true, dof: { focus: .35, aperture: .012, maxBlur: 14 }, grade: ctx.grade.warm, vignette: .3, grain: .03 },
      update(t) {
        const press = tape.pressAt(t, TAPE_V); tape.update(t, TAPE_V); inker.update(t, TAPE_V, press);
        camF.up.copy(UP0).lerp(UP1, ss(38.5, 40.05, t)).normalize(); const c = pF(t); applyCam(camF, c, t, .0004 * (1 - ss(39.5, 40.5, t)));
        shF.post.dof.focus = camF.position.distanceTo(c.l);
      } });
    ctx.callout({ shot: shF, at: V(.2, INK.TAPE_Y + .001, 0), title: '此后马可尼电台的印字机纸带', sub: '1901 年信号山只靠耳朵听，没有纸面记录', t0: 37.6, t1: 39.5, side: 'right', dx: 60, dy: -150 });

    /* ---------------- 音效 ---------------- */
    for (const [d, u] of DOTS_A) { ctx.cue(d, 'spark', .7); ctx.cue(d, 'click', .3); ctx.cue(u, 'tap', .3); }
    ctx.cue(6.0, 'sub', .45); ctx.cue(6.1, 'whoosh', 3.6, .16);
    ctx.cue(10.5, 'whoosh', 1.4, .28); ctx.cue(10.95, 'blip', 880, .08); ctx.cue(12.15, 'blip', 660, .08);
    ctx.cue(13.3, 'whoosh', 4.2, .24); ctx.cue(15.8, 'swoosh', .25);
    ctx.cue(18.0, 'sub', .35); ctx.cue(18.95, 'tick', .7); ctx.cue(19.6, 'riser', 1.4, .1); ctx.cue(20.55, 'tick', .7); ctx.cue(21.4, 'tap', .45); ctx.cue(22.05, 'tick', .7);
    for (const c of CLICKS) { ctx.cue(c, 'click', .6); ctx.cue(c, 'beep', 520, .05, .05); }
    ctx.cue(27.6, 'whoosh', 1.0, .18); ctx.cue(27.9, 'riser', 1.3, .08); ctx.cue(29.05, 'chime', 660, .09);
    ctx.cue(30.4, 'sub', .3); ctx.cue(31.3, 'whoosh', 3.6, .13); ctx.cue(32.1, 'tick', .7); ctx.cue(33.1, 'tick', .7); ctx.cue(34.95, 'chime', 880, .11); ctx.cue(35.1, 'morse', '...', 760, .07, .1);
    ctx.cue(37.0, 'swoosh', .25);
    { let prev = 0; for (let t = 37.0; t < 42; t += .004) { const p = tape.pressAt(t, TAPE_V); if (p && !prev) ctx.cue(t, 'tick', .9); prev = p; } }
  },
};
