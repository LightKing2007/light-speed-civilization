/* 10 · 通用语言（1974 – 1983）
   A  三种网络各说各话：ARPANET（有线）、PRNET（无线电分组网）、SATNET（卫星网），外来的包撞上边界被拒收
   B  桌上：瑟夫与卡恩的照片 + 1974 年论文首页（排印复原）
   C1 封装：数据 → 套上 TCP 头（端口、序号）→ IP 头（目的地址）→ Wi-Fi 帧头 / 帧尾；标注直接指着包上的 TCP 头与 IP 头
   C2 路由器只拆到 IP 层：去掉帧头，看目的地址查路由表，换上新的帧头转发
   D  丢包重传：段 #2 丢失，发送方等不到确认，计时器到点后重发；接收方按序号排好
   D2 分层：底层在光纤 / Wi-Fi / 5G 之间切换，上面的 IP / TCP / 数据不变
   E  1983-01-01 FLAG DAY：反色处理的 1977 年 ARPANET 逻辑图
   道具在 src/props/10/proto.js。所有动画都是 t 的纯函数。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。
   A 三个网络只留名字（大字），撞墙的红叉留在原处不再配小字；B 论文改成一个引线标注，署名条停够 4 秒；
   C 去掉 TCP / IPv4 / 帧头三个字段表，改为直接指着包上的 TCP 头、IP 头写出端口、序号、目的地址；路由阶段只留「路由器」标注 + 精简路由表；
   D 「发送方 / 接收方」写在主机屏幕上、序号写在包的正面，画面上只留「等确认」计时、「#2 丢失」和接收方的排序框；
   D2 面板只说「只换底层，上层不变」；E 去掉英文眉题，日期卡与署名条都停够时间。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildIslands, buildLab, ISLES, COL, PK, SEG, LAB } from '../props/10/proto.js';
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h, edge = 'rgba(235,235,230,.22)', lw = 1) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, edge, lw); };
/** 带暗底的一行字（画面里物体旁边的名字） */
const tag = (g, s, x, y, { font = ink.sans(26, 600), color = TXT, align = 'left', h = 26 } = {}) => {
  g.font = font; const w = g.measureText(s).width, x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  g.fillStyle = 'rgba(8,10,14,.84)'; g.fillRect(x0 - 10, y - h - 5, w + 20, h + 16); ink.text(g, s, x, y, { font, color, align });
};
/** 字幕区后面的暗底（画面下方很亮、很碎时，例如白色论文页、密密麻麻的逻辑图） */
const capScrim = (ctx, shot, t0, t1) => ctx.draw2d({ shot, t0, t1, fade: .4, draw(g) { const gr = g.createLinearGradient(0, 880, 0, 1080); gr.addColorStop(0, 'rgba(6,8,12,0)'); gr.addColorStop(.45, 'rgba(6,8,12,.5)'); gr.addColorStop(1, 'rgba(6,8,12,.62)'); g.fillStyle = gr; g.fillRect(0, 880, 1920, 200); } });
/** 署名条（左下，约 x 132–，y 720–850）后面的暗底：画在 Canvas 层，位于署名条 DOM 之下 */
const lowerScrim = (ctx, t0, t1, w) => ctx.draw2d({ t0, t1, fade: .4, draw(g) { const gr = g.createLinearGradient(100, 0, 100 + w, 0); gr.addColorStop(0, 'rgba(6,8,10,.8)'); gr.addColorStop(.75, 'rgba(6,8,10,.62)'); gr.addColorStop(1, 'rgba(6,8,10,0)'); g.fillStyle = gr; g.fillRect(100, 706, w, 160); } });

