/* 04 · 纸带上的机器（1936）
   A1 匹配剪辑：接 03 结尾横穿画面、向右移动的摩尔斯纸带 → 纸带减速，方格与印刷数字浮现，变成图灵机的纸带
   A2 桌上的相片：图灵 16 岁的肖像（署名条）
   B1 「想象中的图灵机」现身：纸带 / 读写头 / 状态拨盘，右侧规则表；状态 A 向右找到末位（读到空格 → 左移、切换到 B）
   B2 二进制加一：B 状态读 1 写 0 左移进位、读 0 写 1 停机，1011 → 1100（11 + 1 = 12）
   C1 通用机器：拉远，纸带左段是编码后的「机器 A 的规则」、右段是数据，同一个读写头在两段之间往返
   C2 今天的计算机：纸带 → 内存、读写头 + 状态 → 处理器、写在纸带上的规则 → 程序
   D  只剩纸：机器隐去，灯光渐暗（04 → 05 经黑）。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」。
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
// 每一步 [开始, 时长]：B1 里 A 状态快速右行（5 步），B2 里慢速进位（3 步）。最后一步在 16.5 s 写下「1」，结果在面板上停留到 B2 结束
const STEPS = [[9.0, .72], [9.72, .72], [10.44, .72], [11.16, .72], [11.88, 1.02], [13.2, 1.4], [14.6, 1.4], [16.0, 1.5]];
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
const DONE_T = STEPS[STEPS.length - 1][0] + .34 * STEPS[STEPS.length - 1][1];   // 最后一格写完（纸带上已是 1100）
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, 'rgba(235,235,230,.2)', 1); };
/** 署名条（左下）后面的柔和暗底：画在 2D 层（在署名条文字之下） */
const scrim = (g, a = .55) => { g.save(); g.translate(520, 792); g.scale(1, .27); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 600); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.62, `rgba(0,0,0,${a * .75})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-620, -620, 1240, 1240); g.restore(); };
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
      post: { exposure: 1.08, ao: true, dof: { focus: .54, aperture: .004, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .3, grain: .03 },
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
    const pA2 = camPath([[3.0, [-.35, .36, .66], [-.38, .0, .4], 30], [7.5, [-.34, .315, .625], [-.38, .0, .405], 29]]);
    const A2 = ctx.shot({ name: '04.A2 相片', t0: 3.0, in: { type: 'dissolve', dur: .8 }, scene: sc, camera: camA2,
      post: { exposure: 1.16, ao: true, dof: { focus: .4, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .3, grain: .035 },
      update(t) { curTape = DATA; setTape(DATA); setMachine({ head: PARK, show: false }); applyCam(camA2, pA2(t), t, .0006); A2.post.dof.focus = camA2.position.distanceTo(print.position); } });
    // 署名条：完整停留 3.5 s（3.7–7.2），B1 溶入时淡出
    ctx.draw2d({ t0: 3.3, t1: 7.6, fade: .4, draw(g) { scrim(g); } });
    ctx.lower({ t0: 3.3, t1: 7.6, name: '艾伦·图灵', meta: '约 1928 年 · 16 岁', credit: '照片：可能为 Arthur Reginald Chaffin 摄 · 公有领域' });

    /* ================= B1 · 机器现身 + 规则表；A 状态右行找末位 ================= */
    const camB1 = KIT.cam(30, .02, 20);
    const pB1 = camPath([[6.7, [.5, .16, .2], [.47, .075, 0], 30], [9.0, [.1, .46, .9], [.38, .1, 0], 30], [13.2, [.04, .44, .86], [.4, .1, 0], 29]]);
    const B1 = ctx.shot({ name: '04.B1 机器', t0: 6.7, in: { type: 'dissolve', dur: .8 }, scene: sc, camera: camB1,
      post: { exposure: 1.15, ao: true, dof: { focus: .9, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .28 },
      update(t) { const r = machineB(t); applyCam(camB1, pB1(t), t, .0005); B1.post.dof.focus = camB1.position.distanceTo(V(X(r.head), .12, 0)); } });
    // 两个部件各一个标注（规则表见右侧面板）；状态并入读写头的标注：表盘就装在读写头上
    ctx.callout({ shot: B1, at: V(X(-6), YT, .006), title: '纸带', sub: '一格写一个符号', t0: 7.4, t1: 11.9, side: 'left', dx: -110, dy: 120 });
    ctx.callout({ shot: B1, at: t => V(X(runB(t).head), YT + .07, .062), title: '读写头', sub: '表盘显示当前状态', t0: 8.2, t1: 12.7, side: 'left', dx: -150, dy: -170 });

    /* ================= B2 · 二进制加一：进位 ================= */
    const camB2 = KIT.cam(28, .02, 20);
    const B2 = ctx.shot({ name: '04.B2 进位', t0: 13.0, in: { type: 'cut' }, scene: sc, camera: camB2,
      post: { exposure: 1.16, ao: true, dof: { focus: .5, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .28 },
      update(t) {
        // 机位略高、看得到纸带上的 4 个数字格（读写头左移时一路跟随）
        const r = machineB(t), hx = X(lerp(3, 1.4, ss(13.2, 17.2, t)));
        applyCam(camB2, { p: V(hx + .14, YT + .21, .34), l: V(hx + .03, YT + .015, 0), fov: 28 }, t, .0005);
        B2.post.dof.focus = camB2.position.distanceTo(V(X(r.head), YT + .02, .02));
      } });
    // 结果：框出纸带上的 4 个数字（无文字，结果写在规则表面板里）
    ctx.bracket({ shot: B2, box: tapeBox(0, 3), label: '', t0: DONE_T, t1: 20.6, style: 'accent' });

    // 右侧规则表（B1 / B2 共用）：高亮正在执行的规则
    const SYM = s => s === '_' ? '空' : s, MOV = m => m > 0 ? '→' : m < 0 ? '←' : '·';
    // 面板（右侧，避开字幕区）：标题 28 px、表头 21 px、表内符号 32 px、底部「当前状态」与算式
    const ruleTable = (g, t) => {
      const r = runB(t), X0 = 1340, Y0 = 136, W = 530, H = 640, x = X0 + 30, rh = 56, cols = [10, 104, 198, 292, 386];
      panelBox(g, X0, Y0, W, H);
      ink.text(g, '规则表：读到什么，就做什么', x, Y0 + 50, { font: ink.sans(28, 500), color: TXT });
      ['状态', '读到', '写入', '移动', '新状态'].forEach((s, i) => ink.text(g, s, x + cols[i], Y0 + 98, { font: ink.sans(21), color: TXT2 }));
      ink.line(g, [[x, Y0 + 114], [X0 + W - 30, Y0 + 114]], 'rgba(235,235,230,.35)', 1);
      const active = t >= STEPS[0][0] && t < HALT_T + .2 ? r.row : t >= HALT_T + .2 ? 4 : -1;
      ROWS.forEach(([s, rd], i) => {
        const a = ss(9.6 + i * .1, 9.9 + i * .1, t); if (a <= 0) return;
        const yy = Y0 + 124 + i * rh, on = i === active, [w2, mv, ns] = RULES[s][rd];
        g.save(); g.globalAlpha *= a;
        if (on) { g.fillStyle = 'rgba(255,122,48,.22)'; g.fillRect(x - 12, yy, W - 36, rh - 6); g.fillStyle = ink.accent; g.fillRect(x - 12, yy, 4, rh - 6); }
        const col = on ? ink.accent : TXT;
        [s, SYM(rd), SYM(w2), MOV(mv), ns].forEach((v, j) => ink.text(g, v, x + cols[j] + (j === 3 ? 6 : 0), yy + 38, { font: v === '空' ? ink.sans(26, 500) : ink.mono(32, 600), color: j === 4 && v === 'H' && !on ? ink.warn : col }));
        g.restore();
      });
      const fy = Y0 + 124 + ROWS.length * rh + 14; ink.line(g, [[x, fy], [X0 + W - 30, fy]], 'rgba(235,235,230,.35)', 1);
      const halted = t >= HALT_T - .3;
      ink.text(g, '当前状态', x, fy + 44, { font: ink.sans(22), color: TXT2 });
      ink.text(g, halted ? 'H · 停机' : r.st === 'A' ? 'A · 向右找末位' : 'B · 向左进位', x + 108, fy + 45, { font: ink.sans(28, 500), color: halted ? ink.warn : TXT });
      // 算式：先是「？」，最后一格写完后换成结果
      const done = t >= DONE_T, k = done ? ss(DONE_T, DONE_T + .3, t) : 1;
      g.save(); g.globalAlpha *= k;
      ink.text(g, done ? '1011 + 1 = 1100' : '1011 + 1 = ?', x, fy + 100, { font: ink.mono(34, 600), color: done ? ink.accent : TXT });
      if (done) ink.text(g, '即 11 + 1 = 12', X0 + W - 30, fy + 98, { font: ink.sans(22), color: TXT2, align: 'right' });
      g.restore();
    };
    ctx.draw2d({ t0: 9.6, t1: 20.7, draw: ruleTable });

    /* ================= C1 · 通用机器：规则也写在纸带上 ================= */
    const camC1 = KIT.cam(30, .02, 30);
    // 机位比原来低、近：纸带上的规则符号和数据格看得清；读写头在规则与数据之间往返都在画面内
    const pC1 = camPath([[19.6, [.04, 1.26, .98], [-.02, .04, -.02], 28], [26.6, [.13, 1.13, .88], [.08, .045, -.02], 28]]);
    const C1 = ctx.shot({ name: '04.C1 通用机器', t0: 20.0, in: { type: 'dissolve', dur: .8 }, scene: sc, camera: camC1,
      post: { exposure: 1.16, ao: true, dof: { focus: 1.5, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .28 },
      update(t) { machineU(t); applyCam(camC1, pC1(t), t, .0006); C1.post.dof.focus = camC1.position.distanceTo(V(.04, .05, 0)); } });
    ctx.callout({ shot: C1, at: V(X(-26), YT, -.004), title: '机器 A 的规则', sub: '编成符号，写在纸带上', t0: 20.7, t1: 26.4, side: 'left', dx: 40, dy: -190 });
    ctx.callout({ shot: C1, at: V(X(1.5), YT, -.004), title: '要算的数据', sub: '1011 → 1100', t0: 21.5, t1: 26.4, side: 'left', dx: 60, dy: -190, style: 'accent' });
    // 读写头读规则时，橙色角框闪一下（无文字）
    for (const [a, b, g] of UR) ctx.bracket({ shot: C1, box: tapeBox(groupCell(g) - 2, groupCell(g) + 2), label: '', t0: a - .05, t1: b + .3, style: 'accent', fade: .1 });
    ctx.draw2d({ shot: C1, t0: 22.3, t1: 26.4, draw(g) {
      const s = '同一个读写头：先读规则，再改数据'; g.font = ink.sans(28, 500); const w = g.measureText(s).width + 60;
      panelBox(g, 960 - w / 2, 92, w, 64); ink.text(g, s, 960, 135, { font: ink.sans(28, 500), color: TXT, align: 'center' });
    } });

    /* ================= C2 · 今天的计算机 ================= */
    const camC2 = KIT.cam(30, .02, 20);
    const pC2 = camPath([[26.2, [1.0, .27, .56], [.6, .12, -.05], 30], [33.0, [.92, .25, .48], [.6, .12, -.05], 29]]);
    const C2 = ctx.shot({ name: '04.C2 今天', t0: 26.4, in: { type: 'dissolve', dur: .7 }, scene: sc, camera: camC2,
      post: { exposure: 1.15, ao: true, dof: { focus: .6, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .28 },
      update(t) { machineU(t); applyCam(camC2, pC2(t), t, .0005); C2.post.dof.focus = camC2.position.distanceTo(V(X(1), .13, 0)); } });
    // 右侧对照面板：三行在 0.4 s 内依次出现，最后一行完整停留约 3.7 s
    const MAP = [['纸带', '内存'], ['读写头 + 状态', '处理器'], ['纸带上的规则', '程序']];
    ctx.draw2d({ t0: 27.0, t1: 32.6, draw(g, t) {
      const X0 = 1196, Y0 = 232, W = 664, H = 340, x = X0 + 34;
      panelBox(g, X0, Y0, W, H);
      ink.text(g, '通用机器 = 今天的计算机', x, Y0 + 54, { font: ink.sans(30, 500), color: TXT });
      ink.line(g, [[x, Y0 + 78], [X0 + W - 34, Y0 + 78]], 'rgba(235,235,230,.35)', 1);
      MAP.forEach(([a, b], i) => {
        const t0 = 27.2 + i * .4, e = easeOut(ss(t0, t0 + .5, t)); if (e <= 0) return;
        const yy = Y0 + 146 + i * 76; g.save(); g.globalAlpha *= ss(t0, t0 + .25, t);
        ink.text(g, a, x, yy, { font: ink.sans(28, 500), color: TXT2 });
        const ax = x + 262, bx = x + 262 + 96 * e; ink.line(g, [[ax, yy - 10], [bx, yy - 10]], ink.accent, 2.2);
        if (e > .95) { ink.line(g, [[bx - 11, yy - 18], [bx, yy - 10], [bx - 11, yy - 2]], ink.accent, 2.2); }
        g.globalAlpha *= ss(t0 + .3, t0 + .6, t);
        ink.text(g, b, x + 390, yy + 2, { font: ink.sans(34, 700), color: TXT });
        g.restore();
      });
    } });

    /* ================= D · 只在纸上：机器隐去，灯光渐暗 ================= */
    const camD = KIT.cam(30, .02, 20); camD.up.set(0, 0, -1);
    const D = ctx.shot({ name: '04.D 纸上', t0: 32.4, in: { type: 'dissolve', dur: 1.0 }, scene: sc, camera: camD,
      post: { exposure: 1.05, dof: { focus: .5, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .36, grain: .035 },
      update(t) {
        const tp = { ...RULE_TAPE, ...FINAL.tape }; curTape = tp; setTape(tp);
        const dim = 1 - .92 * ss(33.4, 35.9, t);
        setMachine({ head: 1, show: false, light: dim }); D.post.exposure = .32 + .68 * dim;
        const cx = X(-2.2) + .012 * (t - 32.4), h = .5 - .012 * (t - 32.4);
        camD.position.set(cx, h, .02); camD.lookAt(cx, 0, .02); D.post.dof.focus = h;
      } });
    // 结尾不再叠论文标题：字幕「它只存在于纸上」配纸带本身就够了

    /* ================= 音效 ================= */
    ctx.cue(.6, 'riser', 1.4, .08); for (let i = 0; i < 4; i++) ctx.cue(1.5 + i * .25, 'tap', .7);
    ctx.cue(3.0, 'swoosh', .25); ctx.cue(6.7, 'whoosh', 1.4, .2);
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
    ctx.cue(26.4, 'sub', .25); for (let i = 0; i < 3; i++) ctx.cue(27.2 + i * .4, 'blip', 880 + i * 220, .07);
    ctx.cue(32.6, 'sub', .3);
  },
};
