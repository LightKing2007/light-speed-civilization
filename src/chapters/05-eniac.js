/* 05 · 钢铁之躯 —— ENIAC（1943–1946）。
   A 档案照片（詹宁斯与比拉斯）→ B 写实复原机房穿行 + 规格卡 → C 真空三极管剖面：灯丝加热、电子流、栅极负压截止（示波器读数）
   → D 累加器氖灯：十进制环形计数 → 每秒 5000 次加法；一只管子烧断 → 档案照片：更换真空管 → E 插线编程特写 → 档案照片（贝克与斯奈德）。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, easeOut, camPath, applyCam, rng, hash, fmtThin } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { makeTube, TUBE } from '../props/05/tube.js';
import { buildRoom } from '../props/05/room.js';

/* ---------- 时间线上的「状态」：全部是 t 的纯函数 ---------- */
const heat = t => ss(14.3, 16.1, t);                                   // 灯丝加热
const cutU = t => easeIO(clamp((t - 16.5) / .95));                       // 前半玻璃移开
const NEG = [[21.35, 23.0], [23.75, 24.3]];                               // 栅极加负压的时间窗
const neg = t => NEG.reduce((m, [a, b]) => Math.max(m, ss(a, a + .1, t) * (1 - ss(b, b + .1, t))), 0);
const Ia = t => heat(t) * (1 - neg(t - .18));                              // 阳极电流（相对值）
const lampValue = t => {                                                  // 主角累加器显示的数
  if (t < 24.6) return 3141592653;
  if (t < 27.4) return Math.min(10, Math.floor((t - 24.6) / .24));        // 0→9，再进位成 10
  const tt = Math.min(t, 35.0) - 27.4, n = Math.floor(5000 * (tt < 1 ? tt * tt / 2 : tt - .5));
  return (10 + n * 1234567) % 1e10;
};
const failK = t => t < 34.35 || t > 36.6 ? 1 : t < 35.0 ? (hash(Math.floor(t * 26)) > .42 ? 1 : .18) * (1 - ss(34.9, 35.0, t) * .5) : 0;
const flashK = t => t > 34.98 && t < 35.2 ? (1 - ss(35.0, 35.2, t)) * ss(34.98, 35.0, t) : 0;
const plugU = t => clamp((t - 39.6) / .42) + clamp((t - 40.05) / .7) + clamp((t - 40.78) / .24);
const KNOB_T = [41.55, 41.8, 42.05];
const knobStep = t => 2 + KNOB_T.reduce((s, k) => s + ss(k, k + .07, t), 0);
const roomState = t => ({ value: lampValue(t), fail: failK(t), flash: flashK(t), plugU: plugU(t), knob: knobStep(t), warm: t > 32 && t < 37 ? .006 : 0, spot: t > 39 ? 22 : 10 });

