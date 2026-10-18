/* 01 · 跨洋电报（1844 — 1866）
   镜头：A1 电键特写 → A2 电路全景（电键 → 64 km 线路 → 音响器，按下时电流沿导线流动）→ B2 收报端音响器 + 摩尔斯示波条（解出 W H A T）
        → C1 大西洋海缆 + 海床剖面 → C2 大东方号 / 心之港登陆（档案画作，共用一条署名条）→ D 1866 电缆阶梯剖切（逐层长出）
        → E1 越远越平：沿线 4 个测量点的波形 + 电阻电容示意 → E2 发得快 vs 发得慢 → F 大西洋：十多天 → 几分钟。
   屏幕文字原则：每个镜头最多 2 个引线标注 + 1 个信息面板，每个标注完整停留 ≥ 3.5 秒。
   道具在 src/props/01/（电键/音响器/电池按真实尺寸以米建模；电缆以厘米建模）。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, easeOut, camPath, applyCam, rng, fmtThin } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { makeMats, buildKey, buildSounder, buildBattery, wire } from '../props/01/telegraph.js';
import { buildCable, rcPulse, rcGround } from '../props/01/cable.js';

/* ---------- 电键动作时间表（摩尔斯：点 1u、划 3u、元素间 1u、字母间 3u、词间 7u） ---------- */
const CODE = { W: '.--', H: '....', A: '.-', T: '-' };
function morse(word, t0, u) {
  const iv = [], letters = []; let x = t0;
  for (const ch of word) { const s = x; for (const e of CODE[ch]) { const d = e === '-' ? 3 * u : u; iv.push([x, x + d, e]); x += d + u; } letters.push({ ch, code: CODE[ch], t0: s, t1: x - u }); x += 2 * u; }
  return { iv, letters, end: x };
}
const U = .09;
const M_A1 = [[1.95, 2.08, '.'], [2.21, 2.6, '-']];             // 片头：「A」· —
// 电路全景：先按住 1.3 s 再松开（字幕「按下电键，电路接通；松开，电路断开」），再敲几下长短不一的脉冲（「长短不一的电流脉冲」）
const M_A2 = [[4.55, 5.85, '-'], [6.95, 7.08, '.'], [7.25, 7.6, '-'], [7.8, 7.93, '.']];
const WHAT = morse('WHAT', 8.8, U);                               // 收报端特写 + 示波条：逐字母解出 W H A T
const PRESS = [...M_A1, ...M_A2, ...WHAT.iv];
const keyAt = t => { let a = 0; for (const [d, u] of PRESS) { if (t < d - .05 || t > u + .1) continue; a = Math.max(a, ss(d, d + .018, t) * (1 - ss(u, u + .028, t))); } return a; };

