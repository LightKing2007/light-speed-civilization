/* 01 · 电报道具：摩尔斯电键 / 音响器 / 丹尼尔电池组 / 纱包导线。单位：米（真实尺寸）。
   参考：CNAM 14674 摩尔斯电键、Western Electric 电键与音响器（c.1876，威斯康星历史博物馆）。 */
import * as THREE from 'three';
import { V } from '../../engine/util.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

/* ---------- 材质 ---------- */
export function makeMats(KIT, wood) {
  const M = KIT.M;
  const brass = M.brass({ rough: .26 });
  const oldBrass = M.oldBrass({ rough: .38 });
  const silver = new THREE.MeshPhysicalMaterial({ color: lin(.96, .95, .91), metalness: 1, roughness: .18, roughnessMap: KIT.grunge(11) });
  const iron = M.iron({ rough: .5 });
  const ebonite = new THREE.MeshPhysicalMaterial({ color: 0x0d0b0a, roughness: .28, clearcoat: .6, clearcoatRoughness: .25, roughnessMap: KIT.grunge(13, { contrast: .5 }) });
  const slot = new THREE.MeshStandardMaterial({ color: 0x060504, roughness: .8 });
  // 丝包线圈：深绿色丝线密绕
  const coilTex = KIT.canvasTex(64, 512, (g, w, h) => {
    g.fillStyle = '#1d2a1f'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = `rgba(${90 + (y * 7) % 30},${120 + (y * 13) % 25},${80 + (y * 5) % 20},.55)`; g.fillRect(0, y, w, 2.2); }
  });
  coilTex.wrapS = coilTex.wrapT = THREE.RepeatWrapping; coilTex.repeat.set(4, 1);
  const coil = new THREE.MeshPhysicalMaterial({ map: coilTex, bumpMap: coilTex, bumpScale: 1.2, roughness: .55, sheen: .6, sheenColor: new THREE.Color(0x6f8a68), sheenRoughness: .4 });
  // 棉纱编织导线外皮
  const braid = KIT.canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#3b2a1b'; g.fillRect(0, 0, w, h);
    for (let x = -h; x < w + h; x += 8) { g.strokeStyle = 'rgba(150,110,70,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); g.strokeStyle = 'rgba(20,12,6,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 4, h); g.lineTo(x + 4 + h, 0); g.stroke(); }
  });
  braid.wrapS = braid.wrapT = THREE.RepeatWrapping; braid.repeat.set(160, 1);
  const cloth = new THREE.MeshStandardMaterial({ map: braid, bumpMap: braid, bumpScale: 1.5, roughness: .85 });
  const fibre = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: .7 });
  return { KIT, brass, oldBrass, silver, iron, ebonite, slot, coil, cloth, fibre, wood };
}

/* ---------- 小零件 ---------- */
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
/** 一字槽圆头螺丝（底面在 y=0） */
export function screw(mt, r = .0028, h = .0016, rot = 0) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [r, 0], [r, h * .35], [r * .85, h * .8], [r * .45, h], [0, h]], 32), mt.oldBrass));
  const s = mesh(new THREE.BoxGeometry(r * 2.1, h * .5, r * .28), mt.slot, 0, h * .9, 0); s.rotation.y = rot; g.add(s);
  return g;
}
/** 滚花螺母：齿形挤出（竖直，底面 y=0） */
export function knurl(mt, r = .005, h = .004, teeth = 28, mat = null) {
  const sh = new THREE.Shape();
  for (let i = 0; i <= teeth * 2; i++) { const a = i / (teeth * 2) * Math.PI * 2, rr = i % 2 ? r : r * .93; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: h - r * .12, bevelEnabled: true, bevelThickness: r * .06, bevelSize: r * .05, bevelSegments: 2, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, r * .06, 0);
  return mesh(geo, mat || mt.brass);
}
/** 六角螺母 */
export function hexNut(mt, r = .004, h = .0025) {
  const sh = new THREE.Shape(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: h - r * .16, bevelEnabled: true, bevelThickness: r * .08, bevelSize: r * .06, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, r * .08, 0);
  return mesh(geo, mt.oldBrass);
}
/** 接线柱：垫圈 + 六角螺母 + 螺杆 + 滚花帽（底面 y=0），返回 {group, top}（导线接入点，本地坐标） */
export function bindingPost(mt) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(.0058, .0058, .0008, 32), mt.oldBrass, 0, .0004, 0));
  const n = hexNut(mt, .0048, .0032); n.position.y = .0008; g.add(n);
  g.add(mesh(new THREE.CylinderGeometry(.0017, .0017, .011, 16), mt.brass, 0, .0095, 0));
  const k = knurl(mt, .0062, .0068, 30); k.position.y = .0078; g.add(k);
  g.add(mesh(lathe([[0, 0], [.0045, 0], [.0045, .001], [.0028, .0024], [0, .0028]], 32), mt.brass, 0, .0146, 0));
  return { group: g, top: V(0, .0105, 0) };
}
/** 螺旋弹簧（竖直，底面 y=0） */
function spring(mat, r = .0034, wire = .00055, h = .016, turns = 7) {
  const pts = []; const N = turns * 24; for (let i = 0; i <= N; i++) { const a = i / 24 * Math.PI * 2; pts.push(V(Math.cos(a) * r, i / N * h, Math.sin(a) * r)); }
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, wire, 6), mat);
}

