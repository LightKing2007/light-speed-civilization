/* 09 · 第一句话（1969）
   A1 夜里的美国（NASA 夜景 + 极淡的州界）：1969 年 12 月 ARPANET 的四个节点依次亮起、连线
   A2 IMP（接口信息处理机）真实照片
   B1 加州近景：UCLA → SRI 的线路；L、O 沿线飞到 SRI，G 送到时 SRI 主机崩溃（红色警示）；两端是终端面板
   B2 IMP 日志真实照片，高亮「22:30 talked to SRI host to host」
   C  网络沙盘：电路交换（一条通路被独占、大部分时间空闲）→ 分组交换（LOGIN 拆成五个带序号的包各自寻路）
      → 一条线路断开（红），包绕道 → 终点按序号拼回 LOGIN → 网络开始生长
   道具在 src/props/09/net.js。所有动画都是 t 的纯函数。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒；面板底色不透明度 ≥ .82，
   主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。
   A1 只看四个点亮起、连线（章节卡占着左边，不再加地名小字）；IMP 照片延长到 4.5 秒，署名条停够时间；
   B1 只留两端地名 + 一个「斯坦福研究所收到」面板；字母提前飞，崩溃画面停够 3.5 秒；C 的三个面板依次出现在右上角同一位置。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam, gcArc, ll } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { usStates, SITES, LINKS69, LINKS, buildBoard, nodePos, Y_PKT } from '../props/09/net.js';
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h, edge = 'rgba(235,235,230,.22)', lw = 1) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, edge, lw); };
/** 带暗底的一行字（地图、沙盘上的地名 / 角色名） */
const tag = (g, s, x, y, { font = ink.sans(26, 600), color = TXT, align = 'left', h = 26 } = {}) => {
  g.font = font; const w = g.measureText(s).width, x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  g.fillStyle = 'rgba(8,10,14,.84)'; g.fillRect(x0 - 10, y - h - 5, w + 20, h + 16); ink.text(g, s, x, y, { font, color, align });
};
/** 署名条（左下，约 x 132–，y 720–850）后面的暗底：画在 Canvas 层，位于署名条 DOM 之下 */
const lowerScrim = (ctx, t0, t1, w) => ctx.draw2d({ t0, t1, fade: .4, draw(g) { const gr = g.createLinearGradient(100, 0, 100 + w, 0); gr.addColorStop(0, 'rgba(6,8,10,.78)'); gr.addColorStop(.75, 'rgba(6,8,10,.6)'); gr.addColorStop(1, 'rgba(6,8,10,0)'); g.fillStyle = gr; g.fillRect(100, 706, w, 160); } });

/* ---------- 镜头切点 ---------- */
const A2 = 3.2, B1 = 7.0, B2 = 19.4;   // IMP 照片、加州近景、IMP 日志

