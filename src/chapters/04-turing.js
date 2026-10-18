/* 04 · 纸带上的机器（1936）
   A1 匹配剪辑：接 03 结尾横穿画面、向右移动的摩尔斯纸带 → 纸带减速，方格与印刷数字浮现，变成图灵机的纸带
   A2 桌上的相片：图灵 16 岁的肖像（署名条）
   B1 「想象中的图灵机」现身：纸带 / 读写头 / 状态拨盘，右侧规则表；状态 A 向右找到末位（读到空格 → 左移、切换到 B）
   B2 二进制加一：B 状态读 1 写 0 左移进位、读 0 写 1 停机，1011 → 1100（11 + 1 = 12）
   C1 通用机器：拉远，纸带左段是编码后的「机器 A 的规则」、右段是数据，同一个读写头在两段之间往返
   C2 今天的计算机：纸带 → 内存、读写头 + 状态 → 处理器、写在纸带上的规则 → 程序
   D  只剩纸：机器隐去，灯光渐暗（04 → 05 经黑）。
   道具在 src/props/04/machine.js（单位：米）。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, easeOut, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildMachine, makeGlyphs, paperMaterial, X, P, TW, YT, DIAL_ANG, CELL0, CELL1 } from '../props/04/machine.js';

/* ---------- 机器 A：二进制加一 ----------
   A = 右行（找末位）、B = 进位、H = 停机；移动 +1 右 / −1 左 / 0 不动。'_' 表示空格。 */
const RULES = { A: { '0': ['0', 1, 'A'], '1': ['1', 1, 'A'], '_': ['_', -1, 'B'] }, B: { '1': ['0', -1, 'B'], '0': ['1', 0, 'H'], '_': ['1', 0, 'H'] } };
const ROWS = [['A', '0'], ['A', '1'], ['A', '_'], ['B', '1'], ['B', '0'], ['B', '_']];
const DATA = { 0: '1', 1: '0', 2: '1', 3: '1' };                       // 格 0..3：1011
// 每一步 [开始, 时长]：B1 里 A 状态快速右行（5 步），B2 里慢速进位（3 步）
const STEPS = [[9.0, .72], [9.72, .72], [10.44, .72], [11.16, .72], [11.88, 1.02], [13.3, 1.55], [14.85, 1.55], [16.4, 1.6]];
const SIM = []; let FINAL;
{
  let head = 0, st = 'A'; const tape = { ...DATA };
  for (const [s, d] of STEPS) {
    const read = tape[head] ?? '_', [write, mv, ns] = RULES[st][read];
    SIM.push({ s, d, head, st, read, write, mv, ns, row: ROWS.findIndex(r => r[0] === st && r[1] === read), before: { ...tape } });
    if (write === '_') delete tape[head]; else tape[head] = write;
    head += mv; st = ns;
  }
  FINAL = { head, st, tape: { ...tape } };
}
const HALT_T = STEPS[STEPS.length - 1][0] + STEPS[STEPS.length - 1][1];
/** B 段机器状态：读写头位置（格，可为小数）、笔压、表盘角度、各格符号、当前规则行 */
function runB(t) {
  let k = -1; for (let i = 0; i < SIM.length; i++) if (t >= SIM[i].s) k = i;
  if (k < 0) return { head: 0, press: 0, dial: DIAL_ANG.A, tape: DATA, stamp: null, row: -1, st: 'A', u: 0 };
  const S = SIM[k], u = clamp((t - S.s) / S.d), tape = { ...S.before };
  let stamp = null;
  if (u >= .33) { if (S.write === '_') delete tape[S.head]; else tape[S.head] = S.write; if (S.write !== S.read) stamp = { i: S.head, a: ss(.33, .4, u), k: 1 + .28 * (1 - ss(.33, .47, u)) }; }
  return {
    head: S.head + S.mv * easeIO(clamp((u - .5) / .35)), press: ss(.2, .3, u) * (1 - ss(.4, .5, u)),
    dial: lerp(DIAL_ANG[S.st], DIAL_ANG[S.ns], easeIO(clamp((u - .62) / .33))), tape, stamp, row: S.row, st: u > .8 ? S.ns : S.st, u, step: k,
  };
}

