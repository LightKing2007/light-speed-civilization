/* 06 · 存储程序（1945 — 1949）
   A1 冯·诺依曼肖像（档案）→ A2 书桌上的《EDVAC 报告初稿》封面（按原件版式排印复原）
   B1 机能风「冯·诺依曼结构」：输入 → 存储器里同时放进指令（紫）和数据（琥珀）
   B2 换一道题：只改写两格指令，程序 A（算 7 + 5）变成程序 B（每圈加 5 的循环），不必重新接线
   C  指令周期：取指（存储器 → 控制器）→ 译码 → 执行（运算器）→ 写回；节拍越来越快直到连成一片
   D  曼彻斯特「宝宝」复原机与威廉姆斯管存储屏（照片）。
   道具在 src/props/06/arch.js。所有动画都是 t 的纯函数。
   标注原则（可读性精修）：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。
   A1 肖像延长到 4.5 s，让署名条停留够久；D1 / D2 两张照片共用一条署名条（两份授权都写上）。
   指令周期的前三圈放慢（2.2 / 1.8 / 1.6 s 一圈），字幕念四个步骤时看得清每一步。 */
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
const CYC = []; { const P0 = [2.2, 1.8, 1.6]; let t = 19.5, p = P0[0], n = 0; while (t < 32.6) { CYC.push({ t0: t, p, n }); t += p; n++; p = n < 3 ? P0[n] : Math.max(1 / 90, p * (n < 6 ? .74 : .8)); } }
const STAGES = ['取指', '译码', '执行', '写回'];
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, 'rgba(235,235,230,.22)', 1); };
/** 署名条（左下）后面的柔和暗底：亮的照片上也看得清 */
const scrim = (g, a = .6) => { g.save(); g.translate(560, 792); g.scale(1, .27); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 660); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.62, `rgba(0,0,0,${a * .75})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-680, -680, 1360, 1360); g.restore(); };
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
    ctx.shot({ name: '06.A1 冯·诺依曼', t0: 0, in: { type: 'blur', dur: 1.0, params: [5] }, scene: phA.scene, camera: phA.camera, post: ARCH, update(t, st) { phA.update(st / 5.3); } });
    // 署名条：完整停留 3.5 s（1.4–4.9），A2 溶入时淡出；后面垫一层柔和暗底
    ctx.draw2d({ t0: 1.0, t1: 5.3, fade: .4, draw(g) { scrim(g); } });
    ctx.lower({ t0: 1.0, t1: 5.3, name: '约翰·冯·诺依曼（1903–1957）', meta: '数学家', credit: '照片：美国能源部 · 1956 · 公有领域' });

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
    // 封面上的打字标题就是主体，字幕已经说了是 EDVAC 报告：这个镜头不再加署名条（原署名条压在亮纸面上看不清）
    const pA2 = camPath([[4.5, [.02, .46, .2], [0, 0, -.015], 30], [7.2, [.01, .33, .13], [0, 0, -.03], 29]]);
    const A2 = ctx.shot({ name: '06.A2 EDVAC 报告', t0: 4.5, in: { type: 'dissolve', dur: .8 }, scene: sd, camera: camA2,
      post: { exposure: 1.05, dof: { focus: .4, aperture: .0025, maxBlur: 8 }, grade: ctx.grade.warm, vignette: .36, grain: .035 },
      update(t) { const c = pA2(t); applyCam(camA2, c, t, .0006); A2.post.dof.focus = camA2.position.distanceTo(c.l); } });

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
    // 推近一些：存储器约占画面一半宽，输入端仍在画面左侧（输出端不参与讲解，可以出画）
    const pB1 = camPath([[6.4, [-.1, 3.85, 3.7], [-.35, 0, -.85], 34], [12.9, [-.2, 3.45, 3.2], [-.35, 0, -.9], 33]]);
    const B1 = ctx.shot({ name: '06.B1 结构', t0: 6.4, in: { type: 'dissolve', dur: .8 }, scene: S.scene, camera: camB1,
      post: { exposure: 1.12, ao: { radius: .25, intensity: .9 }, dof: { focus: 6, aperture: .003, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .3 },
      update(t) { setScene(t); const c = pB1(t); applyCam(camB1, c, t, .0006); B1.post.dof.focus = camB1.position.distanceTo(c.l); } });
    // 只标存储器（字幕讲的就是它）；控制器、运算器到指令周期镜头里再标
    ctx.callout({ shot: B1, at: V(.75, MOD.M.s[1] + .01, -1.3), title: '存储器', sub: '指令和数据都存在这里', t0: 7.3, t1: 12.6, side: 'right', dx: 110, dy: -130 });
    // 颜色图例（B1、B2 两个镜头共用）：紫 = 指令，琥珀 = 数据
    ctx.draw2d({ t0: 7.8, t1: 18.9, draw(g) {
      const x = 1530, y = 56, w = 300, h = 64;
      panelBox(g, x, y, w, h);
      g.fillStyle = COL.ins; g.fillRect(x + 24, y + 21, 22, 22);
      ink.text(g, '指令', x + 58, y + 42, { font: ink.sans(26, 500), color: TXT });
      g.fillStyle = COL.data; g.fillRect(x + 160, y + 21, 22, 22);
      ink.text(g, '数据', x + 194, y + 42, { font: ink.sans(26, 500), color: TXT });
    } });

    // B2 · 换一道题：改写两格指令
    const camB2 = KIT.cam(32, .05, 60);
    const pB2 = camPath([[12.8, [-.35, 2.35, 1.35], [-.15, .3, -1.0], 32], [19.4, [-.2, 2.15, 1.15], [-.1, .3, -1.02], 31]]);
    const B2 = ctx.shot({ name: '06.B2 换程序', t0: 12.8, in: { type: 'cut' }, scene: S.scene, camera: camB2,
      post: { exposure: 1.12, ao: { radius: .2, intensity: .9 }, dof: { focus: 2.6, aperture: .003, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .3 },
      update(t) { setScene(t); const c = pB2(t); applyCam(camB2, c, t, .0005); B2.post.dof.focus = camB2.position.distanceTo(cellPos(2)); } });
    // 00 号格先被改写（14.6），03 号格随后（15.9）：标注跟着第一格出现，停到镜头末尾
    ctx.callout({ shot: B2, at: cellPos(0), title: '改写指令', sub: '不用插线，程序就换了', t0: 14.0, t1: 18.6, side: 'right', dx: 120, dy: -150, style: 'accent' });

    // C · 指令周期：越来越快
    const camC = KIT.cam(34, .05, 60);
    const pC = camPath([[19.2, [.1, 3.0, 2.9], [0, .2, -.2], 34], [24.6, [.05, 3.15, 3.05], [0, .2, -.22], 34], [31.0, [0, 4.6, 4.5], [0, 0, -.35], 34], [33, [0, 4.8, 4.7], [0, 0, -.35], 34]]);
    const C = ctx.shot({ name: '06.C 指令周期', t0: 19.2, in: { type: 'dissolve', dur: .6 }, scene: S.scene, camera: camC,
      post: { exposure: 1.12, ao: { radius: .25, intensity: .9 }, dof: { focus: 4, aperture: .003, maxBlur: 8 }, grade: ctx.grade.cool, vignette: .3, bloom: { strength: .14 } },
      update(t) { setScene(t); const c = pC(t); applyCam(camC, c, t, .0005); C.post.dof.focus = camC.position.distanceTo(c.l); } });
    // 两个主角模块：字幕念「取出指令、译码、执行」时出现，节拍变快前收起
    ctx.callout({ shot: C, at: modTop('CC').add(V(.15, 0, -.05)), title: '控制器', sub: '取出指令，读懂它', t0: 19.9, t1: 25.6, side: 'right', dx: 130, dy: -120 });
    ctx.callout({ shot: C, at: modTop('CA').add(V(-.15, 0, -.05)), title: '运算器', sub: '按指令做计算', t0: 20.9, t1: 26.2, side: 'left', dx: 130, dy: -120 });
    // 唯一的信息面板（顶部居中）：四个步骤，当前这一步亮起；节拍变快后下方展开「每秒约 30 亿次」
    ctx.draw2d({ shot: C, t0: 19.4, t1: 31.9, draw(g, t) {
      const k = cycleAt(t), c = k >= 0 ? CYC[k] : null, pk = packetAt(t), st = pk && pk.stage != null ? pk.stage : -1, blur = c && c.p < .12;
      const bw = 200, bh = 66, gap = 8, pad = 20, Wd = pad * 2 + bw * 4 + gap * 3, X = (1920 - Wd) / 2, Y = 44;
      const sp = ss(26.0, 26.6, t), H0 = bh + pad * 2, Hh = H0 + 92 * sp;
      panelBox(g, X, Y, Wd, Hh);
      STAGES.forEach((zh, i) => {
        const on = blur ? .55 + .45 * Math.abs(Math.sin(t * 31 + i)) : i === st ? 1 : 0, x = X + pad + i * (bw + gap), y = Y + pad;
        g.fillStyle = on ? `rgba(255,122,48,${.3 + .6 * on})` : 'rgba(255,255,255,.05)'; g.fillRect(x, y, bw, bh);
        ink.rect(g, x, y, bw, bh, on ? ink.accent : 'rgba(235,235,230,.3)', 1.5);
        ink.text(g, String(i + 1), x + 18, y + 44, { font: ink.mono(22, 600), color: on ? TXT : 'rgba(255,150,95,.95)' });
        ink.text(g, zh, x + bw / 2 + 12, y + 45, { font: ink.sans(32, 600), color: on ? TXT : TXT2, align: 'center' });
      });
      if (sp > .01) {
        g.save(); g.globalAlpha *= sp;
        const p = easeOut(ss(26.2, 28.4, t)), yb = Y + H0 + 66, n = String(Math.round(30 * p));
        g.font = ink.sans(28, 500); const w1 = g.measureText('手机芯片：每秒约 ').width;
        g.font = ink.cond(76, 600); const w2 = g.measureText(n).width;
        g.font = ink.sans(30, 500); const w3 = g.measureText(' 亿次').width;
        const x0 = 960 - (w1 + w2 + w3) / 2;
        ink.line(g, [[X + pad, Y + H0 - 2], [X + Wd - pad, Y + H0 - 2]], 'rgba(235,235,230,.22)', 1);
        ink.text(g, '手机芯片：每秒约 ', x0, yb, { font: ink.sans(28, 500), color: TXT });
        ink.text(g, n, x0 + w1, yb + 2, { font: ink.cond(76, 600), color: TXT });
        ink.text(g, ' 亿次', x0 + w1 + w2, yb, { font: ink.sans(30, 500), color: TXT });
        g.restore();
      }
    } });

    /* ================= D · 曼彻斯特「宝宝」 ================= */
    const phD1 = await KIT.photoShot('assets/photos/act2/manchester_baby_replica_head_on.jpg', { from: { x: -.2, y: 0, s: 1.04 }, to: { x: .2, y: -.05, s: 1.14 } });
    ctx.shot({ name: '06.D1 宝宝', t0: 32.0, in: { type: 'dissolve', dur: .8 }, scene: phD1.scene, camera: phD1.camera, post: { tonemap: false, grain: .03, vignette: .32, bloom: { strength: 0 } }, update(t, st) { phD1.update(st / 3.4); } });
    const phD2 = await KIT.photoShot('assets/photos/act2/manchester_baby_replica_crt_bits.jpg', { from: { x: 0, y: 0, s: 1.1 }, to: { x: .05, y: .02, s: 1.22 } });
    ctx.shot({ name: '06.D2 威廉姆斯管', t0: 35.0, in: { type: 'dissolve', dur: .7 }, scene: phD2.scene, camera: phD2.camera, post: { tonemap: false, exposure: 1.18, grain: .03, vignette: .3, bloom: { strength: 0 } }, update(t, st) { phD2.update(st / 3.8); } });
    // 两张照片只有 6 秒，各配一条署名条都停不够 3.5 秒：合成一条，跨两张照片，两份授权都写上
    ctx.draw2d({ t0: 32.4, t1: 37.9, fade: .4, draw(g) { scrim(g, .55); } });
    ctx.lower({ t0: 32.4, t1: 37.9, name: '曼彻斯特「宝宝」复原机', meta: '内存是威廉姆斯管：屏上的亮点记住 0 和 1', credit: '照片：Geni · CC BY-SA 4.0；Logg Tandy · CC BY 4.0' });

    /* ================= 音效 ================= */
    ctx.cue(4.5, 'swoosh', .3); ctx.cue(6.4, 'whoosh', 1.2, .3);
    for (const a of [...ARRIVE, ...REWRITE]) { ctx.cue(a.t, 'blip', a.cell < 24 ? 1320 : 990, .07); ctx.cue(a.t + TRAVEL, 'tick', .6); }
    ctx.cue(14.1, 'click', .5); ctx.cue(15.4, 'click', .5);
    for (const c of CYC) { if (c.p < .3) break; for (let s = 0; s < 4; s++) ctx.cue(c.t0 + c.p * [0, .3, .45, .75][s], s === 0 ? 'tick' : 'blip', ...(s === 0 ? [.6] : [700 + s * 220, .06])); }
    ctx.cue(25.0, 'riser', 3.2, .18); ctx.cue(31.9, 'sub', .3);
  },
};
