/* 07 · 晶体管（1947 / 1959）
   A  真空管（烧热、发光）旁边的第一只晶体管复原 —— 又大又热 vs 一小块锗
   B  点接触晶体管微距：金箔两触点、锗片、弹簧；示波面板：微弱输入 → 放大输出
   C1 MOSFET 剖面 + 掺杂示意（一个磷原子贡献一个自由电子）
   C2 栅极加正压 → 电子聚到氧化层下形成沟道 → 加上漏极电压，电子从源极流向漏极 → 撤压，沟道消失
   C3 快速开关：栅压方波与漏极电流（每次不到 1 ns）
   D  越做越小：晶体管缩成画面中心的一点，比例尺从毫米跳到纳米（转出到 08 的芯片）。
   道具在 src/props/07/devices.js（真空管借用 05 章模型）。所有动画都是 t 的纯函数。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。
   A 改成真空管与晶体管同框的双人镜头（两个标注同时可读），再推向晶体管；源极 / 漏极 / 栅极 / 沟道的标注挪到字幕讲到它们的时候（20–31 s）。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam, noise1 } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildBench, buildMosfet, MS } from '../props/07/devices.js';
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, 'rgba(235,235,230,.22)', 1); };

/* ---------- 栅压 / 漏压 / 沟道：t 的纯函数 ---------- */
const SQ = (t, a, b, per) => { if (t < a || t > b) return 0; const u = ((t - a) / per) % 1; return ss(0, .06, u) * (1 - ss(.5, .56, u)); };   // 方波（软边）
const vg = t => t < 31.6 ? ss(20.3, 21.0, t) * (1 - ss(29.5, 30.1, t)) : SQ(t, 31.9, 37.3, .9);
const vd = t => t < 31.6 ? ss(26.2, 26.7, t) * (1 - ss(29.5, 30.1, t)) : t < 37.5 ? 1 : 0;
const chan = t => t < 31.6 ? ss(20.5, 22.2, t) * (1 - ss(29.6, 30.8, t)) : SQ(t - .08, 31.9, 37.3, .9);      // 沟道形成比栅压慢一点
const flowPhase = t => { let s = 0; for (let u = 26.2; u < t; u += .05) s += vd(u) * chan(u) * Math.min(.05, t - u); return s; };   // ∫ 电流 dt
const SHRINK0 = 37.8, shrinkK = t => Math.pow(10, -3.2 * easeIO(clamp((t - SHRINK0) / 5.4)));