/* ---------- 摩尔斯电键（底座中心在原点，杠杆沿 +x 指向按钮） ---------- */
export function buildKey(mt) {
  const root = new THREE.Group();
  const { rbox } = mt.KIT;
  // 两层胡桃木底座（带倒角）
  const b1 = mesh(rbox(.182, .014, .086, .003, 3), mt.wood, 0, .007, 0); root.add(b1);
  const b2 = mesh(rbox(.166, .009, .072, .0028, 3), mt.wood, 0, .0175, 0); root.add(b2);
  const TOP = .022;
  // 轴架：底板 + 两立柱 + 轴 + 顶尖螺丝与锁紧螺母
  root.add(mesh(rbox(.034, .004, .046, .0012), mt.oldBrass, 0, TOP + .002, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const s = screw(mt, .0022, .0013, .6 * sx * sz); s.position.set(sx * .012, TOP + .004, sz * .0165); root.add(s); }
  const PY = .043;
  for (const sz of [-1, 1]) {
    root.add(mesh(rbox(.011, .025, .006, .0015), mt.oldBrass, 0, TOP + .004 + .0125, sz * .0115));
    const ts = new THREE.Mesh(new THREE.CylinderGeometry(.0016, .0016, .009, 16), mt.brass); ts.rotation.x = Math.PI / 2; ts.position.set(0, PY, sz * .0185); ts.castShadow = true; root.add(ts);
    const kn = knurl(mt, .0042, .0034, 22); kn.rotation.x = sz * Math.PI / 2; kn.position.set(0, PY, sz * .0146); root.add(kn);
    const hn = hexNut(mt, .0036, .0022); hn.rotation.x = sz * Math.PI / 2; hn.position.set(0, PY, sz * .0185); root.add(hn);
  }
  // 前触点砧座（镀银触头）与后限位砧座
  root.add(mesh(new THREE.CylinderGeometry(.0034, .0042, .0132, 24), mt.oldBrass, .045, TOP + .0066, 0));
  root.add(mesh(new THREE.CylinderGeometry(.0021, .0021, .0012, 20), mt.silver, .045, TOP + .0138, 0));
  root.add(mesh(new THREE.CylinderGeometry(.0034, .0042, .015, 24), mt.oldBrass, -.062, TOP + .0075, 0));
  // 接线柱 ×2（后部）
  const posts = [];
  for (const sz of [-1, 1]) { const p = bindingPost(mt); p.group.position.set(-.07, TOP, sz * .024); root.add(p.group); posts.push(p.group.position.clone().add(p.top)); }
  // 底座上的连接铜片（接线柱 → 轴架 / 砧座），平贴底座
  root.add(mesh(new THREE.BoxGeometry(.05, .0006, .004), mt.oldBrass, -.045, TOP + .0003, -.019));
  const strap = mesh(new THREE.BoxGeometry(.118, .0006, .004), mt.oldBrass, -.012, TOP + .0003, .027); root.add(strap);
  const s2 = mesh(new THREE.BoxGeometry(.004, .0006, .03), mt.oldBrass, .045, TOP + .0003, .014); root.add(s2);
  for (const p of [[-.02, -.019], [.04, .027], [.045, .004]]) { const s = screw(mt, .0018, .001); s.position.set(p[0], TOP + .0006, p[1]); root.add(s); }

  // 杠杆（可动部分，绕轴转动）
  const lever = new THREE.Group(); lever.position.set(0, PY, 0); root.add(lever);
  const sh = new THREE.Shape();
  sh.moveTo(-.066, -.0028); sh.lineTo(-.066, .0026); sh.quadraticCurveTo(-.03, .0032, -.012, .0046); sh.quadraticCurveTo(0, .0074, .012, .0046);
  sh.quadraticCurveTo(.05, .0028, .084, .0024); sh.quadraticCurveTo(.09, .0024, .09, .0004); sh.lineTo(.09, -.0024); sh.quadraticCurveTo(.05, -.0026, .012, -.0044);
  sh.quadraticCurveTo(0, -.0068, -.012, -.0044); sh.quadraticCurveTo(-.03, -.003, -.066, -.0028);
  const lg = new THREE.ExtrudeGeometry(sh, { depth: .0062, bevelEnabled: true, bevelThickness: .0009, bevelSize: .0008, bevelSegments: 3, curveSegments: 12 });
  lg.translate(0, 0, -.0031); const lm = mesh(lg, mt.brass); lever.add(lm);
  // 轴毂
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.0042, .0042, .0096, 28), mt.brass); hub.rotation.x = Math.PI / 2; hub.castShadow = true; lever.add(hub);
  // 按钮：黄铜颈 + 硬橡胶蘑菇头
  const knobY = .0024;
  lever.add(mesh(lathe([[0, 0], [.0042, 0], [.0042, .0012], [.0034, .0022], [.0034, .0072], [.0062, .0082], [.0068, .0094], [0, .0094]], 40), mt.brass, .082, knobY, 0));
  lever.add(mesh(lathe([[0, 0], [.0085, 0], [.0118, .0018], [.0128, .0052], [.0122, .0086], [.0098, .0118], [.0058, .0134], [0, .0138]], 48), mt.ebonite, .082, knobY + .0092, 0));
  // 杠杆下方的镀银触头
  lever.add(mesh(new THREE.CylinderGeometry(.0019, .0019, .0014, 20), mt.silver, .045, -.0047, 0));
  // 后限位螺丝（穿过杠杆）+ 滚花锁母
  lever.add(mesh(new THREE.CylinderGeometry(.0016, .0016, .015, 14), mt.brass, -.062, .0015, 0));
  const k1 = knurl(mt, .0046, .0036, 24); k1.position.set(-.062, .0034, 0); lever.add(k1);
  // 弹簧张力螺丝 + 弹簧（轴与触点之间，把按钮端顶起；松手即断开）
  lever.add(mesh(new THREE.CylinderGeometry(.0014, .0014, .012, 14), mt.brass, .024, .002, 0));
  const k2 = knurl(mt, .0048, .0036, 26); k2.position.set(.024, .0036, 0); lever.add(k2);
  const sp = spring(mt.iron, .0032, .00055, PY - .0046 - TOP, 7); sp.position.set(.024, TOP, 0); root.add(sp);

  const ANG = .0275;   // 按下时转角（触点行程约 1.2 mm）
  return {
    group: root, lever, posts, contact: V(.045, TOP + .0145, 0), knob: V(.082, PY + .02, 0),
    /** a: 0 抬起 … 1 按下 */
    set(a) { lever.rotation.z = -ANG * a; },
  };
}

