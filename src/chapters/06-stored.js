/* 06 · 存储程序（1945 — 1949）
   A1 冯·诺依曼肖像（档案）→ A2 书桌上的《EDVAC 报告初稿》封面（按原件版式排印复原）
   B1 机能风「冯·诺依曼结构」：输入 → 存储器里同时放进指令（紫）和数据（琥珀）
   B2 换一道题：只改写两格指令，程序 A（算 7 + 5）变成程序 B（每圈加 5 的循环），不必重新接线
   C  指令周期：取指（存储器 → 控制器）→ 译码 → 执行（运算器）→ 写回；节拍越来越快直到连成一片
   D  曼彻斯特「宝宝」复原机与威廉姆斯管存储屏（照片）。
   道具在 src/props/06/arch.js。所有动画都是 t 的纯函数。 */
import * as THREE from 'three';
import { V, ss, clamp, easeIO, easeOut, camPath, applyCam, Path } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { buildArch, MOD, COL, cellPos, modTop } from '../props/06/arch.js';

/* ---------- 程序与数据 ---------- */
const PROG_A = ['LOAD 24', 'ADD 25', 'STORE 26', 'HALT'];
const PROG_B = ['LOAD 26', 'ADD 25', 'STORE 26', 'JUMP 00'];   // 只改了 00 与 03 两格
const DATA0 = { 24: 7, 25: 5, 26: 0 };
const ARRIVE = [0, 1, 2, 3, 24, 25, 26].map((cell, k) => ({ cell, t: 7.25 + k * .55 }));   // 程序 A 与数据从输入端写入
const REWRITE = [{ cell: 0, t: 14.1 }, { cell: 3, t: 15.4 }];                              // 写入新指令
const TRAVEL = .5;
/* 指令周期时间表：前 3 个周期慢放看清四个阶段，之后越来越快 */
const CYC = []; { let t = 19.5, p = 1.75, n = 0; while (t < 32.6) { CYC.push({ t0: t, p, n }); t += p; n++; if (n >= 3) p = Math.max(1 / 90, p * (n < 6 ? .74 : .8)); } }
const STAGES = [['取指', 'FETCH'], ['译码', 'DECODE'], ['执行', 'EXECUTE'], ['写回', 'WRITE BACK']];
const cycleAt = t => { let k = -1; for (let i = 0; i < CYC.length; i++) if (t >= CYC[i].t0) k = i; else break; return k; };
/** 第 n 个周期执行哪条指令；u = 周期内进度 0..1。程序 B 每圈：LOAD 26 → ADD 25（累加器 +5）→ STORE 26（写回 26 号格）→ JUMP 00 */
function machine(n, u = 1) {
  const loop = Math.floor(n / 4), ins = n % 4;
  const acc = (ins === 1 && u > .75) || ins >= 2 ? 5 * loop + 5 : 5 * loop;
  const m26 = (ins === 2 && u > .97) || ins === 3 ? 5 * loop + 5 : 5 * loop;
  return { ins, text: PROG_B[ins], loop, acc, m26 };
}

