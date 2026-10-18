/* 03 · 马可尼的器材（单位：米，按真实尺寸建模）
   - 感应线圈火花发射机（Ruhmkorff 式「10 英寸火花线圈」+ 锤式断续器 + 火花球隙）
   - 自恢复式金属屑检波器（玻璃管 + 银塞 + 金属屑 + 敲击器）
   - 电话听筒（硬橡胶 Bell 式手持听筒）
   - 摩尔斯印字机（发条机芯 + 电磁铁 + 墨轮 + 纸带卷）与纸带
   材质沿用第 01 章的 makeMats（黄铜 / 旧黄铜 / 银 / 铁 / 硬橡胶 / 丝包线圈 / 纱包线）。 */
import * as THREE from 'three';
import { V, rng, hash } from '../../engine/util.js';
import { screw, knurl, hexNut, bindingPost, wire } from '../01/telegraph.js';

const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
/** 沿 x 轴的圆柱 */
const cylX = (r, len, seg = 48, open = false) => { const g = new THREE.CylinderGeometry(r, r, len, seg, 1, open); g.rotateZ(Math.PI / 2); return g; };
/** 沿 z 轴的圆柱 */
const cylZ = (r, len, seg = 48) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); return g; };

/** 刻字铭牌贴图（黄铜底、蚀刻黑字） */
function plateTex(KIT, lines, w = 512, h = 160) {
  return KIT.canvasTex(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#b89a5a'); gr.addColorStop(.5, '#d8bd7c'); gr.addColorStop(1, '#a8884a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(9); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < .5 ? '60,40,10' : '255,240,200'},${r() * .08})`; g.fillRect(r() * w, r() * h, r() * 40, 1); }
    g.strokeStyle = 'rgba(40,28,10,.8)'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = 'rgba(30,20,8,.88)'; g.textAlign = 'center';
    lines.forEach((s, i) => { g.font = `${i ? 500 : 700} ${i ? 26 : 40}px "Times New Roman", serif`; g.fillText(s, w / 2, 62 + i * 46); });
  });
}

/* =====================================================================
   感应线圈火花发射机（底座中心在原点，线圈沿 x 轴）
   ===================================================================== */