/* ---------- 音响器（远端电磁铁） ---------- */
export function buildSounder(mt) {
  const root = new THREE.Group(); const { rbox } = mt.KIT;
  root.add(mesh(rbox(.16, .02, .1, .003, 3), mt.wood, 0, .01, 0));
  const TOP = .02;
  // 铁轭 + 两个线圈
  root.add(mesh(rbox(.024, .006, .058, .001), mt.iron, -.03, TOP + .003, 0));
  for (const sz of [-1, 1]) {
    const z = sz * .0175;
    root.add(mesh(new THREE.CylinderGeometry(.0125, .0125, .041, 48), mt.coil, -.03, TOP + .006 + .0225, z));
    for (const y of [TOP + .0072, TOP + .0446]) root.add(mesh(new THREE.CylinderGeometry(.0142, .0142, .0024, 48), mt.fibre, -.03, y, z));
    root.add(mesh(new THREE.CylinderGeometry(.0056, .0056, .006, 28), mt.iron, -.03, TOP + .0488, z));
  }
  // 立柱与轴
  for (const sz of [-1, 1]) root.add(mesh(rbox(.009, .072, .008, .0015), mt.oldBrass, .03, TOP + .036, sz * .02));
  const PY = TOP + .064;
  const ax = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, .05, 16), mt.brass); ax.rotation.x = Math.PI / 2; ax.position.set(.03, PY, 0); root.add(ax);
  for (const sz of [-1, 1]) { const kn = knurl(mt, .004, .003, 20); kn.rotation.x = sz * Math.PI / 2; kn.position.set(.03, PY, sz * .024); root.add(kn); }
  // 限位柱（衔铁杆前端上下两个止动螺丝——「咔嗒」声的来源）
  root.add(mesh(rbox(.008, .085, .008, .0015), mt.oldBrass, .072, TOP + .0425, -.014));
  root.add(mesh(rbox(.008, .006, .022, .0012), mt.oldBrass, .072, TOP + .082, -.006));
  root.add(mesh(new THREE.CylinderGeometry(.0015, .0015, .012, 12), mt.brass, .072, TOP + .074, 0));
  const k3 = knurl(mt, .0042, .0032, 22); k3.position.set(.072, TOP + .085, 0); root.add(k3);
  root.add(mesh(new THREE.CylinderGeometry(.0028, .0034, .052, 16), mt.oldBrass, .072, TOP + .026, 0));
  // 衔铁杆
  const lever = new THREE.Group(); lever.position.set(.03, PY, 0); root.add(lever);
  lever.add(mesh(rbox(.135, .0065, .009, .0016), mt.brass, -.012, 0, 0));
  lever.add(mesh(rbox(.016, .0075, .058, .0012), mt.iron, -.06, -.0068, 0));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.0042, .0042, .03, 24), mt.brass); hub.rotation.x = Math.PI / 2; lever.add(hub);
  const k4 = knurl(mt, .0045, .0035, 22); k4.position.set(-.075, .003, 0); lever.add(k4);
  // 接线柱
  const posts = [];
  for (const sz of [-1, 1]) { const p = bindingPost(mt); p.group.position.set(-.064, TOP, sz * .04); root.add(p.group); posts.push(p.group.position.clone().add(p.top)); }
  for (const p of [[.03, .036], [.03, -.036], [-.03, .045], [-.03, -.045]]) { const s = screw(mt, .0022, .0013, p[0] * 40); s.position.set(p[0], TOP, p[1]); root.add(s); }
  const ANG = .034;                                   // 杠杆前端行程 ≈ 3 mm（真实音响器 2–3 mm）
  return { group: root, lever, posts, coilTop: V(-.03, TOP + .05, 0), set(a) { lever.rotation.z = ANG * a; } };
}

