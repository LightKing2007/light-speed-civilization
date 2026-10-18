/* 07 · 晶体管（1947 / 1959）
   A  真空管（烧热、发光）旁边的第一只晶体管复原 —— 又大又热 vs 一小块锗
   B  点接触晶体管微距：金箔两触点、锗片、弹簧；示波面板：微弱输入 → 放大输出
   C1 MOSFET 剖面 + 掺杂示意（一个磷原子贡献一个自由电子）
   C2 栅极加正压 → 电子聚到氧化层下形成沟道 → 加上漏极电压，电子从源极流向漏极 → 撤压，沟道消失
   C3 快速开关：栅压方波与漏极电流（每次不到 1 ns）
   D  越做越小：晶体管缩成画面中心的一点，比例尺从毫米跳到纳米（转出到 08 的芯片）。
   道具在 src/props/07/devices.js（真空管借用 05 章模型）。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam, noise1 } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildBench, buildMosfet, MS } from '../props/07/devices.js';

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
    const pA = camPath([[0, [-.13, .085, .2], [-.085, .06, -.01], 30], [2.6, [-.06, .075, .2], [-.03, .045, -.005], 30], [5.6, [.05, .06, .17], [.03, .03, .01], 30], [7.4, [.075, .05, .13], [.045, .025, .01], 28]]);
    const shA = ctx.shot({ name: '07.A 真空管与晶体管', t0: 0, in: { type: 'dissolve', dur: 1.0 }, scene: BN.scene, camera: camA,
      post: { exposure: 1.1, ao: { radius: .006, intensity: .9 }, dof: { focus: .2, aperture: .0035, maxBlur: 12 }, grade: ctx.grade.warm, vignette: .36, bloom: { strength: .14 } },
      update(t) { const c = pA(t); applyCam(camA, c, t, .0006); shA.post.dof.focus = camA.position.distanceTo(c.l); BN.tube.setHeat(1 - .08 * Math.abs(noise1(t * 3))); } });
    ctx.measure({ shot: shA, a: an.tubeBase.clone().add(V(.022, 0, .02)), b: an.tubeTop.clone().add(V(.022, 0, .02)), label: '≈ 10 cm', t0: .8, t1: 3.2, off: 30 });
    ctx.callout({ shot: shA, at: an.tubeTop.clone().add(V(0, -.035, .012)), title: '真空管', sub: '灯丝要烧到上千度 · 预热要几十秒', t0: .9, t1: 3.3, side: 'right', dx: 120, dy: -80 });
    ctx.callout({ shot: shA, at: an.center, title: '第一只晶体管（复原）', sub: '贝尔实验室 · 1947 年 12 月', t0: 4.2, t1: 6.9, side: 'right', dx: 130, dy: -110, style: 'accent' });
    ctx.readout({ x: 110, y: 760, t0: 4.6, t1: 6.9, html: '<span class="k">巴丁、布拉顿（肖克利领导的小组）</span>' });

    const camB = KIT.cam(30, .002, 5);
    const tip = an.tip.clone();
    const pB = camPath([[6.9, [.082, .05, .085], [.05, .025, .011], 30], [10.2, [.06, .042, .07], [.05, .024, .011], 28], [13.8, [.035, .044, .072], [.05, .024, .011], 28]]);
    const shB = ctx.shot({ name: '07.B 点接触微距', t0: 7.0, in: { type: 'dissolve', dur: .7 }, scene: BN.scene, camera: camB,
      post: { exposure: 1.12, ao: { radius: .002, intensity: .9 }, dof: { focus: .06, aperture: .0035, maxBlur: 14 }, grade: ctx.grade.warm, vignette: .36 },
      update(t) { const c = pB(t); applyCam(camB, c, t, .0004); shB.post.dof.focus = camB.position.distanceTo(tip); BN.tube.setHeat(1); } });
    ctx.callout({ shot: shB, at: tip, code: 'E · C', title: '两个金箔触点', sub: '相距约 0.05 mm', t0: 7.6, t1: 13.3, side: 'right', dx: 150, dy: -70, style: 'accent' });
    ctx.callout({ shot: shB, at: an.ge, title: '锗晶体', sub: '一小块半导体', t0: 8.3, t1: 13.3, side: 'left', dx: -130, dy: 90 });
    ctx.callout({ shot: shB, at: an.spring, title: '弹簧', sub: '把触点压在锗上', t0: 9.0, t1: 13.3, side: 'left', dx: -120, dy: -90 });
    // 示波：输入微弱 → 输出放大
    ctx.draw2d({ t0: 9.6, t1: 13.4, draw(g, t) {
      const x = 1440, y = 640, w = 380, h = 74;
      g.fillStyle = 'rgba(8,9,10,.7)'; g.fillRect(x - 20, y - 46, w + 40, 2 * h + 96); ink.corners(g, x - 20, y - 46, w + 40, 2 * h + 96, 12, ink.dim);
      ink.text(g, '放大 · AMPLIFY', x, y - 18, { font: ink.mono(13), color: ink.dim });
      ink.scope(g, x, y, w, h, u => .14 * Math.sin((u * 3 - t * .9) * 6.283), { color: ink.white, label: '输入（发射极）' });
      ink.scope(g, x, y + h + 18, w, h, u => .95 * Math.sin((u * 3 - t * .9) * 6.283), { color: ink.accent, label: '输出（集电极）' });
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
    const pC = camPath([
      [13.4, [4.3, 2.4, 4.7], [.35, -.15, 0], 30],
      [19.6, [3.3, 1.6, 4.3], [.3, -.15, .1], 30],
      [21.6, [.9, .55, 4.4], [0, -.12, .4], 28],
      [31.4, [.6, .5, 4.0], [0, -.12, .4], 28],
      [37.6, [.5, .55, 4.2], [0, -.1, .4], 29],
      [44.6, [.5, .55, 4.2], [0, -.1, .4], 29],
    ]);
    const shC = ctx.shot({ name: '07.C MOSFET', t0: 13.6, in: { type: 'blur', dur: .9, params: [5] }, scene: MF.scene, camera: camC,
      post: { exposure: 1.1, ao: { radius: .25, intensity: .8 }, dof: { focus: 4.5, aperture: .004, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .32, bloom: { strength: .14 } },
      update(t) { setElectrons(t); setScale(t); const c = pC(t); applyCam(camC, c, t, .0005); shC.post.dof.focus = camC.position.distanceTo(V(0, -.1, .6)); } });
    ctx.readout({ x: 64, y: 110, t0: 14.0, t1: 37.6, html: '<span class="a">MOSFET</span> · 1959 <span class="k">（阿塔拉、姜大元）</span>' });
    ctx.callout({ shot: shC, at: V(-1.08, -.16, front), title: '源极 S', sub: 'n 型：掺磷，多出自由电子', t0: 15.0, t1: 19.6, side: 'left', dx: -110, dy: 120 });
    ctx.callout({ shot: shC, at: V(1.08, -.16, front), title: '漏极 D', sub: 'n 型', t0: 15.4, t1: 19.6, side: 'right', dx: 110, dy: 120 });
    ctx.callout({ shot: shC, at: V(0, MS.ox + .2, front - .1), title: '栅极 G', sub: '金属 · 下面是极薄的氧化层', t0: 15.8, t1: 19.6, side: 'right', dx: 160, dy: -120 });
    ctx.callout({ shot: shC, at: V(0, -.55, front), title: 'p 型硅', sub: '几乎没有自由电子', t0: 16.2, t1: 19.6, side: 'left', dx: -150, dy: 100 });
    // 掺杂示意：硅晶格里换进一个磷原子，多出一个自由电子
    ctx.draw2d({ t0: 14.4, t1: 19.7, draw(g, t) {
      const x0 = 1330, y0 = 210, n = 5, s = 74, R = 19;
      g.fillStyle = 'rgba(8,9,10,.74)'; g.fillRect(x0 - 40, y0 - 60, n * s + 60, n * s + 150); ink.corners(g, x0 - 40, y0 - 60, n * s + 60, n * s + 150, 12, ink.dim);
      ink.text(g, '掺杂 · DOPING', x0 - 16, y0 - 28, { font: ink.mono(13), color: ink.dim });
      const dop = ss(15.6, 16.2, t);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = x0 + i * s, y = y0 + j * s, isP = i === 2 && j === 2;
        if (i < n - 1) ink.line(g, [[x + R, y], [x + s - R, y]], ink.faint, 2); if (j < n - 1) ink.line(g, [[x, y + R], [x, y + s - R]], ink.faint, 2);
        g.fillStyle = isP && dop > .5 ? '#ff9a4a' : 'rgba(170,176,186,.85)'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
        ink.text(g, isP && dop > .5 ? 'P' : 'Si', x, y + 6, { font: ink.mono(isP && dop > .5 ? 17 : 14, 600), color: '#111', align: 'center' });
      }
      if (dop > 0) {   // 自由电子在晶格间游走
        const u = Math.max(0, t - 16.2), ex = x0 + 2 * s + 30 * Math.sin(u * 2.1) + 60 * Math.sin(u * .9) , ey = y0 + 2 * s - 34 + 40 * Math.sin(u * 1.7 + 1);
        g.globalAlpha *= dop; g.fillStyle = ink.cyan; g.beginPath(); g.arc(ex, ey, 7, 0, 7); g.fill(); ink.text(g, 'e⁻', ex + 10, ey - 10, { font: ink.mono(14, 600), color: ink.cyan });
      }
      const ty = y0 + n * s + 4;
      ink.text(g, '约每 100 万个硅原子换进 1 个磷原子', x0 - 16, ty, { font: ink.sans(17) });
      ink.text(g, '导电性提高上百万倍', x0 - 16, ty + 30, { font: ink.sans(17, 600), color: ink.accent });
    } });
    // 电压读数 + 开关状态
    ctx.draw2d({ t0: 20.2, t1: 31.5, draw(g, t) {
      const x = 1440, y = 190, G = vg(t), Dd = vd(t), on = chan(t) > .5;
      g.fillStyle = 'rgba(8,9,10,.7)'; g.fillRect(x - 20, y - 40, 400, 210); ink.corners(g, x - 20, y - 40, 400, 210, 12, ink.dim);
      ink.text(g, '栅极电压 V_G', x, y, { font: ink.sans(18), color: ink.dim }); ink.text(g, `${G > .5 ? '+1' : '0'} V`, x + 360, y, { font: ink.mono(26, 600), color: G > .5 ? ink.accent : ink.white, align: 'right' });
      ink.text(g, '漏极电压 V_D', x, y + 46, { font: ink.sans(18), color: ink.dim }); ink.text(g, `${Dd > .5 ? '+1' : '0'} V`, x + 360, y + 46, { font: ink.mono(26, 600), color: Dd > .5 ? ink.accent : ink.white, align: 'right' });
      ink.line(g, [[x, y + 70], [x + 360, y + 70]], ink.faint, 1);
      ink.text(g, on ? 'ON' : 'OFF', x, y + 132, { font: ink.cond(64, 600), color: on ? ink.accent : ink.white });
      ink.text(g, on ? (Dd > .5 ? '沟道导通 · 电子从源极流向漏极' : '沟道已形成') : '没有沟道 · 开关断开', x + 120, y + 118, { font: ink.sans(17), color: ink.dim });
    } });
    ctx.callout({ shot: shC, at: V(0, -.03, front), code: 'CHANNEL', title: '沟道', sub: '电子聚在氧化层下方', t0: 22.2, t1: 26.2, side: 'left', dx: -120, dy: 140, style: 'accent' });
    // C3：快速开关示波
    ctx.draw2d({ t0: 31.8, t1: 37.6, draw(g, t) {
      const x = 1400, y = 220, w = 420, h = 80;
      g.fillStyle = 'rgba(8,9,10,.7)'; g.fillRect(x - 20, y - 50, w + 40, 2 * h + 140); ink.corners(g, x - 20, y - 50, w + 40, 2 * h + 140, 12, ink.dim);
      ink.text(g, 'SWITCHING · 每次开关 < 1 ns', x, y - 20, { font: ink.mono(14), color: ink.dim });
      ink.scope(g, x, y, w, h, u => 1.6 * vg(t - 3 * (1 - u)) - .8, { color: ink.white, label: 'V_G' });
      ink.scope(g, x, y + h + 16, w, h, u => 1.6 * chan(t - 3 * (1 - u)) * vd(t - 3 * (1 - u)) - .8, { color: ink.accent, label: 'I_D' });
      ink.text(g, '不靠加热 · 不需要真空', x, y + 2 * h + 62, { font: ink.sans(18) });
    } });
    // D：比例尺（毫米 → 纳米）
    ctx.draw2d({ t0: 38.0, t1: 44.4, draw(g, t) {
      const L = 1e-3 * Math.pow(10, -5 * easeIO(clamp((t - 38.2) / 5)));     // 比例尺代表的长度（米）
      const fmt = L >= 1e-3 ? '1 mm' : L >= 1e-6 ? `${+(L * 1e6).toPrecision(2)} µm` : `${+(L * 1e9).toPrecision(2)} nm`;
      const x = 1540, y = 900;
      ink.line(g, [[x, y], [x + 220, y]], ink.white, 2); ink.line(g, [[x, y - 8], [x, y + 8]], ink.white, 2); ink.line(g, [[x + 220, y - 8], [x + 220, y + 8]], ink.white, 2);
      ink.text(g, fmt, x + 110, y - 18, { font: ink.mono(24, 600), align: 'center' });
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(7.0, 'swoosh', .3); ctx.cue(9.6, 'blip', 660, .06);
    ctx.cue(13.6, 'whoosh', 1.1, .3); ctx.cue(16.0, 'tick', .6); ctx.cue(20.3, 'click', .5); ctx.cue(26.2, 'click', .45); ctx.cue(29.5, 'click', .45);
    for (let t = 31.9; t < 37.3; t += .9) { ctx.cue(t, 'tick', .5); ctx.cue(t + .45, 'tap', .6); }
    ctx.cue(37.8, 'riser', 4.5, .16); ctx.cue(43.0, 'chime', 880, .07);
  },
};
