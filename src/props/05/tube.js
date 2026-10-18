/* 05 · 真空三极管（6SN7GT / VT-231 一类的八脚管）——写实模型。
   单位：1 = 10 cm（管高约 0.97 = 9.7 cm）。y=0 为胶木管座底面，管子沿 +y 竖直，正面朝 +z。
   每个零件都分成「前半（z>0）/ 后半（z<0）」两份：剖面镜头把前半整体移开，露出内部。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const v2 = (x, y) => new THREE.Vector2(x, y);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI;

export const TUBE = {
  R: .142, y0: .12, yS: .80, dome: .12, th: .007,
  plate: { hw: .078, hd: .044, y0: .42, y1: .78, th: .004, rc: .018 },
  grid: { a: .034, b: .024, y0: .43, y1: .77, pitch: .0105, r: .0017 },
  cath: { r: .011, y0: .385, y1: .815 },
  mica: [.392, .806],
};

/* ---------- 轮廓 ---------- */
function glassLoop() {
  const { R, y0, yS, dome, th } = TUBE;
  const o = [v2(R - .016, y0), v2(R - .006, y0 + .025), v2(R - .001, y0 + .06), v2(R, y0 + .1), v2(R, yS)];
  const i = [v2(R - .016 - th, y0), v2(R - .006 - th, y0 + .025), v2(R - .001 - th, y0 + .06), v2(R - th, y0 + .1), v2(R - th, yS)];
  const N = 16;
  for (let k = 1; k <= N; k++) { const a = k / N * PI / 2 * .9; o.push(v2(R * Math.cos(a), yS + dome * Math.sin(a))); i.push(v2((R - th) * Math.cos(a), yS + (dome - th) * Math.sin(a))); }
  const top = yS + dome;
  o.push(v2(.015, top + .002), v2(.010, top + .015), v2(.0055, top + .024), v2(.0004, top + .026));
  i.push(v2(.0095, top - .002), v2(.0004, top + .004));
  return [...o, ...i.reverse(), o[0].clone()];
}
function getterPts() {
  const { R, yS, dome, th } = TUBE, pts = [];
  for (let k = 0; k <= 12; k++) { const a = (.3 + .58 * k / 12) * PI / 2; pts.push(v2((R - th - .0016) * Math.cos(a), yS + (dome - th - .0016) * Math.sin(a))); }
  return pts.reverse();
}
function baseLoop() {
  return [v2(0, 0), v2(.148, 0), v2(.156, .004), v2(.160, .014), v2(.160, .060), v2(.1585, .066), v2(.160, .072), v2(.160, .150), v2(.157, .162), v2(.149, .169), v2(.136, .172), v2(.128, .185), v2(0, .185)];
}
function capGeo(loop, side) { const sh = new THREE.Shape(loop.slice(0, -1).map(p => v2(p.x, p.y))); const g = new THREE.ShapeGeometry(sh); if (side < 0) g.scale(-1, 1, 1); return g; }