/* ---------- B1：LOGIN 的前三个字母 ---------- */
const KEYS = [['L', 12.9], ['O', 13.9], ['G', 14.9]], FLY = 1.0, CRASH = 14.9 + FLY;   // 崩溃画面停到 B2 之前 3.5 秒

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
    const NAMES = Object.keys(SITES), APPEAR = { UCLA: .7, SRI: 1.1, UCSB: 1.5, UTAH: 1.9 };
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
      arcs69.forEach((m, i) => { m.visible = mode === 'A'; m.set({ head: easeIO(ss(2.0 + i * .2, 2.8 + i * .2, t)) }); });
      main.visible = mode === 'B'; main.set({ head: easeIO(ss(B1 + .6, B1 + 2.4, t)), opacity: t > CRASH ? lerp(.95, .35, ss(CRASH, CRASH + .4, t)) : .95 });
      states.material.opacity = mode === 'A' ? .2 : .12;
    };
    const camA = KIT.cam(34, .01, 400);
    const pA1 = camPath([[0, LL(31.5, -103, 5.6), LL(38.5, -104), 34], [4.2, LL(32, -110, 4.6), LL(38, -112.5), 34]]);
    const shA = ctx.shot({ name: '09.A1 美国', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: sE, camera: camA,
      post: { exposure: 1.2, grade: ctx.grade.night, vignette: .3, grain: .02, bloom: { strength: .2 } },
      update(t) { applyCam(camA, pA1(t), t, 0); setEarth(t, camA, 'A'); } });
    /* ================= A2 · IMP 照片 ================= */
    const phI = await KIT.photoShot('assets/photos/act3/imp_bbn_ddp516_jurvetson.jpg', { from: { x: 0, y: .76, s: 1.02 }, to: { x: 0, y: .6, s: 1.12 } });
    ctx.shot({ name: '09.A2 IMP', t0: A2, in: { type: 'dissolve', dur: .7 }, scene: phI.scene, camera: phI.camera,
      post: { exposure: 1.0, grade: ctx.grade.warm, vignette: .36, grain: .03 }, update(t) { phI.update((t - A2) / (B1 + .7 - A2)); } });
    lowerScrim(ctx, A2 + .3, B1 + .8, 640);
    ctx.lower({ t0: A2 + .3, t1: B1 + .8, name: 'IMP（接口信息处理机）', meta: '每个节点一台，专门负责转发数据', credit: '照片：Steve Jurvetson · CC BY 2.0' });

    /* ================= B1 · L、O……崩溃 ================= */
    const camB = KIT.cam(34, .005, 400);
    const pB1 = camPath([[B1, LL(31.5, -116.5, 1.9), LL(36.2, -120), 34], [B1 + 4, LL(32.4, -118.6, 1.25), LL(36, -120.4), 34], [B2 + .8, LL(32.6, -119.2, 1.1), LL(35.9, -120.5), 34]]);
    const shB = ctx.shot({ name: '09.B1 LO', t0: B1, in: { type: 'dissolve', dur: .7 }, scene: sE, camera: camB,
      post: { exposure: 1.3, grade: ctx.grade.night, vignette: .3, grain: .02, bloom: { strength: .22 } },
      update(t) { applyCam(camB, pB1(t), t, 0); setEarth(t, camB, 'B'); } });
    // 两端地名、飞行中的字母、崩溃警示（「约 500 公里」字幕里已经讲了，不再标）
    ctx.draw2d({ shot: shB, t0: B1 + .6, t1: B2 + .5, draw(g, t, a, proj) {
      const pu = proj(sitePos('UCLA')), ps = proj(sitePos('SRI')), red = ss(CRASH, CRASH + .15, t);
      if (pu) tag(g, 'UCLA', pu.x + 26, pu.y - 22);
      if (ps) {
        tag(g, '斯坦福研究所', ps.x - 22, ps.y - 24, { align: 'right', color: red > .5 ? '#ff8a7a' : TXT });
        if (red > 0) { const u = ((t - CRASH) % 1.2) / 1.2; g.save(); g.globalAlpha *= red * (1 - u); g.strokeStyle = ink.warn; g.lineWidth = 3; g.beginPath(); g.arc(ps.x, ps.y, 12 + 44 * u, 0, 7); g.stroke(); g.restore(); g.fillStyle = ink.warn; g.beginPath(); g.arc(ps.x, ps.y, 8, 0, 7); g.fill(); }
      }
      for (const [ch, t0] of KEYS) {
        const u = (t - t0) / FLY; if (u < 0 || u > 1.25) continue;
        const crash = ch === 'G', k = crash ? 1 - ss(1, 1.2, u) : 1 - ss(1, 1.12, u), p = proj(arcAt(Math.min(1, u)));
        if (!p) continue;
        g.save(); g.globalAlpha *= k;
        for (let j = 1; j <= 8; j++) { const q = proj(arcAt(Math.max(0, Math.min(1, u) - j * .025))); if (!q) continue; g.fillStyle = `rgba(255,190,120,${.35 * (1 - j / 9)})`; g.beginPath(); g.arc(q.x, q.y, 4.5 - j * .4, 0, 7); g.fill(); }
        g.shadowColor = crash && u > 1 ? ink.warn : 'rgba(255,170,90,.9)'; g.shadowBlur = 18;
        ink.text(g, ch, p.x, p.y + 16, { font: ink.cond(56, 700), color: crash && u > 1 ? ink.warn : '#fff4e6', align: 'center' });
        g.restore();
      }
    } });
    // 接收端面板：斯坦福研究所收到了什么（只留一个面板；发送端的打字过程由飞行的字母表现）
    ctx.draw2d({ shot: shB, t0: 11.8, t1: B2 + .5, draw(g, t) {
      const got = KEYS.filter(([c, t0]) => c !== 'G' && t >= t0 + FLY).map(([c]) => c).join(''), crash = t >= CRASH;
      const X = 80, Y = 380, Wd = 420, H = 214, red = ss(CRASH, CRASH + .15, t), lo = ss(CRASH + .7, CRASH + 1.1, t);
      panelBox(g, X, Y, Wd, H, red > .5 ? ink.warn : 'rgba(235,235,230,.22)', red > .5 ? 2.4 : 1);
      if (red > 0) { g.fillStyle = `rgba(255,77,61,${.14 * red})`; g.fillRect(X, Y, Wd, H); }
      ink.text(g, '斯坦福研究所收到：', X + 26, Y + 50, { font: ink.sans(26, 600), color: TXT });
      if (got) ink.text(g, got, X + 26, Y + 142, { font: ink.cond(84, 700), color: lo > .5 ? ink.accent : TXT });
      if (crash) ink.text(g, '系统崩溃', X + 26, Y + 192, { font: ink.sans(26, 700), color: '#ff8a7a' });
      else if (!got) ink.text(g, '等待中…', X + 26, Y + 132, { font: ink.sans(26), color: TXT2 });
    } });

    /* ================= B2 · IMP 日志 ================= */
    const phL = await KIT.photoShot('assets/photos/act3/imp_log_1969_10_29.jpg', { from: { x: 0, y: -.05, s: 1.02 }, to: { x: 0, y: -.35, s: 1.5 } });
    const shL = ctx.shot({ name: '09.B2 IMP 日志', t0: B2, in: { type: 'dissolve', dur: .8 }, scene: phL.scene, camera: phL.camera,
      post: { exposure: 1.0, grade: ctx.grade.warm, vignette: .4, grain: .03 }, update(t) { phL.update((t - B2) / (25.4 - B2)); } });
    /** 照片上的点（u, v ∈ 0..1，v 从上往下）→ 屏幕像素（1920 × 1080） */
    const photoPx = (ph, u, v) => { const m = ph.mesh, gp = m.geometry.parameters, s = m.scale.x, fa = 1920 / 1080; const X = m.position.x + (u - .5) * gp.width * s, Y = m.position.y + (.5 - v) * gp.height * s; return [(X / fa + 1) / 2 * 1920, (1 - Y) / 2 * 1080]; };
    // 高亮那一行日志 + 一行中文说明（放在框的右下方，避开左下的署名条）
    ctx.draw2d({ shot: shL, t0: B2 + .8, t1: 24.7, draw(g, t) {
      const [x0, y0] = photoPx(phL, .3, .53), [x1, y1] = photoPx(phL, .695, .63), e = easeIO(ss(B2 + .8, B2 + 1.4, t));
      g.strokeStyle = ink.accent; g.lineWidth = 4; g.strokeRect(x0, y0, (x1 - x0) * e, y1 - y0);
      g.save(); g.globalAlpha *= ss(B2 + 1.0, B2 + 1.4, t);
      const s1 = '22:30 · 与 SRI 主机连通'; g.font = ink.sans(30, 700);
      const w = g.measureText(s1).width + 44, bx = Math.max(x1 - w, 700), by = y1 + 16;   // 和框的右边对齐，离左下署名条远一些
      g.fillStyle = 'rgba(8,10,14,.88)'; g.fillRect(bx, by, w, 60);
      ink.text(g, s1, bx + 22, by + 41, { font: ink.sans(30, 700), color: ink.accent });
      g.restore();
    } });
    lowerScrim(ctx, B2 + .2, B2 + 4.5, 620);
    ctx.lower({ t0: B2 + .2, t1: B2 + 4.5, name: 'IMP 日志', meta: 'UCLA · 1969 年 10 月 29 日', credit: '照片：Andrew Adams（FastLizard4）· CC BY-SA 2.0' });

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
      post: { exposure: 1.22, ao: { radius: .15, intensity: .8 }, dof: { focus: 8, aperture: .0012, maxBlur: 6 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .16 } },
      update(t) { setBoard(t); const c = pC(t); applyCam(camC, c, t, .0004); shC.post.dof.focus = camC.position.distanceTo(c.l); } });
    // 端点角色、包上的字母与序号、断线标记（「改走另一条路」字幕已讲，去掉）
    ctx.draw2d({ shot: shC, t0: 24.7, t1: 46.2, draw(g, t, a, proj) {
      const gl = 1 - ss(43.6, 44.2, t);
      // 角色名放在主机下方：包的标记在包的上方，到达接收方时不会压住它
      for (const k of ['S', 'D']) {
        const p = proj(P(k, 0)); if (!p) continue;
        g.save(); g.globalAlpha *= gl;
        tag(g, k === 'S' ? '用户 A' : '用户 B', p.x, p.y + 82, { align: 'center' });   // 两种交换方式用同一对名字，不中途换字
        g.restore();
      }
      /* 包的标记（字母 + 序号）：还在用户 A 处排队时排成一行「L O G I N」放在发送方上方，出发后 0.35 秒内移到包的正上方跟着走 */
      const chip = (m, i, x, y) => {
        g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x - 44, y - 50, 88, 50); ink.rect(g, x - 44, y - 50, 88, 50, 'rgba(255,122,48,.6)', 1.2);
        ink.text(g, m.ch, x - 16, y - 11, { font: ink.cond(36, 700), color: '#fff4e6', align: 'center' });
        ink.text(g, '#' + (i + 1), x + 20, y - 13, { font: ink.mono(21, 700), color: ink.accent, align: 'center' });
      };
      const pS = proj(P('S', .36));
      if (t > 30.9 && t < 43.6 && pS) MSG.forEach((m, i) => {
        const st = msgPos(i, t); if (!st || st.sink > .5) return; const p = proj(st.p.clone().add(V(0, .16, 0))); if (!p) return;
        const qx = Math.max(92, pS.x - 140) + i * 96, qy = pS.y - 40, k = easeIO(ss(m.depart, m.depart + .35, t));
        g.save(); g.globalAlpha *= ss(30.95 + i * .08, 31.25 + i * .08, t); chip(m, i, lerp(qx, p.x, k), lerp(qy, p.y - 10, k)); g.restore();
      });
      if (t > BREAK) {
        const p = proj(P('R3', .02).lerp(P('R6', .02), .5)); if (p) { const k = ss(BREAK, BREAK + .2, t) * gl; g.save(); g.globalAlpha *= k; ink.line(g, [[p.x - 16, p.y - 16], [p.x + 16, p.y + 16]], ink.warn, 5); ink.line(g, [[p.x - 16, p.y + 16], [p.x + 16, p.y - 16]], ink.warn, 5); tag(g, '线路中断', p.x + 30, p.y - 14, { color: '#ff8a7a' }); g.restore(); }
      }
    } });
    /* 右上角同一位置依次出现三块面板：电路交换 → 分组交换（怎么读包上的标记）→ 接收方按序号拼回 */
    const PX = 1350, PY = 112, PW = 480;
    ctx.draw2d({ shot: shC, t0: 25.5, t1: 30.7, draw(g, t) {
      const bx = PX + 26, bw = PW - 52, u = clamp((t - C0) / (C1 - C0));
      panelBox(g, PX, PY, PW, 216);
      ink.text(g, '电路交换：一直占线，很少说话', bx, PY + 48, { font: ink.sans(26, 600), color: TXT });
      ink.text(g, '占着线路', bx, PY + 98, { font: ink.sans(22), color: TXT2 });
      g.fillStyle = 'rgba(255,122,48,.85)'; g.fillRect(bx, PY + 110, bw * u, 20); ink.rect(g, bx, PY + 110, bw, 20, 'rgba(235,235,230,.35)', 1);
      ink.text(g, '真正说话', bx, PY + 166, { font: ink.sans(22), color: TXT2 });
      ink.rect(g, bx, PY + 178, bw, 20, 'rgba(235,235,230,.35)', 1); g.fillStyle = ink.white;
      for (const [s0, s1] of TALK) { const a0 = clamp((s0 - C0) / (C1 - C0)), a1 = clamp((Math.min(t, s1) - C0) / (C1 - C0)); if (a1 > a0) g.fillRect(bx + bw * a0, PY + 178, bw * (a1 - a0), 20); }
      ink.line(g, [[bx + bw * u, PY + 172], [bx + bw * u, PY + 204]], ink.accent, 2.4);
    } });
    ctx.draw2d({ shot: shC, t0: 31.8, t1: 36.0, draw(g) {
      panelBox(g, PX, PY, PW, 146);
      ink.text(g, '分组交换：拆成小包，各自寻路', PX + 26, PY + 48, { font: ink.sans(26, 600), color: TXT });
      const sx = PX + 26, sy = PY + 76;
      g.fillStyle = 'rgba(8,10,14,.9)'; g.fillRect(sx, sy, 88, 50); ink.rect(g, sx, sy, 88, 50, 'rgba(255,122,48,.6)', 1.2);
      ink.text(g, 'L', sx + 28, sy + 39, { font: ink.cond(36, 700), color: '#fff4e6', align: 'center' }); ink.text(g, '#1', sx + 64, sy + 37, { font: ink.mono(21, 700), color: ink.accent, align: 'center' });
      ink.text(g, '字母是数据，#1 是序号', sx + 108, sy + 34, { font: ink.sans(24), color: TXT });
    } });
    ctx.draw2d({ shot: shC, t0: 36.0, t1: 43.7, draw(g, t) {
      const done = ss(DONE + .2, DONE + .6, t);
      panelBox(g, PX, PY, PW, 200);
      ink.text(g, done > .5 ? '用户 B 按序号拼回：✓' : '用户 B 按序号拼回', PX + 26, PY + 48, { font: ink.sans(26, 600), color: done > .5 ? ink.accent : TXT });
      MSG.forEach((m, i) => {
        const sx = PX + 26 + i * 88, sy = PY + 72, got = ss(m.arrive, m.arrive + .25, t);
        g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(sx, sy, 72, 72); ink.rect(g, sx, sy, 72, 72, got > .5 ? ink.accent : 'rgba(235,235,230,.35)', got > .5 ? 2 : 1.2);
        ink.text(g, '#' + (i + 1), sx + 36, sy + 100, { font: ink.mono(21, 600), color: TXT2, align: 'center' });
        if (got > 0) { g.save(); g.globalAlpha *= got; ink.text(g, m.ch, sx + 36, sy + 54, { font: ink.cond(48, 700), color: '#fff4e6', align: 'center' }); g.restore(); }
      });
    } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); for (const k of NAMES) ctx.cue(APPEAR[k], 'blip', 900, .05); ctx.cue(A2, 'swoosh', .25);
    ctx.cue(B1, 'whoosh', 1.1, .25); ctx.cue(B1 + .6, 'riser', 1.8, .1);
    for (const [ch, t0] of KEYS) { ctx.cue(t0, 'clack', .55); if (ch !== 'G') ctx.cue(t0 + FLY, 'blip', 1100, .06); }
    ctx.cue(CRASH, 'glitch', .7); ctx.cue(CRASH + .7, 'sub', .25);
    ctx.cue(B2, 'swoosh', .25); ctx.cue(B2 + .5, 'tick', .7);
    ctx.cue(24.4, 'whoosh', 1.0, .25); for (const [s0] of TALK) ctx.cue(s0, 'tap', .7);
    ctx.cue(31.0, 'blip', 700, .05); MSG.forEach(m => { ctx.cue(m.depart, 'tick', .6); ctx.cue(m.arrive, 'blip', 1000 + 80 * MSG.indexOf(m), .05); });
    ctx.cue(BREAK, 'spark', .6); ctx.cue(DONE + .2, 'chime', 880, .07); ctx.cue(43.7, 'riser', 2.0, .12);
  },
};