/* ---------- 通用机器：规则编码在纸带上 ----------
   每条规则 5 个符号（状态、读到、写入、移动、新状态；N = 不动），规则之间空一格。占格 −40 … −6。 */
const ENC = ROWS.map(([s, r]) => { const [w, mv, ns] = RULES[s][r]; return [s, r, w, mv > 0 ? 'R' : mv < 0 ? 'L' : 'N', ns]; });
const G0 = CELL0, groupCell = g => G0 + g * 6 + 2;                      // 第 g 条规则的中间一格
const RULE_TAPE = {}; ENC.forEach((sy, g) => sy.forEach((c, j) => { RULE_TAPE[G0 + g * 6 + j] = c; }));
// 读写头往返：[时刻, 格]；读规则时停在规则组上，写数据时停在数据格上
const UK = [[20.4, 3], [21.1, groupCell(3)], [21.4, groupCell(3)], [22.1, 3], [22.4, 3], [23.1, groupCell(3)], [23.4, groupCell(3)], [24.1, 2], [24.4, 2], [25.0, groupCell(4)], [25.3, groupCell(4)], [25.9, 1]];
const UW = [[22.1, 3, '0'], [24.1, 2, '0'], [25.9, 1, '1']];          // 写入：时刻、格、符号
const UR = [[21.1, 21.4, 3], [23.1, 23.4, 3], [25.0, 25.3, 4]];          // 读规则：起止、规则组
function runU(t) {
  let head = UK[0][1];
  for (let i = 0; i < UK.length - 1; i++) { const [a, ca] = UK[i], [b, cb] = UK[i + 1]; if (t >= a) head = t >= b ? cb : lerp(ca, cb, easeIO((t - a) / (b - a))); }
  const tape = { ...RULE_TAPE, ...DATA }; let press = 0, stamp = null;
  for (const [w, i, s] of UW) { if (t >= w + .1) tape[i] = s; const p = ss(w, w + .08, t) * (1 - ss(w + .2, w + .3, t)); if (p > press) press = p; if (t >= w + .1 && t < w + .3) stamp = { i, a: ss(w + .1, w + .16, t), k: 1 + .28 * (1 - ss(w + .1, w + .24, t)) }; }
  const g = UR.find(([a, b]) => t >= a - .05 && t <= b + .05);
  return { head, press, tape, stamp, group: g ? g[2] : -1, done: t >= UW[UW.length - 1][0] + .3 };
}