/* 屏极（阳极）：圆角扁盒的一半截面，沿 y 挤出。s=+1 → 后半（世界 z≤0），s=-1 → 前半 */
function plateHalf(s) {
  const { hw, hd, th, rc, y0, y1 } = TUBE.plate, pts = [];
  const arc = (cx, cy, r, a0, a1, n = 5) => { for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push(v2(cx + r * Math.cos(a), s * (cy + r * Math.sin(a)))); } };
  pts.push(v2(hw, 0)); arc(hw - rc, hd - rc, rc, 0, PI / 2); arc(-hw + rc, hd - rc, rc, PI / 2, PI); pts.push(v2(-hw, 0));
  pts.push(v2(-hw + th, 0)); arc(-hw + rc, hd - rc, rc - th, PI, PI / 2); arc(hw - rc, hd - rc, rc - th, PI / 2, 0); pts.push(v2(hw - th, 0));
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: y1 - y0, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-PI / 2); g.translate(0, y0, 0); return g;
}
/* 云母片：带锯齿边的半圆片 */
function micaHalf(s, y, lo = false) {
  const pts = [], R = .129, n = lo ? 24 : 56;
  for (let k = 0; k <= n; k++) { const a = k / n * PI, r = R + ((k % 4) < 2 ? .004 : 0); pts.push(v2(r * Math.cos(a), s * r * Math.sin(a))); }
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: .005, bevelEnabled: false });
  g.rotateX(-PI / 2); g.translate(0, y, 0); return g;
}
/* 栅极：椭圆螺旋细丝，按半圈切分 */
function gridHalf(front, lo = false) {
  const { a, b, y0, y1, r } = TUBE.grid, pitch = lo ? .02 : TUBE.grid.pitch, turns = Math.floor((y1 - y0) / pitch), geos = [], seg = lo ? 6 : 10;
  for (let n = 0; n < turns; n++) {
    const t0 = 2 * PI * n + (front ? 0 : PI), pts = [];
    for (let k = 0; k <= seg; k++) { const th = t0 + PI * k / seg; pts.push(v3(a * Math.cos(th), y0 + pitch * th / (2 * PI), b * Math.sin(th))); }
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, lo ? 3 : 4, false));
  }
  return mergeGeometries(geos);
}
export function rod(a, b, r, seg = 6) {
  const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r, r, L, seg, 1);
  g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g;
}