export function buildSparkCoil(mt, woodMat) {
  const { KIT } = mt; const root = new THREE.Group();
  const BW = .52, BH = .07, BD = .22, CY = BH + .09, CR = .066;
  // 红木底座 + 线脚
  root.add(mesh(KIT.rbox(BW + .02, .014, BD + .02, .005), woodMat, 0, .007, 0));
  root.add(mesh(KIT.rbox(BW, BH - .012, BD, .008), woodMat, 0, .012 + (BH - .012) / 2, 0));
  // 正面黄铜铭牌（四角螺丝）
  const pm = new THREE.MeshPhysicalMaterial({ map: plateTex(KIT, ['INDUCTION COIL', '10 IN. SPARK · No 27']), metalness: 1, roughness: .32, roughnessMap: KIT.grunge(21) });
  const plate = mesh(KIT.rbox(.09, .028, .0016, .0006), pm, .1, BH * .52, BD / 2 + .0009); root.add(plate);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const s = screw(mt, .0016, .001, sx * .7); s.rotation.x = Math.PI / 2; s.position.set(.1 + sx * .04, BH * .52 + sy * .0105, BD / 2 + .0017); root.add(s); }
  // 线圈端板（硬橡胶圆盘，带倒角环）与底脚
  for (const s of [-1, 1]) {
    const x = s * .165;
    root.add(mesh(cylX(.09, .02, 96), mt.ebonite, x, CY, 0));
    for (const o of [-.01, .01]) { const tr = mesh(new THREE.TorusGeometry(.0885, .0018, 8, 96), mt.ebonite, x + o, CY, 0); tr.rotation.y = Math.PI / 2; root.add(tr); }
    root.add(mesh(KIT.rbox(.036, .026, .16, .004), mt.ebonite, x, BH + .011, 0));
    // 端板上的四颗固定螺丝
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + .6; const sc = screw(mt, .0022, .0012, k); sc.rotation.z = -s * Math.PI / 2; sc.position.set(x + s * .01, CY + Math.cos(a) * .072, Math.sin(a) * .072); root.add(sc); }
  }
  // 次级线圈：清漆丝包（深褐红）+ 中间纸标签带
  const silk = KIT.canvasTex(512, 64, (g, w, h) => {
    g.fillStyle = '#2a0f0b'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(${110 + (x * 7) % 40},${38 + (x * 3) % 14},${26},.5)`; g.fillRect(x, 0, 1.6, h); }
  });
  silk.wrapS = silk.wrapT = THREE.RepeatWrapping; silk.repeat.set(6, 1);
  const silkM = new THREE.MeshPhysicalMaterial({ map: silk, bumpMap: silk, bumpScale: .6, roughness: .42, clearcoat: .7, clearcoatRoughness: .3, sheen: .4, sheenColor: new THREE.Color(0x6a2a1c) });
  root.add(mesh(cylX(CR, .31, 96), silkM, 0, CY, 0));
  const lbl = KIT.canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#d9cba8'; g.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,70,40,${r() * .07})`; g.fillRect(r() * w, r() * h, r() * 30, r() * 3); }
    g.fillStyle = 'rgba(40,28,18,.85)'; g.font = '600 46px "Times New Roman", serif'; g.textAlign = 'center'; g.fillText('SECONDARY · 10 MILES No 36 S.C.C.', w * .25, 80); g.fillText('SECONDARY · 10 MILES No 36 S.C.C.', w * .75, 80);
  });
  root.add(mesh(cylX(CR + .0006, .05, 96, true), new THREE.MeshStandardMaterial({ map: lbl, roughness: .8, side: THREE.DoubleSide }), -.04, CY, 0));
  // 铁芯（铁丝束）端面 + 断续器
  const coreEnd = KIT.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3a3836'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 420; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 120; g.fillStyle = `rgba(${150 + r() * 60},${150 + r() * 55},${145 + r() * 50},.9)`; g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 4.2, 0, 7); g.fill(); } });
  root.add(mesh(cylX(.02, .03, 32), mt.iron, -.19, CY, 0));
  const ce = mesh(new THREE.CircleGeometry(.0198, 32), new THREE.MeshStandardMaterial({ map: coreEnd, metalness: .8, roughness: .45 }), -.2051, CY, 0); ce.rotation.y = -Math.PI / 2; root.add(ce);
  // 锤：弹簧片 + 软铁锤头
  root.add(mesh(KIT.rbox(.02, .012, .03, .002), mt.brass, -.214, BH + .006, 0));
  root.add(mesh(new THREE.BoxGeometry(.0014, .09, .012), mt.iron, -.214, BH + .057, 0));
  root.add(mesh(cylX(.017, .009, 32), mt.iron, -.2095, CY, 0));
  // 触点柱 + 白金触点螺丝 + 滚花旋钮
  root.add(mesh(KIT.rbox(.022, .012, .03, .002), mt.brass, -.245, BH + .006, 0));
  root.add(mesh(lathe([[0, 0], [.008, 0], [.0075, .01], [.006, .02], [.006, .1], [.0075, .108], [0, .11]], 32), mt.brass, -.245, BH + .012, 0));
  root.add(mesh(cylX(.0024, .032, 16), mt.steel || mt.iron, -.231, CY + .003, 0));
  const kn = knurl(mt, .009, .008, 30); kn.rotation.z = Math.PI / 2; kn.position.set(-.252, CY + .003, 0); root.add(kn);
  // 次级接线柱：硬橡胶立柱 + 黄铜导杆 + 火花球
  const GY = CY + .09 + .115, GAP = .012, BR = .02;
  const pillar = lathe([[0, 0], [.016, 0], [.016, .006], [.011, .012], [.0095, .03], [.009, .09], [.0105, .1], [.012, .108], [.0085, .115], [0, .115]], 40);
  for (const s of [-1, 1]) {
    const x = s * .165;
    root.add(mesh(pillar, mt.ebonite, x, CY + .086, 0));
    root.add(mesh(new THREE.SphereGeometry(.0105, 32, 16), mt.brass, x, GY, 0));
    // 导杆：从球隙到外侧调节手柄
    const x0 = s * (GAP / 2 + BR), x1 = s * .215;
    const rod = mesh(cylX(.0034, Math.abs(x1 - x0), 24), mt.brass, (x0 + x1) / 2, GY, 0); root.add(rod);
    root.add(mesh(new THREE.SphereGeometry(BR, 48, 32), mt.brass, x0, GY, 0));
    root.add(mesh(new THREE.SphereGeometry(.0115, 32, 16), mt.ebonite, x1 + s * .008, GY, 0));
    const nut = hexNut(mt, .0062, .006); nut.rotation.z = Math.PI / 2; nut.position.set(x + s * .013, GY, 0); root.add(nut);
  }
  // 初级接线柱 ×2、换向开关
  const posts = [];
  for (const [x, z] of [[-.22, .075], [-.22, .035]]) { const b = bindingPost(mt); b.group.position.set(x, BH, z); b.group.scale.setScalar(1.3); root.add(b.group); posts.push(b.group.position.clone().add(b.top.clone().multiplyScalar(1.3))); }
  root.add(mesh(cylX(.013, .05, 32), mt.ebonite, .205, BH + .02, .07));
  for (const s of [-1, 1]) root.add(mesh(KIT.rbox(.006, .03, .014, .002), mt.brass, .205 + s * .029, BH + .015, .07));
  const lev = mesh(new THREE.BoxGeometry(.004, .03, .004), mt.brass, .205, BH + .045, .07); lev.rotation.x = .5; root.add(lev);
  root.add(mesh(new THREE.SphereGeometry(.005, 16, 12), mt.ebonite, .205, BH + .058, .077));

  // 火花：几条预生成的锯齿放电通道，按时间轮换显示
  const sparkMat = new THREE.MeshStandardMaterial({ color: 0, emissive: new THREE.Color(.78, .86, 1), emissiveIntensity: 16, roughness: 1 });
  const sparks = []; const r = rng(31);
  for (let k = 0; k < 6; k++) {
    const pts = []; const n = 9;
    for (let i = 0; i <= n; i++) { const u = i / n, env = Math.sin(Math.PI * u); pts.push(V(-GAP / 2 + GAP * u, (r() - .5) * .0034 * env, (r() - .5) * .0034 * env)); }
    const sp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .00032, 5), sparkMat); sp.position.set(0, GY, 0); sp.visible = false; root.add(sp); sparks.push(sp);
  }
  const light = new THREE.PointLight(0xc8d8ff, 0, 0, 2); light.position.set(0, GY, .004); root.add(light);
  return {
    group: root, gap: V(0, GY, 0), posts, antTop: V(.215 + .02, GY, 0), earth: V(-.215 - .02, GY, 0), CY, GY,
    /** on: 0/1 是否放电；t 用于选择通道与闪烁 */
    setSpark(on, t) {
      const f = Math.floor(t * 90), k = f % 6, fl = hash(f * 1.7 + 3);
      sparks.forEach((s, i) => { s.visible = !!on && i === k && fl > .12; });
      light.intensity = on ? .05 + .09 * fl : 0;
    },
  };
}