export default {
  id: '05', status: 'implemented', slug: 'eniac', title: '钢铁之躯', dur: 46,
  card: { act: '第二部', actName: '计算', title: '钢铁之躯', short: '钢铁之躯', meta: 'ENIAC · 1943 — 1946 · 费城' },
  stamps: [[0, '1946']],
  caps: [[0.4, 6.8, '十年后，通用电子计算机有了钢铁之躯：1946 年 2 月，ENIAC 公开亮相。'], [7.2, 13.6, '它塞满了一万七千多只真空管，重约 27 吨，耗电 150 千瓦，占满一整个房间。'], [14.0, 20.4, '真空管就是它的开关：灯丝烧热阴极，电子被正电的阳极吸走，形成电流；'], [20.8, 26.6, '中间的栅极只要加上一点负电压，就能把电子流挡回去——一通一断，就是一个电子开关。'], [27.0, 32.8, 'ENIAC 每秒能做 5000 次加法：人工要算十几个小时的弹道，它半分钟就能算完。'], [33.2, 38.8, '可真空管发热、易坏，刚投入使用时，几乎每天都有管子烧掉。'], [39.2, 45.6, '更麻烦的是，换一道题，程序员们就得重新插线、拨开关，常常要忙上好几天。']],
  credits: [
    'assets/photos/act2/eniac_jennings_bilas.jpg', 'assets/photos/act2/eniac_changing_tube.jpg', 'assets/photos/act2/eniac_beck_snyder.jpg',
    'assets/hdri/vintage_measuring_lab_2k.hdr', 'assets/tex/concrete_floor_worn_001', 'assets/models/polyhaven/woodenchair_01',
  ],
  async build(ctx) {
    const { KIT } = ctx;
    /* 引擎缺陷绕行：渲染/spot 模式下舞台缩放 k=1、dpr=1，HUD.setScale 不会把 #hud2d 从默认 300×150 放大到 1920×1080，
       导致 draw2d 全部画在画布外。这里在首次绘制时补一次尺寸（幂等），并恢复 HUD 设好的变换与透明度。 */
    const fix2d = (g, a) => { const k = g.getTransform().a || 1, w = Math.round(1920 * k); if (g.canvas.width < w) { g.canvas.width = w; g.canvas.height = Math.round(1080 * k); g.setTransform(k, 0, 0, k, 0, 0); g.globalAlpha = a; } };
    const draw2d = o => ctx.draw2d({ ...o, draw: (g, t, a, pr) => { fix2d(g, a); o.draw(g, t, a, pr); } });
    const ARCH = { tonemap: false, grade: ctx.grade.archival, grain: .05, vignette: .38, weave: .5, flicker: .025, bloom: { strength: 0 } };

    /* ================= A · 档案照片：詹宁斯与比拉斯，1946 ================= */
    const phA = await KIT.photoShot('assets/photos/act2/eniac_jennings_bilas.jpg', { from: { x: -.3, y: .3, s: 1.04 }, to: { x: .32, y: .12, s: 1.2 } });
    ctx.shot({ name: '05.A 档案', t0: 0, in: { type: 'dip', dur: .8 }, scene: phA.scene, camera: phA.camera, post: ARCH, update(t, st) { phA.update(st / 8.2); } });
    ctx.lower({ t0: 3.9, t1: 7.0, name: 'ENIAC', meta: '宾夕法尼亚大学 · 1946 · 贝蒂·詹宁斯（左）与弗朗西丝·比拉斯', credit: '照片：美国陆军 · 公有领域' });

    /* ================= B · 复原机房：U 形排列的 40 块面板 ================= */
    const room = await buildRoom(KIT);
    const H = room.heroW;
    const cB = KIT.cam(36, .02, 60);
    const pathB = camPath([
      [7.2, [1.15, 1.62, 3.9], [-.7, 1.3, -6.2], 36],
      [10.6, [.5, 1.56, .8], [-1.6, 1.38, -5.3], 34],
      [14.7, [-1.22, 1.64, -2.75], [-2.44, 1.8, -3.62], 30],
    ]);
    const B = ctx.shot({ name: '05.B 机房', t0: 7.2, in: { type: 'dissolve', dur: 1.0 }, scene: room.scene, camera: cB,
      post: { exposure: 1.15, ao: { radius: .5, intensity: 1 }, dof: { focus: 3.5, aperture: .006, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .32 },
      update(t) { applyCam(cB, pathB(t), t, .0015); room.update(t, roomState(t)); B.post.dof.focus = cB.position.distanceTo(H(0, 1.6, 0)) * (t < 11 ? .8 : 1); } });
    // 规格卡（右侧）
    const SPEC = [['真空管', 17468, '只'], ['重量', 27, '吨', '约 '], ['功耗', 150, '千瓦'], ['占地', 167, 'm²', '约 '], ['面板', 40, '块 · U 形排列']];
    draw2d({ t0: 8.0, t1: 13.75, draw(g, t) {
      const x = 1440, y = 286, w = 380, h = 62 + SPEC.length * 58;
      g.fillStyle = 'rgba(10,11,12,.74)'; g.fillRect(x - 22, y - 34, w + 44, h);
      ink.corners(g, x - 22, y - 34, w + 44, h, 14, ink.dim);
      ink.text(g, 'ENIAC · 1946 · SPEC', x, y - 6, { font: ink.mono(13), color: ink.dim });
      SPEC.forEach(([k, v, u, pre = ''], i) => {
        const a = ss(8.3 + i * .32, 8.7 + i * .32, t); if (a <= 0) return; g.save(); g.globalAlpha *= a;
        const yy = y + 42 + i * 58, n = Math.round(v * easeOut(ss(8.3 + i * .32, 9.5 + i * .32, t)));
        ink.text(g, k, x, yy, { font: ink.sans(19), color: ink.dim });
        ink.text(g, pre + fmtThin(n), x + 150, yy + 2, { font: ink.mono(i === 0 ? 30 : 26, 600), color: i === 0 ? ink.accent : ink.white });
        ink.text(g, u, x + w, yy, { font: ink.sans(16), color: ink.dim, align: 'right' });
        ink.line(g, [[x, yy + 18], [x + w, yy + 18]], ink.faint, 1); g.restore();
      });
    } });
    ctx.callout({ shot: B, at: () => H(-.05, 1.25, .01), title: '累加器 ×20', sub: '每台存一个 10 位十进制数', t0: 11.3, t1: 13.75, side: 'left', dx: -120, dy: -150 });

    /* ================= C · 真空三极管剖面（影棚，1 单位 = 10 cm） ================= */
    const sc = new THREE.Scene();
    KIT.studio(sc, { bg: 0x09090a, key: 36, fill: 2.2, rim: 30, keyPos: [-2.6, 3.4, 3.1], rimPos: [2.6, 1.9, -3.2], fillPos: [3.2, 1.2, 3.4], target: [0, .5, 0], floorY: -.066, env: .32, shadowRadius: 5 });
    const bd = KIT.canvasTex(512, 256, (g, w, h) => { const gr = g.createRadialGradient(w * .5, h * .42, 10, w * .5, h * .5, w * .55); gr.addColorStop(0, '#3b3d41'); gr.addColorStop(.55, '#1a1b1e'); gr.addColorStop(1, '#09090a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: bd })); back.position.set(.6, 1.6, -4.2); sc.add(back);
    const chassis = new THREE.Mesh(KIT.rbox(4.6, .06, 2.8, .02), KIT.M.aluminium({ rough: .34 })); chassis.position.set(0, -.035, -.35); chassis.receiveShadow = true; sc.add(chassis);
    const sockGeo = new THREE.LatheGeometry([new THREE.Vector2(.168, 0), new THREE.Vector2(.205, 0), new THREE.Vector2(.21, .006), new THREE.Vector2(.205, .012), new THREE.Vector2(.168, .012)], 48);
    const sockM = KIT.M.plastic(0x141210, { rough: .4 }), screwM = KIT.M.steel({ rough: .3 });
    const mount = (x, z) => { const s = new THREE.Mesh(sockGeo, sockM); s.position.set(x, -.006, z); s.receiveShadow = true; sc.add(s);
      for (const sx of [-1, 1]) { const sw = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .01, 20), screwM); sw.position.set(x + sx * .27, -.001, z); sw.castShadow = true; sc.add(sw); const sl = new THREE.Mesh(new THREE.BoxGeometry(.03, .004, .004), KIT.M.iron()); sl.position.set(x + sx * .27, .0045, z); sl.rotation.y = hash(x * 9 + sx) * 3; sc.add(sl); } };
    const tube = makeTube(KIT); sc.add(tube.group); mount(0, 0);
    const bgT = [[1.05, -.95], [-.95, -1.35], [2.0, -1.9]].map(([x, z]) => { const b = makeTube(KIT); b.group.position.set(x, 0, z); b.group.rotation.y = hash(x) * 2; sc.add(b.group); mount(x, z); return b; });
    // 电子
    const NE = 1500, TR = 3, eP = new Float32Array(NE * TR * 3), eA = new Float32Array(NE * TR), RE = rng(5), EL = [];
    for (let i = 0; i < NE; i++) EL.push({ s: i % 2 ? 1 : -1, y: .45 + RE() * .3, z: -.004 - RE() * .034, ph: RE(), k: .75 + RE() * .5, h: .04 + RE() * .92, w: RE() * 6.28 });
    const el = KIT.points(eP, { size: 2.6, color: 0xcdeeff, intensity: 1.12, alphas: eA, soft: .55 }); tube.back.add(el);
    const electrons = t => {
      for (let i = 0; i < NE; i++) {
        const e = EL[i], Ti = .95 / e.k, s0 = ((t / Ti + e.ph) % 1 + 1) % 1, te = t - s0 * Ti, alive = heat(te) * ss(.8, 1, cutU(te + .4)), blk = neg(te + .06) > e.h;
        for (let k = 0; k < TR; k++) {   // 每个电子带两段拖尾，看得出方向
          const s01 = Math.max(0, s0 - k * .022), j = i * TR + k; let r, a;
          if (blk) { r = .0115 + .0165 * Math.sin(Math.PI * s01); a = ss(0, .12, s01) * (1 - ss(.82, 1, s01)) * .9; }
          else { r = .0115 + .0615 * Math.pow(s01, 1.35); a = ss(0, .06, s01) * (1 - ss(.93, 1, s0)); }
          eP[j * 3] = e.s * r; eP[j * 3 + 1] = e.y + Math.sin(e.w + t * 3 + s01 * 4) * .0035; eP[j * 3 + 2] = e.z * (1 - .25 * s01); eA[j] = a * alive * (1 - k * .38) * (k && s0 < .03 ? 0 : 1);
        }
      }
      el.geometry.attributes.position.needsUpdate = true; el.geometry.attributes.aAlpha.needsUpdate = true;
    };
    const setTube = t => { const h = heat(t); tube.setHeat(h); bgT.forEach(b => b.setHeat(h)); tube.setCut(cutU(t)); electrons(t); };
    const focusC = V(0, .58, 0);
    const cC = KIT.cam(30, .02, 60);
    const pathC1 = camPath([
      [13.8, [1.08, .88, 2.32], [.1, .55, 0], 30],
      [16.4, [.6, .76, 2.08], [.11, .57, 0], 30],
      [18.9, [.2, .64, 1.52], [.1, .6, 0], 30],
      [21.5, [.12, .63, 1.4], [.1, .6, 0], 30],
    ]);
    const C1 = ctx.shot({ name: '05.C1 真空管', t0: 13.8, in: { type: 'blur', dur: .9, params: [5] }, scene: sc, camera: cC,
      post: { exposure: 1.05, ao: { radius: .2, intensity: .8 }, dof: { focus: 2.2, aperture: .016, maxBlur: 10 }, bloom: { strength: .15 }, grade: ctx.grade.studio },
      update(t) { applyCam(cC, pathC1(t), t, .0012); el.material.uniforms.uSize.value = 2.3; setTube(t); C1.post.dof.focus = cC.position.distanceTo(focusC); } });
    const cC2 = KIT.cam(28, .02, 60);
    const pathC2 = camPath([[20.6, [.35, .65, 1.42], [.075, .62, 0], 28], [24.7, [.27, .64, 1.28], [.07, .62, 0], 28]]);
    const C2 = ctx.shot({ name: '05.C2 栅极', t0: 20.6, in: { type: 'cut' }, scene: sc, camera: cC2,
      post: { exposure: 1.05, ao: { radius: .2, intensity: .8 }, dof: { focus: 1, aperture: .012, maxBlur: 10 }, bloom: { strength: .15 }, grade: ctx.grade.studio },
      update(t) { applyCam(cC2, pathC2(t), t, .001); el.material.uniforms.uSize.value = 2.7; setTube(t); C2.post.dof.focus = cC2.position.distanceTo(focusC); } });
    const { hw } = TUBE.plate, ga = TUBE.grid.a;
    ctx.callout({ shot: C1, at: V(0, .838, 0), title: '灯丝', sub: '6.3 V 通电 · 发热发光', t0: 14.6, t1: 16.7, side: 'right', dx: 150, dy: -110 });
    ctx.callout({ shot: C1, at: V(-.012, .5, -.004), title: '阴极 K', sub: '被烧热 · 放出电子', t0: 17.5, t1: 20.6, side: 'left', dx: -150, dy: 90 });
    ctx.callout({ shot: C1, at: V(hw, .7, -.02), title: '阳极 A', sub: '+250 V · 吸引电子', t0: 17.9, t1: 20.6, side: 'right', dx: 120, dy: -140 });
    const gCo = ctx.callout({ shot: C2, at: V(-ga, .7, -.004), title: '栅极 G', sub: '0 V · 电子穿过', t0: 20.9, t1: 24.6, side: 'left', dx: -150, dy: -110 });
    ctx.callout({ shot: C2, at: V(hw, .52, -.02), title: '阳极 A', sub: '+250 V', t0: 21.0, t1: 24.6, side: 'right', dx: 110, dy: 120 });
    // 栅极 / 阳极的电荷符号（投影到屏幕）
    const signs = (g, t, project, plus) => {
      const n = neg(t);
      for (const y of [.5, .6, .7]) for (const s of [-1, 1]) {
        if (plus) { const p = project(V(s * (hw - .006), y, -.02)); if (p) ink.text(g, '+', p.x - s * 16, p.y + 7, { font: ink.mono(22, 700), color: ink.accent, align: 'center' }); }
        if (n > .02) { const q = project(V(s * ga, y + .05, -.004)); if (q) { g.save(); g.globalAlpha *= n; ink.text(g, '−', q.x, q.y + 7, { font: ink.mono(24, 700), color: ink.warn, align: 'center' }); g.restore(); } }
      }
    };
    draw2d({ shot: C1, t0: 18.2, t1: 20.6, draw: (g, t, a, project) => signs(g, t, project, true) });
    draw2d({ shot: C2, t0: 20.6, t1: 24.6, draw: (g, t, a, project) => { signs(g, t, project, true); gCo.setText('栅极 G', neg(t) > .5 ? '−20 V · 电子被挡回' : '0 V · 电子穿过'); } });
    // 右侧测量面板：三极管电路图（电子沿回路流动、电流表指针）+ Vg / Ia 示波器 + 通断
    const phiIa = t => { let s = 0; for (let u = 14; u < t; u += .04) s += Ia(Math.min(u + .02, t)) * Math.min(.04, t - u); return s; };   // ∫Ia dt：电子走过的「路程」
    const polyAt = (P, d) => { for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], L = Math.hypot(x1 - x0, y1 - y0); if (d <= L) return [x0 + (x1 - x0) * d / L, y0 + (y1 - y0) * d / L]; d -= L; } return P[P.length - 1]; };
    const polyLen = P => P.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
    const circuit = (g, t, x, y) => {
      const I = Ia(t), n = neg(t), hk = heat(t), cx = x + 132, cy = y + 104, R = 54, top = y + 22, bot = y + 190, bx = x + 296, gx = x + 30, mx = x + 222;
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      const wire = ink.dim;
      // 回路导线
      ink.line(g, [[cx, cy - 28], [cx, top], [mx - 15, top]], wire, 1.3); ink.line(g, [[mx + 15, top], [bx, top], [bx, cy - 7]], wire, 1.3);
      ink.line(g, [[bx, cy + 7], [bx, bot], [gx, bot], [gx, cy + 50]], wire, 1.3); ink.line(g, [[cx + 20, cy + 30], [cx + 20, bot]], wire, 1.3);
      ink.line(g, [[cx - 26, cy], [gx, cy], [gx, cy + 34]], n > .5 ? ink.warn : wire, 1.3);
      // 管壳 + 电极
      g.strokeStyle = 'rgba(235,235,230,.7)'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
      ink.line(g, [[cx - 22, cy - 28], [cx + 22, cy - 28]], ink.white, 3.2);
      g.setLineDash([4, 4]); ink.line(g, [[cx - 26, cy], [cx + 26, cy]], n > .5 ? ink.warn : ink.white, 1.8); g.setLineDash([]);
      ink.line(g, [[cx - 20, cy + 30], [cx - 20, cy + 24], [cx + 20, cy + 24], [cx + 20, cy + 30]], ink.white, 2);
      ink.line(g, [[cx - 18, cy + 50], [cx - 9, cy + 37], [cx, cy + 50]], `rgba(255,122,48,${.25 + .75 * hk})`, 2);
      ink.line(g, [[cx - 18, cy + 50], [cx - 18, cy + 70]], wire, 1.2); ink.line(g, [[cx, cy + 50], [cx, cy + 70]], wire, 1.2);
      ink.text(g, '灯丝 6.3 V', cx - 26, cy + 72, { font: ink.mono(11), color: ink.dim, align: 'right' });
      ink.text(g, 'A', cx + 30, cy - 23, { font: ink.mono(13, 600), color: ink.dim }); ink.text(g, 'G', cx + 32, cy + 5, { font: ink.mono(13, 600), color: n > .5 ? ink.warn : ink.dim }); ink.text(g, 'K', cx + 28, cy + 24, { font: ink.mono(13, 600), color: ink.dim });
      // 高压电池 B+（长板 = 正极）
      ink.line(g, [[bx - 14, cy - 7], [bx + 14, cy - 7]], ink.white, 2); ink.line(g, [[bx - 7, cy + 7], [bx + 7, cy + 7]], ink.white, 3);
      ink.text(g, '+250 V', bx + 20, cy - 2, { font: ink.mono(13, 600), color: ink.accent }); ink.text(g, 'B+', bx + 20, cy + 16, { font: ink.mono(11), color: ink.dim });
      // 栅极偏压（开关：0 V ↔ −20 V）
      if (n > .5) { ink.line(g, [[gx - 7, cy + 34], [gx + 7, cy + 34]], ink.warn, 3); ink.line(g, [[gx - 14, cy + 48], [gx + 14, cy + 48]], ink.warn, 2); }
      else ink.line(g, [[gx, cy + 34], [gx, cy + 50]], wire, 1.3);
      ink.text(g, 'Vg', gx - 12, cy - 8, { font: ink.mono(12, 600), color: n > .5 ? ink.warn : ink.dim, align: 'left' });
      // 电流表
      g.strokeStyle = ink.white; g.lineWidth = 1.4; g.beginPath(); g.arc(mx, top, 15, 0, 7); g.stroke();
      const na = -1.05 + 2.1 * clamp(I); g.strokeStyle = ink.accent; g.lineWidth = 1.6; g.beginPath(); g.moveTo(mx, top + 8); g.lineTo(mx + Math.sin(na) * 15, top + 8 - Math.cos(na) * 15); g.stroke();
      ink.text(g, 'mA', mx, top + 30, { font: ink.mono(11), color: ink.dim, align: 'center' });
      // 电子：阴极 → 阳极 → 电流表 → 电池正极 → 负极 → 回到阴极
      const loop = [[cx, cy + 20], [cx, cy - 28], [cx, top], [bx, top], [bx, bot], [cx + 20, bot], [cx + 20, cy + 30], [cx + 6, cy + 22]], LL = polyLen(loop), ph = phiIa(t) * 64;
      g.fillStyle = ink.cyan;
      for (let d = ((ph % 22) + 22) % 22; d < LL; d += 22) { const [px, py] = polyAt(loop, d); const inside = Math.hypot(px - cx, py - cy) < R; g.globalAlpha = (inside ? 1 : .8) * clamp(I * 1.4) * (g._a ?? 1); g.beginPath(); g.arc(px, py, 2.4, 0, 7); g.fill(); }
      g.restore();
    };
    draw2d({ t0: 17.5, t1: 24.6, draw(g, t, a) {
      const x = 1450, y = 196, w = 370, H2 = 588;
      g.fillStyle = 'rgba(8,9,10,.72)'; g.fillRect(x - 20, y - 30, w + 40, H2); ink.corners(g, x - 20, y - 30, w + 40, H2, 14, ink.dim);
      ink.text(g, 'MEASURE · TRIODE CIRCUIT', x, y - 6, { font: ink.mono(13), color: ink.dim });
      g._a = a; circuit(g, t, x, y);
      const vg = -20 * neg(t), ia = 8.2 * Ia(t), y2 = y + 238;
      ink.line(g, [[x, y2 - 26], [x + w, y2 - 26]], ink.faint, 1);
      ink.text(g, '栅极电压 Vg', x, y2, { font: ink.sans(18) });
      ink.text(g, (vg < -.05 ? '−' : '') + Math.abs(vg).toFixed(0) + ' V', x + w, y2 + 2, { font: ink.mono(24, 600), color: vg < -1 ? ink.warn : ink.white, align: 'right' });
      ink.scope(g, x, y2 + 14, w, 66, u => .55 - 1.1 * neg(t - 4.5 * (1 - u)), { color: ink.warn, lw: 1.6 });
      ink.text(g, '阳极电流 Ia', x, y2 + 118, { font: ink.sans(18) });
      ink.text(g, ia.toFixed(1) + ' mA', x + w, y2 + 120, { font: ink.mono(24, 600), color: ia > .5 ? ink.accent : ink.white, align: 'right' });
      ink.scope(g, x, y2 + 132, w, 66, u => 1.1 * Ia(t - 4.5 * (1 - u)) - .55, { color: ink.accent, lw: 1.6 });
      ink.text(g, '−4.5 s', x, y2 + 214, { font: ink.mono(11), color: ink.dim }); ink.text(g, 'NOW', x + w, y2 + 214, { font: ink.mono(11), color: ink.dim, align: 'right' });
      const on = Ia(t) > .5;
      ink.text(g, on ? '通' : '断', x, y2 + 290, { font: ink.sans(58, 700), color: on ? ink.accent : ink.warn });
      ink.text(g, on ? 'ON · 电流导通' : 'OFF · 电流截止', x + 78, y2 + 268, { font: ink.mono(16, 600), color: on ? ink.accent : ink.warn });
      ink.text(g, on ? '栅极 0 V：电子穿过栅丝' : '栅极 −20 V：电子被推回', x + 78, y2 + 292, { font: ink.sans(14), color: ink.dim });
    } });

    /* ================= D1 · 累加器：十进制环形计数 → 每秒 5000 次加法 ================= */
    const cD = KIT.cam(30, .01, 40);
    const P = (x, y, z) => { const v = H(x, y, z); return [v.x, v.y, v.z]; };
    const pathD = camPath([
      [24.6, P(.34, 1.19, .9), P(.235, 1.185, 0), 30],
      [27.2, P(.32, 1.2, .93), P(.228, 1.19, 0), 30],
      [29.6, P(.06, 1.46, 1.46), P(.16, 1.31, 0), 34],
      [33.2, P(-.04, 1.48, 1.32), P(.15, 1.33, 0), 34],
    ]);
    const D1 = ctx.shot({ name: '05.D1 计数', t0: 24.6, in: { type: 'cut' }, scene: room.scene, camera: cD,
      post: { exposure: 1.2, ao: { radius: .06, intensity: .9 }, dof: { focus: .6, aperture: .004, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .34 },
      update(t) { applyCam(cD, pathD(t), t, .0008); room.update(t, roomState(t)); D1.post.dof.focus = cD.position.distanceTo(H(.15, 1.25, 0)); } });
    const onesBox = () => new THREE.Box3().setFromPoints([room.lampW(9, 0), room.lampW(9, 9)]).expandByScalar(.016);
    ctx.bracket({ shot: D1, box: onesBox(), label: '个位 · 0–9', t0: 24.85, t1: 27.6 });
    ctx.callout({ shot: D1, at: t => room.lampW(9, lampValue(t) % 10), title: '环形计数器', sub: 'ENIAC：十个开关一圈，记一位十进制数', t0: 25.0, t1: 27.4, side: 'right', dx: 150, dy: -40 });
    ctx.bracket({ shot: D1, box: new THREE.Box3().setFromPoints([room.lampW(0, 0), room.lampW(9, 9)]).expandByScalar(.02), label: '10 位十进制数', t0: 29.4, t1: 32.9 });
    ctx.stat({ t0: 27.4, t1: 32.9, fmt: p => fmtThin(5000 * p), unit: '次加法 / 秒', label: 'ENIAC 运算速度', src: '1946 年公开演示', dur: 1.6 });
    // 弹道对比
    draw2d({ t0: 29.5, t1: 32.9, draw(g, t) {
      const x = 110, y = 178, w = 560;
      g.fillStyle = 'rgba(8,9,10,.74)'; g.fillRect(x - 24, y - 40, w + 48, 210); ink.corners(g, x - 24, y - 40, w + 48, 210, 12, ink.dim);
      ink.text(g, '计算一条炮弹弹道', x, y - 10, { font: ink.sans(18) });
      // 小弹道曲线
      const k = ss(29.7, 30.0, t); g.strokeStyle = ink.dim; g.lineWidth = 1.2; g.setLineDash([3, 4]); g.beginPath();
      for (let i = 0; i <= 40 * k; i++) { const u = i / 40, px = x + 300 + u * 250, py = y - 2 - Math.sin(Math.PI * u) * 26 * (1 - .25 * u); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.setLineDash([]);
      const bar = (yy, frac, label, val, col) => { ink.text(g, label, x, yy, { font: ink.sans(16), color: ink.dim }); g.fillStyle = 'rgba(235,235,230,.08)'; g.fillRect(x, yy + 12, w, 14); g.fillStyle = col; g.fillRect(x, yy + 12, Math.max(2, w * frac), 14); ink.text(g, val, x + w, yy, { font: ink.mono(17, 600), color: col, align: 'right' }); };
      bar(y + 40, ss(29.7, 31.6, t), '人工 · 手摇计算器', '十几个小时', ink.white);
      bar(y + 100, ss(29.7, 29.85, t) / 1440 * 6, 'ENIAC', '约 30 秒', ink.accent);
    } });

    /* ================= D2 · 一只管子烧断 ================= */
    const cE = KIT.cam(32, .01, 40);
    const pathE = camPath([[33.0, P(.36, 1.955, .175), P(.05, 1.905, .028), 32], [37.2, P(.325, 1.94, .2), P(.03, 1.905, .028), 32]]);
    const D2 = ctx.shot({ name: '05.D2 故障', t0: 33.0, in: { type: 'cut' }, scene: room.scene, camera: cE,
      post: { exposure: 1.15, ao: { radius: .03, intensity: .8 }, dof: { focus: .26, aperture: .0016, maxBlur: 10 }, bloom: { strength: .14 }, grade: ctx.grade.warm, vignette: .36 },
      update(t) { applyCam(cE, pathE(t), t, .0006); room.update(t, roomState(t)); D2.post.dof.focus = cE.position.distanceTo(room.tubeW(3, 10)); } });
    const [fk, fj] = room.FAIL;
    ctx.callout({ shot: D2, at: room.tubeW(3, 12), title: '灯丝常亮', sub: '17 468 只同时发热', t0: 33.4, t1: 34.9, side: 'left', dx: -130, dy: -150 });
    ctx.callout({ shot: D2, at: room.tubeW(fk, fj).add(V(0, .012, 0)), title: '灯丝烧断', sub: '一只坏管 → 整机停摆', t0: 35.1, t1: 36.6, side: 'left', dx: -120, dy: -265, style: 'warn' });

    /* ================= D3 · 档案照片：更换真空管 ================= */
    const phD = await KIT.photoShot('assets/photos/act2/eniac_changing_tube.jpg', { from: { x: .25, y: -.1, s: 1.04 }, to: { x: -.1, y: -.25, s: 1.16 } });
    ctx.shot({ name: '05.D3 换管', t0: 36.4, in: { type: 'dissolve', dur: .8 }, scene: phD.scene, camera: phD.camera, post: ARCH, update(t, st) { phD.update(st / 3.6); } });
    ctx.lower({ t0: 36.9, t1: 39.1, name: '更换真空管', meta: 'ENIAC · 技术员格伦·贝克检修管子', credit: '照片：美国陆军（M. Weik《The ENIAC Story》）· 公有领域' });

    /* ================= E1 · 插线、拨开关 ================= */
    const cF = KIT.cam(30, .01, 40);
    const pathF = camPath([
      [39.2, P(.30, .78, .56), P(.0, .64, 0), 30],
      [40.8, P(.32, .79, .54), P(.02, .645, 0), 30],
      [41.5, P(.24, .9, .5), P(.0, .86, 0), 30],
      [43.4, P(.22, .92, .46), P(.0, .875, 0), 30],
    ]);
    const E1 = ctx.shot({ name: '05.E1 插线', t0: 39.2, in: { type: 'dissolve', dur: .7 }, scene: room.scene, camera: cF,
      post: { exposure: 1.45, ao: { radius: .04, intensity: .9 }, dof: { focus: .5, aperture: .003, maxBlur: 9 }, grade: ctx.grade.warm, vignette: .34 },
      update(t) { applyCam(cF, pathF(t), t, .0007); room.update(t, roomState(t)); E1.post.dof.focus = cF.position.distanceTo(t < 41.3 ? room.plugW(plugU(t)) : room.knobW(4)); } });
    ctx.callout({ shot: E1, at: t => room.plugW(plugU(t)), title: '插线 = 程序', sub: '电缆决定数据流向哪里', t0: 39.5, t1: 41.3, side: 'right', dx: 140, dy: -120 });
    ctx.callout({ shot: E1, at: room.knobW(4), title: '拨开关', sub: '设定常数与重复次数', t0: 41.45, t1: 42.7, side: 'right', dx: 150, dy: -110 });

    /* ================= E2 · 档案照片：贝克与斯奈德编程 ================= */
    const phE = await KIT.photoShot('assets/photos/act2/eniac_beck_snyder.jpg', { from: { x: -.1, y: 0, s: 1.03 }, to: { x: .28, y: .06, s: 1.16 } });
    ctx.shot({ name: '05.E2 编程', t0: 42.6, in: { type: 'dissolve', dur: .8 }, scene: phE.scene, camera: phE.camera, post: ARCH, update(t, st) { phE.update(st / 4.4); } });
    ctx.lower({ t0: 43.0, t1: 45.8, name: 'ENIAC', meta: '弹道研究实验室（阿伯丁）· 约 1947–1955 · 格伦·贝克与贝蒂·斯奈德', credit: '照片：美国陆军 · 公有领域' });

    /* ================= 音效 ================= */
    ctx.cue(7.3, 'whoosh', 1.1, .25); ctx.cue(9.6, 'relay', .25); ctx.cue(11.1, 'relay', .2); ctx.cue(12.4, 'relay', .22);
    ctx.cue(13.8, 'swoosh', .35); ctx.cue(14.4, 'riser', 1.7, .25); ctx.cue(16.5, 'whoosh', .9, .35);
    for (const [a, b] of NEG) { ctx.cue(a, 'click', .55); ctx.cue(b, 'click', .45); }
    for (let k = 0; k <= 10; k++) ctx.cue(24.6 + k * .24, 'tick', .32);
    ctx.cue(27.4, 'riser', 1.2, .25); ctx.cue(29.7, 'blip', 880, .2);
    ctx.cue(34.4, 'glitch', .25); ctx.cue(35.0, 'spark', .45);
    ctx.cue(39.62, 'clack', .55); ctx.cue(40.98, 'clack', .7); for (const k of KNOB_T) ctx.cue(k, 'click', .5);
  },
};