/* ---------- 零件表 ---------- */
export function tubeParts({ lo = false } = {}) {
  const P = [], add = (key, geo, half = 'back') => P.push({ key, geo, half });
  const seg = lo ? 18 : 40, gl = glassLoop(), go = lo ? gl.slice(0, 25) : gl;   // lo：只要外表面
  add('glass', new THREE.LatheGeometry(go, seg, -PI / 2, PI), 'front');
  add('glass', new THREE.LatheGeometry(go, seg, PI / 2, PI), 'back');
  if (!lo) { const c = mergeGeometries([capGeo(gl, 1), capGeo(gl, -1)]); add('glassCap', c, 'back'); }
  const gp = getterPts(), gs = lo ? 10 : seg;
  add('getter', new THREE.LatheGeometry(gp, gs, -PI / 2, PI), 'front');
  add('getter', new THREE.LatheGeometry(gp, gs, PI / 2, PI), 'back');
  add('base', new THREE.LatheGeometry(baseLoop(), lo ? 16 : 48), 'both');
  // 玻璃芯柱与压封
  const stem = new THREE.LatheGeometry([v2(.078, .118), v2(.074, .14), v2(.052, .185), v2(.036, .225), v2(.032, .25)], lo ? 10 : 24);
  const pinch = new THREE.BoxGeometry(.11, .05, .016); pinch.translate(0, .272, 0);
  add('stem', mergeGeometries([stem.toNonIndexed(), pinch.toNonIndexed()]), 'both');
  // 云母
  for (const y of TUBE.mica) { add('mica', micaHalf(-1, y, lo), 'front'); add('mica', micaHalf(1, y, lo), 'back'); }
  // 屏极 + 加强筋 + 卡舌
  add('plate', plateHalf(-1), 'front'); add('plate', plateHalf(1), 'back');
  const { hw, hd, y0: py0, y1: py1 } = TUBE.plate;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const rib = new THREE.BoxGeometry(.004, (py1 - py0) * .86, .007); rib.translate(sx * (hw + .002), (py0 + py1) / 2, sz * .018);
    add('plate', rib, sz > 0 ? 'front' : 'back');
    for (const ty of [py0 - .028, py1]) { const tab = new THREE.BoxGeometry(.012, .028, .003); tab.translate(sx * (hw - .03), ty + .014, sz * (hd - .002)); add('plate', tab, sz > 0 ? 'front' : 'back'); }
  }
  // 屏极支撑杆、栅极侧杆
  for (const sx of [-1, 1]) add('nickel', rod(v3(sx * (hw + .011), .30, 0), v3(sx * (hw + .011), .86, 0), .0035), 'back');
  for (const sx of [-1, 1]) { const tab = new THREE.BoxGeometry(.014, .3, .003); tab.translate(sx * (hw + .006), .6, 0); add('nickel', tab, 'back'); }
  const { a: ga, b: gb } = TUBE.grid;
  add('copper', gridHalf(true, lo), 'front'); add('copper', gridHalf(false, lo), 'back');
  add('copper', rod(v3(0, .35, gb), v3(0, .86, gb), .0026), 'front');
  add('copper', rod(v3(0, .35, -gb), v3(0, .86, -gb), .0026), 'back');
  // 阴极套管
  const { r: cr, y0: cy0, y1: cy1 } = TUBE.cath;
  const cf = new THREE.CylinderGeometry(cr, cr, cy1 - cy0, lo ? 10 : 24, 1, true, -PI / 2, PI); cf.translate(0, (cy0 + cy1) / 2, 0); add('cathode', cf, 'front');
  const cb = new THREE.CylinderGeometry(cr, cr, cy1 - cy0, lo ? 10 : 24, 1, true, PI / 2, PI); cb.translate(0, (cy0 + cy1) / 2, 0); add('cathode', cb, 'back');
  // 灯丝（发夹形）
  const hp = []; for (let k = 0; k <= 10; k++) hp.push(v3(-.0045, .30 + (.835 - .30) * k / 10, 0));
  for (let k = 1; k < 8; k++) { const a = PI - PI * k / 8; hp.push(v3(.0045 * Math.cos(a), .835 + .0045 * Math.sin(a), 0)); }
  for (let k = 0; k <= 10; k++) hp.push(v3(.0045, .835 - (.835 - .30) * k / 10, 0));
  add('heater', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp, false, 'catmullrom', .1), lo ? 30 : 80, .0017, lo ? 4 : 6, false), 'back');
  // 引线：芯柱 → 各电极
  const leads = [[-.045, v3(-(hw + .011), .30, 0)], [-.027, v3(-.0045, .30, 0)], [-.009, v3(0, .35, -gb)], [.009, v3(0, .35, gb)], [.027, v3(.0045, .30, 0)], [.045, v3(hw + .011, .30, 0)]];
  for (const [x, p] of leads) { add('nickel', rod(v3(x * .9, .14, 0), v3(x, .29, 0), .0022, 5), 'back'); add('nickel', rod(v3(x, .29, 0), p, .0022, 5), 'back'); }
  add('nickel', rod(v3(0, cy0 - .012, 0), v3(.004, cy0 + .004, .011), .0018, 5), 'back');
  // 消气剂环
  const ring = new THREE.TorusGeometry(.021, .0045, 6, lo ? 12 : 24); ring.rotateX(PI / 2); ring.translate(.035, .872, 0); add('nickel', ring, 'back');
  add('nickel', rod(v3(hw + .011, .86, 0), v3(.056, .872, 0), .0018, 5), 'back');
  return P;
}