/* =====================================================================
   金属屑检波器（底板中心在原点，玻璃管沿 x 轴）+ 敲击器
   ===================================================================== */
export function buildCoherer(mt) {
  const { KIT } = mt; const root = new THREE.Group();
  root.add(mesh(KIT.rbox(.17, .012, .07, .003), mt.ebonite, 0, .006, 0));
  const TY = .044;
  for (const s of [-1, 1]) {
    const x = s * .036;
    root.add(mesh(lathe([[0, 0], [.0065, 0], [.0065, .002], [.0045, .004], [.0042, .028], [0, .028]], 24), mt.brass, x, .012, 0));
    const clip = mesh(new THREE.TorusGeometry(.0044, .0011, 8, 24, Math.PI * 1.3), mt.brass, x, TY, 0); clip.rotation.set(0, Math.PI / 2, Math.PI * 1.35); root.add(clip);
    const b = bindingPost(mt); b.group.position.set(s * .07, .012, -.018); root.add(b.group);
    // 黄铜引线片
    const strip = mesh(new THREE.BoxGeometry(.034, .0008, .005), mt.oldBrass, s * .053, .0124, -.009); strip.rotation.y = -s * .5; root.add(strip);
  }
  // 玻璃管（薄壁，开口圆柱 + 端帽）
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .03, transmission: 1, thickness: .0008, ior: 1.5, side: THREE.DoubleSide, specularIntensity: 1 });
  root.add(mesh(cylX(.0034, .066, 48, true), glass, 0, TY, 0));
  for (const s of [-1, 1]) {
    root.add(mesh(cylX(.0027, .03, 32), mt.silver, s * (.0012 + .015), TY, 0));
    root.add(mesh(cylX(.0039, .007, 32), mt.brass, s * .0355, TY, 0));
    root.add(mesh(cylX(.0007, .012, 8), mt.oldBrass, s * .045, TY, 0));
  }
  // 金属屑（镍银屑，堆在缝隙底部）
  const fil = new THREE.InstancedMesh(new THREE.BoxGeometry(.00034, .00022, .00028), mt.silver, 140); const r = rng(77), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 140; i++) { const x = (r() - .5) * .0023, z = (r() - .5) * .0036, y = TY - .0026 + Math.pow(r(), 2) * .0016 + (1 - Math.abs(z) / .002) * .0003; e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e); const s = .7 + r() * .8; m4.compose(V(x, y, z), q, V(s, s, s)); fil.setMatrixAt(i, m4); }
  fil.castShadow = true; root.add(fil);
  // 敲击器：两只小线圈 + 衔铁 + 小锤（从前下方轻敲玻璃管）
  for (const s of [-1, 1]) {
    root.add(mesh(new THREE.CylinderGeometry(.0062, .0062, .016, 24), mt.coil, s * .009, .012 + .009, .026));
    root.add(mesh(new THREE.CylinderGeometry(.0074, .0074, .0016, 24), mt.ebonite, s * .009, .012 + .0175, .026));
  }
  const hammer = new THREE.Group(); hammer.position.set(0, .034, .026); root.add(hammer);
  hammer.add(mesh(new THREE.BoxGeometry(.03, .002, .006), mt.iron, 0, 0, 0));
  const arm = mesh(new THREE.CylinderGeometry(.0008, .0008, .022, 8), mt.brass, 0, .0045, -.0105); arm.rotation.x = -1.05; hammer.add(arm);
  hammer.add(mesh(new THREE.SphereGeometry(.0022, 16, 12), mt.brass, 0, .0095, -.0196));
  return { group: root, tubeY: TY, tube: V(0, TY, 0), hammer, setTap(a) { hammer.rotation.x = -.12 * a; } };
}

