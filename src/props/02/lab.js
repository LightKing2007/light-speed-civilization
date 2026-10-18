/* 02 · 场景 D/E/F：1887 年卡尔斯鲁厄，赫兹的实验室（复原）。单位：米，地面 y = 0。
   布局：工作台沿 x 轴；偶极振子轴线 y = 1.14、z = 0，火花隙在原点上方；感应线圈在台面后部；
   接收环（r = 0.35 m）立在 z = 3 处（「几米之外」）；远墙 z = 12.6 处挂锌板（反射面）。 */
import * as THREE from 'three';
import { V, ss, clamp, lerp, easeIO, rng } from '../../engine/util.js';
import { lathe, mesh, makeMats, wire, sag, bindingPost, screwHead, sparkSet, sparkTimes, sparkAt, makeWaves, liveLine, lin } from './common.js';
import { PL } from './common.js';

export const DY = 1.14, GAPC = V(0, DY, 0), RING_R = .35, ZP = 12.55, LAM = 9;
export const SPARKS = [...sparkTimes(26.9, 38.1, .1, .035, 7), ...sparkTimes(43.55, 56.2, .1, .035, 9)];
/* 慢放示意中的振荡串（E1/F）：起始时刻 */
export const TRAINS = [38.3, 40.95];
export const FV = 1.25, TAU = 1.15, CV = 1.9;
export const qTrain = (t) => { let q = 0; for (const T of TRAINS) { const u = t - T; if (u >= 0) q += Math.exp(-u / TAU) * Math.cos(Math.PI * 2 * FV * u) * ss(0, .06, u); } return q; };
/* 接收环沿轴移动（E2）：3.0 → 5.75（波腹）→ 8.0（波节，停）→ 10.25（波腹） */
export const ringZ = t => 3 + 2.75 * easeIO(clamp((t - 44.3) / 1.4)) + 2.25 * easeIO(clamp((t - 46.0) / 1.0)) + 2.25 * easeIO(clamp((t - 47.6) / 1.1));
export const standK = z => Math.sin(Math.PI * 2 / LAM * (ZP - z));