export default {
  id: '07', status: 'implemented', slug: 'transistor', title: '晶体管', dur: 44,
  card: {"title": "晶体管", "short": "晶体管", "meta": "1947 · 贝尔实验室"},
  stamps: [[0, "1947"], [13.6, "1959"]],
  caps: [[0.4, 6.6, "真空管太大、太热、太容易坏。1947 年底，贝尔实验室造出了第一只晶体管。"], [7.0, 13.2, "它只用一小块锗晶体就能放大信号：没有灯丝，不用预热，体积小、耗电少。"], [13.6, 19.6, "今天芯片里的晶体管叫 MOSFET。纯硅几乎不导电，掺入百万分之一的杂质，导电性就能提高上百万倍。"], [20.0, 26.0, "给栅极加上正电压，电场把电子吸到氧化层下方，形成一条导电的「沟道」，"], [26.4, 31.4, "电子便从源极流向漏极；撤掉电压，沟道消失，开关断开。"], [31.8, 37.4, "它不靠加热、也不需要真空，开关一次只需不到十亿分之一秒。"], [37.8, 43.6, "更重要的是：它可以越做越小。"]],
  credits: [],   // 全部为程序化建模（真空管借用 05 章模型）
  async build(ctx) {
    const { KIT } = ctx;

    /* ================= A / B · 工作台：真空管与第一只晶体管 ================= */
    const BN = buildBench(KIT), an = BN.anchors;
    BN.tube.setHeat(1);
    const camA = KIT.cam(30, .005, 10);
    // 双人镜头：真空管（左）与晶体管（右）同框 0–4.6 s，两个标注都停够时间；之后推向晶体管，接 B 的微距
    const pA = camPath([[0, [-.04, .09, .31], [-.025, .052, -.005], 30], [4.4, [-.01, .085, .285], [-.012, .05, 0], 30], [6.0, [.045, .065, .17], [.04, .03, .01], 29], [7.4, [.07, .052, .13], [.045, .025, .01], 28]]);
    const shA = ctx.shot({ name: '07.A 真空管与晶体管', t0: 0, in: { type: 'dissolve', dur: 1.0 }, scene: BN.scene, camera: camA,
      post: { exposure: 1.18, ao: { radius: .006, intensity: .9 }, dof: { focus: .2, aperture: .0015, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .34, bloom: { strength: .14 } },
      update(t) { const c = pA(t); applyCam(camA, c, t, .0006); shA.post.dof.focus = camA.position.distanceTo(c.l); BN.tube.setHeat(1 - .08 * Math.abs(noise1(t * 3))); } });
    ctx.callout({ shot: shA, at: an.tubeTop.clone().add(V(0, -.035, .012)), title: '真空管', sub: '高约 10 cm，靠灯丝加热', t0: .5, t1: 5.0, side: 'right', dx: 110, dy: -110 });
    ctx.callout({ shot: shA, at: an.center, title: '第一只晶体管', sub: '复原模型 · 巴丁与布拉顿', t0: 2.2, t1: 6.9, side: 'right', dx: 120, dy: -120, style: 'accent' });

    const camB = KIT.cam(30, .002, 5);
    const tip = an.tip.clone();
    const pB = camPath([[6.9, [.082, .05, .085], [.05, .025, .011], 30], [10.2, [.06, .042, .07], [.05, .024, .011], 28], [13.8, [.035, .044, .072], [.05, .024, .011], 28]]);
    const shB = ctx.shot({ name: '07.B 点接触微距', t0: 7.0, in: { type: 'dissolve', dur: .7 }, scene: BN.scene, camera: camB,
      post: { exposure: 1.2, ao: { radius: .002, intensity: .9 }, dof: { focus: .06, aperture: .002, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .34 },
      update(t) { const c = pB(t); applyCam(camB, c, t, .0004); shB.post.dof.focus = camB.position.distanceTo(tip); BN.tube.setHeat(1); } });
    // 字幕先讲「一小块锗晶体」：锗晶体先出，金箔触点随后；弹簧不在讲解里，不标
    ctx.callout({ shot: shB, at: an.ge, title: '锗晶体', sub: '一小块半导体', t0: 7.5, t1: 13.5, side: 'left', dx: -130, dy: 90 });
    ctx.callout({ shot: shB, at: tip, title: '金箔触点', sub: '两个触点相距约 0.05 mm', t0: 8.4, t1: 13.5, side: 'right', dx: 150, dy: -70, style: 'accent' });
    // 信息面板（右下，字幕区之上）：微弱输入 → 放大输出
    ctx.draw2d({ t0: 9.4, t1: 13.6, draw(g, t) {
      const X = 1400, Y = 556, Wd = 460, pad = 20, w = Wd - pad * 2, h = 76;
      panelBox(g, X, Y, Wd, 318);
      ink.text(g, '信号被放大了', X + pad, Y + 44, { font: ink.sans(28, 600), color: TXT });
      ink.text(g, '输入：很弱', X + pad, Y + 92, { font: ink.sans(22), color: TXT2 });
      ink.scope(g, X + pad, Y + 104, w, h, u => .14 * Math.sin((u * 3 - t * .9) * 6.283), { color: ink.white, lw: 2.4 });
      ink.text(g, '输出：放大', X + pad, Y + 212, { font: ink.sans(22), color: ink.accent });
      ink.scope(g, X + pad, Y + 224, w, h, u => .95 * Math.sin((u * 3 - t * .9) * 6.283), { color: ink.accent, lw: 2.4 });
    } });

    /* ================= C · MOSFET 剖面 ================= */
    const MF = buildMosfet(KIT), { E, N, pos, alpha } = MF, { wellX, front } = MS;
    const setElectrons = t => {
      const c = chan(t), fl = flowPhase(t), on = vd(t) * c;
      for (let i = 0; i < N; i++) {
        const e = E[i], jx = noise1(e.ph + t * .9) * .03, jy = noise1(e.ph * 1.7 + t * .8) * .02;
        let x = e.hx + jx, y = e.hy + jy, z = e.hz, a = .85;
        if (e.rec < .55) {                                       // 一部分电子会被吸进沟道
          const k = ss(e.rec * .9, e.rec * .9 + .3, c);
          let cx = lerp(-wellX[0], wellX[0], e.cx);
          if (on > .01 || fl > 0) { const span = 2 * wellX[0] + .3; cx = -wellX[0] - .15 + (((e.cx * span + fl * .9) % span) + span) % span; a *= ss(-wellX[0] - .15, -wellX[0] + .05, cx) * (1 - ss(wellX[0] - .05, wellX[0] + .15, cx)) * .7 + .3; }
          x = lerp(x, cx + jx * .3, k); y = lerp(y, e.cy + jy * .2, k); z = lerp(z, e.cz, k);
        }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; alpha[i] = a;
      }
      MF.electrons.geometry.attributes.position.needsUpdate = true; MF.electrons.geometry.attributes.aAlpha.needsUpdate = true;
      MF.channel.material.opacity = .22 * c;
    };
    const setScale = t => { const s = shrinkK(t); MF.root.scale.setScalar(s); MF.dot.material.opacity = ss(.08, .01, s) * ss(SHRINK0, SHRINK0 + 1, t); };
    const camC = KIT.cam(30, .02, 60);
    const pC = camPath([   // C1 的总览把模型放在画面左侧 3/4，右侧留给掺杂面板
      [13.4, [4.75, 2.35, 4.75], [.8, -.2, 0], 30],
      [19.6, [3.75, 1.6, 4.35], [.75, -.2, .1], 30],
      [21.6, [.9, .55, 4.4], [0, -.12, .4], 28],
      [31.4, [.6, .5, 4.0], [0, -.12, .4], 28],
      [37.6, [.5, .55, 4.2], [0, -.1, .4], 29],
      [44.6, [.5, .55, 4.2], [0, -.1, .4], 29],
    ]);
    const shC = ctx.shot({ name: '07.C MOSFET', t0: 13.6, in: { type: 'blur', dur: .9, params: [5] }, scene: MF.scene, camera: camC,
      post: { exposure: 1.24, ao: { radius: .25, intensity: .8 }, dof: { focus: 4.5, aperture: .004, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .14 } },
      update(t) { setElectrons(t); setScale(t); const c = pC(t); applyCam(camC, c, t, .0005); shC.post.dof.focus = camC.position.distanceTo(V(0, -.1, .6)); } });
    /* C1（13.6–19.6）：只标一处「掺了磷的硅」（蓝色区，里面的亮点就是自由电子）+ 右侧掺杂面板 */
    ctx.callout({ shot: shC, at: V(-1.08, -.16, front), title: '掺了磷的硅', sub: '多出自由电子，能导电', t0: 14.6, t1: 19.3, side: 'left', dx: -110, dy: 130 });
    // 掺杂示意：硅晶格里换进一个磷原子，多出一个自由电子
    ctx.draw2d({ t0: 14.4, t1: 19.6, draw(g, t) {
      // 标题第二行用电子的青色，兼作图例（青色小球 = 自由电子）
      const n = 5, s = 72, R = 23, Wd = 444, X = 1920 - 56 - Wd, Y = 120, x0 = X + (Wd - (n - 1) * s) / 2, y0 = Y + 132;
      panelBox(g, X, Y, Wd, 132 + (n - 1) * s + R + 24);
      ink.text(g, '换进 1 个磷原子，', X + 22, Y + 44, { font: ink.sans(26, 600), color: TXT });
      ink.text(g, '就多出 1 个自由电子', X + 22, Y + 82, { font: ink.sans(26, 600), color: ink.cyan });
      const dop = ss(15.6, 16.2, t);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = x0 + i * s, y = y0 + j * s, isP = i === 2 && j === 2 && dop > .5;
        if (i < n - 1) ink.line(g, [[x + R, y], [x + s - R, y]], 'rgba(235,235,230,.35)', 2); if (j < n - 1) ink.line(g, [[x, y + R], [x, y + s - R]], 'rgba(235,235,230,.35)', 2);
        g.fillStyle = isP ? '#ff9a4a' : 'rgba(178,184,194,.92)'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
        ink.text(g, isP ? '磷' : '硅', x, y + 8, { font: ink.sans(isP ? 24 : 21, 600), color: '#111', align: 'center' });
      }
      if (dop > 0) {   // 自由电子沿两排原子之间的空隙游走（不压在原子上）
        const u = Math.max(0, t - 16.2), ex = x0 + 2 * s + 70 * Math.sin(u * .9) + 18 * Math.sin(u * 2.1), ey = y0 + 1.5 * s + 6 * Math.sin(u * 1.7 + 1);
        g.save(); g.globalAlpha *= dop; g.fillStyle = ink.cyan; g.beginPath(); g.arc(ex, ey, 10, 0, 7); g.fill(); g.restore();
      }
    } });
    /* C2（20–31.4）：标注跟着字幕走 —— 栅极 → 沟道 → 源极 / 漏极（同一时刻最多两个） */
    ctx.callout({ shot: shC, at: V(-.25, MS.ox + .2, front - .1), title: '栅极', sub: '加上正电压', t0: 20.2, t1: 24.8, side: 'left', dx: -170, dy: -130 });
    ctx.callout({ shot: shC, at: V(-.2, -.03, front), title: '沟道', sub: '电子聚到氧化层下方', t0: 21.8, t1: 26.3, side: 'left', dx: -130, dy: 150, style: 'accent' });
    ctx.callout({ shot: shC, at: V(-1.08, -.16, front), title: '源极', sub: '电子从这里出发', t0: 26.1, t1: 30.7, side: 'left', dx: -100, dy: 150 });
    ctx.callout({ shot: shC, at: V(1.08, -.16, front), title: '漏极', sub: '电子流到这里', t0: 26.9, t1: 31.5, side: 'right', dx: 100, dy: 150 });
    // 开关状态面板（右上）：结论（导通 / 断开）放最大，下面两行电压
    ctx.draw2d({ t0: 20.2, t1: 31.5, draw(g, t) {
      const X = 1440, Y = 120, Wd = 420, pad = 22, G = vg(t), Dd = vd(t), on = chan(t) > .5;
      panelBox(g, X, Y, Wd, 226);
      ink.text(g, '开关', X + pad, Y + 58, { font: ink.sans(26), color: TXT2 });
      ink.text(g, on ? '导通' : '断开', X + pad + 76, Y + 62, { font: ink.sans(46, 700), color: on ? ink.accent : TXT });
      ink.line(g, [[X + pad, Y + 90], [X + Wd - pad, Y + 90]], 'rgba(235,235,230,.22)', 1);
      ink.text(g, '栅极电压', X + pad, Y + 144, { font: ink.sans(26), color: TXT });
      ink.text(g, `${G > .5 ? '+1' : '0'} V`, X + Wd - pad, Y + 146, { font: ink.mono(32, 600), color: G > .5 ? ink.accent : TXT, align: 'right' });
      ink.text(g, '漏极电压', X + pad, Y + 198, { font: ink.sans(26), color: TXT });
      ink.text(g, `${Dd > .5 ? '+1' : '0'} V`, X + Wd - pad, Y + 200, { font: ink.mono(32, 600), color: Dd > .5 ? ink.accent : TXT, align: 'right' });
    } });
    // C3（31.8–37.4）：快速开关 —— 同一位置换成示波面板
    ctx.draw2d({ t0: 31.8, t1: 37.6, draw(g, t) {
      const X = 1400, Y = 120, Wd = 460, pad = 20, w = Wd - pad * 2, h = 72;
      panelBox(g, X, Y, Wd, 296);
      ink.text(g, '每次开关不到 1 纳秒', X + pad, Y + 44, { font: ink.sans(28, 600), color: TXT });
      ink.text(g, '栅极电压', X + pad, Y + 90, { font: ink.sans(22), color: TXT2 });
      ink.scope(g, X + pad, Y + 102, w, h, u => 1.6 * vg(t - 3 * (1 - u)) - .8, { color: ink.white, lw: 2.4 });
      ink.text(g, '电流', X + pad, Y + 204, { font: ink.sans(22), color: ink.accent });
      ink.scope(g, X + pad, Y + 216, w, h, u => 1.6 * chan(t - 3 * (1 - u)) * vd(t - 3 * (1 - u)) - .8, { color: ink.accent, lw: 2.4 });
    } });
    // D：比例尺（毫米 → 纳米），放在字幕区上方
    ctx.draw2d({ t0: 38.0, t1: 44.4, draw(g, t) {
      const L = 1e-3 * Math.pow(10, -5 * easeIO(clamp((t - 38.2) / 5)));     // 比例尺代表的长度（米）
      const fmt = L >= 1e-3 ? '1 mm' : L >= 1e-6 ? `${+(L * 1e6).toPrecision(2)} µm` : `${+(L * 1e9).toPrecision(2)} nm`;
      const x = 1560, y = 830;
      ink.line(g, [[x, y], [x + 240, y]], ink.white, 3); ink.line(g, [[x, y - 10], [x, y + 10]], ink.white, 3); ink.line(g, [[x + 240, y - 10], [x + 240, y + 10]], ink.white, 3);
      ink.text(g, fmt, x + 120, y - 22, { font: ink.mono(34, 600), color: TXT, align: 'center' });
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(7.0, 'swoosh', .3); ctx.cue(9.6, 'blip', 660, .06);
    ctx.cue(13.6, 'whoosh', 1.1, .3); ctx.cue(16.0, 'tick', .6); ctx.cue(20.3, 'click', .5); ctx.cue(26.2, 'click', .45); ctx.cue(29.5, 'click', .45);
    for (let t = 31.9; t < 37.3; t += .9) { ctx.cue(t, 'tick', .5); ctx.cue(t + .45, 'tap', .6); }
    ctx.cue(37.8, 'riser', 4.5, .16); ctx.cue(43.0, 'chime', 880, .07);
  },
};
