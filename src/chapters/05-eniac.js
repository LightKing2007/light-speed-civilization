/* 05 · 钢铁之躯 —— ENIAC（1943–1946）。
   A 档案照片（詹宁斯与比拉斯）→ B 写实复原机房穿行 + 规格卡 → C 真空三极管剖面：灯丝加热、电子流、栅极负压截止（示波器读数）
   → D 累加器氖灯：十进制环形计数 → 每秒 5000 次加法；一只管子烧断 → 档案照片：更换真空管 → E 插线编程特写 → 档案照片（贝克与斯奈德）。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕里的数字。
   真空管剖面原为 C1 / C2 两个镜头，合并成一个连续推近的镜头（13.8–26.0），让「栅极」标注停留得够久、并覆盖「一通一断」整句旁白；
   累加器镜头相应从 26.0 开始。15.2–16.5 s 仍是「灯丝渐亮、玻璃完整」（第 15 章蒙太奇引用这一段）。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, easeOut, camPath, applyCam, rng, hash, fmtThin } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { makeTube, TUBE } from '../props/05/tube.js';
import { buildRoom } from '../props/05/room.js';

/* ---------- 时间线上的「状态」：全部是 t 的纯函数 ---------- */
const heat = t => ss(14.3, 16.1, t);                                   // 灯丝加热
const cutU = t => easeIO(clamp((t - 16.5) / .95));                       // 前半玻璃移开（第 15 章引用 15.2–16.5 s，此前保持完整）
const NEG = [[21.6, 23.2], [24.0, 24.5], [25.0, 25.4]];                                         // 栅极加负压的时间窗
const neg = t => NEG.reduce((m, [a, b]) => Math.max(m, ss(a, a + .1, t) * (1 - ss(b, b + .1, t))), 0);
const Ia = t => heat(t) * (1 - neg(t - .18));                              // 阳极电流（相对值）
const D1_T = 26.0;                                                        // 累加器镜头开始（个位从 0 数到 9，再进位）
const lampValue = t => {                                                  // 主角累加器显示的数
  if (t < D1_T) return 3141592653;
  if (t < D1_T + 2.8) return Math.min(10, Math.floor((t - D1_T) / .24));  // 0→9，再进位成 10
  const tt = Math.min(t, 35.0) - (D1_T + 2.8), n = Math.floor(5000 * (tt < 1 ? tt * tt / 2 : tt - .5));
  return (10 + n * 1234567) % 1e10;
};
const FAIL_T = 34.5;                                                      // 故障管：33.85 起闪烁，34.5 烧断（闪光）
const failK = t => t < 33.85 || t > 36.6 ? 1 : t < FAIL_T ? (hash(Math.floor(t * 26)) > .42 ? 1 : .18) * (1 - ss(FAIL_T - .1, FAIL_T, t) * .5) : 0;
const flashK = t => t > FAIL_T - .02 && t < FAIL_T + .2 ? (1 - ss(FAIL_T, FAIL_T + .2, t)) * ss(FAIL_T - .02, FAIL_T, t) : 0;
const plugU = t => clamp((t - 39.6) / .42) + clamp((t - 40.05) / .7) + clamp((t - 40.78) / .24);
const KNOB_T = [41.4, 41.6, 41.8];
const knobStep = t => 2 + KNOB_T.reduce((s, k) => s + ss(k, k + .07, t), 0);
const roomState = t => ({ value: lampValue(t), fail: failK(t), flash: flashK(t), plugU: plugU(t), knob: knobStep(t), warm: t > 32 && t < 37 ? .006 : 0, spot: t > 39 ? 32 : 10 });
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, 'rgba(235,235,230,.2)', 1); };
/** 署名条（左下）后面的柔和暗底：画在 2D 层（在署名条文字之下），亮的档案照片上也看得清 */
const scrim = (g, a = .6) => { g.save(); g.translate(560, 792); g.scale(1, .27); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 660); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.62, `rgba(0,0,0,${a * .75})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-680, -680, 1360, 1360); g.restore(); };

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
    // 署名条：完整停留 3.5 s（4.0–7.55），B 溶入时淡出；后面垫一层柔和暗底
    draw2d({ t0: 3.6, t1: 7.95, fade: .4, draw(g) { scrim(g); } });
    ctx.lower({ t0: 3.6, t1: 7.95, name: 'ENIAC', meta: '1946 · 贝蒂·詹宁斯（左）与弗朗西丝·比拉斯', credit: '照片：美国陆军 · 公有领域' });

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
      post: { exposure: 1.28, ao: { radius: .5, intensity: 1 }, dof: { focus: 3.5, aperture: .004, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .3 },
      update(t) { applyCam(cB, pathB(t), t, .0015); room.update(t, roomState(t)); B.post.dof.focus = cB.position.distanceTo(H(0, 1.6, 0)) * (t < 11 ? .8 : 1); } });
    // 字幕已经念出各项数字，这里不再列规格表；只指出「这一屋子面板就是 ENIAC」和「面板上一排排的真空管」
    ctx.callout({ shot: B, at: V(-2.44, 2.1, -8.0), title: '40 块面板', sub: '围成 U 形，占满房间', t0: 7.9, t1: 12.4, side: 'right', dx: 150, dy: -120 });
    ctx.callout({ shot: B, at: () => room.tubeW(1, 6), title: '真空管', sub: '一排排插满面板', t0: 9.2, t1: 13.8, side: 'right', dx: 160, dy: 120 });

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
    /* 一个连续镜头：从斜侧方推近（加热 → 剖开 → 阴极 / 阳极），再转到右前方的特写看栅极（原 C1 / C2 合并，去掉中间的硬切） */
    const cC = KIT.cam(30, .02, 60);
    const pathC = camPath([
      [13.8, [1.08, .88, 2.32], [.1, .55, 0], 30],
      [16.4, [.6, .76, 2.08], [.11, .57, 0], 30],
      [18.9, [.2, .64, 1.52], [.1, .6, 0], 30],
      [21.3, [.33, .65, 1.42], [.08, .62, 0], 28],
      [26.0, [.25, .64, 1.24], [.07, .62, 0], 28],
    ]);
    const C = ctx.shot({ name: '05.C 真空管', t0: 13.8, in: { type: 'blur', dur: .9, params: [5] }, scene: sc, camera: cC,
      post: { exposure: 1.14, ao: { radius: .2, intensity: .8 }, dof: { focus: 2.2, aperture: .008, maxBlur: 8 }, bloom: { strength: .15 }, grade: ctx.grade.studio },
      update(t) { applyCam(cC, pathC(t), t, .0011); el.material.uniforms.uSize.value = lerp(2.3, 2.7, ss(19.5, 21.3, t)); setTube(t); C.post.dof.focus = cC.position.distanceTo(focusC); } });
    const { hw } = TUBE.plate, ga = TUBE.grid.a;
    // 三个电极依次出现（间隔 ≥ 0.8 s），同一时刻最多两个；每个完整停留 ≥ 3.5 s
    ctx.callout({ shot: C, at: V(-.012, .5, -.004), title: '阴极', sub: '灯丝把它烧热，放出电子', t0: 17.0, t1: 21.5, side: 'left', dx: -150, dy: 90 });
    ctx.callout({ shot: C, at: V(hw, .7, -.02), title: '阳极（正电）', sub: '把电子吸过去', t0: 17.8, t1: 26.0, side: 'right', dx: 120, dy: -150 });
    ctx.callout({ shot: C, at: V(-ga, .7, -.004), title: '栅极', sub: '加负电压，就挡住电子', t0: 21.5, t1: 26.0, side: 'left', dx: -150, dy: -110 });
    // 栅极 / 阳极的电荷符号（投影到屏幕）
    const signs = (g, t, project) => {
      const n = neg(t);
      for (const y of [.5, .6, .7]) for (const s of [-1, 1]) {
        const p = project(V(s * (hw - .006), y, -.02)); if (p) ink.text(g, '+', p.x - s * 16, p.y + 8, { font: ink.mono(26, 700), color: ink.accent, align: 'center' });
        if (n > .02) { const q = project(V(s * ga, y + .05, -.004)); if (q) { g.save(); g.globalAlpha *= n; ink.text(g, '−', q.x, q.y + 8, { font: ink.mono(28, 700), color: ink.warn, align: 'center' }); g.restore(); } }
      }
    };
    draw2d({ shot: C, t0: 18.0, t1: 26.0, draw: (g, t, a, project) => signs(g, t, project) });
    // 右侧面板：标题就是结论（导通 / 截止），下面两条示波器曲线：栅极电压一变负，阳极电流随即归零
    draw2d({ t0: 18.6, t1: 26.0, draw(g, t) {
      const X0 = 1416, Y0 = 210, W = 456, Hh = 430, x = X0 + 28, w = W - 56;
      panelBox(g, X0, Y0, W, Hh);
      const on = Ia(t) > .5;
      ink.text(g, on ? '通：电流流过' : '断：电流被切断', x, Y0 + 58, { font: ink.sans(34, 700), color: on ? ink.accent : ink.warn });
      ink.line(g, [[x, Y0 + 84], [x + w, Y0 + 84]], 'rgba(235,235,230,.35)', 1);
      const vg = -20 * neg(t), ia = 8.2 * Ia(t), y2 = Y0 + 136;
      ink.text(g, '栅极电压', x, y2, { font: ink.sans(24), color: TXT2 });
      ink.text(g, (vg < -.05 ? '−' : '') + Math.abs(vg).toFixed(0) + ' V', x + w, y2 + 2, { font: ink.mono(32, 600), color: vg < -1 ? ink.warn : TXT, align: 'right' });
      ink.scope(g, x, y2 + 18, w, 80, u => .55 - 1.1 * neg(t - 4.5 * (1 - u)), { color: ink.warn, lw: 2.2 });
      const y3 = y2 + 160;
      ink.text(g, '阳极电流', x, y3, { font: ink.sans(24), color: TXT2 });
      ink.text(g, ia.toFixed(1) + ' mA', x + w, y3 + 2, { font: ink.mono(32, 600), color: ia > .5 ? ink.accent : TXT, align: 'right' });
      ink.scope(g, x, y3 + 18, w, 80, u => 1.1 * Ia(t - 4.5 * (1 - u)) - .55, { color: ink.accent, lw: 2.2 });
    } });

    /* ================= D1 · 累加器：十进制环形计数 → 每秒 5000 次加法 ================= */
    const cD = KIT.cam(30, .01, 40);
    const P = (x, y, z) => { const v = H(x, y, z); return [v.x, v.y, v.z]; };
    const pathD = camPath([
      [D1_T, P(.34, 1.19, .9), P(.235, 1.185, 0), 30],
      [D1_T + 2.6, P(.32, 1.2, .93), P(.228, 1.19, 0), 30],
      [D1_T + 4.8, P(.06, 1.46, 1.46), P(.16, 1.31, 0), 34],
      [33.2, P(-.04, 1.48, 1.32), P(.15, 1.33, 0), 34],
    ]);
    const D1 = ctx.shot({ name: '05.D1 计数', t0: D1_T, in: { type: 'cut' }, scene: room.scene, camera: cD,
      post: { exposure: 1.36, ao: { radius: .06, intensity: .9 }, dof: { focus: .6, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .3 },
      update(t) { applyCam(cD, pathD(t), t, .0008); room.update(t, roomState(t)); D1.post.dof.focus = cD.position.distanceTo(H(.15, 1.25, 0)); } });
    // 个位这一列：角框 + 一个标注（标注锚在列中间、文字框不随亮灯移动）
    const onesBox = () => new THREE.Box3().setFromPoints([room.lampW(9, 0), room.lampW(9, 9)]).expandByScalar(.016);
    ctx.bracket({ shot: D1, box: onesBox(), label: '', t0: D1_T + .3, t1: D1_T + 4.8 });
    ctx.callout({ shot: D1, at: room.lampW(9, 4.5).add(V(.02, 0, 0)), title: '累加器的一位', sub: '10 只灯轮流亮，记 0–9', t0: D1_T + .3, t1: D1_T + 4.8, side: 'right', dx: 150, dy: -60 });
    // 左上面板：标题就是速度；下面用两根条对比「算一条弹道」要多久（30 秒 ≈ 十几个小时的千分之一，条宽按比例、至少 4 px）
    draw2d({ t0: 28.8, t1: 33.0, draw(g, t) {
      const X0 = 80, Y0 = 120, W = 620, Hh = 330, x = X0 + 30, w = W - 60;
      panelBox(g, X0, Y0, W, Hh);
      const n = Math.round(5000 * easeOut(ss(28.9, 29.8, t)));
      g.font = ink.mono(50, 700); const nw = g.measureText(fmtThin(n)).width;
      ink.text(g, fmtThin(n), x, Y0 + 70, { font: ink.mono(50, 700), color: ink.accent });
      ink.text(g, '次加法 / 秒', x + Math.max(nw, 150) + 16, Y0 + 68, { font: ink.sans(28, 500), color: TXT });
      ink.line(g, [[x, Y0 + 98], [x + w, Y0 + 98]], 'rgba(235,235,230,.35)', 1);
      ink.text(g, '算一条炮弹弹道：', x, Y0 + 142, { font: ink.sans(24), color: TXT2 });
      const bar = (yy, frac, label, val, col) => {
        ink.text(g, label, x, yy, { font: ink.sans(24, 500), color: TXT }); ink.text(g, val, x + w, yy, { font: ink.sans(26, 600), color: col, align: 'right' });
        g.fillStyle = 'rgba(235,235,230,.12)'; g.fillRect(x, yy + 14, w, 18); g.fillStyle = col; g.fillRect(x, yy + 14, Math.max(4, w * frac), 18);
      };
      bar(Y0 + 196, ss(29.9, 31.8, t), '人工（手摇计算器）', '十几个小时', TXT);
      bar(Y0 + 270, ss(29.9, 30.05, t) / 1440, 'ENIAC', '约 30 秒', ink.accent);
    } });

    /* ================= D2 · 一只管子烧断 ================= */
    const cE = KIT.cam(32, .01, 40);
    // 机位对准那只会烧断的管子（画面中央、在焦内）并缓慢推近；它闪烁、闪光、熄灭，画面本身说明「坏了一只」，不再加标注
    const pathE = camPath([[33.0, P(.36, 1.955, .175), P(.11, 1.905, .028), 32], [36.1, P(.31, 1.94, .175), P(.125, 1.905, .028), 31]]);
    const D2 = ctx.shot({ name: '05.D2 故障', t0: 33.0, in: { type: 'cut' }, scene: room.scene, camera: cE,
      post: { exposure: 1.32, ao: { radius: .03, intensity: .8 }, dof: { focus: .26, aperture: .0016, maxBlur: 8 }, bloom: { strength: .14 }, grade: ctx.grade.warm, vignette: .32 },
      update(t) { applyCam(cE, pathE(t), t, .0006); room.update(t, roomState(t)); D2.post.dof.focus = cE.position.distanceTo(room.tubeW(...room.FAIL)); } });

    /* ================= D3 · 档案照片：更换真空管 ================= */
    const phD = await KIT.photoShot('assets/photos/act2/eniac_changing_tube.jpg', { from: { x: .25, y: -.1, s: 1.04 }, to: { x: -.1, y: -.25, s: 1.16 } });
    ctx.shot({ name: '05.D3 换管', t0: 35.3, in: { type: 'dissolve', dur: .8 }, scene: phD.scene, camera: phD.camera, post: ARCH, update(t, st) { phD.update(st / 4.8); } });
    draw2d({ t0: 35.5, t1: 39.8, fade: .4, draw(g) { scrim(g); } });
    ctx.lower({ t0: 35.5, t1: 39.8, name: '更换真空管', meta: 'ENIAC · 技术员格伦·贝克检修管子', credit: '照片：美国陆军（M. Weik《The ENIAC Story》）· 公有领域' });

    /* ================= E1 · 插线、拨开关（画面自明，不加标注） ================= */
    const cF = KIT.cam(30, .01, 40);
    const pathF = camPath([
      [39.4, P(.30, .78, .56), P(.0, .64, 0), 30],
      [40.9, P(.32, .79, .54), P(.02, .645, 0), 30],
      [41.35, P(.24, .9, .5), P(.0, .86, 0), 30],
      [42.7, P(.22, .92, .46), P(.0, .875, 0), 30],
    ]);
    const E1 = ctx.shot({ name: '05.E1 插线', t0: 39.4, in: { type: 'dissolve', dur: .7 }, scene: room.scene, camera: cF,
      post: { exposure: 1.7, ao: { radius: .04, intensity: .9 }, dof: { focus: .5, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .3 },
      update(t) { applyCam(cF, pathF(t), t, .0007); room.update(t, roomState(t)); E1.post.dof.focus = cF.position.distanceTo(t < 41.1 ? room.plugW(plugU(t)) : room.knobW(4)); } });

    /* ================= E2 · 档案照片：贝克与斯奈德编程 ================= */
    const phE = await KIT.photoShot('assets/photos/act2/eniac_beck_snyder.jpg', { from: { x: -.1, y: 0, s: 1.03 }, to: { x: .28, y: .06, s: 1.16 } });
    ctx.shot({ name: '05.E2 编程', t0: 41.9, in: { type: 'dissolve', dur: .8 }, scene: phE.scene, camera: phE.camera, post: ARCH, update(t, st) { phE.update(st / 4.1); } });
    draw2d({ t0: 41.7, t1: 46.0, fade: .4, draw(g) { scrim(g); } });
    ctx.lower({ t0: 41.7, t1: 46.0, name: 'ENIAC', meta: '约 1947–1955 · 格伦·贝克与贝蒂·斯奈德', credit: '照片：美国陆军 · 公有领域' });

    /* ================= 音效 ================= */
    ctx.cue(7.3, 'whoosh', 1.1, .25); ctx.cue(9.6, 'relay', .25); ctx.cue(11.1, 'relay', .2); ctx.cue(12.4, 'relay', .22);
    ctx.cue(13.8, 'swoosh', .35); ctx.cue(14.4, 'riser', 1.7, .25); ctx.cue(16.5, 'whoosh', .9, .35);
    for (const [a, b] of NEG) { ctx.cue(a, 'click', .55); ctx.cue(b, 'click', .45); }
    for (let k = 0; k <= 10; k++) ctx.cue(D1_T + k * .24, 'tick', .32);
    ctx.cue(D1_T + 2.8, 'riser', 1.2, .25); ctx.cue(29.9, 'blip', 880, .2);
    ctx.cue(33.9, 'glitch', .25); ctx.cue(FAIL_T, 'spark', .45);
    ctx.cue(39.62, 'clack', .55); ctx.cue(40.98, 'clack', .7); for (const k of KNOB_T) ctx.cue(k, 'click', .5);
  },
};