/* ---------- 丹尼尔电池（两格串联） ---------- */
export function buildBattery(mt, KIT) {
  const root = new THREE.Group();
  const glass = KIT.M.glass({ thickness: .004, tint: 0xeef6f2, attDist: .6, rough: .03 });
  // 硫酸铜溶液：透明的蓝色液体（透射 + 体积衰减），透过它能看到里面的铜筒，而不是一圈不透明的「塑料」色带
  const liquid = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .05, transmission: 1, ior: 1.34, thickness: .03, attenuationColor: 0x2c6f96, attenuationDistance: .035, specularIntensity: .8 });
  const pot = KIT.M.ceramic(0xcdb796); pot.roughness = .85; pot.clearcoat = 0;
  const zinc = new THREE.MeshPhysicalMaterial({ color: lin(.62, .63, .65), metalness: 1, roughness: .55, roughnessMap: KIT.grunge(21) });
  const copper = KIT.M.copper({ rough: .45 });
  const terms = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group(); g.position.x = (i - .5) * .1; root.add(g);
    const jar = mesh(lathe([[0, 0], [.039, 0], [.041, .002], [.041, .118], [.0425, .12], [.0395, .12], [.0388, .003], [0, .003]], 64), glass); jar.castShadow = false; g.add(jar);
    g.add(mesh(new THREE.CylinderGeometry(.0378, .0378, .066, 48), liquid, 0, .036, 0));
    const cu = mesh(new THREE.CylinderGeometry(.034, .034, .1, 48, 1, true), copper, 0, .055, 0); cu.material.side = THREE.DoubleSide; g.add(cu);
    g.add(mesh(new THREE.CylinderGeometry(.019, .019, .1, 40), pot, 0, .056, 0));
    g.add(mesh(new THREE.CylinderGeometry(.0075, .0075, .03, 24), zinc, 0, .12, 0));
    const kz = knurl(mt, .0052, .005, 24); kz.position.set(0, .135, 0); g.add(kz);
    // 铜片引出耳 + 夹紧螺丝
    g.add(mesh(new THREE.BoxGeometry(.012, .028, .0012), copper, .03, .118, .018));
    const kc = knurl(mt, .0045, .004, 22); kc.position.set(.03, .132, .018); g.add(kc);
    terms.push({ zinc: g.position.clone().add(V(0, .14, 0)), cu: g.position.clone().add(V(.03, .136, .018)) });
  }
  // 串联铜带：左格铜极 → 右格锌极
  const a = terms[0].cu, b = terms[1].zinc;
  const bridge = new THREE.CatmullRomCurve3([a, a.clone().add(V(.01, .012, -.005)), b.clone().add(V(-.012, .01, 0)), b]);
  root.add(mesh(new THREE.TubeGeometry(bridge, 40, .0012, 8), copper));
  return { group: root, plus: terms[1].cu, minus: terms[0].zinc };
}

/** 纱包导线：pts 为世界坐标点列，返回 {mesh, curve} */
export function wire(mt, pts, r = .0016) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .4);
  const L = curve.getLength(); const geo = new THREE.TubeGeometry(curve, Math.max(40, Math.round(L * 300)), r, 10);
  const mat = mt.cloth.clone(); mat.map = mt.cloth.map.clone(); mat.map.repeat.set(L / .006, 1); mat.map.needsUpdate = true; mat.bumpMap = mat.map;
  const m = mesh(geo, mat); return { mesh: m, curve, L };
}