/* ---------- 封装 / 路由的节拍 ---------- */
const ENC = { data: 13.1, tcp: 14.0, ip: 15.7, link: 17.3 }, SLIDE = .6;
const R_IN = [19.4, 20.4], STRIP = [20.5, 21.1], LOOKUP = 21.9, RELINK = [22.8, 23.4], R_OUT = [24.0, 25.4];
/* ---------- 重传 ---------- */
const TRAVEL = 1.4, LOSS = .55, TIMEOUT = 29.0;
const SEGS = [{ n: 1, t: 26.1 }, { n: 2, t: 26.45, lost: true }, { n: 3, t: 26.8 }, { n: 2, t: TIMEOUT, re: true }];
const ACKS = [{ t: 27.55 }, { t: TIMEOUT + TRAVEL + .05 }];
const LOST_AT = SEGS[1].t + TRAVEL * LOSS, ACKED = ACKS[1].t + TRAVEL;   // #2 掉下去的时刻；最后一个确认送回发送方的时刻
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
      post: { exposure: 1.14, ao: { radius: .2, intensity: .8 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .16 } },
      update(t) { setIslands(t); applyCam(camA, pA(t), t, .0004); } });
    // 三个网络的名字（大字，依次出现、一直留到镜头结束）；外来的包撞墙处留下红叉
    const ISL = [['arpa', 'ARPANET（有线）', .9], ['prnet', '无线电分组网', 1.7], ['satnet', '卫星网', 2.5]];
    ctx.draw2d({ shot: shA, t0: .8, t1: 6.75, draw(g, t, a, proj) {
      for (const [k, n, t0] of ISL) { const p = proj(V(ISLES[k].x, 0, 1.25)); if (!p) continue; g.save(); g.globalAlpha *= ss(t0, t0 + .35, t); tag(g, n, p.x, p.y + 52, { align: 'center' }); g.restore(); }
      for (const v of VISIT) { const hit = t - v.t0 - .8; if (hit < 0) continue; const p = proj(V(ISLES[v.to].x - 1.17, .9, .1)); if (!p) continue; g.save(); g.globalAlpha *= ss(0, .15, hit); g.lineCap = 'round'; ink.line(g, [[p.x - 15, p.y - 15], [p.x + 15, p.y + 15]], ink.warn, 5); ink.line(g, [[p.x - 15, p.y + 15], [p.x + 15, p.y - 15]], ink.warn, 5); g.restore(); }
      const d0 = proj(V(ISLES.satnet.x, 1.0, 0)), s0 = proj(IS.sat.getWorldPosition(V()));
      if (d0 && s0) { g.save(); g.setLineDash([6, 8]); ink.line(g, [[d0.x, d0.y], [s0.x, s0.y]], 'rgba(126,224,138,.55)', 1.8); g.restore(); }
    } });

    /* ================= 实验台（B、C、D、D2、E 共用） ================= */
    const [cerf, kahn, mapImg] = await Promise.all([A.tex('assets/photos/act3/vint_cerf_2010.jpg', { aniso: 16 }), A.tex('assets/photos/act3/bob_kahn_2010_itu.jpg', { aniso: 16 }), A.image('assets/photos/act3/arpanet_logical_map_1977_03.png')]);
    const L = buildLab(KIT, { cerf, kahn, mapImg }), P = L.parts;
    const MID = Object.fromEntries(Object.entries(SEG).map(([k, [a, b]]) => [k, (a + b) / 2]));
    /** 包的完整状态：位置、各层进入进度（0..1）、外壳、帧头被拆掉的进度、链路类型 */
    const setPacket = ({ x = 0, y = 0, z = 0, enc = {}, shell = {}, strip = 0, kind = 'wifi', glow = 0, show = true }) => {
      L.pk.visible = show; if (!show) return;
      L.pk.position.set(x, PK.y + y, z); L.setLink(kind);
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
    // 重传演示的主机和传输线只在 D 镜头里出现（别的镜头里它们只是背景杂物）
    const showLane = on => { L.sender.visible = L.receiver.visible = L.lane.visible = on; };
    const hideLab = () => { L.segs.forEach(m => { m.visible = false; }); L.acks.forEach(m => { m.visible = false; }); showLane(false); };
    const setMedia = kind => { L.media.fiber.visible = kind === 'fiber'; L.media.wifi.visible = kind === 'wifi'; L.media.g5.visible = kind === 'g5'; };

    /* ================= B · 瑟夫与卡恩 ================= */
    const camB = KIT.cam(30, .05, 80), D0 = LAB.desk;
    const pB = camPath([[6.8, [D0.x - .6, 6.4, D0.z + 3.6], [D0.x, 0, D0.z + .1], 30], [12.9, [D0.x + .3, 4.2, D0.z + 2.1], [D0.x, 0, D0.z - .2], 30]]);
    const shB = ctx.shot({ name: '10.B 瑟夫与卡恩', t0: 6.8, in: { type: 'dissolve', dur: .8 }, scene: L.scene, camera: camB,
      post: { exposure: 1.1, ao: { radius: .2, intensity: .7 }, dof: { focus: 6, aperture: .0012, maxBlur: 6 }, grade: ctx.grade.cool, vignette: .34 },
      update(t) { L.aim(D0, .8); setPacket({ show: false }); hideLab(); setMedia(''); const c = pB(t); applyCam(camB, c, t, .0003); shB.post.dof.focus = camB.position.distanceTo(c.l); } });
    lowerScrim(ctx, 7.3, 11.8, 980); capScrim(ctx, shB, 7.0, 12.8);
    ctx.lower({ t0: 7.3, t1: 11.8, name: '温顿·瑟夫（左）与罗伯特·卡恩（右）', meta: 'TCP/IP 的两位设计者 · 摄于 2010 年', credit: '照片：Veni Markovski · CC BY 3.0；ITU Pictures · CC BY 2.0' });
    // 论文首页：标注指向标题（页面平放在桌上，标题在页面上部）
    ctx.callout({ shot: shB, at: V(D0.x - .45, .02, D0.z - .84), title: '1974 年的论文', sub: '首页按原刊版式复原', t0: 8.2, t1: 12.7, side: 'left', dx: -150, dy: -40 });

    /* ================= C1 / C2 · 封装与路由 ================= */
    const camC = KIT.cam(30, .05, 80);
    const pC = camPath([
      // 封装阶段：右侧不再有字段表，包放在画面中央并推近（包约占画面宽度的六成）
      [12.8, [-.6, 2.6, 5.6], [-.35, .55, 0], 30], [19.4, [-.4, 2.45, 5.2], [-.3, .55, 0], 30],
      // 跟着包一起移到路由器（包在 19.4–20.4 移动），IP 头的标注一直留在画面里
      [20.7, [6.1, 3.3, 7.6], [6.5, .35, 0], 30], [24.0, [6.2, 3.1, 7.3], [6.5, .35, 0], 30], [25.8, [8.4, 3.1, 7.4], [8.8, .35, 0], 30],
    ]);
    const packetC = t => {
      const enc = { data: ss(ENC.data, ENC.data + .4, t), tcp: clamp((t - ENC.tcp) / SLIDE), ip: clamp((t - ENC.ip) / SLIDE), link: clamp((t - ENC.link) / SLIDE) };
      const shell = { tcp: ss(ENC.tcp + .4, ENC.tcp + .9, t), ip: ss(ENC.ip + .4, ENC.ip + .9, t), link: ss(ENC.link + .4, ENC.link + .9, t) };
      let x = 0, strip = 0, kind = 'wifi';
      if (t > R_IN[0]) x = lerp(0, LAB.router.x, easeIO(clamp((t - R_IN[0]) / (R_IN[1] - R_IN[0]))));
      if (t > STRIP[0]) strip = clamp((t - STRIP[0]) / (STRIP[1] - STRIP[0]));
      if (t > RELINK[0]) { kind = 'eth'; strip = 0; enc.link = clamp((t - RELINK[0]) / (RELINK[1] - RELINK[0])); shell.link = ss(RELINK[0] + .3, RELINK[1], t); }
      if (t > R_OUT[0]) x = lerp(LAB.router.x, LAB.router.x + 4.6, easeIO(clamp((t - R_OUT[0]) / (R_OUT[1] - R_OUT[0]))));
      return { x, enc, shell, strip, kind, glow: ss(LOOKUP - .5, LOOKUP, t) * (1 - ss(RELINK[0], RELINK[0] + .6, t)) };
    };
    /** 包上某一段（tcp / ip）顶面中点的世界坐标：跟着「滑进来」的动画和包的移动走 */
    const blockTop = k => t => { const st = packetC(t), u = easeIO(clamp(st.enc[k])); return V(st.x + MID[k] - 1.1 * (1 - u), PK.y + .45 * (1 - u) + PK.h / 2 + .02, .05); };
    const shC = ctx.shot({ name: '10.C 封装与路由', t0: 12.8, in: { type: 'dissolve', dur: .8 }, scene: L.scene, camera: camC,
      post: { exposure: 1.1, ao: { radius: .2, intensity: .8 }, dof: { focus: 8, aperture: .0012, maxBlur: 6 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .14 } },
      update(t) {
        const c = pC(t); L.aim(V(c.l.x, 0, 0)); hideLab(); setMedia('');
        setPacket(packetC(t));
        L.leds.forEach((m, i) => { m.material.emissiveIntensity = i === 2 && t > R_OUT[0] ? (Math.floor(t * 8) % 2 ? 2.2 : .3) : .3 + .2 * Math.sin(t * 3 + i * 1.7); });
        applyCam(camC, c, t, .0003); shC.post.dof.focus = camC.position.distanceTo(c.l);
      } });
    // C1 封装：直接指着包上的两段「信封」，写出信封上写的东西（同一时刻两个标注）
    ctx.callout({ shot: shC, at: blockTop('tcp'), title: 'TCP 头', sub: '端口 80 · 序号 1001', t0: 14.4, t1: 19.2, side: 'right', dx: 130, dy: -150, style: 'accent' });
    ctx.callout({ shot: shC, at: blockTop('ip'), title: 'IP 头', sub: '发往 203.0.113.34', t0: 16.0, t1: 24.6, side: 'left', dx: -110, dy: -150 });
    // C2 路由：「路由器」标注（指前面板，标签在右下）+ 精简的路由表（右侧）
    ctx.callout({ shot: shC, at: V(LAB.router.x + .2, .3, 1.0), title: '路由器', sub: '换掉外层，只看 IP', t0: 20.4, t1: 24.9, side: 'right', dx: 150, dy: 170 });
    ctx.draw2d({ shot: shC, t0: 21.2, t1: 25.6, draw(g, t) {
      const X = 1250, Y = 110, Wd = 610, rh = 54, ROWS = [['198.51.100.*', '2 号口'], ['203.0.113.*', '3 号口'], ['其他地址', '4 号口']], hi = ss(LOOKUP, LOOKUP + .4, t);
      panelBox(g, X, Y, Wd, 72 + ROWS.length * rh + 18);
      ink.text(g, '查路由表：往哪个口转发', X + 26, Y + 50, { font: ink.sans(26, 600), color: TXT });
      ROWS.forEach(([a, b], i) => {
        const yy = Y + 74 + i * rh, on = i === 1 ? hi : 0;
        if (on > 0) { g.fillStyle = `rgba(255,122,48,${.24 * on})`; g.fillRect(X + 12, yy, Wd - 24, rh - 6); ink.rect(g, X + 12, yy, Wd - 24, rh - 6, `rgba(255,122,48,${.9 * on})`, 1.6); }
        ink.text(g, a, X + 26, yy + 35, { font: ink.mono(26, 600), color: on > .5 ? ink.accent : TXT });
        ink.text(g, '→ ' + b, X + 420, yy + 35, { font: ink.sans(26, 600), color: on > .5 ? ink.accent : TXT });
      });
    } });

    /* ================= D · 丢包与重传 ================= */
    const LZ = LAB.lane.z, SX = LAB.lane.x0 + .5, RX = LAB.lane.x1 - .5;
    const segPos = (s, t) => { const u = (t - s.t) / TRAVEL; if (u < 0) return null; if (s.lost) { if (u > LOSS + .5) return null; const v = Math.min(u, LOSS), drop = Math.max(0, u - LOSS) * 2; return { p: V(lerp(SX, RX, v), .3 - .6 * drop * drop, LZ), a: 1 - drop }; } if (u > 1.05) return null; return { p: V(lerp(SX, RX, Math.min(1, u)), .3, LZ), a: 1 - ss(1, 1.05, u) }; };
    const ackPos = (k, t) => { const u = (t - k.t) / TRAVEL; if (u < 0 || u > 1.05) return null; return V(lerp(RX, SX, Math.min(1, u)), .22, LZ + .45); };
    const camD = KIT.cam(30, .05, 80);
    // 比原来推近约 10%：两台主机占画面宽度的八成以上，包上的序号看得清
    const pD = camPath([[25.8, [-.3, 5.0, LZ + 9.4], [0, .45, LZ], 30], [31.9, [.3, 4.7, LZ + 8.9], [0, .45, LZ], 30]]);
    const shD = ctx.shot({ name: '10.D 重传', t0: 25.8, in: { type: 'dissolve', dur: .8 }, scene: L.scene, camera: camD,
      post: { exposure: 1.14, ao: { radius: .2, intensity: .8 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .14 } },
      update(t) {
        L.aim(V(0, 0, LZ)); setPacket({ show: false }); setMedia(''); showLane(true);
        SEGS.forEach((s, i) => { const st = segPos(s, t), m = L.segs[i]; m.visible = !!st && st.a > .02; if (st) { m.position.copy(st.p); m.scale.setScalar(Math.max(.001, st.a)); m.material.emissive.set(s.lost && (t - s.t) / TRAVEL > LOSS ? 0xff3b2f : s.re ? 0xffb347 : COL.tcpHex); } });
        ACKS.forEach((k, i) => { const p = ackPos(k, t), m = L.acks[i]; m.visible = !!p; if (p) m.position.copy(p); });
        L.acks[2].visible = false;
        applyCam(camD, pD(t), t, .0003);
      } });
    ctx.draw2d({ shot: shD, t0: 26.0, t1: 31.85, draw(g, t, a, proj) {
      const ps = proj(V(LAB.lane.x0, .7, LZ)), pr = proj(V(LAB.lane.x1, .7, LZ));
      // ① 发送方上方：等 #2 确认的计时器（到点变红并重发；确认回来变绿）
      if (ps) {
        const cx = ps.x, cy = ps.y - 120, over = t >= TIMEOUT, done = t >= ACKED;
        const u = over ? clamp((t - TIMEOUT) / (TIMEOUT - SEGS[1].t)) : clamp((t - SEGS[1].t) / (TIMEOUT - SEGS[1].t)), red = ss(TIMEOUT - .05, TIMEOUT, t) * (1 - ss(TIMEOUT + .6, TIMEOUT + .9, t));
        g.save(); g.globalAlpha *= win(t, 26.8, 31.85, .3);
        tag(g, '等 #2 的确认', cx, cy - 52, { align: 'center', font: ink.sans(24, 600) });
        g.lineWidth = 7; g.strokeStyle = 'rgba(235,235,230,.35)'; g.beginPath(); g.arc(cx, cy, 30, 0, 7); g.stroke();
        g.strokeStyle = done ? '#7ee08a' : red > .5 ? ink.warn : ink.accent; g.beginPath(); g.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + (done || red > .5 ? 1 : u) * Math.PI * 2); g.stroke();
        g.restore();
      }
      // ② #2 掉下去的地方：红叉 + 一行字（留到镜头结束）
      const lp = proj(V(lerp(SX, RX, LOSS), .3, LZ));
      if (lp && t > LOST_AT) { g.save(); g.globalAlpha *= ss(LOST_AT, LOST_AT + .2, t); g.lineCap = 'round'; ink.line(g, [[lp.x - 16, lp.y - 16], [lp.x + 16, lp.y + 16]], ink.warn, 5); ink.line(g, [[lp.x - 16, lp.y + 16], [lp.x + 16, lp.y - 16]], ink.warn, 5); g.globalAlpha *= ss(27.6, 27.9, t); tag(g, '#2 丢失', lp.x, lp.y + 108, { align: 'center', color: '#ff8a7a' }); g.restore(); }
      // 信息面板：接收方上方的排序框
      if (pr) {
        const got = n => SEGS.some(s => s.n === n && !s.lost && t >= s.t + TRAVEL), re = t >= SEGS[3].t + TRAVEL;
        const Wd = 300, H = 150, X = Math.min(1860 - Wd, pr.x - Wd / 2), Y = pr.y - 120 - H;
        panelBox(g, X, Y, Wd, H);
        ink.text(g, '接收方按序号排好', X + 20, Y + 40, { font: ink.sans(24, 600), color: TXT });
        for (let n = 1; n <= 3; n++) {
          const x = X + 20 + (n - 1) * 90, y = Y + 62, ok = got(n), c = n === 2 && re ? ink.accent : COL.tcp;
          if (ok) { g.fillStyle = n === 2 && re ? 'rgba(255,122,48,.22)' : 'rgba(90,169,255,.2)'; g.fillRect(x, y, 78, 66); }
          ink.rect(g, x, y, 78, 66, ok ? c : 'rgba(235,235,230,.4)', 2);
          ink.text(g, ok ? '#' + n : '?', x + 39, y + 45, { font: ink.mono(32, 600), color: ok ? TXT : 'rgba(235,235,230,.6)', align: 'center' });
        }
      }
    } });

    /* ================= D2 · 分层 ================= */
    const LY = LAB.layers, camL = KIT.cam(30, .05, 80);
    const pL = camPath([[32.0, [.1, 2.8, LY.z + 7.8], [.2, 1.35, LY.z], 30], [38.4, [.6, 2.6, LY.z + 7.2], [.3, 1.35, LY.z], 30]]);
    const shL = ctx.shot({ name: '10.D2 分层', t0: 32.0, in: { type: 'dissolve', dur: .8 }, scene: L.scene, camera: camL,
      post: { exposure: 1.14, ao: { radius: .2, intensity: .8 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .16 } },
      update(t) {
        L.aim(V(.4, 0, LY.z)); hideLab(); const [kind, t0] = mediaAt(t); setMedia(kind);
        const swap = ss(t0, t0 + .5, t);
        setPacket({ x: lerp(-.3, .2, (t - 32) / 6.4), y: .35, z: LY.z, enc: { link: t0 === 32.0 ? 1 : swap }, kind: kind === 'g5' ? 'g5' : kind === 'wifi' ? 'wifi' : 'fiber' });
        L.media.arcs.forEach((a, i) => { const u = ((t * .8 - i * .25) % 1 + 1) % 1; a.material.opacity = .6 * (1 - u); });
        applyCam(camL, pL(t), t, .0003);
      } });
    ctx.draw2d({ shot: shL, t0: 32.4, t1: 38.35, draw(g, t) {
      const X = 1300, Y = 110, Wd = 560, [, t0, name] = mediaAt(t), sw = ss(t0, t0 + .4, t);
      panelBox(g, X, Y, Wd, 214);
      ink.text(g, '只换底层，上层不变', X + 26, Y + 50, { font: ink.sans(28, 600), color: TXT });
      ink.text(g, '底层', X + 26, Y + 112, { font: ink.sans(24), color: TXT2 });
      MEDIA.forEach(([, , n], i) => {
        const x = X + 100 + i * 148, y = Y + 78, on = n === name;
        if (on) { g.fillStyle = `rgba(255,122,48,${.18 + .2 * (1 - sw)})`; g.fillRect(x, y, 134, 50); }
        ink.rect(g, x, y, 134, 50, on ? ink.accent : 'rgba(235,235,230,.35)', on ? 2 : 1.2);
        ink.text(g, n, x + 67, y + 35, { font: ink.sans(26, on ? 700 : 500), color: on ? ink.accent : TXT2, align: 'center' });
      });
      ink.text(g, '上层', X + 26, Y + 178, { font: ink.sans(24), color: TXT2 });
      ink.text(g, '数据 · TCP · IP', X + 100, Y + 178, { font: ink.sans(26, 600), color: TXT });
      ink.text(g, '不变', X + Wd - 26, Y + 178, { font: ink.sans(26, 600), color: TXT, align: 'right' });
    } });

    /* ================= E · FLAG DAY ================= */
    const MZ = LAB.map, camE = KIT.cam(30, .05, 80);
    const pE = camPath([[38.4, [-.8, 7.6, MZ.z + 4.6], [0, 0, MZ.z - .1], 30], [44.6, [.4, 5.8, MZ.z + 3.6], [.2, 0, MZ.z - .2], 30]]);
    const shE = ctx.shot({ name: '10.E FLAG DAY', t0: 38.4, in: { type: 'dissolve', dur: 1.0 }, scene: L.scene, camera: camE,
      post: { exposure: 1.08, dof: { focus: 7, aperture: .0012, maxBlur: 6 }, grade: ctx.grade.cool, vignette: .36, bloom: { strength: .12 } },
      update(t) { L.aim(MZ, .7); setPacket({ show: false }); hideLab(); setMedia(''); const c = pE(t); applyCam(camE, c, t, .0003); shE.post.dof.focus = camE.position.distanceTo(c.l); } });
    ctx.draw2d({ shot: shE, t0: 38.7, t1: 43.9, fade: .4, draw(g) {
      const X = 100, Y = 104;
      panelBox(g, X, Y, 600, 176);
      ink.text(g, '1983 年 1 月 1 日', X + 28, Y + 92, { font: ink.cond(72, 600), color: TXT });
      ink.text(g, 'ARPANET 全面改用 TCP/IP', X + 28, Y + 146, { font: ink.sans(26, 600), color: TXT });
    } });
    lowerScrim(ctx, 39.5, 43.85, 900); capScrim(ctx, shE, 38.6, 44.0);
    ctx.lower({ t0: 39.5, t1: 43.85, name: 'ARPANET 逻辑图 · 1977 年 3 月', meta: '切换前的网络：方框是主机', credit: '图：ARPANET · 公有领域（反色处理）' });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); for (const v of VISIT) ctx.cue(v.t0 + .8, 'glitch', .35);
    ctx.cue(6.8, 'swoosh', .25); ctx.cue(8.2, 'tick', .6);
    ctx.cue(12.8, 'whoosh', 1.0, .25); ctx.cue(ENC.data, 'blip', 700, .05); for (const k of ['tcp', 'ip', 'link']) ctx.cue(ENC[k] + SLIDE * .8, 'clack', .4);
    ctx.cue(R_IN[0], 'swoosh', .25); ctx.cue(STRIP[0], 'whoosh', .5, .18); ctx.cue(LOOKUP, 'blip', 1200, .05); ctx.cue(RELINK[1] - .1, 'clack', .4); ctx.cue(R_OUT[0], 'swoosh', .25);
    ctx.cue(25.8, 'swoosh', .25); for (const s of SEGS) ctx.cue(s.t, 'tick', .6); ctx.cue(LOST_AT, 'spark', .4); ctx.cue(TIMEOUT, 'beep', 520, .12, .12); ctx.cue(ACKED, 'chime', 880, .06);
    for (const [, t0] of MEDIA) ctx.cue(t0 + .1, 'whoosh', .5, .16);
    ctx.cue(38.4, 'sub', .3); ctx.cue(39.1, 'chime', 660, .08);
  },
};