/* =====================================================================
   电话听筒：硬橡胶，y 轴从耳承面（y=0）到线尾（y=.18）
   ===================================================================== */
export function buildEarpiece(mt) {
  const root = new THREE.Group();
  const prof = [[0, .001], [.006, .001], [.0062, 0], [.024, 0], [.0285, .0012], [.0312, .0038], [.0318, .0085], [.0302, .0128], [.026, .018], [.021, .026], [.0178, .036], [.0162, .06], [.0154, .12], [.0147, .15], [.0138, .16], [.0108, .168], [.0062, .1735], [.0042, .18], [0, .1805]];
  root.add(mesh(lathe(prof, 72), mt.ebonite));
  root.add(mesh(new THREE.CylinderGeometry(.0058, .0058, .0012, 32), new THREE.MeshStandardMaterial({ color: 0x040303, roughness: .9 }), 0, .0012, 0));
  for (const rr of [.011, .016, .021]) { const ring = mesh(new THREE.TorusGeometry(rr, .0006, 6, 64), mt.ebonite, 0, -.0002, 0); ring.rotation.x = Math.PI / 2; root.add(ring); }
  // 尾部两个黄铜接线螺丝
  for (const s of [-1, 1]) { const sc = mesh(new THREE.CylinderGeometry(.0018, .0018, .004, 16), mt.brass, s * .0035, .181, 0); root.add(sc); }
  return { group: root, cord: V(0, .18, 0) };
}