/* ---------- 材质 ---------- */
export function tubeMats(KIT, { transmission = true } = {}) {
  const glass = transmission ? KIT.M.glass({ thickness: .02, ior: 1.5, tint: 0xeef8f0, attDist: 2.5, rough: .025 })
    : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .25, depthWrite: false });
  return {
    glass,
    glassCap: KIT.M.glass({ thickness: .02, ior: 1.5, tint: 0xd8efe0, attDist: .4, rough: .05, extra: { side: THREE.DoubleSide } }),
    getter: new THREE.MeshPhysicalMaterial({ color: 0xb8b2a8, metalness: 1, roughness: .14, side: THREE.DoubleSide }),
    base: KIT.M.plastic(0x16110d, { rough: .4, extra: { clearcoat: .35, clearcoatRoughness: .4 } }),
    stem: new THREE.MeshPhysicalMaterial({ color: 0x8fa597, roughness: .06, transparent: true, opacity: .2, metalness: 0, depthWrite: false, specularIntensity: .8 }),
    nickel: KIT.M.steel({ rough: .28 }),
    mica: new THREE.MeshPhysicalMaterial({ color: 0xd8d0ba, roughness: .36, metalness: .05, transparent: true, opacity: .85, iridescence: .45, iridescenceIOR: 1.6, sheen: .4, side: THREE.DoubleSide }),
    plate: new THREE.MeshPhysicalMaterial({ color: 0x55565a, metalness: .6, roughness: .42, roughnessMap: KIT.grunge(21), side: THREE.DoubleSide }),
    copper: KIT.M.copper({ rough: .28 }),
    cathode: new THREE.MeshStandardMaterial({ color: 0xc2bcb0, roughness: .92, emissive: 0xff4a12, emissiveIntensity: 0, side: THREE.DoubleSide }),
    heater: new THREE.MeshBasicMaterial({ color: 0x000000 }),
  };
}

/** 管身印字（白色丝印，前半玻璃外侧的一小片曲面） */
export function tubeLabel(KIT) {
  const tex = KIT.canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(240,238,230,.85)'; g.textAlign = 'center';
    g.font = '700 74px "Barlow Condensed", "Arial Narrow", sans-serif'; g.fillText('6SN7GT', w / 2, 112);
    g.font = '500 30px "JetBrains Mono", monospace'; g.fillText('VT-231 · U.S.A.', w / 2, 166);
    g.fillRect(w * .3, 186, w * .4, 3);
  });
  const g = new THREE.CylinderGeometry(TUBE.R + .0008, TUBE.R + .0008, .12, 24, 1, true, -.55, 1.1); g.translate(0, .6, 0);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .5, depthWrite: false }));
}

/** 完整的单只管子（工作室特写用）：返回 { group, front, back, caps, mats, setHeat(h), setCut(u) } */
export function makeTube(KIT, { label = true } = {}) {
  const mats = tubeMats(KIT), group = new THREE.Group(), front = new THREE.Group(), back = new THREE.Group(), both = new THREE.Group();
  group.add(front, back, both); const caps = [];
  for (const p of tubeParts()) {
    const m = new THREE.Mesh(p.geo, mats[p.key]); m.castShadow = !['glass', 'glassCap', 'stem', 'heater'].includes(p.key); m.receiveShadow = true;
    if (p.key === 'glassCap') { caps.push(m); m.visible = false; }
    (p.half === 'front' ? front : p.half === 'back' ? back : both).add(m);
  }
  if (label) front.add(tubeLabel(KIT));
  const glow = new THREE.PointLight(0xff7a30, 0, 0, 2); glow.position.set(0, .6, 0); back.add(glow);
  return {
    group, front, back, mats, glow,
    setHeat(h) { mats.heater.color.setRGB(3.4 * h, 1.05 * h * h, .22 * h * h * h); mats.cathode.emissiveIntensity = .38 * h * h; glow.intensity = .12 * h; },
    setCut(u) { front.visible = u < .999; front.position.set(0, 1.6 * u * u, .5 * u); front.rotation.set(-.25 * u, 0, .08 * u); caps.forEach(c => c.visible = u > .001); },
  };
}

/** 合并后的几何（按材质分组），房间里成排的管子用 InstancedMesh 实例化；scale：10 cm 单位 → 米 */
export function mergedTube(scale = .088) {
  const by = {};
  for (const p of tubeParts({ lo: true })) { if (p.key === 'glassCap') continue; (by[p.key] ||= []).push(p.geo.index ? p.geo.toNonIndexed() : p.geo); }
  const out = {}; for (const k in by) { const g = mergeGeometries(by[k]); g.scale(scale, scale, scale); g.computeBoundingSphere(); out[k] = g; }
  return out;
}
