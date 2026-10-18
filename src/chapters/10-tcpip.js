/* 10 · 通用语言（1974 – 1983）
   A  三种网络各说各话：ARPANET（有线）、PRNET（无线电分组网）、SATNET（卫星网），外来的包撞上边界被拒收
   B  桌上：瑟夫与卡恩的照片 + 1974 年论文首页（排印复原）
   C1 封装：数据「GET /」→ 套上 TCP 头（端口、序号）→ IP 头（地址、TTL）→ Wi-Fi 帧头 / 帧尾；右侧是真实字段排布
   C2 路由器只拆到 IP 层：去掉帧头，TTL 64 → 63，查路由表，换上新的帧头转发
   D  丢包重传：段 #2 丢失，发送方等不到确认，计时器到点后重发；接收方按序号排好
   D2 分层：底层在光纤 / Wi-Fi / 5G 之间切换，上面的 IP / TCP / 数据不变
   E  1983-01-01 FLAG DAY：反色处理的 1977 年 ARPANET 逻辑图
   道具在 src/props/10/proto.js。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildIslands, buildLab, ISLES, COL, PK, SEG, LAB } from '../props/10/proto.js';

/* ---------- 封装 / 路由的节拍 ---------- */
const ENC = { data: 13.1, tcp: 14.0, ip: 15.7, link: 17.3 }, SLIDE = .6;
const R_IN = [19.4, 20.4], STRIP = [20.6, 21.2], TTL_AT = 21.8, LOOKUP = 22.3, RELINK = [23.2, 23.8], R_OUT = [24.2, 25.6];
/* ---------- 重传 ---------- */
const TRAVEL = 1.4, LOSS = .55, TIMEOUT = 29.3;
const SEGS = [{ n: 1, t: 26.0 }, { n: 2, t: 26.35, lost: true }, { n: 3, t: 26.7 }, { n: 2, t: TIMEOUT, re: true }];
const ACKS = [{ label: 'ACK 1', t: 27.5 }, { label: 'ACK 3 · 全部收到', t: TIMEOUT + TRAVEL + .2 }];
/* ---------- 分层 ---------- */
const MEDIA = [['fiber', 32.0, '光纤'], ['wifi', 34.0, 'Wi-Fi'], ['g5', 36.0, '5G']];
const mediaAt = t => (t < MEDIA[1][1] ? MEDIA[0] : t < MEDIA[2][1] ? MEDIA[1] : MEDIA[2]);