export default {
  id: '04', status: 'implemented', slug: 'turing', title: '纸带上的机器', dur: 36,
  card: {"act": "第二部", "actName": "计算", "title": "纸带上的机器", "short": "纸带上的机器", "meta": "1936 · 剑桥", "t0": 0.8, "dur": 3.2},   // 章节卡晚 0.6 s：等纸带下移后再出现，白字不压在亮纸上
  stamps: [[0, "1936"]],
  caps: [[0.4, 6.0, "1936 年，年仅 23 岁的英国数学家图灵，构想出一台极简的机器。"], [6.4, 12.6, "一条无限长的纸带，一个读写头，一张规则表：按当前状态和读到的符号，改写一格、移动一格、切换状态。"], [13.0, 19.6, "比如给二进制数加一：从末位开始，遇到 1 写 0、向左进位；遇到 0 写 1，就此停下。"], [20.0, 26.2, "图灵进一步证明：把另一台机器的规则也写到纸带上，一台「通用机器」就能模仿它。"], [26.6, 32.2, "图灵认为：凡是能一步步算出来的问题，都能这样算。今天的每一台计算机，本质上都是这样的通用机器。"], [32.6, 35.8, "但在当时，它只存在于纸上。"]],
  credits: ['assets/photos/act2/turing_age16_portrait.jpg', 'assets/tex/acg_paper006_aged_paper', 'assets/tex/dark_wood', 'assets/hdri/vintage_measuring_lab_2k.hdr'],
  async build(ctx) {
    const { KIT, A } = ctx;

    /* ================= 场景：暖光书桌 + 想象中的图灵机 ================= */
    const sc = new THREE.Scene();
    await KIT.hdri(sc, KIT.hdriFile('vintage_measuring_lab'), { intensity: .4, rotation: 2.6, background: true, bgBlur: .7, bgIntensity: .035 });
    const deskMat = await KIT.pbr('dark_wood', { repeat: 3 }); deskMat.color.setRGB(.9, .78, .68);
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.6), deskMat); desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; sc.add(desk);
    const lamp = new THREE.SpotLight(0xffe0b8, 75, 0, .62, .75, 2); lamp.position.set(-1.3, 1.5, .45);   // 偏侧面：镜面高光不直冲镜头 lamp.target.position.set(.15, .08, 0);
    lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -.0001; lamp.shadow.normalBias = .002; lamp.shadow.radius = 5; lamp.shadow.camera.near = .4; lamp.shadow.camera.far = 5;
    sc.add(lamp, lamp.target);
    const rim = new THREE.SpotLight(0xdfe8ff, 22, 0, .7, .8, 2); rim.position.set(1.3, 1.7, -1.1);   // 抬高：水平黄铜面上的反光不正对镜头 rim.target.position.set(.2, .1, 0); sc.add(rim, rim.target);
    const fill = new THREE.PointLight(0xffd2a8, .25, 0, 2); fill.position.set(.9, .45, 1.2); sc.add(fill);
    const glyphs = makeGlyphs(KIT), paper = await paperMaterial(KIT);
    const M = await buildMachine(KIT, { glyphs, paper }); sc.add(M.root);
    const tape = M.tape, others = M.root.children.filter(o => o !== tape.group);
    // 桌上的相片：图灵 16 岁（约 1928 年）
    const photoTex = await A.tex('assets/photos/act2/turing_age16_portrait.jpg', { aniso: 16 });
    const print = KIT.photoPrint(photoTex, { width: .15, border: .008, curl: .002 });
    print.rotation.set(-Math.PI / 2, 0, .09); print.position.set(-.3, .0012, .42); sc.add(print);
    const LAMP_K = lamp.intensity, ENV_K = sc.environmentIntensity;

    /* 每个镜头开头调用：设好纸带内容、读写头、表盘与可见性（共享场景，各镜头自己负责全部状态） */
    const setTape = (sym, { grid = 1, border = 1, morse = 0, stamp = null } = {}) => {
      for (let i = CELL0; i <= CELL1; i++) {
        const s = sym[i], st = stamp && stamp.i === i ? stamp : null;
        tape.set(i, s && s !== ' ' ? s : null, st ? st.a : 1, st ? st.k : 1);
        tape.grid(i, typeof grid === 'function' ? grid(i) : grid);
      }
      tape.border(border); if (tape.morse) { tape.morse.visible = morse > .003; tape.morse.material.opacity = morse; }
    };
    const setMachine = ({ head = 0, press = 0, dial = DIAL_ANG.A, show = true, light = 1 }) => {
      M.setHead(head, press); M.setDial(dial);
      const c = Math.round(head); M.setWindow(Math.abs(head - c) < .2 ? curTape[c] ?? '_' : '_');   // 小窗显示读写头正下方的符号（移动途中显示空白）
      for (const o of others) o.visible = show; tape.group.position.y = show ? 0 : TY0 - YT;
      lamp.intensity = LAMP_K * light; rim.intensity = 22 * light; fill.intensity = .25 * light; sc.environmentIntensity = ENV_K * light;
    };
    let curTape = {};
    const machineB = t => { const r = runB(t); curTape = r.tape; setTape(r.tape, { stamp: r.stamp }); setMachine({ head: r.head, press: r.press, dial: r.dial }); return r; };
    const machineU = t => { const r = runU(t); curTape = r.tape; setTape(r.tape, { stamp: r.stamp }); setMachine({ head: r.head, press: r.press, dial: r.done ? DIAL_ANG.H : DIAL_ANG.B }); return r; };
    const TY0 = .0006;                                                     // 机器隐去时纸带平放在桌面上的高度
    const tapeBox = (c0, c1) => new THREE.Box3(V(X(c0) - P / 2, YT, -TW / 2), V(X(c1) + P / 2, YT + .002, TW / 2));

    /* ================= A1 · 匹配剪辑：纸带减速，方格与数字浮现 ================= */
    // 03 结尾：纸带横穿画面中心、以约 0.46 画面高 / 秒向右移动、宽约占画面高度 12%。这里相机高 0.54 m（视高 0.29 m）、向 −x 平移，纸带在画面上向右走。
    const PARK = CELL0;                                                   // A 段读写头停在纸带最左端（画面外）
    const camA = KIT.cam(30, .02, 20); camA.up.set(0, 0, -1);
    const XE = X(1.5), V0 = .134, TA = 2.4;
    const camXA = t => XE + V0 * Math.pow(Math.max(0, TA - t), 2) / (2 * TA);
    const SWEEP = (i, t) => ss(.55 + (X(i) - .2) * 1.6, .95 + (X(i) - .2) * 1.6, t);
    const A1 = ctx.shot({ name: '04.A1 纸带', t0: 0, in: { type: 'dissolve', dur: 1.0 }, scene: sc, camera: camA,
      post: { exposure: 1.02, ao: true, dof: { focus: .54, aperture: .01, maxBlur: 12 }, grade: ctx.grade.warm, vignette: .3, grain: .03 },
      update(t) {
        const sym = {}; [0, 1, 2, 3].forEach(i => { if (t >= 1.5 + i * .25) sym[i] = DATA[i]; });
        const k = [0, 1, 2, 3].map(i => clamp((t - 1.5 - i * .25) / .14)); const cur = k.findIndex(x => x > 0 && x < 1);
        curTape = sym; setTape(sym, { grid: i => SWEEP(i, t), border: ss(.4, 1.3, t), morse: 1 - ss(.9, 2.2, t), stamp: cur >= 0 ? { i: cur, a: ss(0, .5, k[cur]), k: 1 + .3 * (1 - k[cur]) } : null });
        setMachine({ head: PARK, show: false });
        // 溶解过程中相机就开始下移，让纸带落到画面下部，给左侧章节卡留出干净的背景
        const z = -.064 * easeIO(clamp((t - .3) / 1.3)), h = .539 - .05 * easeIO(clamp((t - 1) / 2.4));
        camA.position.set(camXA(t), TY0 + h, z); camA.lookAt(camXA(t), TY0, z);
        A1.post.dof.focus = h;
      } });

    /* ================= A2 · 桌上的相片：图灵 16 岁 ================= */
    const camA2 = KIT.cam(30, .02, 20);
    const pA2 = camPath([[3.0, [-.35, .36, .66], [-.38, .0, .4], 30], [6.7, [-.34, .32, .63], [-.38, .0, .405], 29]]);
    const A2 = ctx.shot({ name: '04.A2 相片', t0: 3.0, in: { type: 'dissolve', dur: .8 }, scene: sc, camera: camA2,
      post: { exposure: 1.08, ao: true, dof: { focus: .4, aperture: .012, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .34, grain: .035 },
      update(t) { curTape = DATA; setTape(DATA); setMachine({ head: PARK, show: false }); applyCam(camA2, pA2(t), t, .0006); A2.post.dof.focus = camA2.position.distanceTo(print.position); } });
    ctx.lower({ t0: 3.6, t1: 6.5, name: '艾伦·图灵', meta: '约 1928 年 · 16 岁', credit: '照片：可能为 Arthur Reginald Chaffin 摄 · 公有领域' });

    /* ================= B1 · 机器现身 + 规则表；A 状态右行找末位 ================= */
    const camB1 = KIT.cam(30, .02, 20);
    const pB1 = camPath([[6.4, [.5, .16, .2], [.47, .075, 0], 30], [8.8, [.1, .46, .9], [.38, .1, 0], 30], [13.2, [.04, .44, .86], [.4, .1, 0], 29]]);
    const B1 = ctx.shot({ name: '04.B1 机器', t0: 6.4, in: { type: 'dissolve', dur: .7 }, scene: sc, camera: camB1,
      post: { exposure: 1.05, ao: true, dof: { focus: .9, aperture: .006, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .3 },
      update(t) { const r = machineB(t); applyCam(camB1, pB1(t), t, .0005); B1.post.dof.focus = camB1.position.distanceTo(V(X(r.head), .12, 0)); } });
    ctx.callout({ shot: B1, at: V(X(-5), YT, .006), title: '纸带', sub: '无限长 · 一格写一个符号', t0: 7.1, t1: 9.3, side: 'left', dx: -90, dy: 110 });
    ctx.callout({ shot: B1, at: t => V(X(runB(t).head), YT + .07, .062), title: '读写头', sub: '一次只看一格', t0: 7.9, t1: 10.2, side: 'left', dx: -150, dy: -170 });
    ctx.callout({ shot: B1, at: t => V(X(runB(t).head), YT + .19, -.04), title: '状态', sub: 'A 右行 · B 进位 · H 停机', t0: 10.3, t1: 12.9, side: 'left', dx: -130, dy: -90 });

    /* ================= B2 · 二进制加一：进位 ================= */
    const camB2 = KIT.cam(28, .02, 20);
    const B2 = ctx.shot({ name: '04.B2 进位', t0: 13.0, in: { type: 'cut' }, scene: sc, camera: camB2,
      post: { exposure: 1.06, ao: true, dof: { focus: .5, aperture: .008, maxBlur: 12 }, grade: ctx.grade.warm, vignette: .32 },
      update(t) {
        const r = machineB(t), hx = X(lerp(3, 1, ss(13.2, 18.2, t)));
        applyCam(camB2, { p: V(hx + .17, YT + .13, .38), l: V(hx + .035, YT + .028, 0), fov: 28 }, t, .0005);
        B2.post.dof.focus = camB2.position.distanceTo(V(X(r.head), YT + .03, .03));
      } });
    ctx.bracket({ shot: B2, box: tapeBox(0, 3), label: '1011 + 1 = 1100', t0: 18.2, t1: 19.9, style: 'accent' });

    // 右侧规则表（B1 / B2 共用）：高亮正在执行的规则
    const SYM = s => s === '_' ? '空' : s, MOV = m => m > 0 ? '→' : m < 0 ? '←' : '·';
    const ruleTable = (g, t) => {
      const r = runB(t), x = 1388, y = 214, w = 448, rh = 52, cols = [8, 98, 188, 278, 368];
      const h = 112 + ROWS.length * rh + 120;
      g.fillStyle = 'rgba(9,9,10,.76)'; g.fillRect(x - 24, y - 40, w + 48, h); ink.corners(g, x - 24, y - 40, w + 48, h, 14, ink.dim);
      ink.text(g, '规则表 · RULE TABLE', x, y - 8, { font: ink.mono(14), color: ink.dim });
      ['状态', '读到', '写入', '移动', '新状态'].forEach((s, i) => ink.text(g, s, x + cols[i], y + 32, { font: ink.sans(17), color: ink.dim }));
      ink.line(g, [[x, y + 46], [x + w, y + 46]], ink.faint, 1);
      const active = t >= STEPS[0][0] && t < HALT_T + .2 ? r.row : t >= HALT_T + .2 ? 4 : -1;
      ROWS.forEach(([s, rd], i) => {
        const a = ss(9.6 + i * .1, 9.9 + i * .1, t); if (a <= 0) return;
        const yy = y + 60 + i * rh, on = i === active, [w2, mv, ns] = RULES[s][rd];
        g.save(); g.globalAlpha *= a;
        if (on) { g.fillStyle = 'rgba(255,122,48,.17)'; g.fillRect(x - 10, yy, w + 20, rh - 6); g.fillStyle = ink.accent; g.fillRect(x - 10, yy, 3, rh - 6); }
        const col = on ? ink.accent : ink.white;
        [s, SYM(rd), SYM(w2), MOV(mv), ns].forEach((v, j) => ink.text(g, v, x + cols[j] + (j === 3 ? 6 : 0), yy + 34, { font: v === '空' ? ink.sans(22, 500) : ink.mono(26, 600), color: j === 4 && v === 'H' && !on ? ink.warn : col }));
        g.restore();
      });
      const fy = y + 60 + ROWS.length * rh + 24; ink.line(g, [[x, fy - 14], [x + w, fy - 14]], ink.faint, 1);
      const halted = t >= HALT_T - .3;
      ink.text(g, '当前状态', x, fy + 18, { font: ink.sans(17), color: ink.dim });
      ink.text(g, halted ? 'H · 停机' : r.st === 'A' ? 'A · 右行' : 'B · 进位', x + 98, fy + 20, { font: ink.mono(24, 600), color: halted ? ink.warn : ink.white });
      if (t >= HALT_T) { const a = ss(HALT_T, HALT_T + .4, t); g.save(); g.globalAlpha *= a; ink.text(g, '1011（11）+ 1 = 1100（12）', x, fy + 64, { font: ink.mono(22, 600), color: ink.accent }); g.restore(); }
      else ink.text(g, 'A 右行找末位 · B 进位 · H 停机', x, fy + 62, { font: ink.mono(15), color: ink.dim });
    };
    ctx.draw2d({ t0: 9.5, t1: 19.9, draw: ruleTable });

    /* ================= C1 · 通用机器：规则也写在纸带上 ================= */
    const camC1 = KIT.cam(30, .02, 30);
    const pC1 = camPath([[19.6, [-.08, 1.5, 1.12], [-.11, .04, -.02], 28], [26.6, [-.12, 1.36, 1.02], [-.12, .05, -.02], 28]]);
    const C1 = ctx.shot({ name: '04.C1 通用机器', t0: 20.0, in: { type: 'dissolve', dur: .8 }, scene: sc, camera: camC1,
      post: { exposure: 1.06, ao: true, dof: { focus: 1.8, aperture: .004, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .32 },
      update(t) { machineU(t); applyCam(camC1, pC1(t), t, .0006); C1.post.dof.focus = camC1.position.distanceTo(V(-.14, .05, 0)); } });
    ctx.bracket({ shot: C1, box: tapeBox(G0, G0 + 34), label: 'RULES · 6 × 5', t0: 20.6, t1: 26.3 });
    ctx.bracket({ shot: C1, box: tapeBox(0, 3), label: 'DATA', t0: 21.0, t1: 26.3, style: 'accent' });
    ctx.callout({ shot: C1, at: V(X(G0 + 17), YT, -.02), title: '机器 A 的规则', sub: '编码成符号，写在纸带上', t0: 20.7, t1: 26.3, side: 'left', dx: -60, dy: -170 });
    ctx.callout({ shot: C1, at: V(X(1.5), YT, -.02), title: '数据', sub: '1011 → 1100', t0: 21.2, t1: 26.3, side: 'right', dx: 90, dy: -170, style: 'accent' });
    for (const [a, b, g] of UR) ctx.bracket({ shot: C1, box: tapeBox(groupCell(g) - 2, groupCell(g) + 2), label: '', t0: a - .05, t1: b + .3, style: 'accent', fade: .1 });
    ctx.readout({ x: 1810, y: 96, align: 'right', t0: 20.5, t1: 26.3, html: t => { const r = runU(t); return r.group >= 0 ? `<span class="k">读取规则</span> ${ENC[r.group].join(' ')}` : r.done ? '<span class="k">数据</span> 1100 <span class="k">· 停机</span>' : '<span class="k">通用机器 · 往返于规则与数据之间</span>'; } });

    /* ================= C2 · 今天的计算机 ================= */
    const camC2 = KIT.cam(30, .02, 20);
    const pC2 = camPath([[26.2, [1.0, .27, .56], [.6, .12, -.05], 30], [33.0, [.92, .25, .48], [.6, .12, -.05], 29]]);
    const C2 = ctx.shot({ name: '04.C2 今天', t0: 26.4, in: { type: 'dissolve', dur: .7 }, scene: sc, camera: camC2,
      post: { exposure: 1.05, ao: true, dof: { focus: .6, aperture: .008, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .32 },
      update(t) { machineU(t); applyCam(camC2, pC2(t), t, .0005); C2.post.dof.focus = camC2.position.distanceTo(V(X(1), .13, 0)); } });
    const MAP = [['纸带', '内存', '存放数据'], ['读写头 + 状态', '处理器', '一步一步执行'], ['写在纸带上的规则', '程序', '也存放在内存里']];
    ctx.draw2d({ t0: 27.0, t1: 32.3, draw(g, t) {
      const x = 1180, y = 300, w = 640;
      g.fillStyle = 'rgba(9,9,10,.72)'; g.fillRect(x - 28, y - 64, w + 56, 330); ink.corners(g, x - 28, y - 64, w + 56, 330, 14, ink.dim);
      ink.text(g, '通用图灵机 → 今天的计算机', x, y - 26, { font: ink.mono(15), color: ink.dim });
      MAP.forEach(([a, b, c], i) => {
        const t0 = 27.3 + i * .55, e = easeOut(ss(t0, t0 + .5, t)); if (e <= 0) return;
        const yy = y + 30 + i * 84; g.save(); g.globalAlpha *= ss(t0, t0 + .25, t);
        ink.text(g, a, x, yy, { font: ink.sans(26, 500) });
        const ax = x + 270, bx = x + 270 + 90 * e; ink.line(g, [[ax, yy - 9], [bx, yy - 9]], ink.accent, 1.6);
        if (e > .95) { ink.line(g, [[bx - 9, yy - 15], [bx, yy - 9], [bx - 9, yy - 3]], ink.accent, 1.6); }
        g.globalAlpha *= ss(t0 + .3, t0 + .6, t);
        ink.text(g, b, x + 384, yy, { font: ink.sans(30, 700), color: ink.white });
        ink.text(g, c, x + 384, yy + 28, { font: ink.sans(16), color: ink.dim });
        g.restore();
      });
      g.save(); g.globalAlpha *= ss(29.4, 29.9, t); ink.text(g, '丘奇—图灵论题：能一步步算出来的，图灵机都能算', x, y + 262, { font: ink.sans(17), color: ink.dim }); g.restore();
    } });

    /* ================= D · 只在纸上：机器隐去，灯光渐暗 ================= */
    const camD = KIT.cam(30, .02, 20); camD.up.set(0, 0, -1);
    const D = ctx.shot({ name: '04.D 纸上', t0: 32.4, in: { type: 'dissolve', dur: 1.0 }, scene: sc, camera: camD,
      post: { exposure: 1, dof: { focus: .5, aperture: .008, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .38, grain: .035 },
      update(t) {
        const tp = { ...RULE_TAPE, ...FINAL.tape }; curTape = tp; setTape(tp);
        const dim = 1 - .92 * ss(33.4, 35.9, t);
        setMachine({ head: 1, show: false, light: dim }); D.post.exposure = .32 + .68 * dim;
        const cx = X(-2.2) + .012 * (t - 32.4), h = .5 - .012 * (t - 32.4);
        camD.position.set(cx, h, .02); camD.lookAt(cx, 0, .02); D.post.dof.focus = h;
      } });
    ctx.readout({ x: 960, y: 150, align: 'center', t0: 33.0, t1: 35.9, html: '<span class="k">A. M. TURING · 1936</span><br>ON COMPUTABLE NUMBERS, WITH AN APPLICATION TO THE ENTSCHEIDUNGSPROBLEM<br><span class="k">《论可计算数及其在判定问题上的应用》</span>' });

    /* ================= 音效 ================= */
    ctx.cue(.6, 'riser', 1.4, .08); for (let i = 0; i < 4; i++) ctx.cue(1.5 + i * .25, 'tap', .7);
    ctx.cue(3.0, 'swoosh', .25); ctx.cue(6.4, 'whoosh', 1.4, .2);
    for (const S of SIM) {
      ctx.cue(S.s + .1 * S.d, 'tick', .5); ctx.cue(S.s + .3 * S.d, 'clack', .45);
      if (S.mv) ctx.cue(S.s + .52 * S.d, 'relay', .3);
      if (S.ns !== S.st) ctx.cue(S.s + .7 * S.d, 'click', .5);
    }
    ctx.cue(HALT_T, 'ding', .7);
    ctx.cue(20.0, 'whoosh', 1.0, .22);
    for (let i = 0; i < UK.length - 1; i++) if (UK[i][1] !== UK[i + 1][1]) ctx.cue(UK[i][0] + .05, 'swoosh', .12);
    for (const [a] of UR) ctx.cue(a + .05, 'tick', .5);
    for (const [w] of UW) ctx.cue(w, 'clack', .5);
    ctx.cue(26.4, 'sub', .25); for (let i = 0; i < 3; i++) ctx.cue(27.3 + i * .55, 'blip', 880 + i * 220, .07);
    ctx.cue(32.6, 'sub', .3);
  },
};
