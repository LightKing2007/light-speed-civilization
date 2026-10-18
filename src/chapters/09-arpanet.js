/* 09 · 第一句话（1969）
   A1 夜里的美国（NASA 夜景 + 极淡的州界）：1969 年 12 月 ARPANET 的四个节点依次亮起、连线
   A2 IMP（接口信息处理机）真实照片
   B1 加州近景：UCLA → SRI 的线路；L、O 沿线飞到 SRI，G 送到时 SRI 主机崩溃（红色警示）；两端是终端面板
   B2 IMP 日志真实照片，高亮「22:30 talked to SRI host to host」
   C  网络沙盘：电路交换（一条通路被独占、大部分时间空闲）→ 分组交换（LOGIN 拆成五个带序号的包各自寻路）
      → 一条线路断开（红），包绕道 → 终点按序号拼回 LOGIN → 网络开始生长
   道具在 src/props/09/net.js。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam, gcArc, ll } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { usStates, SITES, LINKS69, LINKS, buildBoard, nodePos, Y_PKT } from '../props/09/net.js';

/* ---------- B1：LOGIN 的前三个字母 ---------- */
const KEYS = [['L', 12.9], ['O', 14.3], ['G', 15.8]], FLY = 1.0, CRASH = 15.8 + FLY;

/* ---------- C：数据包的行程 ---------- */
const LEG = 1.1, DWELL = .25, BREAK = 37.4;
const plan = (route, t0, holds = {}) => { const legs = []; let t = t0; for (let i = 0; i < route.length - 1; i++) { if (holds[route[i]]) t = Math.max(t, holds[route[i]]); legs.push({ a: route[i], b: route[i + 1], t0: t, t1: t + LEG }); t += LEG + DWELL; } return legs; };
const MSG = [   // LOGIN 拆成五个包：字母、序号、路线
  { ch: 'L', legs: plan(['S', 'R1', 'R3', 'R4', 'R6', 'D'], 31.3) },
  { ch: 'O', legs: plan(['S', 'R2', 'R4', 'R6', 'D'], 31.6) },
  { ch: 'G', legs: plan(['S', 'R1', 'R5', 'D'], 32.2) },
  { ch: 'I', legs: plan(['S', 'R2', 'R3', 'R5', 'D'], 34.6, { R3: 37.7 }) },   // 本想走 R3→R6，线路断了，在 R3 等了一下改走 R5
  { ch: 'N', legs: plan(['S', 'R1', 'R3', 'R5', 'D'], 35.2) },
];
MSG.forEach(m => { m.depart = m.legs[0].t0; m.arrive = m.legs[m.legs.length - 1].t1; });
const ORDER = [...MSG.keys()].sort((a, b) => MSG[a].arrive - MSG[b].arrive);
const DONE = Math.max(...MSG.map(m => m.arrive));
const BG = [   // 其他用户的包：沿各自的环路循环（同一条线路被很多人轮流使用）
  { route: ['R1', 'R3', 'R6', 'R4', 'R2', 'R1'], per: 6.4, ph: .1 }, { route: ['R5', 'R3', 'R2', 'R1', 'R5'], per: 5.2, ph: .5 },
  { route: ['R4', 'R6', 'R5', 'R3', 'R4'], per: 5.6, ph: .3 }, { route: ['R2', 'R4', 'R3', 'R1', 'R2'], per: 5.0, ph: .8 },
  { route: ['R6', 'R3', 'R1', 'R5', 'R6'], per: 6.0, ph: .65 }, { route: ['R3', 'R6', 'D', 'R5', 'R3'], per: 4.6, ph: .2 },
];
/* 电路交换：被独占的通路，与「真正在说话」的时段 */
const CIRCUIT = ['S', 'R2', 'R4', 'R6', 'D'], C0 = 24.6, C1 = 30.5;
const TALK = [[25.5, 25.9], [26.2, 26.4], [28.4, 28.9], [29.5, 29.7]];