export default {
  id: '10', status: 'implemented', slug: 'tcpip', title: '通用语言', dur: 44,
  card: {"title": "通用语言", "short": "通用语言", "meta": "TCP/IP · 1974 — 1983"},
  stamps: [[0, "1974"], [38.4, "1983"]],
  caps: [[0.4, 6.4, "70 年代，无线电分组网、卫星网也纷纷出现，可它们彼此「语言」不通。"], [6.8, 12.6, "1974 年，瑟夫和卡恩提出 TCP——后来拆分成 TCP/IP，让任何网络都能互联。"], [13.0, 19.0, "数据每往下交一层，就套上一层「信封」：TCP 写上端口和序号，IP 写上收发地址。"], [19.4, 25.4, "沿途的路由器只拆到 IP 这一层：看一眼目的地址，查表，转发出去。"], [25.8, 31.6, "如果某个包在途中丢失，收不到确认的 TCP 会自动重发——可靠，就是这样「补」出来的。"], [32.0, 38.0, "分层的好处是：底层换成光纤、Wi-Fi 还是 5G，上层的程序都不必改变。"], [38.4, 43.8, "1983 年 1 月 1 日，ARPANET 正式切换到 TCP/IP。许多人把这一天看作互联网的生日。"]],
  credits: ['assets/photos/act3/vint_cerf_2010.jpg', 'assets/photos/act3/bob_kahn_2010_itu.jpg', 'assets/photos/act3/arpanet_logical_map_1977_03.png'],
  async build(ctx) {
    const { KIT, A } = ctx;

    /* ================= A · 各说各话 ================= */
    const IS = buildIslands(KIT);
    const orbit = (k, i, t) => { const a = t * .9 + i * Math.PI / 2, x = ISLES[k].x; return V(x + Math.cos(a) * .82, .45 + .06 * Math.sin(t * 2 + i), Math.sin(a) * .82); };
    // 闯进别的网络的包：撞上边界后弹回
    const VISIT = [{ from: 'arpa', to: 'prnet', t0: 2.0 }, { from: 'prnet', to: 'satnet', t0: 3.7 }];
    const visitPos = (v, t) => { const x0 = ISLES[v.from].x + .9, xb = ISLES[v.to].x - 1.17 - .08, u = t - v.t0; if (u < 0 || u > 1.6) return null; const x = u < .8 ? lerp(x0, xb, easeIO(u / .8)) : lerp(xb, x0 + .2, easeIO((u - .8) / .8)); return V(x, .45 + .25 * Math.sin(Math.PI * clamp(u / .8)), .1); };
    const setIslands = t => {
      for (const k of Object.keys(ISLES)) IS.pkts[k].forEach((m, i) => { if (i === 3) return; m.visible = true; m.position.copy(orbit(k, i, t)); m.rotation.set(t * .7 + i, t * .9, 0); });
      VISIT.forEach((v, j) => { const m = IS.pkts[v.from][3], p = visitPos(v, t); m.visible = !!p; if (p) { m.position.copy(p); m.rotation.set(t, t * 1.3, 0); } const hit = t - v.t0 - .8; IS.isles[v.to].wall.material.opacity = hit > 0 && hit < .9 ? .22 * (1 - hit / .9) : 0; });
      IS.waves.forEach((w, i) => { const u = ((t * .7 + i / 3) % 1); w.scale.setScalar(1 + 2.6 * u); w.material.opacity = .5 * (1 - u); });
      IS.sat.rotation.y = t * .1;
    };
    const camA = KIT.cam(32, .05, 80);
    const pA = camPath([[0, [-.7, 4.6, 11.2], [0, .55, 0], 32], [6.8, [.5, 4.0, 10.0], [.1, .55, 0], 32]]);
    const shA = ctx.shot({ name: '10.A 各说各话', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: IS.scene, camera: camA,
      post: { exposure: 1.05, ao: { radius: .2, intensity: .8 }, grade: ctx.grade.cool, vignette: .34, bloom: { strength: .16 } },
      update(t) { setIslands(t); applyCam(camA, pA(t), t, .0004); } });
    const ISL = { arpa: ['ARPANET', '有线 · 租用电话线路'], prnet: ['PRNET', '无线电分组网'], satnet: ['SATNET', '卫星网'] };
    ctx.draw2d({ shot: shA, t0: .6, t1: 6.7, draw(g, t, a, proj) {
      for (const [k, [n, d]] of Object.entries(ISL)) { const p = proj(V(ISLES[k].x, 0, 1.25)); if (!p) continue; ink.text(g, n, p.x, p.y + 34, { font: ink.mono(20, 600), align: 'center' }); ink.text(g, d, p.x, p.y + 60, { font: ink.sans(17), color: ink.dim, align: 'center' }); }
      for (const v of VISIT) { const hit = t - v.t0 - .8; if (hit < 0 || hit > 1.6) continue; const p = proj(V(ISLES[v.to].x - 1.17, .9, .1)); if (!p) continue; g.save(); g.globalAlpha *= ss(0, .15, hit) * (1 - ss(1.2, 1.6, hit)); ink.line(g, [[p.x - 11, p.y - 11], [p.x + 11, p.y + 11]], ink.warn, 3.5); ink.line(g, [[p.x - 11, p.y + 11], [p.x + 11, p.y - 11]], ink.warn, 3.5); ink.text(g, '格式不同 · 无法识别', p.x, p.y - 22, { font: ink.sans(18, 600), color: ink.warn, align: 'center' }); g.restore(); }
      const d0 = proj(V(ISLES.satnet.x, 1.0, 0)), s0 = proj(IS.sat.getWorldPosition(V()));
      if (d0 && s0) { g.save(); g.setLineDash([6, 8]); ink.line(g, [[d0.x, d0.y], [s0.x, s0.y]], 'rgba(126,224,138,.5)', 1.5); g.restore(); }
    } });

    /* ================= 实验台（B、C、D、D2、E 共用） ================= */
    const [cerf, kahn, mapImg] = await Promise.all([A.tex('assets/photos/act3/vint_cerf_2010.jpg', { aniso: 16 }), A.tex('assets/photos/act3/bob_kahn_2010_itu.jpg', { aniso: 16 }), A.image('assets/photos/act3/arpanet_logical_map_1977_03.png')]);
    const L = buildLab(KIT, { cerf, kahn, mapImg }), P = L.parts;
    const MID = Object.fromEntries(Object.entries(SEG).map(([k, [a, b]]) => [k, (a + b) / 2]));
    /** 包的完整状态：位置、各层进入进度（0..1）、外壳、帧头被拆掉的进度、链路类型、TTL */
    const setPacket = ({ x = 0, y = 0, z = 0, enc = {}, shell = {}, strip = 0, kind = 'wifi', ttl = 64, glow = 0, show = true }) => {
      L.pk.visible = show; if (!show) return;
      L.pk.position.set(x, PK.y + y, z); L.setIP(ttl); L.setLink(kind);
      for (const k of ['data', 'tcp', 'ip', 'link', 'fcs']) {
        const kk = k === 'fcs' ? 'link' : k, u = easeIO(clamp(enc[kk] ?? 1)), off = kk === 'link' ? strip : 0, p = P[k];
        p.group.visible = u > .002 && off < .998;
        if (k === 'data') p.group.scale.setScalar(Math.max(.001, u));
        else p.group.position.set(MID[k] + (k === 'fcs' ? 1 : -1) * 1.1 * (1 - u), .45 * (1 - u) + .7 * easeIO(off), 0);
        const op = 1 - off; p.body.material.opacity = op; p.group.children.slice(1).forEach(f => { f.material.opacity = op; });
        p.body.material.emissiveIntensity = .12 + (k === 'ip' ? glow : 0) * .6;
      }
      for (const k of ['tcp', 'ip', 'link']) L.shells[k].material.opacity = .14 * clamp(shell[k] ?? 1) * (k === 'link' ? 1 - strip : 1);
      L.shells.link.position.y = .7 * easeIO(strip);
    };
    const hideLab = () => { L.segs.forEach(m => { m.visible = false; }); L.acks.forEach(m => { m.visible = false; }); };
    const setMedia = kind => { L.media.fiber.visible = kind === 'fiber'; L.media.wifi.visible = kind === 'wifi'; L.media.g5.visible = kind === 'g5'; };

    /* ================= B · 瑟夫与卡恩 ================= */
    const camB = KIT.cam(30, .05, 80), D0 = LAB.desk;
    const pB = camPath([[6.8, [D0.x - .6, 6.4, D0.z + 3.6], [D0.x, 0, D0.z + .1], 30], [12.9, [D0.x + .3, 4.2, D0.z + 2.1], [D0.x, 0, D0.z - .2], 30]]);
    ctx.shot({ name: '10.B 瑟夫与卡恩', t0: 6.8, in: { type: 'dissolve', dur: .8 }, scene: L.scene, camera: camB,
      post: { exposure: 1.05, ao: { radius: .2, intensity: .7 }, dof: { focus: 6, aperture: .0015, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .36 },
      update(t) { L.aim(D0, .8); setPacket({ show: false }); hideLab(); setMedia(''); applyCam(camB, pB(t), t, .0003); } });
    ctx.lower({ t0: 7.2, t1: 9.8, name: '温顿·瑟夫（左）与罗伯特·卡恩（右）', meta: 'TCP/IP 的两位设计者 · 照片摄于 2010 年', credit: '照片：Veni Markovski · CC BY 3.0；ITU Pictures · CC BY 2.0' });
    ctx.lower({ t0: 10.1, t1: 12.7, name: '《A Protocol for Packet Network Intercommunication》', meta: 'IEEE Transactions on Communications · 1974 年 5 月', credit: '按原刊首页版式排印复原（正文以灰条示意）' });

    /* ================= C1 / C2 · 封装与路由 ================= */
    const camC = KIT.cam(30, .05, 80);
    const pC = camPath([
      [12.8, [1.0, 3.4, 7.8], [1.6, .45, 0], 30], [19.0, [1.3, 3.1, 7.3], [1.6, .45, 0], 30],
      [20.4, [6.1, 3.3, 7.6], [6.5, .35, 0], 30], [24.0, [6.2, 3.1, 7.3], [6.5, .35, 0], 30], [25.8, [8.4, 3.1, 7.4], [8.8, .35, 0], 30],
    ]);
    const packetC = t => {
      const enc = { data: ss(ENC.data, ENC.data + .4, t), tcp: clamp((t - ENC.tcp) / SLIDE), ip: clamp((t - ENC.ip) / SLIDE), link: clamp((t - ENC.link) / SLIDE) };
      const shell = { tcp: ss(ENC.tcp + .4, ENC.tcp + .9, t), ip: ss(ENC.ip + .4, ENC.ip + .9, t), link: ss(ENC.link + .4, ENC.link + .9, t) };
      let x = 0, strip = 0, kind = 'wifi';
      if (t > R_IN[0]) x = lerp(0, LAB.router.x, easeIO(clamp((t - R_IN[0]) / (R_IN[1] - R_IN[0]))));
      if (t > STRIP[0]) strip = clamp((t - STRIP[0]) / (STRIP[1] - STRIP[0]));
      if (t > RELINK[0]) { kind = 'eth'; strip = 0; enc.link = clamp((t - RELINK[0]) / (RELINK[1] - RELINK[0])); shell.link = ss(RELINK[0] + .3, RELINK[1], t); }
      if (t > R_OUT[0]) x = lerp(LAB.router.x, LAB.router.x + 4.6, easeIO(clamp((t - R_OUT[0]) / (R_OUT[1] - R_OUT[0]))));
      return { x, enc, shell, strip, kind, ttl: t < TTL_AT ? 64 : 63, glow: ss(21.2, 21.6, t) * (1 - ss(23.0, 23.6, t)) };
    };
    const shC = ctx.shot({ name: '10.C 封装与路由', t0: 12.8, in: { type: 'dissolve', dur: .8 }, scene: L.scene, camera: camC,
      post: { exposure: 1.05, ao: { radius: .2, intensity: .8 }, dof: { focus: 6, aperture: .0012, maxBlur: 6 }, grade: ctx.grade.cool, vignette: .32, bloom: { strength: .14 } },
      update(t) {
        const c = pC(t); L.aim(V(c.l.x, 0, 0)); hideLab(); setMedia('');
        setPacket(packetC(t));
        L.leds.forEach((m, i) => { m.material.emissiveIntensity = i === 2 && t > R_OUT[0] ? (Math.floor(t * 8) % 2 ? 2.2 : .3) : .3 + .2 * Math.sin(t * 3 + i * 1.7); });
        applyCam(camC, c, t, .0003);
      } });
    ctx.callout({ shot: shC, at: V(LAB.router.x - 1.4, .5, 1.0), title: '路由器', sub: '只拆到 IP 这一层', t0: 20.2, t1: 22.4, side: 'left', dx: -120, dy: -120 });
    // 右侧：TCP 头、IPv4 头（20 字节）、链路层 / 路由表
    const cell = (g, x, y, w, h, name, val, col, hi = 0) => {
      g.fillStyle = hi > 0 ? `rgba(255,122,48,${.25 * hi})` : 'rgba(255,255,255,.03)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, col ? col + '88' : ink.faint, 1);
      ink.text(g, name, x + 8, y + 19, { font: ink.sans(14), color: ink.dim });
      if (val) ink.text(g, val, x + 8, y + h - 10, { font: ink.mono(w < 90 ? 15 : 17, 600), color: hi > .5 ? ink.accent : col || ink.white });
    };
    ctx.draw2d({ shot: shC, t0: ENC.tcp + .2, t1: 19.3, draw(g, t) {
      const x = 1150, y = 110, w = 680, bit = w / 32;
      g.fillStyle = 'rgba(8,12,20,.8)'; g.fillRect(x - 20, y - 14, w + 40, 196); ink.corners(g, x - 20, y - 14, w + 40, 196, 12, ink.dim);
      ink.text(g, 'TCP 头 · 前 12 字节', x, y + 12, { font: ink.mono(16), color: COL.tcp });
      cell(g, x, y + 26, 16 * bit, 48, '源端口', '52814', COL.tcp); cell(g, x + 16 * bit, y + 26, 16 * bit, 48, '目的端口', '80（网页）', COL.tcp);
      cell(g, x, y + 74, w, 48, '序号', '1001', COL.tcp); cell(g, x, y + 122, w, 48, '确认号', '…', null);
    } });
    ctx.draw2d({ shot: shC, t0: ENC.ip + .2, t1: 25.7, draw(g, t) {
      const x = 1150, y = 340, w = 680, bit = w / 32, rh = 46, ttl = t < TTL_AT ? '64' : '63', flip = ss(TTL_AT - .3, TTL_AT, t) * (1 - ss(TTL_AT + 1.4, TTL_AT + 2, t));
      g.fillStyle = 'rgba(8,12,20,.8)'; g.fillRect(x - 20, y - 14, w + 40, 5 * rh + 54); ink.corners(g, x - 20, y - 14, w + 40, 5 * rh + 54, 12, ink.dim);
      ink.text(g, 'IPv4 头 · 20 字节（每行 32 位）', x, y + 12, { font: ink.mono(16), color: COL.ip });
      const r0 = y + 26;
      cell(g, x, r0, 4 * bit, rh, '版本', '4'); cell(g, x + 4 * bit, r0, 4 * bit, rh, '首部长', '5'); cell(g, x + 8 * bit, r0, 8 * bit, rh, '服务类型', ''); cell(g, x + 16 * bit, r0, 16 * bit, rh, '总长度', '');
      cell(g, x, r0 + rh, 16 * bit, rh, '标识', ''); cell(g, x + 16 * bit, r0 + rh, 3 * bit, rh, '标志', ''); cell(g, x + 19 * bit, r0 + rh, 13 * bit, rh, '片偏移', '');
      cell(g, x, r0 + 2 * rh, 8 * bit, rh, 'TTL（生存跳数）', ttl, COL.ip, flip); cell(g, x + 8 * bit, r0 + 2 * rh, 8 * bit, rh, '协议', '6 = TCP', COL.ip); cell(g, x + 16 * bit, r0 + 2 * rh, 16 * bit, rh, '首部校验和', '');
      cell(g, x, r0 + 3 * rh, w, rh, '源地址', '192.168.1.7（家中局域网）', COL.ip);
      cell(g, x, r0 + 4 * rh, w, rh, '目的地址', '203.0.113.34', COL.ip, ss(LOOKUP - .3, LOOKUP, t) * (1 - ss(RELINK[0], RELINK[0] + .5, t)));
      if (t > TTL_AT - .3 && t < TTL_AT + 2) { g.save(); g.globalAlpha *= flip; ink.text(g, '每过一个路由器 −1，减到 0 就丢弃', x + 8 * bit + 8, r0 + 2 * rh - 8, { font: ink.sans(15, 600), color: ink.accent }); g.restore(); }
    } });
    ctx.draw2d({ shot: shC, t0: ENC.link + .2, t1: 19.3, draw(g) {
      const x = 1150, y = 650, w = 680;
      g.fillStyle = 'rgba(8,12,20,.8)'; g.fillRect(x - 20, y - 14, w + 40, 96); ink.corners(g, x - 20, y - 14, w + 40, 96, 12, ink.dim);
      ink.text(g, 'Wi-Fi 帧头 / 帧尾', x, y + 12, { font: ink.mono(16), color: COL.link });
      ink.text(g, '这一跳的收发硬件地址（MAC）· 帧尾是校验码', x, y + 52, { font: ink.sans(18) });
    } });
    ctx.draw2d({ shot: shC, t0: LOOKUP - .4, t1: 25.7, draw(g, t) {
      const x = 1150, y = 650, w = 680, rh = 38, ROWS = [['192.168.1.0/24', '本地 · 端口 1'], ['198.51.100.0/24', '10.0.0.2 · 端口 2'], ['203.0.113.0/24', '10.0.0.6 · 端口 3'], ['0.0.0.0/0（其他）', '10.0.0.1 · 端口 4']];
      g.fillStyle = 'rgba(8,12,20,.82)'; g.fillRect(x - 20, y - 14, w + 40, ROWS.length * rh + 66); ink.corners(g, x - 20, y - 14, w + 40, ROWS.length * rh + 66, 12, ink.dim);
      ink.text(g, '路由表', x, y + 12, { font: ink.mono(16), color: ink.dim }); ink.text(g, '目的网络', x, y + 40, { font: ink.sans(15), color: ink.dim }); ink.text(g, '下一跳 · 出口', x + 360, y + 40, { font: ink.sans(15), color: ink.dim });
      const hi = ss(LOOKUP, LOOKUP + .4, t);
      ROWS.forEach(([a, b], i) => { const yy = y + 52 + i * rh, on = i === 2 ? hi : 0; if (on > 0) { g.fillStyle = `rgba(255,122,48,${.22 * on})`; g.fillRect(x - 6, yy, w + 12, rh - 4); } ink.text(g, a, x, yy + 26, { font: ink.mono(18, 600), color: on > .5 ? ink.accent : ink.white }); ink.text(g, b, x + 360, yy + 26, { font: ink.mono(18), color: on > .5 ? ink.accent : ink.dim }); });
    } });

    /* ================= D · 丢包与重传 ================= */
    const LZ = LAB.lane.z, SX = LAB.lane.x0 + .5, RX = LAB.lane.x1 - .5;
    const segPos = (s, t) => { const u = (t - s.t) / TRAVEL; if (u < 0) return null; if (s.lost) { if (u > LOSS + .5) return null; const v = Math.min(u, LOSS), drop = Math.max(0, u - LOSS) * 2; return { p: V(lerp(SX, RX, v), .3 - .6 * drop * drop, LZ), a: 1 - drop }; } if (u > 1.05) return null; return { p: V(lerp(SX, RX, Math.min(1, u)), .3, LZ), a: 1 - ss(1, 1.05, u) }; };
    const ackPos = (k, t) => { const u = (t - k.t) / TRAVEL; if (u < 0 || u > 1.05) return null; return V(lerp(RX, SX, Math.min(1, u)), .22, LZ + .35); };
    const camD = KIT.cam(30, .05, 80);
    const pD = camPath([[25.8, [-.4, 5.4, LZ + 10.2], [0, .5, LZ], 30], [31.9, [.4, 5.0, LZ + 9.6], [0, .5, LZ], 30]]);
    const shD = ctx.shot({ name: '10.D 重传', t0: 25.8, in: { type: 'dissolve', dur: .8 }, scene: L.scene, camera: camD,
      post: { exposure: 1.05, ao: { radius: .2, intensity: .8 }, grade: ctx.grade.cool, vignette: .32, bloom: { strength: .16 } },
      update(t) {
        L.aim(V(0, 0, LZ)); setPacket({ show: false }); setMedia('');
        SEGS.forEach((s, i) => { const st = segPos(s, t), m = L.segs[i]; m.visible = !!st && st.a > .02; if (st) { m.position.copy(st.p); m.scale.setScalar(Math.max(.001, st.a)); m.material.emissive.set(s.lost && (t - s.t) / TRAVEL > LOSS ? 0xff3b2f : s.re ? 0xffb347 : COL.tcpHex); } });
        ACKS.forEach((k, i) => { const p = ackPos(k, t), m = L.acks[i]; m.visible = !!p; if (p) m.position.copy(p); });
        L.acks[2].visible = false;
        applyCam(camD, pD(t), t, .0003);
      } });
    ctx.draw2d({ shot: shD, t0: 25.9, t1: 31.9, draw(g, t, a, proj) {
      const ps = proj(V(LAB.lane.x0, .6, LZ)), pr = proj(V(LAB.lane.x1, .6, LZ));
      if (ps) { ink.text(g, '发送方', ps.x, ps.y - 30, { font: ink.sans(19, 600), align: 'center' }); }
      if (pr) { ink.text(g, '接收方', pr.x, pr.y - 30, { font: ink.sans(19, 600), align: 'center' }); }
      SEGS.forEach(s => { const st = segPos(s, t); if (!st || st.a < .3) return; const p = proj(st.p.clone().add(V(0, .22, 0))); if (!p) return; ink.text(g, '#' + s.n + (s.re ? ' 重发' : ''), p.x, p.y - 8, { font: ink.mono(17, 600), color: s.re ? ink.accent : ink.white, align: 'center' }); });
      ACKS.forEach(k => { const q = ackPos(k, t); if (!q) return; const p = proj(q.clone().add(V(0, .16, 0))); if (p) ink.text(g, k.label, p.x, p.y - 6, { font: ink.mono(15, 600), color: '#7ee08a', align: 'center' }); });
      const lost = SEGS[1], lu = (t - lost.t) / TRAVEL;
      if (lu > LOSS) { const p = proj(V(lerp(SX, RX, LOSS), .3, LZ)); if (p) { g.save(); g.globalAlpha *= ss(LOSS, LOSS + .1, lu) * (1 - ss(TIMEOUT + .4, TIMEOUT + 1, t)); ink.line(g, [[p.x - 13, p.y - 13], [p.x + 13, p.y + 13]], ink.warn, 4); ink.line(g, [[p.x - 13, p.y + 13], [p.x + 13, p.y - 13]], ink.warn, 4); ink.text(g, '#2 丢失', p.x, p.y + 40, { font: ink.sans(19, 600), color: ink.warn, align: 'center' }); g.restore(); } }
      // 发送方的计时器：等 #2 的确认
      if (ps && t > lost.t && t < TIMEOUT + .8) {
        const u = clamp((t - lost.t) / (TIMEOUT - lost.t)), cx = ps.x, cy = ps.y - 110, over = t >= TIMEOUT;
        g.save(); g.globalAlpha *= 1 - ss(TIMEOUT + .4, TIMEOUT + .8, t);
        g.strokeStyle = ink.faint; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 30, 0, 7); g.stroke();
        g.strokeStyle = over ? ink.warn : ink.accent; g.beginPath(); g.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2); g.stroke();
        ink.text(g, over ? '超时 · 重发 #2' : '等 #2 的确认', cx, cy - 46, { font: ink.sans(17, 600), color: over ? ink.warn : ink.dim, align: 'center' });
        g.restore();
      }
      // 接收方的缓冲区：按序号排好
      if (pr) {
        const x0 = Math.min(pr.x - 120, 1620) - 120, y0 = pr.y + 120, got = n => SEGS.some(s => s.n === n && !s.lost && t >= s.t + TRAVEL);
        g.fillStyle = 'rgba(8,12,20,.8)'; g.fillRect(x0 - 16, y0 - 34, 272, 104); ink.corners(g, x0 - 16, y0 - 34, 272, 104, 10, ink.dim);
        ink.text(g, '按序号排好', x0, y0 - 10, { font: ink.sans(15), color: ink.dim });
        for (let n = 1; n <= 3; n++) { const x = x0 + (n - 1) * 82; ink.rect(g, x, y0, 66, 50, got(n) ? COL.tcp : ink.faint, 1.4); ink.text(g, got(n) ? '#' + n : '?', x + 33, y0 + 33, { font: ink.mono(20, 600), color: got(n) ? ink.white : 'rgba(235,235,230,.3)', align: 'center' }); }
      }
    } });

    /* ================= D2 · 分层 ================= */
    const LY = LAB.layers, camL = KIT.cam(30, .05, 80);
    const pL = camPath([[32.0, [.1, 2.8, LY.z + 7.8], [.2, 1.35, LY.z], 30], [38.4, [.6, 2.6, LY.z + 7.2], [.3, 1.35, LY.z], 30]]);
    const shL = ctx.shot({ name: '10.D2 分层', t0: 32.0, in: { type: 'dissolve', dur: .8 }, scene: L.scene, camera: camL,
      post: { exposure: 1.05, ao: { radius: .2, intensity: .8 }, grade: ctx.grade.cool, vignette: .32, bloom: { strength: .16 } },
      update(t) {
        L.aim(V(.4, 0, LY.z)); hideLab(); const [kind, t0] = mediaAt(t); setMedia(kind);
        const swap = ss(t0, t0 + .5, t);
        setPacket({ x: lerp(-.3, .2, (t - 32) / 6.4), y: .35, z: LY.z, enc: { link: t0 === 32.0 ? 1 : swap }, kind: kind === 'g5' ? 'g5' : kind === 'wifi' ? 'wifi' : 'fiber', ttl: 63 });
        L.media.arcs.forEach((a, i) => { const u = ((t * .8 - i * .25) % 1 + 1) % 1; a.material.opacity = .6 * (1 - u); });
        applyCam(camL, pL(t), t, .0003);
      } });
    ctx.draw2d({ shot: shL, t0: 32.3, t1: 38.4, draw(g, t) {
      const x = 1300, y = 120, w = 500, rh = 64, [, t0, name] = mediaAt(t), sw = ss(t0, t0 + .5, t);
      const ROWS = [['应用层', 'HTTP「GET /」', COL.data], ['传输层', 'TCP', COL.tcp], ['网络层', 'IP', COL.ip]];
      g.fillStyle = 'rgba(8,12,20,.8)'; g.fillRect(x - 20, y - 20, w + 40, 4 * rh + 90); ink.corners(g, x - 20, y - 20, w + 40, 4 * rh + 90, 12, ink.dim);
      ROWS.forEach(([a, b, c], i) => { const yy = y + i * rh; ink.rect(g, x, yy, w, rh - 12, c + '99', 1.4); ink.text(g, a, x + 18, yy + 34, { font: ink.sans(18), color: ink.dim }); ink.text(g, b, x + 130, yy + 35, { font: ink.mono(22, 600), color: c }); });
      const yy = y + 3 * rh; g.fillStyle = `rgba(255,122,48,${.18 + .2 * (1 - sw)})`; g.fillRect(x, yy, w, rh - 12); ink.rect(g, x, yy, w, rh - 12, ink.accent, 1.6);
      ink.text(g, '链路层', x + 18, yy + 34, { font: ink.sans(18), color: ink.dim });
      MEDIA.forEach(([, , n], i) => { const on = n === name; ink.text(g, n, x + 130 + i * 120, yy + 35, { font: ink.mono(22, on ? 700 : 400), color: on ? ink.accent : 'rgba(235,235,230,.3)' }); });
      ink.text(g, '↑ 上面三层：不必改变', x, y + 4 * rh + 26, { font: ink.sans(18, 600), color: ink.white });
      ink.text(g, '只换这一层', x + w, y + 4 * rh + 26, { font: ink.sans(18, 600), color: ink.accent, align: 'right' });
    } });

    /* ================= E · FLAG DAY ================= */
    const MZ = LAB.map, camE = KIT.cam(30, .05, 80);
    const pE = camPath([[38.4, [-.8, 7.6, MZ.z + 4.6], [0, 0, MZ.z - .1], 30], [44.6, [.4, 5.8, MZ.z + 3.6], [.2, 0, MZ.z - .2], 30]]);
    ctx.shot({ name: '10.E FLAG DAY', t0: 38.4, in: { type: 'dissolve', dur: 1.0 }, scene: L.scene, camera: camE,
      post: { exposure: 1.0, dof: { focus: 7, aperture: .0015, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .4, bloom: { strength: .12 } },
      update(t) { L.aim(MZ, .7); setPacket({ show: false }); hideLab(); setMedia(''); applyCam(camE, pE(t), t, .0003); } });
    ctx.draw2d({ t0: 39.0, t1: 44.2, fade: .5, draw(g, t) {
      const x = 130, y = 150;
      g.fillStyle = 'rgba(6,12,22,.78)'; g.fillRect(x - 30, y - 50, 720, 214); ink.corners(g, x - 30, y - 50, 720, 214, 14, ink.dim);
      ink.text(g, 'FLAG DAY', x, y - 12, { font: ink.mono(18, 600), color: ink.accent });
      ink.text(g, '1983 年 1 月 1 日', x, y + 62, { font: ink.cond(68, 600) });
      g.save(); g.globalAlpha *= ss(39.8, 40.3, t); ink.text(g, 'ARPANET 全面切换到 TCP/IP', x, y + 120, { font: ink.sans(26, 600) }); g.restore();
    } });
    ctx.lower({ t0: 40.6, t1: 43.8, name: 'ARPANET 逻辑图 · 1977 年 3 月', meta: '切换前几年的网络 · 方框是主机，圆点是 IMP', credit: '图：ARPANET · 公有领域（反色处理）' });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); for (const v of VISIT) ctx.cue(v.t0 + .8, 'glitch', .35);
    ctx.cue(6.8, 'swoosh', .25); ctx.cue(10.1, 'tick', .6);
    ctx.cue(12.8, 'whoosh', 1.0, .25); ctx.cue(ENC.data, 'blip', 700, .05); for (const k of ['tcp', 'ip', 'link']) ctx.cue(ENC[k] + SLIDE * .8, 'clack', .4);
    ctx.cue(R_IN[0], 'swoosh', .25); ctx.cue(STRIP[0], 'whoosh', .5, .18); ctx.cue(TTL_AT, 'tick', .8); ctx.cue(LOOKUP, 'blip', 1200, .05); ctx.cue(RELINK[1] - .1, 'clack', .4); ctx.cue(R_OUT[0], 'swoosh', .25);
    ctx.cue(25.8, 'swoosh', .25); for (const s of SEGS) ctx.cue(s.t, 'tick', .6); ctx.cue(SEGS[1].t + TRAVEL * LOSS, 'spark', .4); ctx.cue(TIMEOUT, 'beep', 520, .12, .12); ctx.cue(TIMEOUT + TRAVEL + .1, 'chime', 880, .06);
    for (const [, t0] of MEDIA) ctx.cue(t0 + .1, 'whoosh', .5, .16);
    ctx.cue(38.4, 'sub', .3); ctx.cue(39.1, 'chime', 660, .08);
  },
};
