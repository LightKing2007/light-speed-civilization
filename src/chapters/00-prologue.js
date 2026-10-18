/* 00 · 零点一秒（冷开场）
   一条消息从纽约的书桌出发：手机天线 → 屋顶 5G 基站 → 街道下的光纤 → 横穿北美 → 太平洋海底光缆 → 上海早晨的另一部手机，
   全程约 0.1 秒（画面为慢放，右上角计时器给出真实用时）。再与 1865 年跨洋邮件的 10 天对比，最后用手机爆炸视图引出三条线索与片名。
   离线镜头（t 300–312）：上海的妈妈回复「好，照顾好自己。」供第 15 章尾声引用。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, easeOut, prog, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { SW, SH, paintChat, paintLock } from '../props/00/ui.js';
import { deskSet, towerSet, fiberSet, seabedSet, kitchenSet, studioSet } from '../props/00/sets.js';

const MSG = '妈，我到纽约了，一切都好。', REPLY = '好，照顾好自己。';
const T_SEND = 3.45;                         // 气泡发出 = T + 0
// 信号真实用时（毫秒）↔ 章内时间（画面慢放）。数值见 docs/script.md：基站 ≈ 4 ms、进光纤 ≈ 7 ms、俄勒冈 ≈ 37 ms、上海登陆 ≈ 97 ms
const MS = [[T_SEND, 0], [7.6, 1.2], [9.4, 4.0], [14.2, 7.0], [21.0, 37], [28.9, 97], [30.5, 98]];
const msAt = t => { if (t <= MS[0][0]) return 0; for (let i = 1; i < MS.length; i++) if (t <= MS[i][0]) return lerp(MS[i - 1][1], MS[i][1], (t - MS[i - 1][0]) / (MS[i][0] - MS[i - 1][0])); return MS[MS.length - 1][1]; };
const fmtMs = v => v < 10 ? v.toFixed(1) : String(Math.round(v));
// 纽约 → 俄勒冈太平洋城：陆地骨干光缆（近似沿 I-80 / I-84 走向的示意路由）
const LAND = [[40.71, -74.01], [40.75, -74.6], [41.1, -75.8], [41.25, -77.5], [41.2, -80.5], [41.5, -81.7], [41.6, -83.6], [41.6, -86.2], [41.88, -87.63], [41.6, -90.6], [41.3, -93.6], [41.26, -95.94], [40.8, -98.3], [41.1, -100.8], [41.14, -104.82], [41.3, -105.6], [41.6, -109.2], [41.23, -111.97], [42.5, -113.8], [43.6, -116.2], [44.0, -117.0], [45.67, -118.79], [45.6, -121.2], [45.52, -122.68], [45.4, -123.5], [45.2, -123.96]];
// NCP 主干（TeleGeography cable-geo.json，id = new-cross-pacific-ncp-cable-system：太平洋城 → 南汇 → 崇明），主干约 10 000 km
const NCP = [[45.202, -123.963], [45.647, -125.1], [45.96, -129.6], [46.582, -138.6], [47.197, -151.2], [47.197, -180], [47.197, 180], [47.197, 172.8], [44.052, 160.2], [38.652, 149.4], [34.683, 143.1], [33.565, 140.4], [32.812, 138.6], [31.671, 136.8], [30.901, 135], [30.514, 132.75], [29.148, 131.4], [29.345, 130.5], [30.514, 128.25], [30.901, 126], [30.853, 122.175], [30.865, 121.925], [30.9, 121.894], [30.936, 121.896], [30.934, 121.612], [31.126, 121.275], [31.511, 121.275], [31.62, 121.395]];
const NCP_ID = 'new-cross-pacific-ncp-cable-system';
const PINYIN = 'mawodaoniuyueleyiqiedouhao', KEYS = 'qwertyuiopasdfghjklzxcvbnm';
const HDR = (k, v) => `<span class="k">${k}</span> · ${v}`;

export default {
  id: '00', status: 'implemented', slug: 'prologue', title: '零点一秒', dur: 52,
  card: null,
  stamps: [],
  caps: [[0.6, 5.0, "纽约，晚上九点四十二分。一条消息被发出。"], [5.4, 9.8, "它先化作电磁波，飞向几百米外的基站，"], [10.0, 14.6, "再变成光脉冲，钻进埋在街道下的光纤。"], [15.0, 21.6, "横穿北美大陆，在俄勒冈海岸潜入太平洋——"], [22.0, 29.4, "沿着海底光缆跨越一万多公里，在上海登陆，点亮另一部手机。"], [29.8, 34.6, "这一路，信号只走了约十分之一秒。"], [35.2, 41.6, "一百六十年前，一封信从纽约寄到伦敦，要在海上漂十天以上。"], [42.0, 47.4, "把这段距离缩短到一眨眼的，是三条接力了一个半世纪的线索——"], [47.6, 51.6, "电波，计算，网络。"]],
  credits: [
    'assets/photos/act1/collins_line_arctic_1852_currier.jpg',
    'assets/hdri/shanghai_bund_2k.hdr', 'assets/hdri/combination_room_2k.hdr',
    'assets/tex/dark_wood', 'assets/tex/damp_sand', 'assets/tex/concrete_floor_worn_001',
    'assets/models/polyhaven/desk_lamp_arm_01', 'assets/models/polyhaven/office_notepads',
    'assets/earth/earth_day_8k.jpg', 'assets/earth/earth_lights_8k.jpg', 'assets/earth/earth_clouds_8k.jpg', 'assets/earth/earth_normal_4k.png', 'assets/earth/earth_water_mask_4k.png', 'assets/earth/stars_8k.jpg',
    'assets/data/telegeography/cable-geo.json',
  ],
  async build(ctx) {
    const { KIT } = ctx;
    const v3 = () => new THREE.Vector3();
    // 绕过引擎缺陷（同 01 章）：导出/截图模式下 #hud2d 停留在默认 300×150，draw2d 会被放大糊掉
    { const cv = typeof document !== 'undefined' && document.getElementById('hud2d'); if (cv && cv.width === 300 && cv.height === 150) { cv.width = 1920; cv.height = 1080; } }

    /* ---------- 两部手机的屏幕 ---------- */
    const nyTex = KIT.canvasTex(SW, SH, () => { }, { aniso: 16 });
    const shTex = KIT.canvasTex(SW, SH, () => { }, { aniso: 16 });
    let nyKey = '', shKey = '';
    const NY_HIST = [{ ts: '昨天 23:06' }, { me: true, text: '登机了，落地给你发消息' }, { me: false, text: '好，路上注意安全，到了说一声。' }];
    function nyScreen(t) {
      const n = clamp(Math.floor((t - .55) / .175) + 1, 0, MSG.length), typing = t > .5 && t < 2.95;
      const li = Math.floor((t - .55) / (2.35 / PINYIN.length)), kf = ((t - .55) / (2.35 / PINYIN.length)) % 1;
      const keyIdx = typing && li >= 0 && li < PINYIN.length && kf < .6 ? KEYS.indexOf(PINYIN[li]) : -1;
      const sendPress = t > 3.2 && t < T_SEND ? (t - 3.2) / .25 : 0, sent = t >= T_SEND;
      const sendP = sent ? Math.round(clamp((t - T_SEND) / .45) * 30) / 30 : -1, caret = typing || Math.floor(t * 1.8) % 2 === 0;
      const key = [n, keyIdx, Math.round(sendPress * 8), sendP, caret, t > 4.4].join('|'); if (key === nyKey) return; nyKey = key;
      paintChat(nyTex.userData.g, SW, SH, { dark: true, time: '21:42', peer: '妈妈', avatar: '妈', avatarColor: '#b9826a', history: NY_HIST, draft: sent ? '' : MSG.slice(0, n), caret, sendPress, sendP, newText: MSG, newTs: '今天 21:42', keyIdx, cands: ['好', '都好', '一切', '到了', '纽约', '的'], status: t > 4.4 ? '发送中…' : '' });
      nyTex.needsUpdate = true;
    }
    // 上海那部手机：锁屏通知（F）/ 妈妈回复（离线镜头 300–312）
    function shScreen(t) {
      if (t < 200) {
        const b = Math.round(clamp((t - 30.55) / .45) * 30) / 30, key = 'L' + b; if (key === shKey) return; shKey = key;
        paintLock(shTex.userData.g, SW, SH, { time: '9:42', date: '10月18日 星期日', banner: b, title: '儿子', body: MSG, app: '信息' });
      } else {
        const st = t - 300, n = clamp(Math.floor((st - 1.2) / .36) + 1, 0, REPLY.length), typing = st > 1.15 && st < 4.2;
        const kf = ((st - 1.2) / .18) % 1, li = Math.floor((st - 1.2) / .18), seq = 'haozhaogu';
        const keyIdx = typing && li >= 0 && kf < .6 ? KEYS.indexOf(seq[li % seq.length]) : -1;
        const sendPress = st > 4.3 && st < 4.55 ? (st - 4.3) / .25 : 0, sent = st >= 4.55, sendP = sent ? Math.round(clamp((st - 4.55) / .45) * 30) / 30 : -1;
        const caret = typing || Math.floor(st * 1.8) % 2 === 0, status = st > 6.9 ? '已送达' : '';
        const key = ['C', n, keyIdx, Math.round(sendPress * 8), sendP, caret, status].join('|'); if (key === shKey) return; shKey = key;
        paintChat(shTex.userData.g, SW, SH, { dark: false, time: '09:43', peer: '儿子', avatar: '儿', avatarColor: '#5b8fd6', history: [{ ts: '09:42' }, { me: false, text: MSG }], draft: sent ? '' : REPLY.slice(0, n), caret, sendPress, sendP, newText: REPLY, newTs: '', keyIdx, cands: ['好', '照顾', '自己', '注意', '身体', '的'], status });
      }
      shTex.needsUpdate = true;
    }
    nyScreen(0); shScreen(0);

    /* ---------- 通用 HUD：信号计时器；亮画面上给角标一层柔和的压暗（广播常用做法） ---------- */
    const scrim = (shot, t0, t1, k = .38) => ctx.draw2d({ shot, t0, t1, draw(g) {
      const a = g.createLinearGradient(0, 0, 0, 300); a.addColorStop(0, `rgba(8,8,10,${k})`); a.addColorStop(1, 'rgba(8,8,10,0)'); g.fillStyle = a; g.fillRect(0, 0, 1920, 300);
    } });
    ctx.readout({ x: 1856, y: 52, align: 'right', cls: 'timer', t0: 3.0, t1: 34.9, html: t => `<div style="font:500 13px var(--f-mono);letter-spacing:.24em;color:var(--dim);text-align:right;margin-bottom:6px">SIGNAL · 信号用时</div><div${t > 30.5 ? ' class="a"' : ''}>T + ${fmtMs(msAt(t))}<span style="font-size:28px;margin-left:10px;letter-spacing:.06em">ms</span></div>` });

    /* ====================== A + B1 · 纽约夜书桌 → X 光 → 电磁波 ====================== */
    const D = await deskSet(ctx, nyTex);
    const camD = KIT.cam(30);
    const pathD = camPath([
      [0, [.50, .17, .46], [-.06, .06, -.24], 32],
      [2.1, [.115, .25, .15], [-.004, 0, -.012], 29],
      [4.9, [.07, .245, .105], [-.004, 0, -.014], 28],
      [7.9, [.17, .30, .27], [-.012, 0, -.05], 33],
    ]);
    const antW = D.phone.anchors.top.getWorldPosition(v3()); D.phone.group.updateMatrixWorld(true); D.phone.anchors.top.getWorldPosition(antW);
    const lamDir = V(-.35, .55, -.75).normalize(); let radiiD = [];
    const shD = ctx.shot({
      t0: 0, in: { type: 'cut' }, name: '00.A desk', scene: D.scene, camera: camD,
      post: { exposure: 1.05, ao: { radius: .05, intensity: .9 }, dof: { focus: .3, aperture: .0032, maxBlur: 12 }, grade: { tint: [1.04, 1, .94], saturation: .96, lift: [.004, .004, .008] }, vignette: .34 },
      update(t) {
        const c = pathD(t); applyCam(camD, c, t, .0016);
        shD.post.dof.focus = camD.position.distanceTo(c.l);
        nyScreen(t);
        D.phone.setXray(ss(5.3, 6.1, t));
        radiiD = D.waves.update(t, { center: antW, t0: 5.55, speed: .3, lambda: .086, maxR: .62 });
      },
    });
    ctx.readout({ x: 64, y: 56, t0: .4, t1: 5.3, html: t => HDR('NEW YORK', `40.71°N 74.01°W · <span class="a">21:42:0${clamp(5 + Math.floor((t + .2) / 1.5), 5, 7)}</span>`) });
    ctx.callout({ shot: shD, at: () => D.phone.anchors.antenna.getWorldPosition(v3()), t0: 5.9, t1: 7.75, code: 'ANT', title: '天线', sub: '把电信号变成电磁波', side: 'right', dx: 150, dy: -90 });
    const shellPt = (j, t) => { const r = radiiD[j]; return r == null ? antW.clone() : antW.clone().addScaledVector(lamDir, r); };
    ctx.measure({ shot: shD, a: t => shellPt(3, t), b: t => shellPt(2, t), t0: 6.5, t1: 7.75, label: 'λ ≈ 8.6 cm · 3.5 GHz', off: 26 });
    for (let i = 0; i < MSG.length; i++) ctx.cue(.55 + i * .175, 'tap', .7);
    ctx.cue(3.25, 'tap', 1.2); ctx.cue(T_SEND, 'swoosh', .8); ctx.cue(5.55, 'whoosh', 1.4, .7);

    /* ====================== B2 · 屋顶 5G 基站 ====================== */
    const T = await towerSet(ctx);
    const camT = KIT.cam(36);
    const pathT = camPath([[7.4, [3.9, 2.85, 4.75], [-.1, 3.0, 0], 34], [10.4, [2.55, 3.2, 3.2], [-.05, 3.2, 0], 32]]);
    const srcT = V(-175, -20, 140), mastP = V(0, 3.0, .3), d0 = srcT.distanceTo(mastP);
    const shT = ctx.shot({
      t0: 7.5, in: { type: 'dissolve', dur: .5 }, name: '00.B tower', scene: T.scene, camera: camT,
      post: { exposure: 1.12, grade: ctx.grade.night, vignette: .34, dof: { focus: 6, aperture: .045, maxBlur: 12 } },
      update(t) {
        const c = pathT(t); applyCam(camT, c, t, .0012); shT.post.dof.focus = camT.position.distanceTo(c.l);
        T.waves.update(t, { center: srcT, t0: 7.9, speed: 2.6, lambda: .086, maxR: d0 + 1.2, r0: d0 - 3.5, burst: 3, fadeIn: .03 });
        const hit = win(t, 8.85, 9.9, .1); T.leds.forEach((l, i) => l.material.emissiveIntensity = 2.2 + hit * 5 * (Math.floor(t * 9 + i) % 2));
        T.beacon.material.emissiveIntensity = 3.5 * (.35 + .65 * ss(.0, .25, Math.abs(Math.sin(t * 1.6))));
      },
    });
    ctx.callout({ shot: shT, at: () => T.panels[0].getWorldPosition(v3()), t0: 8.1, t1: 10.25, code: 'gNB', title: '5G 基站 · 三扇区天线', sub: '距手机约 300 m', side: 'left', dx: 190, dy: -130 });
    ctx.readout({ x: 1856, y: 172, align: 'right', t0: 8.6, t1: 10.1, html: () => `<span class="k">电波飞行</span> ≈ 1 µs <span class="k">· 其余为基站调度与处理</span>` });
    ctx.cue(8.9, 'blip', 1500, .1); ctx.cue(9.05, 'blip', 1800, .08);

    /* ====================== C · 光纤微距（毫米） ====================== */
    const Fb = await fiberSet(ctx);
    const camF = KIT.cam(26, .5, 600);
    const pathF = camPath([[9.8, [3.7, 1.3, 3.3], [.2, 0, 0], 24], [15.2, [4.2, 1.05, 2.9], [1.0, 0, 0], 23]]);
    const shF = ctx.shot({
      t0: 9.8, in: { type: 'dissolve', dur: .5 }, name: '00.C fiber', scene: Fb.scene, camera: camF,
      post: { exposure: 1.05, dof: { focus: 4.5, aperture: .055, maxBlur: 14 }, grade: ctx.grade.studio, vignette: .38 },
      update(t, st) {
        const c = pathF(t); applyCam(camF, c, t, .0012); shF.post.dof.focus = camF.position.distanceTo(c.l) * .92;
        const u = Fb.core.material.uniforms; u.uT.value = Math.max(0, st - .5); u.uOn.value = st > .5 ? 1 : 0;
        const gx = 1.5, sp = (Fb.X0 + u.uV.value * u.uT.value - gx) / u.uSp.value, k = Math.floor(sp), fr = (sp - k - .5) * u.uSp.value / u.uW.value;
        Fb.glow.position.set(gx, .35, .25); Fb.glow.intensity = k >= 0 ? 1.2 * u.uBits.value[k % 12] * Math.exp(-fr * fr) : 0;
      },
    });
    ctx.readout({ x: 64, y: 56, t0: 10.2, t1: 14.9, html: () => HDR('OPTICAL FIBER', 'λ 1550 nm 红外光 · 肉眼不可见（红色为示意）') });
    ctx.callout({ shot: shF, at: V(-1.5, .125, 0), t0: 10.6, t1: 15.0, code: '03', title: '涂覆层 · 250 µm', sub: '保护玻璃的树脂', side: 'left', dx: 60, dy: 170 });
    ctx.callout({ shot: shF, at: V(.5, .0625, 0), t0: 11.2, t1: 15.0, code: '02', title: '包层 · 125 µm', sub: '折射率略低的石英玻璃', side: 'left', dx: 80, dy: -200 });
    ctx.callout({ shot: shF, at: V(1.4, 0, 0), t0: 11.8, t1: 15.0, code: '01', title: '纤芯 · 9 µm', sub: '光在这里传播', side: 'right', dx: 100, dy: -230 });
    // 原理小图：全反射（角度夸大示意）
    ctx.draw2d({ shot: shF, t0: 12.4, t1: 14.95, draw(g, t, alpha) {
      const x0 = 64, y0 = 596, w = 520, h = 226, yc = y0 + 104, hh = 24, hc = 54, xa = x0 + 18, xb = x0 + w - 18;
      g.fillStyle = 'rgba(6,7,9,.62)'; g.fillRect(x0, y0, w, h); ink.corners(g, x0, y0, w, h, 12, ink.dim, 1);
      ink.text(g, 'TIR · 全反射', x0 + 16, y0 + 26, { font: ink.mono(13), color: ink.dim });
      ink.text(g, '角度为夸大示意', x0 + w - 16, y0 + 26, { font: ink.mono(12), color: ink.faint, align: 'right' });
      g.fillStyle = 'rgba(235,235,230,.05)'; g.fillRect(xa, yc - hc, xb - xa, 2 * hc);
      g.fillStyle = 'rgba(255,90,60,.08)'; g.fillRect(xa, yc - hh, xb - xa, 2 * hh);
      ink.line(g, [[xa, yc - hh], [xb, yc - hh]], ink.dim, 1); ink.line(g, [[xa, yc + hh], [xb, yc + hh]], ink.dim, 1);
      ink.line(g, [[xa, yc - hc], [xb, yc - hc]], ink.faint, 1); ink.line(g, [[xa, yc + hc], [xb, yc + hc]], ink.faint, 1);
      ink.text(g, '包层 n₂ = 1.463', xb - 4, yc - hc + 16, { font: ink.mono(12), color: ink.dim, align: 'right' });
      ink.text(g, '纤芯 n₁ = 1.468', xb - 4, yc + 5, { font: ink.mono(12), color: 'rgba(255,170,140,.8)', align: 'right' });
      // 锯齿光线：在纤芯/包层界面来回反射，向右推进
      const per = 92, tri = x => { const u = ((x - xa) / per) % 1; return u < .5 ? 1 - 4 * u : -3 + 4 * u; };
      const hx = xa + clamp((t - 12.6) / 1.5) * (xb - 150 - xa);
      const pts = []; for (let x = xa; x <= hx; x += 2) pts.push([x, yc - hh * tri(x)]);
      if (pts.length > 1) { g.save(); g.shadowColor = 'rgba(255,80,50,.8)'; g.shadowBlur = 6; ink.line(g, pts, '#ff6a48', 2); g.restore(); const q = pts[pts.length - 1]; g.fillStyle = '#ffd0c0'; g.beginPath(); g.arc(q[0], q[1], 3, 0, 7); g.fill(); }
      // 标出一个反射点的入射角
      const rx = xa + per * 1.5, ry = yc + hh;
      if (hx > rx + 10) {
        const k = ss(rx + 10, rx + 70, hx); g.globalAlpha *= k;
        g.setLineDash([3, 3]); ink.line(g, [[rx, ry], [rx, ry - 44]], ink.dim, 1); g.setLineDash([]);
        g.strokeStyle = ink.white; g.lineWidth = 1; g.beginPath(); g.arc(rx, ry, 26, -Math.PI / 2, -Math.PI / 2 - Math.atan(per / 2 / (2 * hh)), true); g.stroke();
        ink.text(g, 'θ > 临界角 ≈ 85°', rx + 8, ry + 22, { font: ink.mono(12), color: ink.white });
      }
      g.globalAlpha = alpha;
      ink.text(g, '光以大于临界角射向界面 → 被全部反射回纤芯', x0 + 16, y0 + h - 40, { font: ink.sans(16, 500), color: ink.white });
      ink.text(g, '玻璃中光速 ≈ 20 万 km/s（c ÷ 1.47）', x0 + 16, y0 + h - 14, { font: ink.mono(13), color: ink.dim });
    } });
    ctx.cue(10.3, 'blip', 2400, .06);

    /* ====================== D + E2 · 写实地球 ====================== */
    const es = new THREE.Scene();
    const E = await ctx.earth({ quality: '8k', nightIntensity: 2.4 }); es.add(E.group); await E.addStars(es, .22);
    E.setSunFromUTC(Date.UTC(2026, 9, 18, 1, 42, 7));     // 纽约 21:42 = UTC 01:42：美洲是夜晚，东亚是早晨
    const landLine = E.path(LAND, { width: 2.6, color: 0xfff2e2, intensity: 1.25, head: 0, glowHead: 2.5, alt: .006, maxDeg: .3 });
    const ncpLine = E.path(NCP, { width: 2.8, color: 0xfff2e2, intensity: 1.3, head: 0, glowHead: 2.5, alt: .008, maxDeg: .4 });
    const pac = f => { const g = f.geometry; if (!g) return false; const parts = g.type === 'MultiLineString' ? g.coordinates : [g.coordinates]; return parts.some(p => p.some(c => (c[0] > 118 || c[0] < -116) && c[1] > -5 && c[1] < 62)); };
    const others = await E.cables(f => f.properties.id !== NCP_ID && pac(f), { width: .8, color: 0x9ab8cc, opacity: .22, intensity: .8 });
    const ncpAll = await E.cables(f => f.properties.id === NCP_ID, { width: 1.3, color: 0xcfe9ff, opacity: .55, intensity: .9 });
    const LL = (a, b, h = 0) => E.ll(a, b, h).toArray();
    const camE = KIT.cam(34, .01, 400);
    const pathNA = camPath([
      [14.7, LL(36.6, -72.4, 1.5), LL(40.4, -74.6), 34],
      [16.6, LL(34.5, -82, 2.5), LL(40.6, -83), 34],
      [19.0, LL(35.5, -100, 3.0), LL(41.6, -103), 34],
      [22.3, LL(39.5, -117.5, 2.3), LL(44.6, -122), 34],
    ]);
    const pathPac = camPath([
      [25.3, LL(40.5, -127.5, 1.7), LL(45.0, -124.6), 34],
      [26.9, LL(31, -150, 8.5), LL(42, -152), 34],
      [29.0, LL(21, 163, 12.5), LL(36, 160), 34],
      [30.3, LL(20, 145, 11.5), LL(33, 138), 34],
    ]);
    const earthUpd = (cam, path, t, na) => {
      applyCam(cam, path(t), t, 0); E.update(t, cam);
      landLine.set({ head: na ? prog(t, 15.1, 21.0, u => u) : 1, glowHead: na ? 2.5 : 0 });
      ncpLine.visible = !na; ncpLine.set({ head: na ? 0 : prog(t, 25.7, 28.9, u => u * u * (3 - 2 * u) * .3 + u * .7) });
      others.group.visible = ncpAll.group.visible = !na; ncpAll.lines.forEach(l => l.mesh.set({ opacity: .55 * ss(25.4, 26.4, t) }));
      others.lines.forEach(l => l.mesh.set({ opacity: .22 * ss(25.6, 27, t) }));
    };
    const shNA = ctx.shot({ t0: 14.7, in: { type: 'dissolve', dur: .6 }, name: '00.D america', scene: es, camera: camE, post: { exposure: 1.18, grade: ctx.grade.space, vignette: .26, grain: .02 }, update(t) { earthUpd(camE, pathNA, t, true); } });
    ctx.readout({ x: 64, y: 56, t0: 15.1, t1: 21.9, html: () => HDR('NORTH AMERICA', '01:42:07 UTC · 东部 21:42 / 西部 18:42') });
    ctx.callout({ shot: shNA, at: E.ll(40.71, -74.01), occlude: E.occlude, t0: 15.2, t1: 17.6, title: '纽约', sub: '光信号进入陆地骨干网', side: 'left', dx: 120, dy: -70 });
    ctx.callout({ shot: shNA, at: E.ll(41.26, -95.94), occlude: E.occlude, t0: 17.4, t1: 20.2, title: '陆地光缆', sub: '≈ 4 400 km · 示意路由', side: 'right', dx: 110, dy: -90 });
    ctx.callout({ shot: shNA, at: E.ll(45.2, -123.96), occlude: E.occlude, t0: 19.8, t1: 22.4, code: 'CLS', title: '太平洋城 · 俄勒冈', sub: '海缆登陆站', side: 'left', dx: 110, dy: -80 });
    ctx.cue(15.1, 'riser', 5.6, .45);

    /* ====================== E1 · 太平洋海床 ====================== */
    const S = await seabedSet(ctx);
    const camS = KIT.cam(34, .02, 60);
    const cx = S.xr.center;
    const pathS = camPath([[21.6, [cx.x - .46, .21, cx.z + .5], [cx.x + .05, .015, cx.z], 34], [25.9, [cx.x - .24, .15, cx.z + .33], [cx.x + .08, .01, cx.z - .01], 32]]);
    const shS = ctx.shot({
      t0: 21.6, in: { type: 'dissolve', dur: .7 }, name: '00.E seabed', scene: S.scene, camera: camS,
      post: { exposure: 1.3, dof: { focus: .7, aperture: .0035, maxBlur: 12 }, grade: { tint: [.9, 1.02, 1.05], saturation: .88, lift: [0, .006, .01] }, vignette: .42, grain: .035 },
      update(t, st) {
        const c = pathS(t); applyCam(camS, c, t, .0035); shS.post.dof.focus = camS.position.distanceTo(c.l);
        S.snow.position.set(-.03 * st, -.025 * st, .01 * st);
        S.fibers.forEach(f => f.set({ time: st }));
      },
    });
    const jUp = S.xr.center.clone().add(V(0, .0105, 0));
    ctx.readout({ x: 64, y: 56, t0: 22.0, t1: 25.9, html: () => HDR('PACIFIC', '深海段 · 水深数千米 · 没有阳光') });
    ctx.bracket({ shot: shS, box: new THREE.Box3().setFromPoints([S.xr.a, S.xr.b]).expandByScalar(.016), label: 'X-RAY · 剖视', t0: 22.3, t1: 26.0 });
    ctx.callout({ shot: shS, at: jUp, t0: 22.7, t1: 26.0, code: 'PE', title: '聚乙烯绝缘层', sub: '外径约 2 cm', side: 'left', dx: 120, dy: -120 });
    ctx.callout({ shot: shS, at: S.xr.curve.getPointAt(S.xr.ua + .012).add(V(0, .0047, 0)), t0: 23.2, t1: 26.0, code: 'Cu', title: '铜导体', sub: '给沿途的光放大器供电', side: 'left', dx: 140, dy: 120 });
    ctx.callout({ shot: shS, at: S.xr.curve.getPointAt(S.xr.ub - .015), t0: 23.7, t1: 26.0, code: 'SMF', title: '光纤 · 数对', sub: '光脉冲在里面奔跑', side: 'right', dx: 130, dy: -110 });
    ctx.cue(21.8, 'sub', .5);

    const shP = ctx.shot({ t0: 25.3, in: { type: 'dissolve', dur: .7 }, name: '00.E pacific', scene: es, camera: camE, post: { exposure: 1.15, grade: ctx.grade.space, vignette: .26, grain: .02 }, update(t) { earthUpd(camE, pathPac, t, false); } });
    ctx.readout({ x: 64, y: 56, t0: 25.7, t1: 30.0, html: () => HDR('PACIFIC', '海缆路由：TeleGeography') });
    ctx.callout({ shot: shP, at: E.ll(47.197, -165), occlude: E.occlude, t0: 26.4, t1: 28.8, code: 'NCP', title: '新跨太平洋海缆', sub: '2018 年投用 · 主干约 1 万 km', side: 'right', dx: 110, dy: -100 });
    ctx.callout({ shot: shP, at: E.ll(31.62, 121.395), occlude: E.occlude, t0: 28.7, t1: 30.4, code: 'CLS', title: '上海 · 崇明登陆站', sub: '当地时间 09:42', side: 'right', dx: 120, dy: -80 });

    /* ====================== F · 上海早晨 ====================== */
    const K = await kitchenSet(ctx, shTex);
    const camK = KIT.cam(30), TY = K.TY;
    const pathK = camPath([[29.7, [.25, TY + .21, .35], [0, TY + .004, .05], 30], [32.6, [.13, TY + .17, .2], [-.006, TY + .004, .04], 28], [35.6, [.1, TY + .15, .165], [-.008, TY + .004, .036], 27]]);
    K.phone.coverM.envMapIntensity = .35;
    const kitchenPhone = t => {
      const buzz = win(t, 30.42, 31.0, .05); K.phone.group.position.x = .0007 * Math.sin(t * 190) * buzz;
    };
    const shK = ctx.shot({
      t0: 29.7, in: { type: 'dissolve', dur: .5 }, name: '00.F shanghai', scene: K.scene, camera: camK,
      post: { exposure: 1.0, ao: { radius: .05, intensity: .8 }, dof: { focus: .35, aperture: .003, maxBlur: 12 }, grade: { tint: [1.04, 1.01, .95], saturation: 1.0, contrast: 1.02 }, vignette: .28 },
      update(t) {
        const c = pathK(t); applyCam(camK, c, t, .0012); shK.post.dof.focus = camK.position.distanceTo(c.l);
        shScreen(t); K.phone.setScreenK(.82 * ss(30.42, 30.62, t)); kitchenPhone(t);
      },
    });
    ctx.readout({ x: 64, y: 56, t0: 30.1, t1: 34.9, html: () => HDR('SHANGHAI', '31.23°N 121.47°E · <span class="a">09:42:07</span>') });
    ctx.readout({ x: 1856, y: 172, align: 'right', cls: 'big', t0: 31.0, t1: 34.9, html: () => `Δt ≈ 0.1 s` });
    ctx.cue(30.45, 'ding', .9);
    scrim(shK, 29.9, 35.0);

    /* ====================== 离线镜头（t 300–312）：妈妈回复，供尾声引用 ====================== */
    const camO = KIT.cam(30); K.scene.add(camO);
    const pathO = camPath([[300, [.085, TY + .245, .145], [-.002, TY, .042], 30], [312, [.07, TY + .225, .125], [-.002, TY, .043], 29]]);
    const ovTex = KIT.canvasTex(720, 240, () => { }); let ovKey = '';
    const ov = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); ov.renderOrder = 999; camO.add(ov);
    const paintOv = (st) => {
      const ms = st < 4.55 ? 0 : Math.min(98, (st - 4.55) / 1.6 * 98), a = ss(4.2, 4.6, st) * (1 - ss(10.8, 11.6, st)), key = Math.round(ms) + '|' + Math.round(a * 20); if (key === ovKey) return; ovKey = key;
      const g = ovTex.userData.g; g.clearRect(0, 0, 720, 240); g.globalAlpha = a; g.textAlign = 'right'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12;
      g.fillStyle = 'rgba(235,235,230,.62)'; g.font = '500 22px "JetBrains Mono",Menlo,monospace'; g.fillText('SIGNAL · 上海 → 纽约', 700, 40);
      g.fillStyle = ms >= 98 ? '#ff7a30' : '#f2f2ee'; g.font = '600 104px "Barlow Condensed","Arial Narrow",sans-serif'; g.fillText(`T + ${Math.round(ms)} ms`, 700, 150);
      g.fillStyle = 'rgba(235,235,230,.62)'; g.font = '500 22px "JetBrains Mono",Menlo,monospace'; g.fillText(ms >= 98 ? 'DELIVERED · 已送达' : '…', 700, 200); ovTex.needsUpdate = true;
    };
    ctx.shot({
      offline: true, t0: 300, t1: 312, name: '00.X reply', scene: K.scene, camera: camO,
      post: { exposure: 1.0, dof: { focus: .26, aperture: .003, maxBlur: 10 }, grade: { tint: [1.04, 1.01, .95] }, vignette: .28 },
      update(t, st) {
        const c = pathO(t); applyCam(camO, c, t, .001);
        shScreen(t); K.phone.setScreenK(1.0); K.phone.group.position.x = 0;
        const d = .26, hh = d * Math.tan(15 * Math.PI / 180), hw = hh * camO.aspect, w = hw * .62, h = w / 3;
        ov.scale.set(w, h, 1); ov.position.set(hw - w / 2 - hw * .06, hh - h / 2 - hh * .08, -d); paintOv(st);
      },
    });

    /* ====================== G · 一百六十年前 ====================== */
    const ph = await KIT.photoShot('assets/photos/act1/collins_line_arctic_1852_currier.jpg', { from: { x: -.25, y: .95, s: 1.06 }, to: { x: .12, y: .7, s: 1.2 } });
    const shG = ctx.shot({
      t0: 34.8, in: { type: 'dissolve', dur: 1.0 }, name: '00.G archive', scene: ph.scene, camera: ph.camera,
      post: { tonemap: false, exposure: 1, grade: ctx.grade.sepia, flicker: .025, weave: .45, grain: .05, vignette: .45, bloom: { strength: 0 } },
      update(t, st) { ph.update(st / 7.4); shG.post.exposure = 1 - .32 * ss(38.6, 39.4, t); },
    });
    ctx.readout({ x: 64, y: 56, t0: 35.6, t1: 41.8, html: () => `<span class="a">1865</span> · 纽约 → 伦敦 · <span class="a">≈ 10 天</span>` });
    ctx.lower({ t0: 35.7, t1: 38.7, name: '美国邮船「北极号」', meta: '柯林斯航运 · 纽约—利物浦邮政航线 · 1850 年代', credit: '石版画：Nathaniel Currier · 英国国家海事博物馆藏 · 公有领域' });
    ctx.stat({ t0: 38.9, t1: 41.8, fmt: p => `${Math.round(864 * p)} 万`, unit: '倍', label: '1865 年的 10 天 ÷ 今天的 0.1 秒', src: '10 天 = 864 000 秒', dur: 1.6 });
    ctx.cue(35.0, 'sub', .4);
    scrim(shG, 35.3, 42.0, .5);

    /* ====================== H · 爆炸视图 + 三条线索 + 片名 ====================== */
    const Hs = studioSet(ctx, nyTex), AH = Hs.phone.anchors;
    Hs.explode(1); Hs.scene.updateMatrixWorld(true);
    const aW = AH.antenna.getWorldPosition(v3()), ctrH = new THREE.Box3().setFromObject(Hs.phone.group).getCenter(v3());
    Hs.explode(0); Hs.scene.updateMatrixWorld(true);
    const P0 = Hs.phone.group.position.clone();
    const orb = (c, az, el, R, dy = 0) => [c.x + R * Math.cos(el) * Math.sin(az), c.y + dy + R * Math.sin(el), c.z + R * Math.cos(el) * Math.cos(az)];
    const camH = KIT.cam(32);
    // 收尾：推向「电波」天线（顶部橙色柔性板），让它横在画面中部偏右、和第 01 章开场电键杠杆的位置一致，
    // 再以焦点虚化转到电键（两者都是「发送信号的开关」）；最后一秒画面渐暖、渐暗，接上 01 的暖色书桌
    const END = { dist: .9, dx: -.19, dy: -.045 };
    const p50 = V(...orb(ctrH, .06, .12, 2.12, -.04)), endDir = p50.clone().sub(aW).normalize().lerp(Hs.normal, .3).normalize();
    const endPos = aW.clone().addScaledVector(endDir, END.dist), rgt = V(0, 1, 0).cross(endDir).normalize();
    const endLook = aW.clone().addScaledVector(rgt, END.dx).add(V(0, END.dy, 0));
    const lookH = ctrH.clone().add(V(0, -.04, 0));
    const pathH = camPath([
      [41.6, orb(P0, .62, .08, 1.62, .02), P0.clone().add(V(0, .02, 0)).toArray(), 30],
      [44.4, orb(ctrH, .17, .12, 2.24, -.04), lookH.toArray(), 32],
      [47.4, orb(ctrH, .1, .12, 2.17, -.04), lookH.toArray(), 32],
      [50.5, p50.toArray(), lookH.toArray(), 32],
      [52.7, endPos.toArray(), endLook.toArray(), 30],
      [53.4, endPos.clone().addScaledVector(endDir, -.03).toArray(), endLook.toArray(), 30],
    ]);
    const shH = ctx.shot({
      t0: 41.6, in: { type: 'dissolve', dur: .8 }, name: '00.H explode', scene: Hs.scene, camera: camH,
      post: { exposure: 1.06, ao: { radius: .22, intensity: .9 }, dof: { focus: 2.0, aperture: .0026, maxBlur: 10 }, grade: ctx.grade.studio, vignette: .34 },
      update(t) {
        const c = pathH(t); applyCam(camH, c, t, .001);
        shH.post.dof.focus = t > 50.5 ? camH.position.distanceTo(aW) : camH.position.distanceTo(c.l);
        nyScreen(t);
        Hs.explode(easeIO(prog(t, 42.0, 44.5, u => u)));
        Hs.phone.group.rotation.y = .95 + .05 * Math.sin((t - 42) * .3);
        shH.post.exposure = (1.06 - .8 * ss(47.1, 47.9, t) * (1 - ss(50.4, 51.4, t))) * (1 - .35 * ss(52.0, 53.2, t));
        const warm = ss(51.4, 53.0, t); shH.post.grade.tint = [1 + .06 * warm, 1, 1 - .1 * warm];
        shH.post.dof.aperture = .0026 + .004 * ss(51.0, 52.4, t);
      },
    });
    ctx.callout({ shot: shH, at: () => AH.antenna.getWorldPosition(v3()), t0: 44.6, t1: 47.35, code: '01', title: '电波', sub: '天线 · 无线通信', side: 'right', dx: 150, dy: -80 });
    ctx.callout({ shot: shH, at: () => AH.soc.getWorldPosition(v3()), t0: 45.4, t1: 47.35, code: '02', title: '计算', sub: '芯片 · 数十亿个晶体管', side: 'left', dx: 250, dy: -60 });
    ctx.callout({ shot: shH, at: () => AH.modem.getWorldPosition(v3()), t0: 46.2, t1: 47.35, code: '03', title: '网络', sub: '基带 · 协议 · 光纤', side: 'right', dx: 200, dy: 100 });
    ctx.callout({ shot: shH, at: () => AH.antenna.getWorldPosition(v3()), t0: 51.0, t1: 52.15, code: '01', title: '电波', sub: '发送信号的开关', side: 'right', dx: 120, dy: 90 });
    ctx.dom('title', 47.5, 51.2, .8);
    ctx.cue(44.5, 'tick', 1); ctx.cue(45.3, 'tick', 1); ctx.cue(46.1, 'tick', 1); ctx.cue(47.5, 'sub', .8); ctx.cue(51.0, 'whoosh', 1.6, .5);
  },
};