/* =====================================================================
   摩尔斯印字机（底座中心在原点；纸带沿 +x 从墨轮下方吐出）
   ===================================================================== */
export const INK = { TAPE_Y: .112, PRINT_X: .092, EXIT_X: .124, W: .013, REEL_X: -.215, REEL_R: .05 };
function gearGeo(r, teeth, th, hole = .25) {
  const sh = new THREE.Shape(); const N = teeth * 4;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, ph = i % 4, rr = ph === 0 || ph === 1 ? r : r * (1 - 1.6 / teeth); i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const h = new THREE.Path(); h.absarc(0, 0, r * hole, 0, Math.PI * 2, true); sh.holes.push(h);
  // 辐条孔
  if (r > .02) for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; const p = new THREE.Path(); p.absarc(Math.cos(a) * r * .58, Math.sin(a) * r * .58, r * .17, 0, Math.PI * 2, true); sh.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * .15, bevelSize: th * .12, bevelSegments: 1, curveSegments: 6 }); g.translate(0, 0, -th / 2); return g;
}
export function buildInker(mt, woodMat) {
  const { KIT } = mt; const root = new THREE.Group(); const { TAPE_Y, PRINT_X } = INK;
  root.add(mesh(KIT.rbox(.47, .022, .18, .005), woodMat, -.05, .011, 0));
  root.add(mesh(KIT.rbox(.48, .008, .19, .003), woodMat, -.05, .004, 0));
  // 两块黄铜侧板 + 立柱
  const BX = -.02, PH = .125;
  for (const z of [-.042, .042]) root.add(mesh(KIT.rbox(.21, PH, .005, .006), mt.brass, BX, .022 + PH / 2, z));
  for (const [x, y] of [[-.115, .035], [.075, .035], [-.115, .135], [.075, .135]]) {
    root.add(mesh(cylZ(.0042, .084, 24), mt.brass, x, y, 0));
    for (const z of [-.0465, .0465]) { const n = hexNut(mt, .0052, .004); n.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2; n.position.set(x, y, z); root.add(n); }
  }
  // 机芯齿轮（板间 + 前板外侧），记下以便转动
  const gears = [];
  const addGear = (r, teeth, x, y, z, speed, mat = mt.brass) => { const g = mesh(gearGeo(r, teeth, .003), mat, x, y, z); root.add(g); gears.push({ g, speed }); const ax = mesh(cylZ(r * .22, .006, 16), mt.steel || mt.iron, x, y, z); root.add(ax); return g; };
  addGear(.046, 60, -.065, .088, .047, -.3);
  addGear(.018, 14, -.012, .118, .047, .3 * 60 / 14 * .55);
  addGear(.03, 36, .025, .07, .047, -.5);
  addGear(.04, 48, -.04, .075, 0, .2);
  addGear(.022, 20, .03, .105, -.015, -.45);
  // 上弦钥匙
  root.add(mesh(new THREE.BoxGeometry(.006, .006, .02), mt.steel || mt.iron, -.09, .05, .056));
  root.add(mesh(KIT.rbox(.03, .014, .004, .003), mt.brass, -.09, .05, .066));
  // 顶部电磁铁：横梁 + 两只丝包线圈 + 衔铁杠杆
  root.add(mesh(KIT.rbox(.06, .008, .094, .002), mt.brass, -.05, .022 + PH + .004, 0));
  for (const z of [-.017, .017]) {
    root.add(mesh(new THREE.CylinderGeometry(.0135, .0135, .038, 32), mt.coil, -.05, .022 + PH + .027, z));
    for (const y of [.009, .046]) root.add(mesh(new THREE.CylinderGeometry(.0158, .0158, .003, 32), mt.ebonite, -.05, .022 + PH + y, z));
  }
  const lever = new THREE.Group(); lever.position.set(-.085, .022 + PH + .058, 0); root.add(lever);
  lever.add(mesh(KIT.rbox(.15, .006, .05, .002), mt.iron, .075, 0, 0));
  lever.add(mesh(new THREE.BoxGeometry(.004, .05, .006), mt.brass, .17, -.026, 0));
  // 墨轮支架 + 墨轮 + 墨槽
  const wheel = mesh(cylZ(.011, .0022, 48), mt.steel || mt.iron, PRINT_X, TAPE_Y + .0114, 0); root.add(wheel);
  root.add(mesh(KIT.rbox(.03, .016, .022, .003), mt.brass, PRINT_X, TAPE_Y + .033, -.004));
  const inkWell = mesh(KIT.rbox(.026, .012, .02, .003), mt.ebonite, PRINT_X, TAPE_Y + .028, .0); root.add(inkWell);
  // 走纸滚轮
  for (const dy of [-.0088, .0088]) { root.add(mesh(cylZ(.0082, .03, 40), mt.steel || mt.iron, INK.EXIT_X, TAPE_Y + dy, 0)); }
  root.add(mesh(KIT.rbox(.012, .04, .006, .002), mt.brass, INK.EXIT_X, TAPE_Y, .019));
  root.add(mesh(KIT.rbox(.012, .04, .006, .002), mt.brass, INK.EXIT_X, TAPE_Y, -.019));
  // 进纸导槽
  root.add(mesh(KIT.rbox(.012, .01, .03, .002), mt.brass, -.135, TAPE_Y - .007, 0));
  // 纸带卷支架 + 纸卷
  root.add(mesh(KIT.rbox(.012, TAPE_Y + .05, .012, .003), mt.brass, INK.REEL_X, (TAPE_Y + .05) / 2 + .022, -.016));
  const reel = new THREE.Group(); reel.position.set(INK.REEL_X, TAPE_Y + INK.REEL_R, 0); root.add(reel);
  const rollTex = KIT.canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e4d7b8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 220; i++) { const rr = 70 + i * .85; g.strokeStyle = `rgba(120,95,60,${.05 + (i * 37 % 11) / 110})`; g.lineWidth = 1; g.beginPath(); g.arc(w / 2, h / 2, rr, 0, 7); g.stroke(); } g.fillStyle = '#6b5236'; g.beginPath(); g.arc(w / 2, h / 2, 64, 0, 7); g.fill(); g.fillStyle = '#2a2018'; g.beginPath(); g.arc(w / 2, h / 2, 14, 0, 7); g.fill(); });
  const rollSide = new THREE.MeshStandardMaterial({ map: rollTex, roughness: .85 });
  const rollEdge = new THREE.MeshStandardMaterial({ color: 0xe0d2b0, roughness: .9 });
  const roll = new THREE.Mesh(cylZ(INK.REEL_R, INK.W, 64), [rollEdge, rollSide, rollSide]); roll.castShadow = roll.receiveShadow = true; reel.add(roll);
  for (const z of [-.009, .009]) reel.add(mesh(cylZ(.035, .0016, 48), mt.brass, 0, 0, z));
  reel.add(mesh(cylZ(.004, .034, 16), mt.steel || mt.iron, 0, 0, -.006));
  // 正面铭牌
  const pm = new THREE.MeshPhysicalMaterial({ map: plateTex(KIT, ['MORSE INKER', 'RECEIVING REGISTER']), metalness: 1, roughness: .3 });
  root.add(mesh(KIT.rbox(.06, .02, .0014, .0005), pm, .1, .011, .091));
  return {
    group: root, gears, reel, lever, wheel,
    /** t：时间；v：纸带速度；press：0..1 衔铁吸合 */
    update(t, v, press) {
      for (const { g, speed } of gears) g.rotation.z = t * speed * v / .05;
      reel.rotation.z = t * v / INK.REEL_R;
      wheel.rotation.z = -t * v / .011;
      lever.rotation.z = -.035 * press;
    },
  };
}