export default {
  id: '06', status: 'implemented', slug: 'stored', title: '存储程序', dur: 38,
  card: {"title": "存储程序", "short": "存储程序", "meta": "1945 — 1949"},
  stamps: [[0, "1945"], [32, "1948"]],
  caps: [[0.4, 6.2, "1945 年，冯·诺依曼执笔的 EDVAC 报告，写下了关键的一笔："], [6.6, 12.4, "把程序也变成数字，和数据一起，存进同一个存储器。"], [12.8, 18.8, "换一道题，不必再重新接线——只要往存储器里写入新的指令。"], [19.2, 25.4, "处理器周而复始地做四件事：取出指令、译码、执行、写回结果。"], [25.8, 31.6, "这个节拍，至今仍在你手机的芯片里重复，每秒几十亿次。"], [32.0, 37.6, "1948 年 6 月，英国曼彻斯特的「宝宝」，在世界上第一次运行了存放在内存里的程序。"]],
  credits: ['assets/photos/act2/von_neumann_1956_doe.jpg', 'assets/photos/act2/manchester_baby_replica_head_on.jpg', 'assets/photos/act2/manchester_baby_replica_crt_bits.jpg', 'assets/tex/dark_wood', 'assets/tex/acg_paper006_aged_paper'],
  async build(ctx) {
    const { KIT } = ctx;
    const ARCH = { tonemap: false, grade: ctx.grade.archival, grain: .05, vignette: .38, weave: .5, flicker: .025, bloom: { strength: 0 } };

    /* ================= A1 · 冯·诺依曼 ================= */
    const phA = await KIT.photoShot('assets/photos/act2/von_neumann_1956_doe.jpg', { from: { x: 0, y: .14, s: 1.0 }, to: { x: 0, y: .1, s: 1.06 } });
    ctx.shot({ name: '06.A1 冯·诺依曼', t0: 0, in: { type: 'blur', dur: 1.0, params: [5] }, scene: phA.scene, camera: phA.camera, post: ARCH, update(t, st) { phA.update(st / 3.6); } });
    ctx.lower({ t0: .9, t1: 3.4, name: '约翰·冯·诺依曼 · 1903–1957', meta: '数学家 · EDVAC 报告执笔者', credit: '照片：美国能源部 · 1956 · 公有领域' });

    /* ================= A2 · 《EDVAC 报告初稿》封面（排印复原） ================= */
    const sd = new THREE.Scene();
    await KIT.hdri(sd, KIT.hdriFile('vintage_measuring_lab'), { intensity: .25, rotation: 1.2, background: true, bgBlur: .8, bgIntensity: .03 });
    const deskMat = await KIT.pbr('dark_wood', { repeat: 2 }); deskMat.color.setRGB(.85, .74, .64);
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.4), deskMat); desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; sd.add(desk);
    const lampD = new THREE.SpotLight(0xffe2bc, 8, 0, .55, .75, 2); lampD.position.set(-.45, .8, .35); lampD.target.position.set(0, 0, 0); lampD.castShadow = true; lampD.shadow.mapSize.set(2048, 2048); lampD.shadow.bias = -.0001; lampD.shadow.radius = 5; sd.add(lampD, lampD.target);
    const LINES = [['First Draft of a Report', 1, 1], ['on the EDVAC', 1, 1], ['', 0], ['by', 0], ['', 0], ['John von Neumann', 0], ['', 0], ['', 0], ['Contract No. W-670-ORD-4926', 0], ['', 0], ['Between the', 0], ['United States Army Ordnance Department', 0], ['and the', 0], ['University of Pennsylvania', 0], ['', 0], ['', 0], ['', 0], ['Moore School of Electrical Engineering', 0], ['University of Pennsylvania', 0], ['', 0], ['June 30, 1945', 0]];
    const pageTex = KIT.canvasTex(1100, 1424, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e9d9a8'); gr.addColorStop(1, '#d9c690'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) { const x = (i * 7919) % w, y = (i * 104729) % h; g.fillStyle = `rgba(120,95,40,${(i % 7) * .006})`; g.fillRect(x, y, 2, 2); }
      for (const y of [260, 700, 1140]) { g.fillStyle = 'rgba(70,60,40,.35)'; g.beginPath(); g.arc(46, y, 13, 0, 7); g.fill(); }        // 装订孔
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      LINES.forEach(([s, ul], i) => {
        if (!s) return; const y = 190 + i * 50; g.font = `${ul ? 700 : 600} 31px "Courier New", Courier, monospace`;
        for (let k = 0; k < s.length; k++) {                // 打字机：每个字母浓淡、位置略有不同
          const x = w / 2 + (k - (s.length - 1) / 2) * 18.2, j = Math.sin(i * 31 + k * 7.7) * .6;
          g.fillStyle = `rgba(28,22,16,${.86 + .14 * Math.abs(Math.sin(k * 3.1 + i))})`; g.fillText(s[k], x, y + j);
        }
        if (ul) { g.strokeStyle = 'rgba(38,30,22,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2 - s.length * 9.4, y + 7); g.lineTo(w / 2 + s.length * 9.4, y + 7); g.stroke(); }
      });
    });
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(.2159, .2794), new THREE.MeshPhysicalMaterial({ map: pageTex, roughness: .85, sheen: .3, sheenColor: new THREE.Color(0xfff0d0) }));
    paper.rotation.set(-Math.PI / 2, 0, .06); paper.position.y = .0008; paper.receiveShadow = true; sd.add(paper);
    const under = paper.clone(); under.material = new THREE.MeshPhysicalMaterial({ color: 0xd8c592, roughness: .9 }); under.rotation.z = -.05; under.position.set(.012, .0004, .01); sd.add(under);
    const camA2 = KIT.cam(30, .01, 10);
    const pA2 = camPath([[3.0, [.02, .46, .2], [0, 0, -.015], 30], [6.8, [.01, .33, .13], [0, 0, -.03], 29]]);
    const A2 = ctx.shot({ name: '06.A2 EDVAC 报告', t0: 3.1, in: { type: 'dissolve', dur: .8 }, scene: sd, camera: camA2,
      post: { exposure: 1.05, dof: { focus: .4, aperture: .008, maxBlur: 10 }, grade: ctx.grade.warm, vignette: .36, grain: .035 },
      update(t) { const c = pA2(t); applyCam(camA2, c, t, .0006); A2.post.dof.focus = camA2.position.distanceTo(c.l); } });
    ctx.lower({ t0: 3.8, t1: 6.6, name: '《EDVAC 报告初稿》', meta: '1945 年 6 月 30 日 · 宾夕法尼亚大学摩尔学院', credit: '按原件封面版式排印复原' });

    /* ================= B / C · 冯·诺依曼结构 ================= */
    const S = await buildArch(KIT);
    const memAt = t => {
      const cells = Array.from({ length: 32 }, () => ({ text: '', kind: '', hi: 0 }));
      for (const a of ARRIVE) if (t >= a.t + TRAVEL) { const c = cells[a.cell]; if (a.cell < 24) { c.text = PROG_A[a.cell]; c.kind = 'ins'; } else { c.text = String(DATA0[a.cell]); c.kind = 'data'; } c.hi = +(1 - ss(a.t + TRAVEL, a.t + TRAVEL + .6, t)).toFixed(2); }
      for (const r of REWRITE) if (t >= r.t + TRAVEL) { const c = cells[r.cell]; c.text = PROG_B[r.cell]; c.hi = +(1 - ss(r.t + TRAVEL, r.t + TRAVEL + .9, t)).toFixed(2); }
      let pc = -1; const k = cycleAt(t);
      if (k >= 0) { const c = CYC[k], u = (t - c.t0) / c.p, m = machine(c.n, u); pc = m.ins; cells[26].text = String(m.m26); if (c.p > .2 && m.ins === 2 && u > .97) cells[26].hi = 1; }
      return { cells, pc };
    };
    // 数据包路线
    const yM = MOD.M.s[1] + .035, front = MOD.M.c[1] + MOD.M.s[2] / 2 + .02, yF = .03;
    const toCC = i => { const p = cellPos(i); return [V(p.x, yM, p.z), V(p.x, yM, front - .04), V(-1.0, yM, front - .04), V(-1.0, yF, front + .03), V(-1.0, yF, .27), V(-1.0, .37, .46)]; };
    const toCA = i => { const p = cellPos(i); return [V(p.x, yM, p.z), V(p.x, yM, front - .04), V(1.0, yM, front - .04), V(1.0, yF, front + .03), V(1.0, yF, .27), V(1.0, .37, .46)]; };
    const ccToCa = [V(-1.0, .37, .46), V(-.8, yF, .62), V(.8, yF, .62), V(1.0, .37, .46)];
    const fromIn = i => { const p = cellPos(i); return [V(-2.5, yF, -.95), V(-1.27, yF, -.95), V(-1.2, yM, -.95), V(p.x, yM, -.95), V(p.x, yM, p.z)]; };
    const paths = new Map(); const P = (key, pts) => { if (!paths.has(key)) paths.set(key, new Path(pts)); return paths.get(key); };
    /** 本时刻的数据包：{ path, u, color, len } 或 null */
    const packetAt = t => {
      for (const a of [...ARRIVE, ...REWRITE]) if (t >= a.t && t < a.t + TRAVEL) return { path: P('in' + a.cell, fromIn(a.cell)), u: easeIO((t - a.t) / TRAVEL), color: a.cell < 24 ? COL.insHex : COL.dataHex, len: .25 };
      const k = cycleAt(t); if (k < 0) return null;
      const c = CYC[k], u = (t - c.t0) / c.p, m = machine(c.n), fast = clamp((.35 - c.p) / .3);
      if (u < .3) return { path: P('f' + m.ins, toCC(m.ins)), u: easeIO(u / .3), color: COL.insHex, len: .2 + .8 * fast, stage: 0 };
      if (u < .45) return { path: P('f' + m.ins, toCC(m.ins)), u: 1, color: COL.insHex, len: 0, stage: 1 };
      if (m.ins === 0 || m.ins === 1) { const cell = m.ins === 0 ? 26 : 25; if (u < .75) return { path: P('o' + cell, toCA(cell)), u: easeIO((u - .45) / .3), color: COL.dataHex, len: .2 + .8 * fast, stage: 2 }; return { path: P('o' + cell, toCA(cell)), u: 1, color: COL.dataHex, len: 0, stage: 3 }; }
      if (m.ins === 2) { if (u < .7) return { path: P('cc-ca', ccToCa), u: easeIO((u - .45) / .25), color: COL.insHex, len: .2 + .8 * fast, stage: 2 }; return { path: P('o26', toCA(26)), u: 1 - easeIO((u - .7) / .3), color: COL.dataHex, len: .2 + .8 * fast, stage: 3 }; }
      return { path: P('f3', toCC(3)), u: 1, color: COL.insHex, len: 0, stage: u < .7 ? 2 : 3 };            // JUMP：在控制器里把 PC 改回 00
    };
    const _q = V();
    const setScene = t => {
      S.memC.draw(memAt(t));
      const pk = packetAt(t), k = cycleAt(t), stage = pk && pk.stage != null ? pk.stage : -1;
      S.packet.visible = !!pk;
      if (pk) { pk.path.at(pk.u, _q); S.packet.position.copy(_q); S.packet.material.emissive.set(pk.color); S.packet.rotation.y = t * 3; }
      const n = S.trailPts, L = pk ? pk.len : 0;
      for (let j = 0; j < n; j++) { const uj = pk ? pk.u - j / n * L : 0; if (pk && L > 0 && uj >= 0) { pk.path.at(uj, _q); S.trailGeo[j * 3] = _q.x; S.trailGeo[j * 3 + 1] = _q.y; S.trailGeo[j * 3 + 2] = _q.z; S.trailA[j] = (1 - j / n) * .8; } else S.trailA[j] = 0; }
      S.trail.geometry.attributes.position.needsUpdate = true; S.trail.geometry.attributes.aAlpha.needsUpdate = true;
      S.trail.material.uniforms.uColor.value.set(pk ? pk.color : 0xffffff);
      const on = { I: ARRIVE.concat(REWRITE).some(a => t >= a.t - .1 && t < a.t + .25) ? 1 : 0, M: pk && (stage === 0 || stage === 3) ? .6 : 0, CC: stage === 1 ? 1 : 0, CA: stage === 2 ? 1 : 0, O: 0 };
      if (k >= 0 && CYC[k].p < .25) { on.M = on.CC = on.CA = .5 + .5 * Math.abs(Math.sin(t * 40)); }
      S.setLeds(on);
    };

    // B1 · 全景：指令与数据写进同一个存储器
    const camB1 = KIT.cam(34, .05, 60);
    const pB1 = camPath([[6.4, [.4, 4.7, 5.4], [0, 0, -.4], 34], [12.9, [.15, 4.1, 4.7], [0, 0, -.45], 33]]);
    const B1 = ctx.shot({ name: '06.B1 结构', t0: 6.4, in: { type: 'dissolve', dur: .8 }, scene: S.scene, camera: camB1,
      post: { exposure: 1.08, ao: { radius: .25, intensity: .9 }, dof: { focus: 6, aperture: .003, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .32 },
      update(t) { setScene(t); const c = pB1(t); applyCam(camB1, c, t, .0006); B1.post.dof.focus = camB1.position.distanceTo(c.l); } });
    // 模块名牌（中文）：投影到各模块上方的小标签
    const tag = (g, p, zh, en, a) => { if (!p) return; g.save(); g.globalAlpha *= a; ink.line(g, [[p.x, p.y], [p.x, p.y - 34]], ink.dim, 1); ink.text(g, zh, p.x, p.y - 44, { font: ink.sans(22, 500), align: 'center' }); ink.text(g, en, p.x, p.y - 72, { font: ink.mono(12), color: ink.dim, align: 'center' }); g.restore(); };
    ctx.draw2d({ shot: B1, t0: 7.0, t1: 12.8, draw(g, t, a, pr) { Object.keys(MOD).forEach((k, i) => tag(g, pr(modTop(k).add(V(0, .05, k === 'M' ? .5 : 0))), MOD[k].zh, MOD[k].name, ss(7.0 + i * .18, 7.4 + i * .18, t))); } });
    const legend = `<span style="display:inline-block;width:14px;height:14px;background:${COL.ins};margin-right:8px;vertical-align:-1px"></span>指令　<span style="display:inline-block;width:14px;height:14px;background:${COL.data};margin:0 8px 0 14px;vertical-align:-1px"></span>数据`;
    ctx.readout({ x: 1810, y: 96, align: 'right', t0: 8.0, t1: 19.0, html: legend });

    // B2 · 换一道题：改写两格指令
    const camB2 = KIT.cam(32, .05, 60);
    const pB2 = camPath([[12.8, [-.35, 2.35, 1.35], [-.15, .3, -1.0], 32], [19.4, [-.2, 2.15, 1.15], [-.1, .3, -1.02], 31]]);
    const B2 = ctx.shot({ name: '06.B2 换程序', t0: 12.8, in: { type: 'cut' }, scene: S.scene, camera: camB2,
      post: { exposure: 1.08, ao: { radius: .2, intensity: .9 }, dof: { focus: 2.6, aperture: .006, maxBlur: 10 }, grade: ctx.grade.cool, vignette: .32 },
      update(t) { setScene(t); const c = pB2(t); applyCam(camB2, c, t, .0005); B2.post.dof.focus = camB2.position.distanceTo(cellPos(2)); } });
    ctx.callout({ shot: B2, at: cellPos(0), code: 'PROGRAM', title: '写入新指令', sub: 'LOAD 24 → LOAD 26 · HALT → JUMP 00', t0: 14.3, t1: 18.7, side: 'left', dx: 120, dy: -150, style: 'accent' });
    ctx.callout({ shot: B2, at: cellPos(26), title: '程序 B：每一圈把 5 加进 26 号格', sub: '原来的程序 A 只算一次 7 + 5', t0: 16.2, t1: 18.7, side: 'right', dx: 140, dy: 120 });
    ctx.readout({ x: 110, y: 120, t0: 13.2, t1: 18.7, html: t => `<span class="k">ENIAC：换题 = 重新插线、拨开关</span><br>${t > 14.6 ? '存储程序：换题 = 改写存储器里的指令' : ''}` });

    // C · 指令周期：越来越快
    const camC = KIT.cam(34, .05, 60);
    const pC = camPath([[19.2, [.1, 3.0, 2.9], [0, .2, -.2], 34], [24.6, [.05, 3.15, 3.05], [0, .2, -.22], 34], [31.0, [0, 4.6, 4.5], [0, 0, -.35], 34], [33, [0, 4.8, 4.7], [0, 0, -.35], 34]]);
    const C = ctx.shot({ name: '06.C 指令周期', t0: 19.2, in: { type: 'dissolve', dur: .6 }, scene: S.scene, camera: camC,
      post: { exposure: 1.08, ao: { radius: .25, intensity: .9 }, dof: { focus: 4, aperture: .003, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .32, bloom: { strength: .14 } },
      update(t) { setScene(t); const c = pC(t); applyCam(camC, c, t, .0005); C.post.dof.focus = camC.position.distanceTo(c.l); } });
    // 顶部四段指示条 + 当前指令 / 累加器
    ctx.draw2d({ t0: 19.4, t1: 32.1, draw(g, t, a, pr) {
      const k = cycleAt(t), c = k >= 0 ? CYC[k] : null, pk = packetAt(t), st = pk && pk.stage != null ? pk.stage : -1, blur = c && c.p < .12;
      const x0 = 560, y0 = 70, w = 200, h = 44;
      STAGES.forEach(([zh, en], i) => {
        const on = blur ? .55 + .45 * Math.abs(Math.sin(t * 31 + i)) : i === st ? 1 : 0, x = x0 + i * (w + 6);
        g.fillStyle = on ? `rgba(255,122,48,${.18 + .5 * on})` : 'rgba(10,11,12,.6)'; g.fillRect(x, y0, w, h);
        ink.rect(g, x, y0, w, h, on ? ink.accent : ink.faint, 1);
        ink.text(g, zh, x + 16, y0 + 30, { font: ink.sans(22, 600), color: on ? ink.white : ink.dim });
        ink.text(g, en, x + w - 12, y0 + 29, { font: ink.mono(11), color: on ? ink.white : ink.dim, align: 'right' });
      });
      if (c) {
        const m = machine(c.n, (t - c.t0) / c.p);
        ink.text(g, blur ? '节拍快到看不清（示意）' : `第 ${c.n + 1} 个周期 · PC ${String(m.ins).padStart(2, '0')} · ${m.text}`, x0, y0 + h + 32, { font: ink.mono(16), color: ink.dim });
        const p = pr(modTop('CA').add(V(0, .08, .1)));
        if (p && !blur) { ink.text(g, '累加器', p.x, p.y - 58, { font: ink.sans(16), color: ink.dim, align: 'center' }); ink.text(g, String(m.acc), p.x, p.y - 26, { font: ink.mono(28, 600), color: COL.data, align: 'center' }); }
      }
    }, shot: C });
    // 「每秒 30 亿」：放在右上方空处（右侧中部是输出模块，用固定位置的大数字会压住它）
    ctx.draw2d({ t0: 26.4, t1: 31.6, draw(g, t) {
      const p = easeOut(ss(26.4, 28.6, t)), x = 1810, y = 210;
      ink.text(g, `${Math.round(30 * p)}`, x - 170, y, { font: ink.cond(120, 600), color: ink.white, align: 'right' });
      ink.text(g, '亿', x - 120, y, { font: ink.sans(44, 500), color: ink.white, align: 'center' });
      ink.text(g, '次 / 秒', x, y, { font: ink.sans(24), color: ink.dim, align: 'right' });
      ink.line(g, [[x - 470, y + 26], [x, y + 26]], ink.faint, 1);
      ink.text(g, '手机处理器主频约 3 GHz：每秒约 30 亿个节拍', x, y + 58, { font: ink.sans(19), align: 'right' });
      ink.text(g, '按时钟频率估算 · 量级示意', x, y + 84, { font: ink.mono(13), color: ink.dim, align: 'right' });
    } });

    /* ================= D · 曼彻斯特「宝宝」 ================= */
    const phD1 = await KIT.photoShot('assets/photos/act2/manchester_baby_replica_head_on.jpg', { from: { x: -.2, y: 0, s: 1.04 }, to: { x: .2, y: -.05, s: 1.14 } });
    ctx.shot({ name: '06.D1 宝宝', t0: 32.0, in: { type: 'dissolve', dur: .8 }, scene: phD1.scene, camera: phD1.camera, post: { tonemap: false, grain: .03, vignette: .32, bloom: { strength: 0 } }, update(t, st) { phD1.update(st / 3.4); } });
    ctx.lower({ t0: 32.6, t1: 35.2, name: '曼彻斯特「宝宝」（SSEM）复原机', meta: '1948 年 6 月 21 日首次运行存储程序 · 曼彻斯特科学与工业博物馆', credit: '照片：Geni · CC BY-SA 4.0' });
    const phD2 = await KIT.photoShot('assets/photos/act2/manchester_baby_replica_crt_bits.jpg', { from: { x: 0, y: 0, s: 1.1 }, to: { x: .05, y: .02, s: 1.22 } });
    ctx.shot({ name: '06.D2 威廉姆斯管', t0: 35.0, in: { type: 'dissolve', dur: .7 }, scene: phD2.scene, camera: phD2.camera, post: { tonemap: false, grain: .03, vignette: .36, bloom: { strength: 0 } }, update(t, st) { phD2.update(st / 3.8); } });
    ctx.lower({ t0: 35.5, t1: 37.9, name: '存储屏上的比特', meta: '威廉姆斯管：用荧光屏上的亮点记住 0 和 1', credit: '照片：Logg Tandy · CC BY 4.0' });

    /* ================= 音效 ================= */
    ctx.cue(3.1, 'swoosh', .3); ctx.cue(6.4, 'whoosh', 1.2, .3);
    for (const a of [...ARRIVE, ...REWRITE]) { ctx.cue(a.t, 'blip', a.cell < 24 ? 1320 : 990, .07); ctx.cue(a.t + TRAVEL, 'tick', .6); }
    ctx.cue(14.1, 'click', .5); ctx.cue(15.4, 'click', .5);
    for (const c of CYC) { if (c.p < .3) break; for (let s = 0; s < 4; s++) ctx.cue(c.t0 + c.p * [0, .3, .45, .75][s], s === 0 ? 'tick' : 'blip', ...(s === 0 ? [.6] : [700 + s * 220, .06])); }
    ctx.cue(24.6, 'riser', 3.2, .18); ctx.cue(31.9, 'sub', .3);
  },
};