export default {
  id: '09', status: 'implemented', slug: 'arpanet', title: '第一句话', dur: 46,
  card: {"act": "第三部", "actName": "网络", "title": "第一句话", "short": "第一句话", "meta": "ARPANET · 1969"},
  stamps: [[0, "1969"]],
  caps: [[0.4, 6.0, "计算机越来越多，却彼此孤立。1969 年，美国国防部资助的 ARPANET 开始把各地的大学和研究所连起来。"], [6.4, 12.4, "那年 10 月 29 日晚，UCLA 的学生向 500 多公里外的斯坦福研究所发送「LOGIN」。"], [12.8, 18.4, "刚传出「L」和「O」，系统就崩溃了。网络说出的第一句话，是「LO」。"], [18.8, 24.0, "大约一小时后，连接修好，完整的「LOGIN」终于送达。"], [24.4, 30.4, "电话网靠「电路交换」：通话期间，一条端到端的通路被一对用户独占，哪怕没人说话。"], [30.8, 37.0, "ARPANET 改用「分组交换」：数据被切成小包，每个包写上地址和序号，各自寻路。"], [37.4, 43.4, "某条线路断了，包会绕道而行；到了终点，再按序号重新拼合。"], [43.8, 45.8, "网络，开始生长。"]],
  credits: [
    'assets/photos/act3/imp_bbn_ddp516_jurvetson.jpg', 'assets/photos/act3/imp_log_1969_10_29.jpg',
    'assets/data/naturalearth/ne_50m_admin_1_states_provinces.geojson',
    'assets/earth/earth_day_8k.jpg', 'assets/earth/earth_clouds_8k.jpg', 'assets/earth/earth_lights_8k.jpg', 'assets/earth/earth_normal_4k.png', 'assets/earth/stars_8k.jpg',
  ],
  async build(ctx) {
    const { KIT, A } = ctx;

    /* ================= A1 / B1 · 夜里的美国 ================= */
    const sE = new THREE.Scene();
    const E = await ctx.earth({ quality: '8k', nightIntensity: 2.6, cloudOpacity: .55 }); sE.add(E.group); await E.addStars(sE, .2);
    E.setSunFromUTC(Date.UTC(1969, 9, 30, 5, 30));        // 加州 10 月 29 日 22:30
    E.group.updateMatrixWorld(true);
    const states = await usStates(A, E, { opacity: .2 });
    const LL = (a, b, h = 0) => E.ll(a, b, h).toArray();
    const sitePos = k => E.ll(SITES[k].ll[0], SITES[k].ll[1], .004);
    const NAMES = Object.keys(SITES), APPEAR = { UCLA: .8, SRI: 1.3, UCSB: 1.8, UTAH: 2.3 };
    const mk = new Float32Array(NAMES.length * 3), mkA = new Float32Array(NAMES.length);
    NAMES.forEach((k, i) => sitePos(k).toArray(mk, i * 3));
    const markers = KIT.points(mk, { size: 15, color: 0xffd9a0, intensity: 1.7, alphas: mkA, soft: .8, additive: true }); markers.renderOrder = 6; sE.add(markers);
    const arcs69 = LINKS69.map(([a, b]) => { const pa = SITES[a].ll, pb = SITES[b].ll, d = ll(pa[0], pa[1]).angleTo(ll(pb[0], pb[1])) * E.R; return E.arc(pa, pb, { h: d * .12, width: 1.8, color: 0xffe2bc, opacity: .9, head: 0, alt: .004 }); });
    // UCLA → SRI：B1 的主线路
    const main = E.arc(SITES.UCLA.ll, SITES.SRI.ll, { h: .05, width: 2.6, color: 0xffe2bc, opacity: .95, head: 0, glowHead: 1.8, alt: .004 });
    const arcPts = gcArc(SITES.UCLA.ll, SITES.SRI.ll, E.R + .004, .05, 160).map(p => p.applyMatrix4(E.group.matrixWorld));
    const arcAt = u => { const f = clamp(u) * (arcPts.length - 1), i = Math.min(arcPts.length - 2, Math.floor(f)); return arcPts[i].clone().lerp(arcPts[i + 1], f - i); };
    const setEarth = (t, cam, mode) => {
      E.update(t, cam);
      NAMES.forEach((k, i) => { mkA[i] = mode === 'A' ? ss(APPEAR[k], APPEAR[k] + .3, t) : (k === 'UCLA' || k === 'SRI' ? 1 : .35); });
      markers.geometry.attributes.aAlpha.needsUpdate = true;
      arcs69.forEach((m, i) => { m.visible = mode === 'A'; m.set({ head: easeIO(ss(2.6 + i * .2, 3.4 + i * .2, t)) }); });
      main.visible = mode === 'B'; main.set({ head: easeIO(ss(7.2, 9.0, t)), opacity: t > CRASH ? lerp(.95, .35, ss(CRASH, CRASH + .4, t)) : .95 });
      states.material.opacity = mode === 'A' ? .2 : .12;
    };
    const camA = KIT.cam(34, .01, 400);
    const pA1 = camPath([[0, LL(31.5, -103, 5.6), LL(38.5, -104), 34], [4.2, LL(32, -110, 4.6), LL(38, -112.5), 34]]);
    const shA = ctx.shot({ name: '09.A1 美国', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: sE, camera: camA,
      post: { exposure: 1.2, grade: ctx.grade.night, vignette: .3, grain: .02, bloom: { strength: .2 } },
      update(t) { applyCam(camA, pA1(t), t, 0); setEarth(t, camA, 'A'); } });
    const LABEL = { UCLA: [14, 22, 'left'], UCSB: [-14, -10, 'right'], SRI: [-14, -8, 'right'], UTAH: [14, -8, 'left'] };
    ctx.draw2d({ shot: shA, t0: .8, t1: 4.0, draw(g, t, a, proj) {
      for (const k of NAMES) {
        const p = proj(sitePos(k)); if (!p) continue; const [dx, dy, al] = LABEL[k];
        g.save(); g.globalAlpha *= ss(APPEAR[k], APPEAR[k] + .4, t);
        ink.text(g, k === 'UTAH' ? 'UTAH' : k, p.x + dx, p.y + dy, { font: ink.mono(18, 600), align: al });
        ink.text(g, SITES[k].zh, p.x + dx, p.y + dy + 22, { font: ink.sans(16), color: ink.dim, align: al });
        g.restore();
      }
    } });
    ctx.readout({ x: 64, y: 110, t0: 2.6, t1: 3.9, html: '<span class="a">ARPANET</span> · 1969 年 12 月的 4 个节点' });

    /* ================= A2 · IMP 照片 ================= */
    const phI = await KIT.photoShot('assets/photos/act3/imp_bbn_ddp516_jurvetson.jpg', { from: { x: 0, y: .76, s: 1.02 }, to: { x: 0, y: .6, s: 1.12 } });
    ctx.shot({ name: '09.A2 IMP', t0: 3.9, in: { type: 'dissolve', dur: .7 }, scene: phI.scene, camera: phI.camera,
      post: { exposure: 1.0, grade: ctx.grade.warm, vignette: .4, grain: .03 }, update(t) { phI.update((t - 3.9) / 2.8); } });
    ctx.lower({ t0: 4.3, t1: 6.5, name: 'IMP（接口信息处理机）', meta: 'BBN 公司用霍尼韦尔 DDP-516 小型机改装 · 每个节点一台，专门负责转发数据', credit: '照片：Steve Jurvetson · CC BY 2.0' });

    /* ================= B1 · L、O……崩溃 ================= */
    const camB = KIT.cam(34, .005, 400);
    const pB1 = camPath([[6.4, LL(31.5, -116.5, 1.9), LL(36.2, -120), 34], [10.4, LL(32.4, -118.6, 1.25), LL(36, -120.4), 34], [18.8, LL(32.6, -119.2, 1.1), LL(35.9, -120.5), 34]]);
    const shB = ctx.shot({ name: '09.B1 LO', t0: 6.4, in: { type: 'dissolve', dur: .7 }, scene: sE, camera: camB,
      post: { exposure: 1.2, grade: ctx.grade.night, vignette: .3, grain: .02, bloom: { strength: .22 } },
      update(t) { applyCam(camB, pB1(t), t, 0); setEarth(t, camB, 'B'); } });
    // 两端标签、线路长度、飞行中的字母、崩溃警示
    ctx.draw2d({ shot: shB, t0: 6.8, t1: 18.9, draw(g, t, a, proj) {
      const pu = proj(sitePos('UCLA')), ps = proj(sitePos('SRI'));
      if (pu) { ink.text(g, 'UCLA', pu.x + 16, pu.y + 24, { font: ink.mono(20, 600) }); ink.text(g, '洛杉矶', pu.x + 16, pu.y + 48, { font: ink.sans(16), color: ink.dim }); }
      if (ps) {
        const red = ss(CRASH, CRASH + .15, t);
        ink.text(g, 'SRI', ps.x - 16, ps.y - 30, { font: ink.mono(20, 600), color: red > .5 ? ink.warn : ink.white, align: 'right' }); ink.text(g, '门洛帕克', ps.x - 16, ps.y - 8, { font: ink.sans(16), color: ink.dim, align: 'right' });
        if (red > 0) { const u = ((t - CRASH) % 1.2) / 1.2; g.save(); g.globalAlpha *= red * (1 - u); g.strokeStyle = ink.warn; g.lineWidth = 2.5; g.beginPath(); g.arc(ps.x, ps.y, 10 + 40 * u, 0, 7); g.stroke(); g.restore(); g.fillStyle = ink.warn; g.beginPath(); g.arc(ps.x, ps.y, 7, 0, 7); g.fill(); }
      }
      const pm = proj(arcAt(.5));
      if (pm) { g.save(); g.globalAlpha *= ss(8.6, 9.2, t) * (1 - ss(12.4, 12.8, t)); ink.text(g, '约 500 公里', pm.x + 20, pm.y - 16, { font: ink.sans(20, 600) }); g.restore(); }
      for (const [ch, t0] of KEYS) {
        const u = (t - t0) / FLY; if (u < 0 || u > 1.25) continue;
        const crash = ch === 'G', k = crash ? 1 - ss(1, 1.2, u) : 1 - ss(1, 1.12, u), p = proj(arcAt(Math.min(1, u)));
        if (!p) continue;
        g.save(); g.globalAlpha *= k;
        for (let j = 1; j <= 8; j++) { const q = proj(arcAt(Math.max(0, Math.min(1, u) - j * .025))); if (!q) continue; g.fillStyle = `rgba(255,190,120,${.35 * (1 - j / 9)})`; g.beginPath(); g.arc(q.x, q.y, 4 - j * .35, 0, 7); g.fill(); }
        g.shadowColor = crash && u > 1 ? ink.warn : 'rgba(255,170,90,.9)'; g.shadowBlur = 18;
        ink.text(g, ch, p.x, p.y + 14, { font: ink.cond(48, 700), color: crash && u > 1 ? ink.warn : '#fff4e6', align: 'center' });
        g.restore();
      }
    } });
    // 终端面板：UCLA（发送）与 SRI（接收）
    ctx.draw2d({ shot: shB, t0: 11.8, t1: 18.9, draw(g, t) {
      const typed = KEYS.filter(([, t0]) => t >= t0).map(([c]) => c).join(''), got = KEYS.filter(([c, t0]) => c !== 'G' && t >= t0 + FLY).map(([c]) => c).join('');
      const crash = t >= CRASH, blink = Math.floor(t * 2.5) % 2 === 0;
      // UCLA
      let x = 1350, y = 610, w = 470, h = 150;
      g.fillStyle = 'rgba(8,9,10,.78)'; g.fillRect(x, y, w, h); ink.corners(g, x, y, w, h, 12, ink.dim);
      ink.text(g, 'UCLA · SDS Sigma 7 · 发送', x + 22, y + 34, { font: ink.mono(16), color: ink.dim });
      ink.text(g, '> ' + typed + (blink && !crash ? '▌' : ''), x + 22, y + 92, { font: ink.mono(38, 600) });
      ink.text(g, crash ? '× 连接中断' : '正在输入「LOGIN」', x + 22, y + 130, { font: ink.sans(17), color: crash ? ink.warn : ink.dim });
      // SRI
      x = 90; y = 150; const red = ss(CRASH, CRASH + .15, t), big = ss(17.0, 17.4, t);
      g.fillStyle = `rgba(${8 + 40 * red},9,10,.78)`; g.fillRect(x, y, w, h + 30 * big); ink.corners(g, x, y, w, h + 30 * big, 12, red > .5 ? ink.warn : ink.dim);
      ink.text(g, 'SRI · SDS 940 · 接收', x + 22, y + 34, { font: ink.mono(16), color: ink.dim });
      ink.text(g, got, x + 22, y + 92 + 22 * big, { font: big > 0 ? ink.cond(38 + 34 * big, 700) : ink.mono(38, 600), color: big > .5 ? ink.accent : ink.white });
      ink.text(g, crash ? (big > .5 ? '网络说出的第一句话' : '系统崩溃') : got ? '收到' : '等待中…', x + 22 + (big > .5 ? 120 : 0), y + 130 + 12 * big, { font: ink.sans(17, crash ? 600 : 400), color: crash && big < .5 ? ink.warn : ink.dim });
    } });

    /* ================= B2 · IMP 日志 ================= */
    const phL = await KIT.photoShot('assets/photos/act3/imp_log_1969_10_29.jpg', { from: { x: 0, y: -.05, s: 1.02 }, to: { x: 0, y: -.35, s: 1.5 } });
    const shL = ctx.shot({ name: '09.B2 IMP 日志', t0: 18.8, in: { type: 'dissolve', dur: .8 }, scene: phL.scene, camera: phL.camera,
      post: { exposure: 1.0, grade: ctx.grade.warm, vignette: .42, grain: .03 }, update(t) { phL.update((t - 18.8) / 5.6); } });
    /** 照片上的点（u, v ∈ 0..1，v 从上往下）→ 屏幕像素（1920 × 1080） */
    const photoPx = (ph, u, v) => { const m = ph.mesh, gp = m.geometry.parameters, s = m.scale.x, fa = 1920 / 1080; const X = m.position.x + (u - .5) * gp.width * s, Y = m.position.y + (.5 - v) * gp.height * s; return [(X / fa + 1) / 2 * 1920, (1 - Y) / 2 * 1080]; };
    ctx.draw2d({ shot: shL, t0: 20.2, t1: 24.3, draw(g, t) {
      const [x0, y0] = photoPx(phL, .3, .53), [x1, y1] = photoPx(phL, .695, .63), e = easeIO(ss(20.2, 20.8, t));
      g.strokeStyle = ink.accent; g.lineWidth = 3; g.strokeRect(x0, y0, (x1 - x0) * e, y1 - y0);
      g.save(); g.globalAlpha *= ss(20.7, 21.1, t);
      g.fillStyle = 'rgba(8,9,10,.8)'; g.fillRect(x0, y1 + 14, 560, 82);
      ink.text(g, '22:30 · 与 SRI 主机对主机连通', x0 + 18, y1 + 50, { font: ink.sans(24, 600), color: ink.accent });
      ink.text(g, 'Talked to SRI host to host', x0 + 18, y1 + 80, { font: ink.mono(17), color: ink.dim });
      g.restore();
    } });
    ctx.lower({ t0: 19.3, t1: 21.6, name: 'IMP 日志', meta: 'UCLA · 1969 年 10 月 29 日', credit: '照片：Andrew Adams（FastLizard4）· CC BY-SA 2.0' });

    /* ================= C · 网络沙盘 ================= */
    const NB = buildBoard(KIT);
    const P = (k, y = Y_PKT) => nodePos(k, y);
    const queueSlot = i => V(-2.5, Y_PKT, .15 + (i - 2) * .22);
    /** 消息包 i 在 t 时刻的位置；null = 不显示 */
    const msgPos = (i, t) => {
      const m = MSG[i]; if (t < 30.95 + i * .08) return null;
      if (t < m.depart) return { p: queueSlot(i), yaw: 0 };
      if (t > m.arrive + .25) return null;
      for (let j = 0; j < m.legs.length; j++) {
        const L = m.legs[j], from = j === 0 ? queueSlot(i) : P(L.a), to = P(L.b), yaw = Math.atan2(-(to.z - from.z), to.x - from.x);
        if (t < L.t0) return { p: from, yaw, wait: true };
        if (t <= L.t1) return { p: from.clone().lerp(to, easeIO((t - L.t0) / LEG)), yaw };
      }
      return { p: P('D'), yaw: 0, sink: ss(m.arrive, m.arrive + .25, t) };
    };
    const bgPos = (b, t) => {
      const n = b.route.length - 1, f = ((t / b.per + b.ph) % 1) * n, j = Math.floor(f), u = f - j, a = b.route[j], c = b.route[j + 1];
      if (t > BREAK && ((a === 'R3' && c === 'R6') || (a === 'R6' && c === 'R3'))) return null;
      const A0 = P(a), B0 = P(c); return { p: A0.clone().lerp(B0, ss(.1, .9, u)), yaw: Math.atan2(-(B0.z - A0.z), B0.x - A0.x) };
    };
    const place = (m, st, color, k) => {
      if (!st) { m.visible = false; return; }
      m.visible = true; m.position.copy(st.p); m.rotation.set(0, st.yaw, 0); m.scale.setScalar(Math.max(.001, 1 - (st.sink || 0)));
      m.material.emissive.set(color); m.material.emissiveIntensity = k;
    };
    const setBoard = t => {
      // 电路交换：整条通路被独占（橙色），说话时有一道亮光走过
      const own = ss(C0, C0 + .6, t) * (1 - ss(C1, C1 + .5, t));
      for (const [a, b] of LINKS) NB.lightLink(a, b, 0);
      for (let i = 0; i < CIRCUIT.length - 1; i++) NB.lightLink(CIRCUIT[i], CIRCUIT[i + 1], own);
      const brk = ss(BREAK, BREAK + .15, t); if (brk > 0) NB.lightLink('R3', 'R6', brk * (.75 + .25 * Math.cos(t * 9)), 0xff3b2f);
      let pi = 0;
      for (const [s0, s1] of TALK) { const u = (t - s0) / (s1 - s0 + .9); const on = u >= 0 && u <= 1 && own > .5; const path = CIRCUIT.map(k => P(k, .14)), f = clamp(u) * (path.length - 1), j = Math.min(path.length - 2, Math.floor(f)); place(NB.pkts[20 + pi], on ? { p: path[j].clone().lerp(path[j + 1], f - j), yaw: Math.atan2(-(path[j + 1].z - path[j].z), path[j + 1].x - path[j].x) } : null, 0xffe6c8, 3); pi++; }
      // 分组交换
      MSG.forEach((m, i) => place(NB.pkts[i], t > 30.6 ? msgPos(i, t) : null, 0xffb347, 2.2));
      const bgOn = ss(30.9, 31.6, t);
      BG.forEach((b, i) => place(NB.pkts[8 + i], bgOn > 0 ? bgPos(b, t) : null, 0x7fa6c8, 1.1 * bgOn));
      // 节点状态灯：有包经过时亮
      for (const [k, n] of Object.entries(NB.nodes)) n.led.material.emissiveIntensity = (k === 'S' || k === 'D') ? 1.6 : .9;
      NB.showGrowth(ss(43.7, 45.7, t));
    };
    const camC = KIT.cam(32, .05, 80);
    const pC = camPath([[24.4, [-.7, 5.3, 6.5], [0, .1, .15], 32], [30.6, [.1, 5.0, 6.2], [0, 0, .1], 32], [37.0, [.45, 4.9, 6.1], [.1, 0, .05], 32], [43.4, [.35, 5.0, 6.2], [.1, 0, .05], 32], [46.6, [0, 9.2, 11.2], [0, 0, -.1], 34]]);
    const shC = ctx.shot({ name: '09.C 分组交换', t0: 24.4, in: { type: 'dissolve', dur: 1.0 }, scene: NB.scene, camera: camC,
      post: { exposure: 1.05, ao: { radius: .15, intensity: .8 }, dof: { focus: 8, aperture: .0012, maxBlur: 6 }, grade: ctx.grade.cool, vignette: .32, bloom: { strength: .16 } },
      update(t) { setBoard(t); const c = pC(t); applyCam(camC, c, t, .0004); shC.post.dof.focus = camC.position.distanceTo(c.l); } });
    // 端点标签、包上的字母与序号、断线标记
    ctx.draw2d({ shot: shC, t0: 24.7, t1: 46.2, draw(g, t, a, proj) {
      const circ = t < 30.7, gl = 1 - ss(43.6, 44.2, t);
      for (const [k, name] of [['S', 'A'], ['D', 'B']]) {
        const p = proj(P(k, .36)); if (!p) continue;
        g.save(); g.globalAlpha *= gl;
        ink.text(g, name, p.x, p.y - 40, { font: ink.cond(34, 600), align: 'center' });
        ink.text(g, circ ? (k === 'S' ? '通话一方' : '通话另一方') : (k === 'S' ? '发送方' : '接收方'), p.x, p.y - 16, { font: ink.sans(16), color: ink.dim, align: 'center' });
        g.restore();
      }
      if (t > 30.9 && t < 43.6) MSG.forEach((m, i) => {
        const st = msgPos(i, t); if (!st || st.sink > .5) return; const p = proj(st.p.clone().add(V(0, .16, 0))); if (!p) return;
        g.fillStyle = 'rgba(8,9,10,.72)'; g.fillRect(p.x - 26, p.y - 46, 52, 40);
        ink.text(g, m.ch, p.x - 10, p.y - 16, { font: ink.cond(26, 700), color: '#fff4e6', align: 'center' });
        ink.text(g, '#' + (i + 1), p.x + 12, p.y - 17, { font: ink.mono(13, 600), color: ink.accent, align: 'center' });
      });
      if (t > BREAK) {
        const p = proj(P('R3', .02).lerp(P('R6', .02), .5)); if (p) { const k = ss(BREAK, BREAK + .2, t) * gl; g.save(); g.globalAlpha *= k; ink.line(g, [[p.x - 14, p.y - 14], [p.x + 14, p.y + 14]], ink.warn, 4); ink.line(g, [[p.x - 14, p.y + 14], [p.x + 14, p.y - 14]], ink.warn, 4); ink.text(g, '线路中断', p.x + 24, p.y - 12, { font: ink.sans(19, 600), color: ink.warn }); g.restore(); }
      }
      if (t > 37.7 && t < 39.6) { const p = proj(P('R3', .1)); if (p) { g.save(); g.globalAlpha *= ss(37.7, 37.9, t) * (1 - ss(39.2, 39.6, t)); ink.text(g, '改走另一条路', p.x - 70, p.y + 52, { font: ink.sans(18, 600), color: ink.accent, align: 'right' }); g.restore(); } }
    } });
    // 电路交换面板
    ctx.draw2d({ shot: shC, t0: 24.9, t1: 30.7, draw(g, t) {
      const x = 1330, y = 118, w = 500, h = 220, bx = x + 26, bw = w - 52;
      g.fillStyle = 'rgba(8,9,10,.78)'; g.fillRect(x, y, w, h); ink.corners(g, x, y, w, h, 12, ink.dim);
      ink.text(g, '电路交换 · CIRCUIT SWITCHING', bx, y + 36, { font: ink.mono(16), color: ink.dim });
      ink.text(g, '整条通路', bx, y + 76, { font: ink.sans(18) });
      const u = clamp((t - C0) / (C1 - C0));
      g.fillStyle = 'rgba(255,122,48,.75)'; g.fillRect(bx, y + 88, bw * u, 16); ink.rect(g, bx, y + 88, bw, 16, ink.faint, 1);
      ink.text(g, '一直被这一通电话占着', bx + bw, y + 76, { font: ink.sans(16), color: ink.dim, align: 'right' });
      ink.text(g, '真正在传声音', bx, y + 146, { font: ink.sans(18) });
      ink.rect(g, bx, y + 158, bw, 16, ink.faint, 1); g.fillStyle = ink.white;
      for (const [s0, s1] of TALK) { const a0 = clamp((s0 - C0) / (C1 - C0)), a1 = clamp((Math.min(t, s1) - C0) / (C1 - C0)); if (a1 > a0) g.fillRect(bx + bw * a0, y + 158, bw * (a1 - a0), 16); }
      ink.line(g, [[bx + bw * u, y + 152], [bx + bw * u, y + 180]], ink.accent, 2);
      g.save(); g.globalAlpha *= ss(27.0, 27.5, t); ink.text(g, '大部分时间空闲', bx, y + 204, { font: ink.sans(18, 600), color: ink.accent }); g.restore();
    } });
    // 分组交换面板 + 接收端拼合
    ctx.draw2d({ shot: shC, t0: 30.9, t1: 43.7, draw(g, t) {
      let x = 1330, y = 118, w = 500, h = 118;
      g.fillStyle = 'rgba(8,9,10,.78)'; g.fillRect(x, y, w, h); ink.corners(g, x, y, w, h, 12, ink.dim);
      ink.text(g, '分组交换 · PACKET SWITCHING', x + 26, y + 36, { font: ink.mono(16), color: ink.dim });
      g.fillStyle = 'rgba(8,9,10,.9)'; g.fillRect(x + 26, y + 56, 52, 40); g.strokeStyle = ink.accent; g.lineWidth = 1.5; g.strokeRect(x + 26, y + 56, 52, 40);
      ink.text(g, 'L', x + 42, y + 86, { font: ink.cond(26, 700), color: '#fff4e6', align: 'center' }); ink.text(g, '#1', x + 64, y + 85, { font: ink.mono(13, 600), color: ink.accent, align: 'center' });
      ink.text(g, '每个包：数据 + 目的地址 + 序号', x + 96, y + 84, { font: ink.sans(18) });
      // 拼合槽
      x = 1330; y = 700; w = 500; h = 150;
      g.fillStyle = 'rgba(8,9,10,.8)'; g.fillRect(x, y, w, h); ink.corners(g, x, y, w, h, 12, ink.dim);
      ink.text(g, '接收方 B · 按序号拼合', x + 26, y + 34, { font: ink.mono(16), color: ink.dim });
      const order = ORDER.filter(i => t >= MSG[i].arrive).map(i => MSG[i].ch).join(' '), done = ss(DONE + .2, DONE + .6, t);
      if (done < .5) ink.text(g, order ? '到达顺序：' + order : '', x + w - 26, y + 34, { font: ink.sans(16), color: ink.dim, align: 'right' });
      else ink.text(g, '✓ 拼好：LOGIN', x + w - 26, y + 36, { font: ink.sans(19, 600), color: ink.accent, align: 'right' });
      MSG.forEach((m, i) => {
        const sx = x + 26 + i * 78, sy = y + 52, got = ss(m.arrive, m.arrive + .25, t);
        ink.rect(g, sx, sy, 64, 64, got > .5 ? ink.accent : ink.faint, 1.4);
        ink.text(g, '#' + (i + 1), sx + 32, sy + 84, { font: ink.mono(13), color: ink.dim, align: 'center' });
        if (got > 0) { g.save(); g.globalAlpha *= got; ink.text(g, m.ch, sx + 32, sy + 48, { font: ink.cond(40, 700), color: '#fff4e6', align: 'center' }); g.restore(); }
      });
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); for (const k of NAMES) ctx.cue(APPEAR[k], 'blip', 900, .05); ctx.cue(3.9, 'swoosh', .25);
    ctx.cue(6.4, 'whoosh', 1.1, .25); ctx.cue(7.2, 'riser', 1.8, .1);
    for (const [ch, t0] of KEYS) { ctx.cue(t0, 'clack', .55); if (ch !== 'G') ctx.cue(t0 + FLY, 'blip', 1100, .06); }
    ctx.cue(CRASH, 'glitch', .7); ctx.cue(17.0, 'sub', .25);
    ctx.cue(18.8, 'swoosh', .25); ctx.cue(20.3, 'tick', .7);
    ctx.cue(24.4, 'whoosh', 1.0, .25); for (const [s0] of TALK) ctx.cue(s0, 'tap', .7);
    ctx.cue(31.0, 'blip', 700, .05); MSG.forEach(m => { ctx.cue(m.depart, 'tick', .6); ctx.cue(m.arrive, 'blip', 1000 + 80 * MSG.indexOf(m), .05); });
    ctx.cue(BREAK, 'spark', .6); ctx.cue(DONE + .2, 'chime', 880, .07); ctx.cue(43.7, 'riser', 2.0, .12);
  },
};