/* ---------- 纸带：带墨迹的长条，按速度 v 向 +x 滚动（纯 t 函数） ---------- */
export const TAPE = { L: .768, U: .004, PATTERN: '...' };      // 纹理周期长度（米）、摩尔斯单位长度（米）
/** 纹理上的墨迹区间 [c0,c1]（米，纹理坐标 0..L）：重复的「S」（· · ·），词间 7 个单位 */
export function tapeMarks() {
  const out = []; let x = .006; const U = TAPE.U;
  while (x < TAPE.L - .01) { for (let i = 0; i < 3; i++) { out.push([x, x + U]); x += 2 * U; } x += 6 * U; }
  return out;
}
export function buildTape(KIT, { x0, x1, y, curve = null, seg = 200 } = {}) {
  const marks = tapeMarks(), L = TAPE.L, PX = 6400;
  const tex = KIT.canvasTex(Math.round(L * PX), 96, (g, w, h) => {
    g.fillStyle = '#e9dfc6'; g.fillRect(0, 0, w, h);
    const r = rng(12);
    for (let i = 0; i < 9000; i++) { const a = r() * .06; g.fillStyle = r() < .5 ? `rgba(120,96,60,${a})` : `rgba(255,250,235,${a})`; g.fillRect(r() * w, r() * h, 2 + r() * 14, 1); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,120,70,${.03 + r() * .04})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 80, 6 + r() * 20, 0, 0, 7); g.fill(); }
    // 墨迹：中线上的短划（墨轮压出的「点」），边缘略有晕染
    const cy = h / 2, hh = h * .17;
    for (const [c0, c1] of marks) {
      const xa = c0 * PX, xb = c1 * PX;
      for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(52,38,86,${k === 3 ? .9 : .1})`; const e = (3 - k) * 2.2; g.beginPath(); g.roundRect(xa - e + r() * 1.5, cy - hh - e * .6, xb - xa + 2 * e, 2 * hh + e * 1.2, hh + e); g.fill(); }
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(30,20,60,.25)'; g.fillRect(xa + r() * (xb - xa), cy - hh + r() * 2 * hh, 2, 1); }
    }
    // 两侧压痕（滚轮压出的细线）
    g.fillStyle = 'rgba(110,90,60,.12)'; g.fillRect(0, h * .1, w, 1.5); g.fillRect(0, h * .88, w, 1.5);
  }, { aniso: 16 });
  tex.wrapS = THREE.RepeatWrapping;
  const blankTex = KIT.canvasTex(1024, 96, (g, w, h) => { g.fillStyle = '#e9dfc6'; g.fillRect(0, 0, w, h); const r = rng(13); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(120,96,60,${r() * .06})`; g.fillRect(r() * w, r() * h, 2 + r() * 14, 1); } }, { aniso: 16 });
  blankTex.wrapS = THREE.RepeatWrapping;
  // 带状几何：沿 x 方向，curve(x) → y 偏移
  const mk = (xa, xb, map) => {
    const n = seg, pos = [], uv = [], idx = []; let acc = 0, px = xa, py = y + (curve ? curve(xa) : 0);
    for (let i = 0; i <= n; i++) {
      const x = xa + (xb - xa) * i / n, yy = y + (curve ? curve(x) : 0); acc += Math.hypot(x - px, yy - py); px = x; py = yy;
      pos.push(x, yy, -INK.W / 2, x, yy, INK.W / 2); uv.push(acc / L, 1, acc / L, 0);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map, roughness: .78, sheen: .25, sheenColor: new THREE.Color(0xfff2d8), side: THREE.DoubleSide }));
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const printed = mk(INK.PRINT_X + x0, x1, tex), blank = mk(INK.REEL_X + x0, INK.PRINT_X + x0, blankTex);
  const grp = new THREE.Group(); grp.add(printed, blank);
  // 纸带边缘厚度：两条细边（深一点的纸色）
  return {
    group: grp, marks,
    /** 内容坐标：c = (x - PRINT_X) - v t（mod L）；墨轮正下方是否有墨迹 */
    pressAt(t, v) { const c = ((-v * t) % L + L) % L; for (const [a, b] of marks) if (c >= a - .0004 && c <= b + .0004) return 1; return 0; },
    update(t, v) { tex.offset.x = -(v * t) / L; blankTex.offset.x = -(v * t) / L; },
  };
}