export default {
  id: '01', status: 'implemented', slug: 'telegraph', title: '跨洋电报', dur: 48,
  card: {"act": "第一部", "actName": "电波", "title": "跨洋电报", "short": "跨洋电报", "meta": "1844 — 1866 · 大西洋"},
  stamps: [[0, "1844"], [19.3, "1866"]],
  caps: [[0.4, 6.4, "1844 年，摩尔斯的电报线连通华盛顿与巴尔的摩：按下电键，电路接通；松开，电路断开。"], [6.8, 12.8, "长短不一的电流脉冲，在远处敲出「嘀」和「嗒」——这就是摩尔斯电码。"], [13.2, 18.8, "可要跨过大西洋，导线就得沉进数千米深的海底。"], [19.2, 24.6, "1866 年，巨轮「大东方号」铺通了第一条长期可用的跨大西洋电缆。"], [25.0, 31.0, "电缆的核心是一束铜线，裹着叫作古塔胶的天然树胶绝缘，外面再缠上铁丝铠装。"], [31.4, 37.4, "但几千公里的电缆，电阻与电容沿线层层累积，清脆的脉冲到了对岸，被「抹」成一个缓慢的鼓包。"], [37.8, 42.4, "发报员只能放慢速度，每分钟只发得出几个单词。"], [42.8, 47.8, "即便如此，欧美之间的消息，也从十多天缩短到了几分钟。"]],
  credits: [
    'assets/photos/act1/great_eastern_laying_atlantic_cable_painting_rmg.jpg',
    'assets/photos/act1/hearts_content_cable_landing_1866_dudley.jpg',
    'assets/hdri/vintage_measuring_lab_2k.hdr',
    'assets/tex/dark_wood', 'assets/tex/brown_leather', 'assets/tex/acg_paper006_aged_paper',
    'assets/models/polyhaven/vintage_oil_lamp', 'assets/models/polyhaven/pocket_watch', 'assets/models/polyhaven/round_spectacles', 'assets/models/polyhaven/book_encyclopedia_set_01',
    'assets/earth/earth_day_8k.jpg', 'assets/earth/earth_clouds_8k.jpg', 'assets/earth/earth_lights_8k.jpg', 'assets/earth/earth_normal_4k.png', 'assets/earth/stars_8k.jpg',
  ],

  async build(ctx) {
    const { KIT } = ctx;
    // 绕过引擎缺陷：导出/截图模式下 stageScale×dpr = 1，HUD.setScale 不会把 #hud2d 从默认 300×150 改成 1920×1080，draw2d 会被放大糊掉。
    { const cv = document.getElementById('hud2d'); if (cv && cv.width === 300 && cv.height === 150) { cv.width = 1920; cv.height = 1080; } }

    /* ================================================================
       场景 1：1844 年电报局的书桌（单位：米）
       ================================================================ */
    const sA = new THREE.Scene();
    await KIT.hdri(sA, KIT.hdriFile('vintage_measuring_lab'), { intensity: .42, rotation: 2.2, background: true, bgBlur: .6, bgIntensity: .09 });
    const sun = new THREE.DirectionalLight(0xffd2a0, 3.4); sun.position.set(-.9, 1.05, -.55); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -.6, right: .6, top: .6, bottom: -.6, near: .1, far: 4 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.00015; sun.shadow.normalBias = .0015; sun.shadow.radius = 3;
    sA.add(sun, sun.target);
    const bounce = new THREE.PointLight(0xffc89a, .18, 0, 2); bounce.position.set(.35, .25, .45); sA.add(bounce);
    const deskMat = await KIT.pbr('dark_wood', { repeat: 3 }); deskMat.color.setRGB(.92, .8, .7);
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), deskMat); desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; sA.add(desk);
    // 背后的护墙板（景深里只剩暖色木纹），让背景读作 19 世纪的房间而不是影棚
    const wallMat = await KIT.pbr('dark_wood', { repeat: [2.2, 1.4] }); wallMat.color.setRGB(.42, .33, .27);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), wallMat); wall.position.set(-.2, .8, -.8); wall.rotation.y = .18; wall.receiveShadow = true; sA.add(wall);
    const rail = new THREE.Mesh(KIT.rbox(3.2, .035, .03, .008), wallMat); rail.position.set(-.2, .42, -.785); rail.rotation.y = .18; sA.add(rail);
    const leather = await KIT.pbr('brown_leather', { repeat: 1.4 });
    const pad = new THREE.Mesh(KIT.rbox(.44, .003, .3, .0012, 2), leather); pad.position.set(-.01, .0015, .02); pad.receiveShadow = true; sA.add(pad);
    const wood = await KIT.pbr('dark_wood', { repeat: .45 }); wood.color.setRGB(1.0, .8, .64);
    const mt = makeMats(KIT, wood);
    const key = buildKey(mt); key.group.position.set(0, .003, 0); sA.add(key.group);
    const sdr = buildSounder(mt); sdr.group.position.set(.3, 0, -.05); sdr.group.rotation.y = -.42; sA.add(sdr.group);
    const bat = buildBattery(mt, KIT); bat.group.position.set(-.3, 0, -.17); bat.group.rotation.y = .35; sA.add(bat.group);
    sA.updateMatrixWorld(true);
    const W_ = (grp, p) => grp.localToWorld(p.clone());
    const kP0 = W_(key.group, key.posts[0]), kP1 = W_(key.group, key.posts[1]);
    const sP0 = W_(sdr.group, sdr.posts[0]), sP1 = W_(sdr.group, sdr.posts[1]);
    const bPlus = W_(bat.group, bat.plus), bMinus = W_(bat.group, bat.minus);
    const PADY = .0046, DY = .0017;
    // 回路：电池+ → 电键近侧接线柱 ┆ 电键远侧接线柱 → 线路（≈ 64 km）→ 音响器 → 回线 → 电池−
    const w1 = wire(mt, [bPlus, bPlus.clone().add(V(.01, .006, .012)), V(-.2, .05, -.06), V(-.175, PADY, -.03), V(-.15, PADY, .02), V(-.115, PADY, .05), V(-.086, .008, .034), kP1.clone().add(V(-.001, -.003, 0))]);
    const w2 = wire(mt, [kP0.clone().add(V(-.001, -.003, 0)), V(-.086, .009, -.034), V(-.07, PADY, -.07), V(0, PADY, -.098), V(.11, PADY, -.11), V(.19, PADY, -.115), V(sP0.x - .03, DY + .002, sP0.z - .012), sP0.clone().add(V(0, -.003, 0))]);
    const w3 = wire(mt, [sP1.clone().add(V(0, -.003, 0)), V(sP1.x - .012, .008, sP1.z + .03), V(sP1.x - .03, DY, sP1.z + .1), V(.15, DY, .21), V(-.05, DY, .25), V(-.25, DY, .2), V(-.38, DY, .02), V(bMinus.x - .03, .012, bMinus.z + .03), V(bMinus.x - .012, .1, bMinus.z + .006), bMinus.clone().add(V(-.004, .002, 0))]);
    sA.add(w1.mesh, w2.mesh, w3.mesh);
    // 布景：油灯 / 怀表 / 眼镜 / 书 / 电报纸
    const prop = async (id, size, p, ry = 0) => { try { const m = await KIT.model(`assets/models/polyhaven/${id}/${id}_1k.gltf`, { size }); m.position.set(...p); m.rotation.y = ry; sA.add(m); return m; } catch (e) { console.warn('[01] model', id, e); return null; } };
    await Promise.all([
      prop('vintage_oil_lamp', .36, [-.5, 0, -.42], .4), prop('book_encyclopedia_set_01', .34, [.52, 0, -.5], -.3),
      prop('pocket_watch', .056, [-.165, .003, .115], .9), prop('round_spectacles', .125, [.2, .003, -.15], 2.6),
    ]);
    const paperMat = await KIT.pbr('acg_paper006_aged_paper', { repeat: 1 }); paperMat.roughness = .9; paperMat.color.setRGB(1.05, 1, .92);
    const ink2 = KIT.canvasTex(512, 680, (g, w, h) => {      // 一张写了一半的电报稿：横线 + 手写摩尔斯/字母
      g.clearRect(0, 0, w, h); const r = rng(5); g.strokeStyle = 'rgba(60,40,30,.35)'; g.lineWidth = 1.2;
      for (let y = 120; y < h - 40; y += 36) { g.beginPath(); g.moveTo(40, y); g.lineTo(w - 40, y); g.stroke(); }
      g.fillStyle = 'rgba(40,28,22,.75)'; g.font = 'italic 30px Georgia, serif'; g.fillText('Washington  May 24', 60, 80);
      g.strokeStyle = 'rgba(30,22,18,.8)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let row = 0; row < 7; row++) { let x = 50; const y = 112 + row * 36; while (x < w - 70 && (row < 6 || x < 300)) { const d = r() < .45 ? 26 : 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + d, y - 1 + r() * 2); g.stroke(); x += d + 10 + (r() < .3 ? 22 : 0); } }
    });
    const paperInk = new THREE.MeshStandardMaterial({ map: ink2, transparent: true, roughness: .9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const sheet = new THREE.Group(); sheet.position.set(-.06, .0032, .2); sheet.rotation.y = .22; sA.add(sheet);
    const sh1 = new THREE.Mesh(new THREE.PlaneGeometry(.17, .22), paperMat); sh1.rotation.x = -Math.PI / 2; sh1.receiveShadow = true; sheet.add(sh1);
    const sh2 = new THREE.Mesh(new THREE.PlaneGeometry(.17, .22), paperInk); sh2.rotation.x = -Math.PI / 2; sh2.position.y = .0002; sheet.add(sh2);

    const updDesk = t => { const a = keyAt(t); key.set(a); sdr.set(a); };

    // ---- A1 电键特写（0–3.6）：画面左 40% 留给章节卡；第 15 章尾声在 1.4 s 处引用这个画面 ----
    const cA1 = KIT.cam(26);
    const pA1 = camPath([[0, [.27, .105, .2], [-.035, .03, .0], 26], [4.4, [.215, .082, .158], [-.03, .03, .005], 25]]);
    // 焦点虚化转场：00 结尾的天线 → 电键（两者都是「发送信号的开关」）
    const shA1 = ctx.shot({ t0: 0, name: 'A1 电键', in: { type: 'blur', dur: 1.4, params: [5] }, scene: sA, camera: cA1,
      post: { exposure: 1.08, ao: { radius: .02, intensity: 1 }, dof: { focus: .27, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .32 },
      update(t) { applyCam(cA1, pA1(t), t, .0012); updDesk(t); this.post.dof.focus = cA1.position.distanceTo(key.knob); } });

    // ---- A2 电路全景（3.6–8.6）：只标发报端与收报端两处，加一条「线路长约 64 km」；电流用沿导线流动的亮点表示 ----
    const cA2 = KIT.cam(30);
    const pA2 = camPath([[3.6, [-.005, .5, .69], [.025, .02, -.05], 31], [8.8, [.05, .47, .655], [.025, .02, -.05], 30.5]]);
    const shA2 = ctx.shot({ t0: 3.6, name: 'A2 电路', in: { type: 'cut' }, scene: sA, camera: cA2,
      post: { exposure: 1.1, ao: { radius: .03, intensity: 1 }, dof: { focus: .74, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .3 },
      update(t) { applyCam(cA2, pA2(t), t, .0008); updDesk(t); } });
    const sample = (c, n = 90) => { const a = []; for (let i = 0; i <= n; i++) a.push(c.getPointAt(i / n)); return a; };
    const S1 = sample(w1.curve), S2 = sample(w2.curve), S3 = sample(w3.curve);
    const loop = [{ pts: S1, L: w1.L }, { pts: S2, L: w2.L }, { pts: S3, L: w3.L }];
    ctx.draw2d({ shot: shA2, t0: 3.75, t1: 8.8, draw(g, t, a, P) {
      const draw = ss(3.75, 4.35, t), on = keyAt(t);
      // 白线描出整条回路（导线位置），画出动画；接通时变成橙色
      for (const w of loop) {
        const n = Math.floor(w.pts.length * draw); if (n < 2) continue;
        const sc = w.pts.slice(0, n).map(p => P(p)).filter(Boolean);
        ink.line(g, sc.map(q => [q.x, q.y]), on > .5 ? 'rgba(255,170,100,.95)' : 'rgba(246,246,242,.75)', 2);
      }
      // 线路中段的「断开」符号：表示这段导线其实长 64 km
      const m = P(w2.curve.getPointAt(.72)), m2 = P(w2.curve.getPointAt(.74));
      if (m && m2 && draw > .9) {
        const dx = m2.x - m.x, dy = m2.y - m.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, tx = dx / L, ty = dy / L;
        g.globalAlpha = a * ss(4.0, 4.3, t);
        for (const o of [-6, 6]) ink.line(g, [[m.x + tx * o - nx * 13 - tx * 4, m.y + ty * o - ny * 13 - ty * 4], [m.x + tx * o + nx * 13 + tx * 4, m.y + ty * o + ny * 13 + ty * 4]], ink.white, 2);
        const lb = '线路长约 64 km', ly = m.y - 30; g.font = ink.sans(24, 500); const lw = g.measureText(lb).width;
        g.fillStyle = 'rgba(8,10,14,.85)'; g.fillRect(m.x - lw / 2 - 12, ly - 26, lw + 24, 38);
        ink.text(g, lb, m.x, ly, { font: ink.sans(24, 500), color: ink.white, align: 'center' });
        g.globalAlpha = a;
      }
      // 电流：沿回路流动的小亮点（电键按下时）
      const flow = on;
      if (flow > .01) {
        const tt = t, sp = .16, gap = .028;
        for (const w of loop) for (let s = (tt * sp) % gap; s < w.L; s += gap) {
          const q = P(w.pts[Math.min(w.pts.length - 1, Math.round(s / w.L * (w.pts.length - 1)))]); if (!q) continue;
          g.globalAlpha = a * flow; g.fillStyle = 'rgba(255,170,90,.95)'; g.beginPath(); g.arc(q.x, q.y, 3.2, 0, 7); g.fill();
          g.fillStyle = '#fff6ea'; g.beginPath(); g.arc(q.x, q.y, 1.4, 0, 7); g.fill();
        }
        g.globalAlpha = a;
      }
    } });
    ctx.callout({ shot: shA2, at: key.knob.clone().add(V(0, .003, 0)), title: '电键', sub: '华盛顿：按下发报', t0: 3.6, t1: 9.0, side: 'left', dx: 150, dy: 230 });
    ctx.callout({ shot: shA2, at: W_(sdr.group, sdr.coilTop), title: '音响器', sub: '巴尔的摩：收报', t0: 4.4, t1: 9.0, side: 'left', dx: 80, dy: -170 });

    // ---- B2 远端：巴尔的摩的音响器（8.6–12.9）。字幕说到「在远处敲出」时切到收报端，看衔铁被吸下、弹回；
    //      上方示波条把每次敲击记成脉冲，下面逐字母解出 W H A T ----
    const SX = 330, SY = 84, SW = 1260, SH = 176, TA = 8.7, TB = 11.95, xOf = tt => SX + (tt - TA) / (TB - TA) * SW;
    ctx.draw2d({ t0: 8.65, t1: 12.95, draw(g, t) {
      const hd = clamp(t, TA, TB);
      g.fillStyle = 'rgba(8,10,12,.86)'; g.fillRect(SX, SY, SW, SH); ink.rect(g, SX, SY, SW, SH, ink.faint, 1);
      // 图例（大字、常驻）：短脉冲 = 嘀，长脉冲 = 嗒
      ink.text(g, '短脉冲 =「嘀」', SX + 20, SY + 38, { font: ink.sans(24, 500), color: ink.white });
      ink.text(g, '长脉冲 =「嗒」', SX + 250, SY + 38, { font: ink.sans(24, 500), color: ink.accent });
      const base = SY + SH - 22, top = SY + 64;
      ink.line(g, [[SX + 12, base], [SX + SW - 12, base]], ink.faint, 1);
      // 波形：点（短）画白色，划（长）画橙色，与图例对应
      const seg = (x0, x1, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let x = x0; x <= x1; x += 1) { const tt = TA + (x - SX) / SW * (TB - TA), y = lerp(base, top, keyAt(tt)); x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); };
      seg(SX, xOf(hd), ink.white, 2.4);
      for (const [d, u, e] of WHAT.iv) if (e === '-' && hd > d) seg(xOf(d) - 2, Math.min(xOf(u) + 2, xOf(hd)), ink.accent, 3.2);
      ink.line(g, [[xOf(hd), SY + 52], [xOf(hd), SY + SH - 8]], 'rgba(255,122,48,.8)', 1.5);
      // 逐字母解码（大字母，不再附点划小字）
      for (const L of WHAT.letters) {
        if (t < L.t1 + .05) continue; g.globalAlpha = ss(L.t1 + .05, L.t1 + .25, t);
        const x0 = xOf(L.t0), x1 = xOf(L.t1), cx = (x0 + x1) / 2;
        ink.line(g, [[x0, SY + SH + 8], [x0, SY + SH + 16], [x1, SY + SH + 16], [x1, SY + SH + 8]], ink.white, 1.5);
        g.fillStyle = 'rgba(8,10,12,.82)'; g.fillRect(cx - 30, SY + SH + 22, 60, 58);
        ink.text(g, L.ch, cx, SY + SH + 70, { font: ink.cond(50), color: ink.white, align: 'center' });
        g.globalAlpha = 1;
      }
    } });
    const sL = (x, y, z) => sdr.group.localToWorld(V(x, y, z));
    const cB2 = KIT.cam(30), lookB2 = sL(.012, .071, 0).toArray();
    const pB2 = camPath([[8.6, sL(.15, .14, .40).toArray(), lookB2, 30], [13.9, sL(.12, .13, .36).toArray(), lookB2, 29.5]]);
    const shB2 = ctx.shot({ t0: 8.6, name: 'B2 音响器', in: { type: 'cut' }, scene: sA, camera: cB2,
      post: { exposure: 1.1, ao: { radius: .015, intensity: 1 }, dof: { focus: .22, aperture: .003, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .32 },
      update(t) { const c = pB2(t); applyCam(cB2, c, t, .0009); updDesk(t); this.post.dof.focus = c.p.distanceTo(c.l); } });
    ctx.callout({ shot: shB2, at: sL(-.03, .081, .012), title: '衔铁', sub: '通电吸下，断电弹回，咔嗒作响', t0: 8.8, t1: 13.4, side: 'left', dx: 110, dy: 150 });

    /* ================================================================
       场景 2：写实地球 · 北大西洋（1866 年 7 月 27 日的日照）
       ================================================================ */
    const sE = new THREE.Scene(); const E = await ctx.earth({ quality: '8k', cloudOpacity: .72 }); sE.add(E.group); await E.addStars(sE, .2);
    E.setSunFromUTC(Date.UTC(1866, 6, 27, 16, 30));
    const VAL = [51.93, -10.35], HC = [47.88, -53.37], LON = [51.507, -.128], NY = [40.713, -74.006];
    const atl = E.path([VAL, HC], { width: 2.6, color: 0xffe2bc, opacity: .97, intensity: 1, head: 0, glowHead: 1.6, alt: .003 });
    // 云量按镜头调：C1 要看清海底地形（大陆架浅蓝、大西洋中脊），F 恢复成正常天气
    const cloudK = k => { if (E.clouds) E.clouds.material.uniforms.uOp.value = k; E.surface.material.uniforms.uCloudShadow.value = .55 * k / .72; };
    const land1 = E.path([LON, [52.2, -4.5], [52.05, -9.0], VAL], { width: 1.2, color: 0xe8e2d6, opacity: .7, dash: 60, alt: .003 });
    const land2 = E.path([HC, [46.2, -59.9], [44.6, -63.6], [42.4, -70.9], NY], { width: 1.2, color: 0xe8e2d6, opacity: .7, dash: 60, alt: .003 });
    const D2R = Math.PI / 180, gcKm = Math.round(2 * 6371 * Math.asin(Math.sqrt(Math.sin((HC[0] - VAL[0]) * D2R / 2) ** 2 + Math.cos(VAL[0] * D2R) * Math.cos(HC[0] * D2R) * Math.sin((HC[1] - VAL[1]) * D2R / 2) ** 2)) / 10) * 10;
    const cC = KIT.cam(30, .01, 3000);
    const pC = camPath([[12.9, E.ll(31, -29, 10.2).toArray(), E.ll(49.5, -31.5, 0).toArray(), 30], [20, E.ll(37.5, -31.5, 7.1).toArray(), E.ll(50, -32, 0).toArray(), 30]]);
    const shC = ctx.shot({ t0: 12.9, name: 'C1 大西洋', in: { type: 'dissolve', dur: 1.0 }, scene: sE, camera: cC, post: { exposure: 1.12, grade: ctx.grade.space, vignette: .3 },
      update(t) { applyCam(cC, pC(t)); E.update(t, cC); cloudK(.26); atl.set({ head: easeIO(ss(13.7, 17.2, t)), pulse: 0, time: t }); land1.visible = land2.visible = false; } });
    // 两端各一个标注（只写「哪一岸」，去掉经纬度）；两岸距离并入下面的剖面图
    ctx.callout({ shot: shC, at: () => E.ll(VAL[0], VAL[1]), title: '瓦伦西亚岛', sub: '爱尔兰 · 欧洲这一端', t0: 13.8, t1: 20.2, side: 'right', dx: 90, dy: -110, occlude: E.occlude });
    ctx.callout({ shot: shC, at: () => E.ll(HC[0], HC[1]), title: '心之港', sub: '纽芬兰 · 北美这一端', t0: 14.6, t1: 20.2, side: 'left', dx: 90, dy: -120, occlude: E.occlude });
    // 海床剖面（示意）：心之港（左）→ 瓦伦西亚（右），与画面东西方向一致；放在右下角，避开两个地名和字幕区
    const PROF = [[0, 0], [.02, .07], [.05, .16], [.085, 1.2], [.12, 3.2], [.16, 4.1], [.22, 4.35], [.3, 4.15], [.37, 3.7], [.43, 3.0], [.48, 2.45], [.52, 2.2], [.56, 2.6], [.6, 3.2], [.66, 3.75], [.74, 3.95], [.81, 3.5], [.86, 2.4], [.9, .9], [.935, .2], [.97, .1], [1, 0]];
    const pr = rng(19), depthAt = u => { let i = 0; while (i < PROF.length - 2 && u > PROF[i + 1][0]) i++; const [a0, d0] = PROF[i], [a1, d1] = PROF[i + 1]; return lerp(d0, d1, (u - a0) / (a1 - a0)); };
    const PJ = []; for (let i = 0; i <= 160; i++) PJ.push(depthAt(i / 160) + (i > 6 && i < 154 ? (pr() - .5) * .16 : 0));
    const PX = 1160, PY0 = 586, PW_ = 700, PH = 294;
    ctx.draw2d({ shot: shC, t0: 15.4, t1: 20.2, draw(g, t) {
      g.fillStyle = 'rgba(6,9,12,.86)'; g.fillRect(PX, PY0, PW_, PH); ink.rect(g, PX, PY0, PW_, PH, ink.faint, 1);
      const sy = PY0 + 74, kmPx = 34, x0 = PX + 24, x1 = PX + PW_ - 24;
      ink.text(g, '海底深达数千米', PX + 22, PY0 + 40, { font: ink.sans(28, 500), color: ink.white });
      const vex = Math.round((gcKm / (x1 - x0)) / (1 / kmPx) / 10) * 10; ink.text(g, `高度放大约 ${vex} 倍`, PX + PW_ - 22, PY0 + 38, { font: ink.sans(20), color: 'rgba(238,238,232,.85)', align: 'right' });
      const rv = ss(15.6, 16.3, t), pts = PJ.map((d, i) => [x0 + (x1 - x0) * i / 160, sy + d * kmPx]);
      g.fillStyle = 'rgba(40,66,88,.75)'; g.beginPath(); g.moveTo(x0, sy); for (const p of pts) g.lineTo(p[0], lerp(sy, p[1], rv)); g.lineTo(x1, sy); g.fill();
      ink.line(g, [[x0, sy], [x1, sy]], 'rgba(150,200,235,.85)', 1.5);
      ink.line(g, pts.map(p => [p[0], lerp(sy, p[1], rv)]), 'rgba(238,238,232,.85)', 1.6);
      // 电缆沿海床铺设（从瓦伦西亚一侧开始），与地球上的画线同步
      const hd = easeIO(ss(13.7, 17.2, t)), n = Math.round(160 * hd);
      if (n > 1 && rv > .99) { const seg = pts.slice(160 - n).map(p => [p[0], p[1] - 2]); ink.line(g, seg, ink.accent, 3); }
      // 深度标尺（不写字，标题已说「数千米」）
      const dd = ss(16.4, 16.9, t);
      if (dd > 0) { g.globalAlpha = dd; const xm = x0 + (x1 - x0) * .22, yb = sy + 4.35 * kmPx; ink.line(g, [[xm - 10, sy], [xm + 10, sy]], ink.white, 2); ink.line(g, [[xm, sy], [xm, yb]], ink.white, 2); ink.line(g, [[xm - 10, yb], [xm + 10, yb]], ink.white, 2); g.globalAlpha = 1; }
      // 横向：两岸距离
      const by = PY0 + PH - 26;
      ink.line(g, [[x0, by - 8], [x1, by - 8]], 'rgba(238,238,232,.6)', 1.2); ink.line(g, [[x0, by - 15], [x0, by - 1]], 'rgba(238,238,232,.6)', 1.2); ink.line(g, [[x1, by - 15], [x1, by - 1]], 'rgba(238,238,232,.6)', 1.2);
      const dl = `两岸相距约 ${fmtThin(gcKm)} km`; g.font = ink.sans(22, 500); const dw = g.measureText(dl).width;
      g.fillStyle = 'rgba(6,9,12,1)'; g.fillRect((x0 + x1) / 2 - dw / 2 - 12, by - 26, dw + 24, 36);
      ink.text(g, dl, (x0 + x1) / 2, by, { font: ink.sans(22, 500), color: ink.white, align: 'center' });
    } });

    /* ================================================================
       C2 档案画作：大东方号铺缆 / 心之港登陆
       ================================================================ */
    const ph1 = await KIT.photoShot('assets/photos/act1/great_eastern_laying_atlantic_cable_painting_rmg.jpg', { from: { x: .25, y: .05, s: 1.06 }, to: { x: -.05, y: -.05, s: 1.2 } });
    const phPost = { tonemap: false, grade: { saturation: .82, contrast: 1.04, tint: [1.03, 1, .94], lift: [.01, .008, .004] }, grain: .04, vignette: .42, flicker: .015 };
    ctx.shot({ t0: 19.3, name: 'C2 大东方号', in: { type: 'dissolve', dur: .9 }, scene: ph1.scene, camera: ph1.camera, post: phPost, update(t, st) { ph1.update(st / 3.5); } });
    const ph2 = await KIT.photoShot('assets/photos/act1/hearts_content_cable_landing_1866_dudley.jpg', { from: { x: .1, y: .1, s: 1.05 }, to: { x: .55, y: -.05, s: 1.2 } });
    ctx.shot({ t0: 22.1, name: 'C2 心之港', in: { type: 'dissolve', dur: .7 }, scene: ph2.scene, camera: ph2.camera, post: phPost, update(t, st) { ph2.update(st / 3.5); } });
    // 两幅画共用一条署名条（停留 5 秒），两位画家的署名都在 credit 里（授权要求）
    ctx.lower({ t0: 19.7, t1: 24.9, name: '1866：大东方号铺设大西洋电缆', meta: '7 月，电缆在纽芬兰心之港登陆', credit: '画：Henry Clifford（英国国家海事博物馆）· Robert Charles Dudley · 均为公有领域' });

    // 档案画作上的署名条：左下压一层柔和的暗部，保证文字可读（不加框）
    const scrim = (t0, t1) => ctx.draw2d({ t0, t1, draw(g, t) {
      const a = win(t, t0, t1, .45); if (a <= 0) return; g.save(); g.globalAlpha = a;
      g.translate(420, 840); g.scale(1.9, 1); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 430);
      gr.addColorStop(0, 'rgba(6,5,4,.68)'); gr.addColorStop(.55, 'rgba(6,5,4,.4)'); gr.addColorStop(1, 'rgba(6,5,4,0)');
      g.fillStyle = gr; g.fillRect(-430, -430, 860, 860); g.restore(); } });
    scrim(19.5, 25.1);

    /* ================================================================
       场景 3：1866 电缆（暗棚，单位：厘米）
       ================================================================ */
    const sD = new THREE.Scene();
    const stD = KIT.studio(sD, { floorY: -1.45, size: 600, curve: 40, key: 5200, keyPos: [26, 34, 30], rim: 3800, rimPos: [-24, 16, -26], fill: 260, fillPos: [-26, 6, 22], env: .3, bg: 0x0b0c0e, shadowRadius: 5 });
    Object.assign(stD.key.shadow.camera, { near: 5, far: 200 }); stD.key.shadow.camera.updateProjectionMatrix(); stD.key.shadow.normalBias = .01; stD.key.angle = Math.PI / 7;
    const cab = buildCable(KIT, { len: 220, innerLen: 26 }); sD.add(cab.group); sD.fog = new THREE.Fog(0x0b0c0e, 140, 420);
    // 第二盏轮廓光沿电缆方向打过来，让长电缆在暗处有一条高光
    const keyE = new THREE.SpotLight(0xfff4e8, 4200, 0, Math.PI / 5, .8, 2); keyE.position.set(-26, 36, 30); keyE.target.position.set(-30, 0, 0); keyE.castShadow = true; keyE.shadow.mapSize.set(2048, 2048); keyE.shadow.radius = 5; keyE.shadow.normalBias = .01; Object.assign(keyE.shadow.camera, { near: 5, far: 200 }); sD.add(keyE, keyE.target);
    const rim2 = new THREE.SpotLight(0xfff0e0, 2200, 0, Math.PI / 9, .8, 2); rim2.position.set(30, 12, -10); rim2.target.position.set(-60, 0, 0); sD.add(rim2, rim2.target);
    // 铜芯 → 古塔胶 → 黄麻 → 铠装依次长出；铠装提前到 27 s 长出，让它的标注能完整停留
    const cabAt = t => cab.set({ gp: [0, 1, 2, 3].map(i => ss(25.7 + i * .2, 26.3 + i * .2, t)), jute: ss(26.7, 27.2, t), arm: ss(27.0, 28.2, t), xFrom: -12 });

    // ---- D 剖面逐层长出（24.8–31.6）：只标两样——铜线一眼就能认出，不另加标注；
    //      标「古塔胶」（陌生的材料）和「铁丝铠装」（外面裹着麻纱，看上去像绳子，需要点明） ----
    const cD = KIT.cam(28);
    const pD = camPath([[24.8, [6.4, 2.1, 5.6], [2.9, .05, 0], 27], [27.2, [7.6, 3.0, 8.0], [1.7, 0, 0], 29], [29.4, [8.4, 3.9, 11.6], [.4, 0, 0], 30], [31.6, [6.6, 4.2, 13.6], [-.6, -.1, 0], 30], [32.4, [6.0, 4.25, 14.2], [-.9, -.12, 0], 30]]);
    const shD = ctx.shot({ t0: 24.8, name: 'D 电缆剖面', in: { type: 'dissolve', dur: .8 }, scene: sD, camera: cD,
      post: { exposure: 1.12, ao: { radius: .35, intensity: 1 }, dof: { focus: 8, aperture: .07, maxBlur: 8 }, grade: ctx.grade.studio, vignette: .3 },
      update(t) { const c = pD(t); applyCam(cD, c, t, .0015); cabAt(t); this.post.dof.focus = c.p.distanceTo(c.l); } });
    ctx.callout({ shot: shD, at: V(2.2, .26, .3), title: '古塔胶', sub: '一种天然树胶，用来绝缘', t0: 26.6, t1: 32.3, side: 'right', dx: 150, dy: -60 });
    ctx.callout({ shot: shD, at: V(-3.2, .95, 1.08), title: '铁丝铠装', sub: '每根铁丝外面裹着麻纱', t0: 27.5, t1: 32.3, side: 'left', dx: 110, dy: -140 });

    // ---- E1 RC 分布参数（31.2–37.65） ----
    const T0 = 12.6, PW = .16, TL = 32.55, WIN = 3.0;
    const TAPS = [0, 1 / 3, 2 / 3, 1].map(f => {
      let pk = 0, pt = 0; for (let i = 1; i < 2000; i++) { const tau = i * .002, v = rcPulse(f, tau, T0, PW); if (v > pk) { pk = v; pt = tau; } }
      const g0 = .8 / pk, gain = f === 0 ? 1 : g0 >= 100 ? Math.round(g0 / 50) * 50 : g0 >= 20 ? Math.round(g0 / 10) * 10 : Math.round(g0);
      return { f, pk, pt, gain };
    });
    const tapX = [-47, -36.5, -26, -15.5];
    const cE1 = KIT.cam(34);
    const pE1 = camPath([[31.6, [-27.5, 5.2, 36.5], [-29.5, 3.6, 0], 34], [37.9, [-32, 5.0, 35.5], [-31.5, 3.5, 0], 34]]);
    const shE1 = ctx.shot({ t0: 31.6, name: 'E1 RC 扩散', in: { type: 'dissolve', dur: .6 }, scene: sD, camera: cE1,
      post: { exposure: 1.05, ao: { radius: .4, intensity: 1 }, dof: { focus: 36, aperture: .3, maxBlur: 8 }, grade: ctx.grade.studio, vignette: .32 },
      update(t) { applyCam(cE1, pE1(t), t, .001); cab.set({}); } });
    // 一张图讲清楚：顶部结论 → 沿电缆 4 个测量点的波形（越远越平、越慢）→ 下方「电阻 + 电容」一段段重复的示意
    const LABELS = ['发送端', `${fmtThin(Math.round(gcKm / 3 / 1000) * 1000)} km 处`, `${fmtThin(Math.round(gcKm * 2 / 3 / 1000) * 1000)} km 处`, `接收端 · 约 ${fmtThin(Math.round(gcKm / 1000) * 1000)} km`];
    ctx.draw2d({ shot: shE1, t0: 31.8, t1: 37.75, draw(g, t, a, P) {
      const xs = tapX.map(x => { const q = P(V(x, 1.45, 0)); return q ? q.x : 0; });
      const cy = P(V(-30, 1.45, 0)); const cabTop = cy ? cy.y : 640;
      // ---- 结论（面板标题）----
      { const s = '传得越远，脉冲被抹得越平', y = 112; g.font = ink.sans(32, 500); const w = g.measureText(s).width;
        g.fillStyle = 'rgba(8,10,12,.86)'; g.fillRect(960 - w / 2 - 20, y - 36, w + 40, 52);
        ink.text(g, s, 960, y, { font: ink.sans(32, 500), color: ink.white, align: 'center' }); }
      // ---- 梯形 RC 网络（画出动画，从左到右）----
      const LY = 456, GY = 520, rv = ss(32.0, 32.9, t), xa = xs[0] - 40, xb = xs[3] + 40, xr = lerp(xa, xb, rv);
      g.save(); g.beginPath(); g.rect(0, 0, xr, 1080); g.clip();
      const N = 9, step = (xs[3] - xs[0]) / N;
      ink.line(g, [[xa, LY], [xs[0], LY]], ink.white, 1.6); ink.line(g, [[xa, GY], [xb, GY]], 'rgba(238,238,232,.7)', 1.4);
      for (let k = 0; k < N; k++) {
        const x0 = xs[0] + k * step, x1 = x0 + step, zx0 = x0 + step * .25, zx1 = x0 + step * .75, zz = [];
        for (let j = 0; j <= 8; j++) zz.push([lerp(zx0, zx1, j / 8), LY + (j === 0 || j === 8 ? 0 : (j % 2 ? -8 : 8))]);
        ink.line(g, [[x0, LY], [zx0, LY], ...zz, [zx1, LY], [x1, LY]], ink.white, 1.6);
        const cx = x1; ink.line(g, [[cx, LY], [cx, LY + 26]], ink.white, 1.4); ink.line(g, [[cx - 13, LY + 26], [cx + 13, LY + 26]], ink.white, 2); ink.line(g, [[cx - 13, LY + 34], [cx + 13, LY + 34]], ink.white, 2); ink.line(g, [[cx, LY + 34], [cx, GY]], ink.white, 1.4);
        if (k === 0) {
          for (const [s, x, y, al] of [['电阻', (zx0 + zx1) / 2, LY - 20, 'center'], ['电容', cx + 22, LY + 40, 'left']]) {
            g.font = ink.sans(24, 500); const w = g.measureText(s).width, bx = al === 'center' ? x - w / 2 : x;
            g.fillStyle = 'rgba(8,10,12,.86)'; g.fillRect(bx - 8, y - 25, w + 16, 34); ink.text(g, s, x, y, { font: ink.sans(24, 500), color: ink.accent, align: al });
          }
        }
      }
      ink.line(g, [[xs[3], LY], [xb, LY]], ink.white, 1.6);
      g.restore();
      // ---- 4 个测量点的波形 ----
      const tau = t - TL;
      TAPS.forEach((tp, k) => {
        const ap = ss(31.9 + k * .15, 32.3 + k * .15, t); if (ap <= 0) return; g.globalAlpha = a * ap;
        const w = 320, h = 150, x = clamp(xs[k] - w / 2, 40, 1880 - w), y = 214;
        g.fillStyle = 'rgba(8,10,12,.86)'; g.fillRect(x, y - 44, w, h + 44); ink.rect(g, x, y, w, h, ink.faint, 1);
        const base = y + h - 20, sc = h - 44;
        ink.line(g, [[x + 8, base], [x + w - 8, base]], ink.faint, 1);
        ink.text(g, LABELS[k], x + 12, y - 13, { font: ink.sans(24, 500), color: ink.white });
        const hd = clamp(tau / WIN); if (hd > 0) {
          g.strokeStyle = k ? ink.accent : ink.white; g.lineWidth = 2.6; g.beginPath();
          const n = Math.floor((w - 16) * hd);
          for (let i = 0; i <= n; i++) { const tt = i / (w - 16) * WIN, v = rcPulse(tp.f, tt, T0, PW) * tp.gain; const yy = base - clamp(v, 0, 1.05) * sc; i ? g.lineTo(x + 8 + i, yy) : g.moveTo(x + 8, yy); }
          g.stroke();
        }
        // 峰值时刻：一条细竖线（越远越靠右 = 来得越晚），不再写公式
        const mk = ss(35.1 + k * .2, 35.4 + k * .2, t);
        if (k > 0 && mk > 0 && tau > tp.pt) { g.globalAlpha = a * ap * mk; const px = x + 8 + tp.pt / WIN * (w - 16); ink.line(g, [[px, y + 10], [px, base + 6]], 'rgba(255,255,255,.6)', 1.4); }
        // 引线到电缆
        g.globalAlpha = a * ap * .8; ink.line(g, [[xs[k], y + h], [xs[k], LY - 2]], 'rgba(238,238,232,.45)', 1.2); ink.line(g, [[xs[k], GY + 2], [xs[k], cabTop - 6]], 'rgba(238,238,232,.45)', 1.2);
        g.fillStyle = ink.white; g.fillRect(xs[k] - 4, cabTop - 10, 8, 8);
        g.globalAlpha = a;
      });
    } });

    // ---- E2 快发 vs 慢发（37.65–42.4）：沿电缆望向远方 ----
    const cE2 = KIT.cam(32);
    const pE2 = camPath([[37.65, [9.5, 1.6, 8.8], [-40, -2.2, -6.5], 30], [43.3, [7.9, 1.72, 7.7], [-40, -2.1, -6], 29]]);
    const shE2 = ctx.shot({ t0: 37.65, name: 'E2 快发慢发', in: { type: 'cut' }, scene: sD, camera: cE2,
      post: { exposure: 1.05, ao: { radius: .35, intensity: 1 }, dof: { focus: 11, aperture: .1, maxBlur: 8 }, grade: ctx.grade.studio, vignette: .36 },
      update(t) { applyCam(cE2, pE2(t), t, .0012); cab.set({}); } });
    const SPAN = 8.2, NS = 600;
    // 接收端经检流计接地的有限长 RC 线（T = 6 s 量级的示意时间常数），方波脉冲宽 0.2 s
    const TG = 6, PWG = .2;
    const train = (dt, n) => { const send = [], recv = []; let mx = 0; for (let i = 0; i <= NS; i++) { const tt = i / NS * SPAN; let s = 0, r = 0; for (let k = 0; k < n; k++) { const o = tt - .25 - k * dt; if (o > 0 && o < PWG) s = 1; for (let j = 0; j < 8; j++) r += rcGround(o - (j + .5) * PWG / 8, TG) * PWG / 8; } send.push(s); recv.push(r); mx = Math.max(mx, r); } return { send, recv, mx }; };
    const FAST = train(.42, 7), SLOW = train(2.35, 3); for (const T of [FAST, SLOW]) T.recv = T.recv.map(v => v / T.mx);
    // 两行示波：白线 = 发出去的脉冲，橙线 = 对岸收到的（已放大）；行名与一句话结论放在左侧，大字
    ctx.draw2d({ shot: shE2, t0: 37.75, t1: 43.0, draw(g, t, a) {
      const rows = [{ d: FAST, y: 112, t0: 37.8, label: '发得快', note: '鼓包连成一片，分不清点和划', c: '#ff8a7a' }, { d: SLOW, y: 352, t0: 38.35, label: '发得慢', note: '鼓包一个个分开，才认得出', c: ink.white }];
      const x = 600, w = 1250, h = 200;
      for (const [ri, R] of rows.entries()) {
        const ap = ss(R.t0 - .1, R.t0 + .2, t); if (ap <= 0) continue; g.globalAlpha = a * ap;
        g.fillStyle = 'rgba(8,10,12,.86)'; g.fillRect(x, R.y, w, h); ink.rect(g, x, R.y, w, h, ink.faint, 1);
        g.fillStyle = 'rgba(8,10,12,.86)'; g.fillRect(x - 420, R.y, 404, 104);
        ink.text(g, R.label, x - 34, R.y + 44, { font: ink.sans(30, 500), color: ink.white, align: 'right' });
        if (ri === 0) { ink.text(g, '发出', x + 14, R.y + 32, { font: ink.sans(20, 500), color: ink.white }); ink.text(g, '收到（放大）', x + 14, R.y + 118, { font: ink.sans(20, 500), color: ink.accent }); }
        const hd = ss(R.t0, R.t0 + .9, t), n = Math.floor(NS * hd);
        const b1 = R.y + 80, b2 = R.y + h - 16;
        g.strokeStyle = ink.white; g.lineWidth = 2.2; g.beginPath(); for (let i = 0; i <= n; i++) { const xx = x + 90 + i / NS * (w - 110), yy = b1 - R.d.send[i] * 42; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
        g.strokeStyle = ink.accent; g.lineWidth = 2.8; g.beginPath(); for (let i = 0; i <= n; i++) { const xx = x + 90 + i / NS * (w - 110), yy = b2 - R.d.recv[i] * 66; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
        const nt = ss(R.t0 + .25, R.t0 + .5, t); if (nt > 0) { g.globalAlpha = a * ap * nt; ink.text(g, R.note, x - 34, R.y + 84, { font: ink.sans(22), color: R.c, align: 'right' }); }
        g.globalAlpha = a;
      }
    } });

    // ---- F 结果：大西洋，十多天 → 几分钟（42.4–48） ----
    const cF = KIT.cam(30, .01, 3000);
    const pF = camPath([[42.4, E.ll(38, -36, 7.4).toArray(), E.ll(48, -22, 0).toArray(), 30], [49.3, E.ll(30, -40, 12.5).toArray(), E.ll(44, -16, 0).toArray(), 30]]);
    const shF = ctx.shot({ t0: 42.4, name: 'F 十多天 → 几分钟', in: { type: 'dissolve', dur: .9 }, scene: sE, camera: cF, post: { exposure: 1.15, grade: ctx.grade.space, vignette: .28 },
      update(t) { applyCam(cF, pF(t)); E.update(t, cF); cloudK(.6); atl.set({ head: 1, pulse: 1.4, pulseLen: 1, pulseSpeed: .42, time: t - 43.2 }); land1.visible = land2.visible = true; land1.set({ head: ss(42.8, 43.6, t) }); land2.set({ head: ss(43.2, 44.0, t) }); } });
    ctx.callout({ shot: shF, at: () => E.ll(LON[0], LON[1]), title: '伦敦', t0: 42.55, t1: 48.6, side: 'left', dx: 70, dy: -60, occlude: E.occlude });
    ctx.callout({ shot: shF, at: () => E.ll(NY[0], NY[1]), title: '纽约', t0: 43.35, t1: 48.6, side: 'left', dx: 70, dy: -70, occlude: E.occlude });
    // 结论面板：标题直接给结论，两根条形对比「十多天」和「几分钟」
    ctx.draw2d({ shot: shF, t0: 44.15, t1: 48.6, draw(g, t) {
      const x = 1150, y = 330, w = 620;
      g.fillStyle = 'rgba(6,9,12,.86)'; g.fillRect(x - 28, y - 72, w + 56, 300); ink.rect(g, x - 28, y - 72, w + 56, 300, ink.faint, 1);
      ink.text(g, '电报让消息快了约 3 000 倍', x, y - 22, { font: ink.sans(30, 500), color: ink.white });
      const r1 = easeOut(ss(44.3, 45.1, t));
      ink.text(g, '1865 邮轮', x, y + 40, { font: ink.sans(24), color: ink.white });
      g.fillStyle = 'rgba(235,235,230,.9)'; g.fillRect(x, y + 56, w * r1, 22);
      if (r1 > .95) ink.text(g, '十多天', x + w, y + 40, { font: ink.sans(26, 500), color: ink.white, align: 'right' });
      const r2 = ss(45.0, 45.3, t);
      if (r2 > 0) {
        g.globalAlpha = r2; ink.text(g, '1866 电报', x, y + 130, { font: ink.sans(24), color: ink.white });
        g.fillStyle = ink.accent; g.fillRect(x, y + 146, 5, 22);
        ink.text(g, '几分钟', x + w, y + 130, { font: ink.sans(26, 500), color: ink.accent, align: 'right' });
        ink.text(g, '按 10 天 ÷ 5 分钟估算', x + w, y + 204, { font: ink.sans(20), color: 'rgba(238,238,232,.85)', align: 'right' });
        g.globalAlpha = 1;
      }
    } });

    /* ---------- 音效 ---------- */
    for (const [d, u] of M_A1) { ctx.cue(d, 'click', .5); ctx.cue(u, 'tap', .6); }
    for (const [d, u] of [...M_A2, ...WHAT.iv]) { ctx.cue(d, 'clack', .5); ctx.cue(u, 'tap', .55); }
    ctx.cue(12.9, 'whoosh', 1.3, .35); ctx.cue(13.7, 'riser', 3.4, .12);
    ctx.cue(24.8, 'swoosh', .3); [0, 1, 2, 3].forEach(i => ctx.cue(25.75 + i * .2, 'tick', .7)); ctx.cue(27.0, 'whoosh', 1.1, .22);
    ctx.cue(TL, 'click', .7);
    ctx.cue(37.65, 'tick', .8); ctx.cue(42.4, 'whoosh', 1.2, .3); ctx.cue(45.0, 'chime', 880, .1);
  },
};