export async function buildLab(KIT) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x050505);
  await KIT.hdri(s, KIT.hdriFile('vintage_measuring_lab'), { intensity: .32, rotation: 2.6 });
  const M = makeMats(KIT);
  const oak = await KIT.pbr('dark_wood', { repeat: [3, 1], physical: true, extra: { clearcoat: .2, clearcoatRoughness: .5 } }); oak.color.setRGB(.95, .74, .56);
  const oakS = await KIT.pbr('dark_wood', { repeat: .4 }); oakS.color.setRGB(.9, .7, .54);
  const floorM = await KIT.pbr('dark_wood', { repeat: [6, 10] }); floorM.color.setRGB(.55, .42, .33);
  const panel = await KIT.pbr('dark_wood', { repeat: [5, 1] }); panel.color.setRGB(.42, .32, .25);

  /* ---------------- 房间 ---------------- */
  const room = new THREE.Group(); s.add(room);
  const floor = mesh(new THREE.PlaneGeometry(9, 16), floorM, { cast: false }); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 5.6); room.add(floor);
  const plaster = new THREE.MeshStandardMaterial({ color: 0x5f5a50, roughness: .95, roughnessMap: KIT.grunge(61, { contrast: 1.4 }) });
  const wallAt = (w, h, p, ry) => { const g = new THREE.Group(); g.position.copy(p); g.rotation.y = ry; const up = mesh(new THREE.PlaneGeometry(w, h - 1.15), plaster, { cast: false }); up.position.y = 1.15 + (h - 1.15) / 2; g.add(up); const wn = mesh(new THREE.PlaneGeometry(w, 1.15), panel, { cast: false }); wn.position.y = .575; g.add(wn); const rail = mesh(KIT.rbox(w, .05, .04, .01), oakS); rail.position.set(0, 1.16, .02); g.add(rail); const base = mesh(KIT.rbox(w, .14, .03, .008), oakS); base.position.set(0, .07, .015); g.add(base); room.add(g); return g; };
  const backW = wallAt(9, 5, V(0, 0, -1.75), 0);
  const leftW = wallAt(16, 5, V(-4.5, 0, 5.6), Math.PI / 2);
  const farW = wallAt(9, 5, V(0, 0, 12.7), Math.PI);
  const rightW = wallAt(16, 5, V(4.5, 0, 5.6), -Math.PI / 2);
  // 左墙两扇高窗（百叶半掩，透进一点冷光）
  const paneM = new THREE.MeshStandardMaterial({ color: 0, emissive: 0x8a9db4, emissiveIntensity: .55, roughness: 1 });
  const winG = new THREE.Group(); room.add(winG);
  for (const z of [1.2, 5.6, 10]) {
    const g = new THREE.Group(); g.position.set(-4.47, 0, z); g.rotation.y = Math.PI / 2; winG.add(g);
    const pane = mesh(new THREE.PlaneGeometry(1.1, 2.3), paneM, { cast: false }); pane.position.y = 2.55; g.add(pane);
    const fr = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: .7 });
    for (const [w, h, x, y] of [[1.24, .08, 0, 1.36], [1.24, .08, 0, 3.74], [.08, 2.46, -.58, 2.55], [.08, 2.46, .58, 2.55], [.04, 2.3, 0, 2.55], [1.1, .035, 0, 2.0], [1.1, .035, 0, 3.0]]) { const b = mesh(KIT.rbox(w, h, .06, .01), fr); b.position.set(x, y, .03); g.add(b); }
    for (let k = 0; k < 9; k++) { const sl = mesh(KIT.rbox(1.1, .1, .012, .004), fr); sl.position.set(0, 1.45 + k * .12, .07); sl.rotation.x = -.9; g.add(sl); }   // 下半截百叶
  }
  // 锌板（远墙，4 m 高 × 2 m 宽，四张拼接，钉在木龙骨上）
  const spangle = KIT.canvasTex(1024, 2048, (g, w, h) => {
    const r = rng(77); g.fillStyle = '#a9adb0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 70, v = 150 + r() * 70; g.fillStyle = `rgba(${v},${v + 2},${v + 5},.35)`; g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + r() * .5, rr = rad * (.6 + r() * .5); k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
    g.strokeStyle = 'rgba(40,40,40,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    g.fillStyle = 'rgba(30,28,26,.8)'; for (let y = 24; y < h; y += 64) for (const x of [14, w / 2 - 10, w / 2 + 10, w - 14]) { g.beginPath(); g.arc(x, y, 3.2, 0, 6.283); g.fill(); }
  });
  const zincPlate = mesh(new THREE.PlaneGeometry(2, 4), KIT.M.steel({ rough: .42, seed: 33, extra: { color: new THREE.Color(1, 1, 1), map: spangle } }), { cast: false });
  zincPlate.position.set(0, 2.25, ZP + .1); zincPlate.rotation.y = Math.PI; room.add(zincPlate);
  for (const x of [-1.05, 1.05]) { const b = mesh(KIT.rbox(.08, 4.2, .05, .01), oakS); b.position.set(x, 2.25, ZP + .12); room.add(b); }

  /* ---------------- 工作台 ---------------- */
  const BZ = -.12, TOP = .84;
  const bench = new THREE.Group(); s.add(bench);
  const top = mesh(KIT.rbox(2.9, .06, .9, .012), oak); top.position.set(0, TOP - .03, BZ); bench.add(top);
  for (const x of [-1.33, 1.33]) for (const z of [BZ - .36, BZ + .36]) { const l = mesh(KIT.rbox(.08, TOP - .06, .08, .01), oakS); l.position.set(x, (TOP - .06) / 2, z); bench.add(l); }
  for (const z of [BZ - .37, BZ + .37]) { const a = mesh(KIT.rbox(2.6, .11, .03, .008), oakS); a.position.set(0, TOP - .115, z); bench.add(a); }
  const shelf = mesh(KIT.rbox(2.7, .03, .7, .008), oakS); shelf.position.set(0, .16, BZ); bench.add(shelf);

  /* ---------------- 鲁姆科夫感应线圈（Funkeninductor） ---------------- */
  const coil = new THREE.Group(); coil.position.set(0, TOP, -.36); s.add(coil);
  const base = mesh(KIT.rbox(.6, .07, .24, .01), M.lacquer); base.position.y = .045; coil.add(base);
  const plinth = mesh(KIT.rbox(.63, .014, .27, .005), M.lacquer); plinth.position.y = .007; coil.add(plinth);
  const plateTex = KIT.canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#7a5a28'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2810'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#2a1c0a'; g.textAlign = 'center'; g.font = '600 50px "Times New Roman", Georgia, serif'; g.fillText('FUNKEN-INDUCTOR', w / 2, 82); g.font = '400 30px "Times New Roman", Georgia, serif'; g.fillText('No. 3  ·  30 cm  Schlagweite', w / 2, 128); });
  const mplate = mesh(new THREE.PlaneGeometry(.1, .031), KIT.M.brass({ rough: .35, extra: { map: plateTex, color: new THREE.Color(1, 1, 1) } }), { cast: false }); mplate.position.set(-.05, .045, .1201); coil.add(mplate);
  const CY = .175;                                   // 线圈轴心高（相对底座底面）
  const flangeG = lathe([[0, 0], [.098, 0], [.102, .003], [.102, .017], [.098, .02], [0, .02]], 96);
  for (const sg of [-1, 1]) { const f = mesh(flangeG, M.ebonite); f.rotation.z = Math.PI / 2; f.position.set(sg * .19 + (sg > 0 ? .01 : .01), CY, 0); coil.add(f); const cr = mesh(KIT.rbox(.05, .04, .15, .006), M.lacquer); cr.position.set(sg * .19, .09, 0); coil.add(cr); }
  const windTex = KIT.canvasTex(32, 512, (g, w, h) => { for (let i = 0; i < 16; i++) { const y = i * h / 16; const gr = g.createLinearGradient(0, y, 0, y + h / 16); gr.addColorStop(0, '#202020'); gr.addColorStop(.5, '#e0e0e0'); gr.addColorStop(1, '#202020'); g.fillStyle = gr; g.fillRect(0, y, w, h / 16); } }, { srgb: false });
  windTex.wrapS = windTex.wrapT = THREE.RepeatWrapping; windTex.repeat.set(1, 15);
  const winding = mesh(new THREE.CylinderGeometry(.08, .08, .36, 128, 1, true), new THREE.MeshPhysicalMaterial({ color: lin(.62, .3, .18), metalness: 1, roughness: .34, bumpMap: windTex, bumpScale: 2.5, clearcoat: .7, clearcoatRoughness: .2, roughnessMap: KIT.grunge(51) }));
  winding.rotation.z = Math.PI / 2; winding.position.set(0, CY, 0); coil.add(winding);
  const band = mesh(new THREE.CylinderGeometry(.0815, .0815, .012, 96, 1, true), M.silk(0x3b2416)); band.rotation.z = Math.PI / 2; band.position.set(0, CY, 0); coil.add(band);
  const coreT = KIT.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#555'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; for (let y = 4; y < h; y += 7) for (let x = 4 + (y / 7 % 2) * 3; x < w; x += 7) { g.beginPath(); g.arc(x, y, 2.6, 0, 6.283); g.fill(); } });
  const core = mesh(new THREE.CylinderGeometry(.02, .02, .05, 48), [M.iron, KIT.M.iron({ rough: .45, extra: { map: coreT, color: new THREE.Color(1, 1, 1) } }), M.iron]); core.rotation.z = Math.PI / 2; core.position.set(-.215, CY, 0); coil.add(core);
  // 内夫锤断续器：竖直弹簧片 + 铁锤头 + 带铂触点的调节螺钉（随火花节奏振动）
  const hammer = new THREE.Group(); hammer.position.set(-.262, .07, 0); coil.add(hammer);
  const hb = mesh(KIT.rbox(.03, .012, .03, .003), M.brass); hb.position.y = .006; hammer.add(hb);
  const spring = mesh(new THREE.BoxGeometry(.0018, CY - .07, .012), M.steel); spring.position.y = (CY - .07) / 2 + .01; hammer.add(spring);
  const head = mesh(new THREE.CylinderGeometry(.015, .015, .012, 32), M.iron); head.rotation.z = Math.PI / 2; head.position.set(.006, CY - .07 + .004, 0); hammer.add(head);
  const cp = mesh(lathe([[.007, 0], [.007, .004], [.0045, .006], [.0045, .085], [.006, .088], [.006, .1], [0, .1]]), M.brass); cp.position.set(-.292, .07, 0); coil.add(cp);
  const cscrew = mesh(new THREE.CylinderGeometry(.0018, .0018, .03, 12), M.steel); cscrew.rotation.z = Math.PI / 2; cscrew.position.set(-.278, .07 + .075, 0); coil.add(cscrew);
  const cknob = mesh(new THREE.CylinderGeometry(.007, .007, .007, 32), M.brassKnurl); cknob.rotation.z = Math.PI / 2; cknob.position.set(-.3, .07 + .075, 0); coil.add(cknob);
  // 换向器 + 初级接线柱
  const comm = new THREE.Group(); comm.position.set(.23, .08, .06); coil.add(comm);
  const cyl = mesh(new THREE.CylinderGeometry(.016, .016, .05, 32), M.ebonite); cyl.rotation.x = Math.PI / 2; cyl.position.y = .02; comm.add(cyl);
  for (const z of [-.03, .03]) { const br = mesh(KIT.rbox(.012, .03, .006, .002), M.brass); br.position.set(0, .015, z); comm.add(br); }
  const lever = mesh(new THREE.CylinderGeometry(.0025, .0025, .035, 12), M.brass); lever.position.set(0, .045, 0); lever.rotation.x = .5; comm.add(lever);
  const lk = mesh(new THREE.SphereGeometry(.006, 16, 12), M.ebonite); lk.position.set(0, .06, .009); comm.add(lk);
  const pp = []; for (const [x, z] of [[.27, -.085], [.205, -.085]]) { const b = bindingPost(M, .03, .006); b.position.set(x, .08, z); coil.add(b); pp.push(V(x, .11, z)); }
  // 次级接线柱：胶木立柱 + 黄铜球 + 放电杆
  const termW = [];
  for (const sg of [-1, 1]) {
    const pil = mesh(lathe([[.012, 0], [.012, .006], [.008, .01], [.008, .14], [.01, .145], [.01, .15], [0, .15]]), M.ebonite); pil.position.set(sg * .2, CY + .1, 0); coil.add(pil);
    const ball = mesh(new THREE.SphereGeometry(.014, 32, 24), M.brassPol); ball.position.set(sg * .2, CY + .26, 0); coil.add(ball);
    const rod = mesh(new THREE.CylinderGeometry(.003, .003, .12, 12), M.brass); rod.rotation.z = Math.PI / 2; rod.position.set(sg * .14, CY + .26, 0); coil.add(rod);
    const tip = mesh(new THREE.SphereGeometry(.007, 24, 16), M.brassPol); tip.position.set(sg * .08, CY + .26, 0); coil.add(tip);
    const ring = mesh(new THREE.CylinderGeometry(.006, .006, .012, 16), M.ebonite); ring.rotation.z = Math.PI / 2; ring.position.set(sg * .11, CY + .26, 0); coil.add(ring);
    termW.push(V(sg * .2, TOP + CY + .262, -.36));
  }

  /* ---------------- 本生电池 ×2 ---------------- */
  const cells = [];
  const zincTube = lathe([[.044, 0], [.046, 0], [.046, .165], [.044, .165]], 48);
  for (const [i, x] of [[0, -.78], [1, -.63]]) {
    const c = new THREE.Group(); c.position.set(x, TOP, -.42); s.add(c);
    const jar = mesh(lathe([[0, 0], [.052, 0], [.055, .004], [.055, .19], [.057, .195], [.053, .195], [.051, .19], [.051, .006], [0, .006]], 48), M.glass); c.add(jar);
    const liq = mesh(new THREE.CylinderGeometry(.0505, .0505, .14, 48), new THREE.MeshPhysicalMaterial({ color: 0xc89a5a, transmission: .8, roughness: .1, thickness: .1, attenuationColor: 0x8a5a20, attenuationDistance: .15 })); liq.position.y = .076; c.add(liq);
    const zn = mesh(zincTube, M.zinc); zn.position.y = .012; c.add(zn);
    const pot = mesh(new THREE.CylinderGeometry(.027, .027, .19, 32), new THREE.MeshStandardMaterial({ color: 0xa8714c, roughness: .95, roughnessMap: KIT.grunge(71) })); pot.position.y = .1; c.add(pot);
    const carb = mesh(KIT.rbox(.022, .26, .012, .002), new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: .65 })); carb.position.y = .13; c.add(carb);
    const clampC = mesh(KIT.rbox(.03, .018, .02, .003), M.brass); clampC.position.y = .25; c.add(clampC);
    const clampZ = mesh(KIT.rbox(.02, .024, .014, .003), M.brass); clampZ.position.set(.046, .17, 0); c.add(clampZ);
    const nk = mesh(new THREE.CylinderGeometry(.006, .006, .008, 24), M.brassKnurl); nk.position.set(.0, .264, 0); c.add(nk);
    cells.push({ carbon: V(x, TOP + .262, -.42), zinc: V(x + .046, TOP + .185, -.42) });
  }

  /* ---------------- 偶极振子：两根约 1 m 铜杆 + 直径 30 cm 空心锌球 + 黄铜球火花隙 ---------------- */
  const dip = new THREE.Group(); s.add(dip);
  const rodG = new THREE.CylinderGeometry(.0042, .0042, .973, 24);
  const balls = [], rods = [], spheres = [];
  const sphG = new THREE.SphereGeometry(.15, 96, 64), seamG = new THREE.TorusGeometry(.1502, .0022, 8, 128);
  for (const sg of [-1, 1]) {
    const r = mesh(rodG, M.copper); r.rotation.z = Math.PI / 2; r.position.set(sg * (.027 + .973 / 2), DY, 0); dip.add(r); rods.push(r);
    const b = mesh(new THREE.SphereGeometry(.012, 48, 32), M.brassPol); b.position.set(sg * .015, DY, 0); dip.add(b); balls.push(b);
    const sl = mesh(new THREE.CylinderGeometry(.0065, .0065, .02, 24), M.brass); sl.rotation.z = Math.PI / 2; sl.position.set(sg * .034, DY, 0); dip.add(sl);
    const sp = mesh(sphG, M.zinc); sp.position.set(sg * 1.15, DY, 0); sp.rotation.z = Math.PI / 2 + .3; dip.add(sp); spheres.push(sp);
    const seam = mesh(seamG, M.zinc); seam.position.copy(sp.position); seam.rotation.y = Math.PI / 2; dip.add(seam);
    const col = mesh(lathe([[.0105, 0], [.0105, .022], [.0075, .03], [.0075, .042], [0, .042]], 32), M.brass); col.position.set(sg * 1.006, DY, 0); col.rotation.z = sg * Math.PI / 2; dip.add(col);
    // 支柱：车削木脚 + 胶木柱 + 黄铜夹
    for (const [x, h] of [[sg * .45, DY - TOP - .006], [sg * 1.15, DY - TOP - .15]]) {
      const ft = mesh(lathe([[.05, 0], [.05, .012], [.042, .02], [.03, .026], [.016, .032], [0, .032]]), oakS); ft.position.set(x, TOP, 0); dip.add(ft);
      const pc = mesh(new THREE.CylinderGeometry(.011, .012, h - .03, 24), M.ebonite); pc.position.set(x, TOP + .03 + (h - .03) / 2, 0); dip.add(pc);
      const cl = mesh(KIT.rbox(.028, .022, .026, .004), M.brass); cl.position.set(x, TOP + h - .004, 0); dip.add(cl);
      const sc = mesh(new THREE.CylinderGeometry(.0035, .0035, .012, 12), M.brassKnurl); sc.position.set(x, TOP + h - .004, .018); sc.rotation.x = Math.PI / 2; dip.add(sc);
    }
    // 接线夹
    const clp = mesh(KIT.rbox(.02, .016, .016, .003), M.brass); clp.position.set(sg * .11, DY + .002, 0); dip.add(clp);
  }
  // 导线：线圈次级 → 振子；电池 → 线圈初级
  const blackSilk = M.silk(0x1d1a17), redSilk = M.silk(0x5a2018);
  for (let i = 0; i < 2; i++) { const sg = i ? 1 : -1; const a = termW[i], b = V(sg * .11, DY + .006, 0); s.add(wire([a, V(lerp(a.x, b.x, .3), a.y + .02, lerp(a.z, b.z, .3)), V(lerp(a.x, b.x, .65), DY + .07, lerp(a.z, b.z, .65)), b], blackSilk, .0022, 80).mesh); }
  const ppW = pp.map(p => V(p.x, p.y + TOP, p.z - .36));
  s.add(wire([cells[0].carbon, V(-.75, TOP + .32, -.46), V(-.66, TOP + .2, -.5), cells[1].zinc.clone().add(V(.005, .01, 0))], redSilk, .0018, 60).mesh);
  s.add(wire([cells[1].carbon, V(-.6, TOP + .3, -.47), V(-.45, TOP + .004, -.55), V(.05, TOP + .002, -.54), V(.2, TOP + .004, -.5), ppW[1]], redSilk, .0018, 120).mesh);
  s.add(wire([cells[0].zinc.clone().add(V(.005, .01, 0)), V(-.8, TOP + .1, -.5), V(-.7, TOP + .002, -.6), V(.1, TOP + .002, -.6), V(.27, TOP + .004, -.52), ppW[0]], blackSilk, .0018, 120).mesh);

  /* ---------------- 布景 ---------------- */
  const prop = async (id, size, p, ry = 0) => { try { const m = await KIT.model(`assets/models/polyhaven/${id}/${id}_1k.gltf`, { size }); m.position.set(...p); m.rotation.y = ry; s.add(m); return m; } catch (e) { console.warn('[02] model', id, e); return null; } };
  const lamps = await Promise.all([prop('vintage_oil_lamp', .48, [-1.22, TOP, -.48], .4), prop('vintage_oil_lamp', .48, [1.24, TOP, -.5], -.2)]);
  await Promise.all([
    prop('vintage_cabinet_01', 2.3, [2.6, 0, -1.42], 0),
    prop('standing_chalkboard_01', 1.6, [-2.5, 0, -1.2], .35),
    prop('woodenchair_01', .95, [1.85, 0, .55], -2.2),
    prop('chemistry_set', .42, [3.0, 0, -.6], -1.2),
  ]);
  const flames = [];
  lamps.forEach(l => l && l.traverse(o => { if (o.isMesh && /flame/i.test(o.name + (o.material && o.material.name))) { o.material = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffa04a, emissiveIntensity: 5, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }); o.castShadow = false; flames.push(o); } if (o.isMesh && /glass/i.test(o.name)) o.castShadow = false; }));
  const lampLs = [[-1.22, -.48], [1.24, -.5]].map(([x, z]) => { const l = new THREE.PointLight(0xff9f55, .55, 0, 2); l.position.set(x, TOP + .3, z); s.add(l); return l; });

  /* ---------------- 接收环（谐振器）：r = 0.35 m 铜线圆环 + 测微火花隙，立在木座上 ---------------- */
  const ringG = new THREE.Group(); s.add(ringG);
  const GA = .0286;
  const ringM = mesh(new THREE.TorusGeometry(RING_R, .0032, 16, 360, Math.PI * 2 - GA), M.copper); ringM.rotation.z = Math.PI / 2 + GA / 2; ringM.position.y = DY; ringG.add(ringM);
  const knobL = mesh(new THREE.SphereGeometry(.004, 24, 16), M.brassPol), knobR = knobL.clone(); knobL.position.set(-.005, DY + RING_R, 0); knobR.position.set(.005, DY + RING_R, 0); ringG.add(knobL, knobR);
  const mic = new THREE.Group(); mic.position.set(.022, DY + RING_R, 0); ringG.add(mic);
  const mb = mesh(KIT.rbox(.016, .014, .014, .002), M.brass); mic.add(mb);
  const ms = mesh(new THREE.CylinderGeometry(.0016, .0016, .018, 12), M.steel); ms.rotation.z = Math.PI / 2; ms.position.x = -.012; mic.add(ms);
  const mk = mesh(new THREE.CylinderGeometry(.0065, .0065, .006, 32), M.brassKnurl); mk.rotation.z = Math.PI / 2; mk.position.x = .012; mic.add(mk);
  const scaleT = KIT.canvasTex(256, 32, (g, w, h) => { g.fillStyle = '#c8b27a'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a1c0a'; for (let i = 0; i <= 50; i++) { const x = 8 + i * (w - 16) / 50; g.fillRect(x, 0, 1.4, i % 5 ? 10 : 18); } });
  const msc = mesh(new THREE.CylinderGeometry(.0068, .0068, .004, 32, 1, true), KIT.M.brass({ rough: .3, extra: { map: scaleT, color: new THREE.Color(1, 1, 1) } })); msc.rotation.z = Math.PI / 2; msc.position.x = .0165; mic.add(msc);
  const pedestal = mesh(lathe([[0, 0], [.17, 0], [.17, .02], [.15, .04], [.06, .055], [.03, .08], [.026, .1], [.026, .66], [.034, .68], [.034, .71], [.02, .72], [0, .72]], 64), oakS); ringG.add(pedestal);
  const holder = mesh(new THREE.CylinderGeometry(.011, .011, DY - RING_R - .72 + .01, 24), M.ebonite); holder.position.y = .72 + (DY - RING_R - .72) / 2; ringG.add(holder);
  const rclamp = mesh(KIT.rbox(.03, .02, .02, .004), M.brass); rclamp.position.y = DY - RING_R; ringG.add(rclamp);

  /* ---------------- 火花 ---------------- */
  const sparkMain = sparkSet(KIT, V(-.0035, DY + .0005, 0), V(.0035, DY - .0003, 0), { variants: 7, seed: 5, coreK: 10, haloK: 1.3, width: 1.8, haloW: 4.5, jag: .22 }); s.add(sparkMain.group);
  const sparkRing = sparkSet(KIT, V(-.0011, DY + RING_R, 0), V(.0011, DY + RING_R + .0002, 0), { variants: 4, seed: 9, coreK: 3.2, haloK: .6, width: 1.3, haloW: 3, jag: .18, n: 6 }); ringG.add(sparkRing.group);
  const sparkL = new THREE.PointLight(0xc9d2ff, 0, 0, 2); sparkL.position.copy(GAPC).add(V(0, 0, .006)); s.add(sparkL);
  const ringL = new THREE.PointLight(0xc9d2ff, 0, 0, 2); ringL.position.set(0, DY + RING_R, .004); ringG.add(ringL);

  /* ---------------- 灯光 ---------------- */
  const key = new THREE.SpotLight(0xffd8ac, 26, 0, Math.PI / 6, .9, 2); key.position.set(2.4, 3.6, 2.6); key.target.position.set(-.1, 1, -.2); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -.0002; key.shadow.normalBias = .01; Object.assign(key.shadow.camera, { near: 1, far: 12 }); s.add(key, key.target);
  const win = new THREE.DirectionalLight(0xaec2e0, .22); win.position.set(-6, 3, 1.5); win.target.position.set(0, 1, 1); s.add(win, win.target);
  const hall = new THREE.SpotLight(0xffe2c0, 0, 0, Math.PI / 3, 1, 2); hall.position.set(1.5, 10, 6.2); hall.target.position.set(0, 0, 6.2); hall.castShadow = true; hall.shadow.mapSize.set(2048, 2048); hall.shadow.radius = 6; Object.assign(hall.shadow.camera, { near: 4, far: 16 }); s.add(hall, hall.target);
  const ringKey = new THREE.SpotLight(0xffe0b8, 0, 0, Math.PI / 7, .9, 2); ringKey.position.set(1.4, 2.4, 4.6); ringKey.target.position.set(0, 1.1, 3); s.add(ringKey, ringKey.target);

  /* ---------------- 原理层：电荷着色、电流脉冲、波前、驻波 ---------------- */
  const POS = new THREE.Color(0xff7a48), NEG = new THREE.Color(0x5aa8ff);
  const segs = [];
  const segG = new THREE.CylinderGeometry(.0085, .0085, .973 / 10 - .004, 16);
  for (const sg of [-1, 1]) for (let i = 0; i < 10; i++) { const u = (i + .5) / 10; const m = new THREE.Mesh(segG, new THREE.MeshBasicMaterial({ color: POS, transparent: true, opacity: 0, depthWrite: false })); m.rotation.z = Math.PI / 2; m.position.set(sg * (.027 + u * .973), DY, 0); m.renderOrder = 3; s.add(m); segs.push({ m, sg, u }); }
  const shellG = new THREE.SphereGeometry(.158, 48, 32);
  const sphOv = [-1, 1].map(sg => { const m = new THREE.Mesh(shellG, new THREE.MeshBasicMaterial({ color: POS, transparent: true, opacity: 0, depthWrite: false })); m.position.set(sg * 1.15, DY, 0); m.renderOrder = 3; s.add(m); return { m, sg }; });
  const curLine = PL(KIT, [V(-1.0, DY + .022, 0), V(1.0, DY + .022, 0)], { width: 2, color: 0xfff2dc, intensity: 1, opacity: 0, pulse: 1.8, pulseLen: 7, pulseSpeed: 1 }); s.add(curLine);
  const waves = makeWaves({ count: 8, axis: V(1, 0, 0), dip: 1, rim: .55, ior: 1.1, thick: .05, pow: 4.5, env: .3, spec: .15 }); s.add(waves.group);
  // 驻波（E2）：曲线 + 包络虚线
  const NS = 220, zA = .25, zB = ZP;
  const stand = liveLine(KIT, NS, { width: 2.6, color: 0xff9a52, intensity: 1.05, opacity: 0 }); s.add(stand);
  const envPts = sg => { const a = []; for (let i = 0; i < NS; i++) { const z = lerp(zA, zB, i / (NS - 1)); a.push(V(0, DY + sg * .62 * Math.abs(standK(z)), z)); } return a; };
  const envU = PL(KIT, envPts(1), { width: 1.2, color: 0xf2f2ee, intensity: .8, opacity: 0, dash: 60 }), envD = PL(KIT, envPts(-1), { width: 1.2, color: 0xf2f2ee, intensity: .8, opacity: 0, dash: 60 }); s.add(envU, envD);
  const axisZ = PL(KIT, [V(0, DY, zA), V(0, DY, zB)], { width: 1.1, color: 0xf2f2ee, intensity: .7, opacity: 0 }); s.add(axisZ);

  s.updateMatrixWorld(true);
  const wv = [];
  const st = { cut: false };
  return {
    scene: s, coil, ringG, hall, key, ringKey, lampLs, room: { backW, leftW, farW, rightW }, zincPlate,
    gap: GAPC.clone(), ringTop: () => V(0, DY + RING_R, ringG.position.z), ringC: () => V(0, DY, ringG.position.z), sphere: sg => V(sg * 1.15, DY, 0),
    coilPt: V(0, TOP + CY, -.36), hammerPt: V(-.255, TOP + CY, -.36), platePt: V(0, 2.4, ZP),
    nodes: [ZP - LAM, ZP - LAM / 2, ZP].map(z => V(0, DY, z)),
    /** o: { cut, hallK, charges, waves:'train'|'none', stand, ringSparkK } */
    update(t, o = {}) {
      // 房间剖切（E2 从侧面俯看）
      leftW.visible = winG.visible = !o.cut;
      hall.intensity = o.hallK ?? 0; ringKey.intensity = o.ringKey ?? 0;
      // 断续器振动 + 火花
      const on = t > 26.85;
      hammer.rotation.z = on ? .035 * Math.sin(t * Math.PI * 2 * 17) : 0;
      const ff = .92 + .08 * Math.sin(t * 11.3) * Math.sin(t * 6.1 + 2); lampLs.forEach(l => l.intensity = .55 * ff); flames.forEach(f => f.material.emissiveIntensity = 5 * ff);
      let sk = 0, si = 0;
      if (o.train) { // 慢放示意：每串开始一次长火花，随振荡衰减
        for (const T of TRAINS) { const u = t - T; if (u >= -.02 && u < 2.4) { sk = Math.max(sk, (u < 0 ? 0 : 1) * Math.exp(-u / .5) * (.85 + .15 * Math.sin(u * 40) ** 2)); si = Math.floor(u * 12) + T * 3; } }
      } else { const a = sparkAt(SPARKS, t, .062); sk = a.k; si = a.i; }
      sparkMain.set(sk, Math.max(0, si)); sparkL.intensity = .028 * sk;
      // 接收环：与主火花同步的微弱火花，强度随驻波位置变化
      const rz = ringZ(t); ringG.position.z = rz;
      const rk = (o.ringSparkK ?? (o.stand ? standK(rz) ** 2 : 1)) * sk * (o.train ? .8 : (Math.sin(si * 3.7) > -.6 ? 1 : 0));
      sparkRing.set(rk > .05 ? rk : 0, Math.max(0, si)); ringL.intensity = .0018 * rk;
      // 电荷 / 电流
      const ca = o.charges ?? 0;
      const q = qTrain(t), Iq = (qTrain(t + .005) - qTrain(t - .005)) / .01;
      segs.forEach(S => { const rho = S.sg * Math.sin(Math.PI / 2 * S.u) * q; S.m.visible = ca > .01; S.m.material.color.copy(rho > 0 ? POS : NEG); S.m.material.opacity = ca * clamp(Math.abs(rho)) * .55; });
      sphOv.forEach(S => { const rho = S.sg * q; S.m.visible = ca > .01; S.m.material.color.copy(rho > 0 ? POS : NEG); S.m.material.opacity = ca * clamp(Math.abs(rho)) * .32; });
      curLine.set({ opacity: ca * clamp(Math.abs(Iq) / 4) * .9, time: -q * 1.4, pulse: 1.8 });
      // 波前
      wv.length = 0;
      if (o.waves) {
        for (const T of (o.trains || TRAINS)) for (let n = 0; n < 4; n++) {
          const te = T + n / FV, r = (t - te) * CV; if (r <= .02) continue;
          const a = Math.exp(-n / (FV * TAU)) * ss(.02, .25, r) * (1 - ss(o.maxR ? o.maxR * .55 : 2.6, o.maxR || 4.6, r)) * (o.waves === true ? 1 : o.waves);
          if (a > .01) wv.push({ r, a });
        }
      }
      waves.set(GAPC, wv);
      // 驻波
      const sa = o.stand ?? 0;
      stand.visible = envU.visible = envD.visible = axisZ.visible = sa > .01;
      if (sa > .01) {
        const c = Math.cos(t * Math.PI * 2 * .9);
        stand.set({ opacity: sa }); envU.set({ opacity: .45 * sa }); envD.set({ opacity: .45 * sa }); axisZ.set({ opacity: .4 * sa });
        stand.setPoints((i, u, out) => { const z = lerp(zA, zB, u); return out.set(0, DY + .62 * standK(z) * c, z); });
      }
      return { sk, rk };
    },
  };
}
