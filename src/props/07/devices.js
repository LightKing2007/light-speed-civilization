/* 07 · 晶体管：写实道具。
   buildBench：暗棚工作台上的真空管（借用 05 章的 6SN7 模型）与第一只点接触晶体管复原（单位：米）。
     晶体管：铜底座 + 锗片 + 透明聚苯乙烯三角楔（两条斜边包金箔，尖端切开成两个相距约 0.05 mm 的触点）+ 磷青铜弹簧压紧 + 引线。
   buildMosfet：MOSFET 剖面模型（单位为示意比例）：p 型硅衬底、n+ 源 / 漏区、极薄栅氧、金属栅极、电极；电子粒子由调用方驱动。 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';
import { makeTube } from '../05/tube.js';

const mesh = (geo, mat, { cast = true, recv = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
const tube = (pts, r, mat, seg = 64) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 10, false), mat);

export function buildBench(KIT) {
  const scene = new THREE.Scene();
  KIT.studio(scene, { bg: 0x08090a, key: 9, fill: .6, rim: 7, keyPos: [-.35, .55, .45], rimPos: [.4, .3, -.45], fillPos: [.5, .2, .4], target: [0, .02, 0], floorY: 0, size: 6, env: .3, shadowRadius: 4 });
  const bench = mesh(KIT.rbox(.5, .012, .3, .004), KIT.M.plastic(0x15130f, { rough: .55 })); bench.position.y = .006; scene.add(bench);
  const Y0 = .012;
  // 真空管（05 章模型，1 单位 = 10 cm → 0.1）
  const T = makeTube(KIT); T.group.scale.setScalar(.1); T.group.position.set(-.085, Y0, -.01); scene.add(T.group);
  // ---- 点接触晶体管 ----
  const g = new THREE.Group(); g.position.set(.05, Y0, .01); scene.add(g);
  const copper = KIT.M.copper({ rough: .38 }), brass = KIT.M.brass({ rough: .3 }), gold = KIT.M.gold({ rough: .2 });
  const bronze = KIT.M.oldBrass({ rough: .32 });
  const seat = mesh(KIT.rbox(.034, .005, .026, .0015), KIT.M.plastic(0x1d1a16, { rough: .45 })); seat.position.set(0, .0025, 0); g.add(seat);   // 胶木座
  const base = mesh(KIT.rbox(.016, .004, .014, .0008), copper); base.position.set(0, .007, 0); g.add(base);                                              // 铜底座 = 基极
  const ge = mesh(KIT.rbox(.009, .0022, .009, .0004), new THREE.MeshPhysicalMaterial({ color: 0x6d7074, metalness: .55, roughness: .28, clearcoat: .3 })); ge.position.set(0, .0101, 0); g.add(ge);   // 锗片
  const GE_TOP = .0112;
  // 三角楔：尖端朝下压在锗片上
  const W = .011, Hh = .013, D = .0032;
  const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(W / 2, Hh); tri.lineTo(-W / 2, Hh); tri.closePath();
  const wg = new THREE.ExtrudeGeometry(tri, { depth: D, bevelEnabled: true, bevelThickness: .0002, bevelSize: .0002, bevelSegments: 2 }); wg.translate(0, 0, -D / 2);
  const wedge = mesh(wg, KIT.M.glass({ thickness: .003, tint: 0xfff4dc, rough: .12, attDist: .02 })); wedge.position.y = GE_TOP + .00005; g.add(wedge);
  // 金箔：沿两条斜边贴在楔的正面与侧边，尖端处留一道缝（两个触点）
  const gap = .00028, ang = Math.atan2(Hh, W / 2), Lf = Math.hypot(W / 2, Hh) - .0004;
  for (const s of [-1, 1]) {
    const f = mesh(new THREE.BoxGeometry(Lf, .00005, D + .0006), gold, { cast: false }); f.rotation.z = s * ang; const mx = s * (W / 4 + gap / 2) * .98, my = GE_TOP + Hh / 2 + .0002;
    f.position.set(mx + s * .00025, my, 0); f.rotation.z = s > 0 ? ang : -ang; g.add(f);
    // 正面的金箔窄带（看得见的「两片」）
    const band = mesh(new THREE.BoxGeometry(.0016, Lf, .00005), gold, { cast: false }); band.position.set(s * (W / 4 + .0006), GE_TOP + Hh / 2 + .0002, D / 2 + .00025); band.rotation.z = s > 0 ? -(Math.PI / 2 - ang) : (Math.PI / 2 - ang); g.add(band);
  }
  // 引线：从金箔上端引到两侧接线柱
  for (const s of [-1, 1]) {
    const post = mesh(new THREE.CylinderGeometry(.0012, .0012, .012, 16), brass); post.position.set(s * .014, .011, .008); g.add(post);
    g.add(tube([V(s * (W / 2 - .0008), GE_TOP + Hh - .0004, D / 2 + .0003), V(s * .0085, GE_TOP + Hh + .002, .004), V(s * .014, .017, .008)], .00018, copper));
  }
  // 弹簧：磷青铜条从后方立柱弯过来压住楔的顶边
  const sp = mesh(new THREE.CylinderGeometry(.0011, .0011, .03, 16), brass); sp.position.set(-.011, .017, -.009); g.add(sp);
  g.add(tube([V(-.011, .031, -.009), V(-.006, .034, -.006), V(-.001, .031, -.002), V(.0005, GE_TOP + Hh + .0012, 0), V(.003, GE_TOP + Hh + .0008, .001)], .0005, bronze, 80));
  return {
    scene, tube: T, transistor: g,
    anchors: { tip: V(.05, Y0 + GE_TOP + .0004, .01 + D / 2), ge: V(.05 + .004, Y0 + .0105, .01 + .0045), spring: V(.05 - .006, Y0 + .034, .01 - .006), foil: V(.05 + .003, Y0 + GE_TOP + .007, .01 + D / 2), tubeTop: V(-.085, Y0 + .097, -.01), tubeBase: V(-.085, Y0, -.01), center: V(.05, Y0 + .012, .01) },
  };
}

/* ---------------- MOSFET 剖面（示意比例；x 向右 = 源 → 漏，y 向上，z 朝镜头为剖切面） ---------------- */
export const MS = { W: 3.4, DEP: 1.6, HS: 1.0, wellX: [.6, 1.55], wellD: .36, ox: .045, gateH: .28, gateX: .58, front: .8 };
function latticeTex(KIT) {
  return KIT.canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#2a2d33'; g.fillRect(0, 0, w, w);
    const n = 16, s = w / n;
    g.strokeStyle = 'rgba(160,170,185,.16)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, w); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = 'rgba(190,198,210,.42)'; g.beginPath(); g.arc(i * s + s / 2, j * s + s / 2, 4.5, 0, 7); g.fill(); }
  }, { aniso: 16 });
}
export function buildMosfet(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x08090b, key: 150, fill: 10, rim: 90, keyPos: [-4, 6, 6], rimPos: [5, 4, -5], fillPos: [6, 2, 6], target: [0, -.2, 0], floorY: -1.2, env: .3, shadowRadius: 5 });
  const root = new THREE.Group(); scene.add(root);
  const { W, DEP, HS, wellX, wellD, ox, gateH, gateX, front } = MS;
  const lt = latticeTex(KIT); lt.wrapS = lt.wrapT = THREE.RepeatWrapping; lt.repeat.set(4, 1.2);
  const subMat = new THREE.MeshStandardMaterial({ color: 0x8a909a, map: lt, roughness: .55, metalness: .25 });
  const sub = mesh(new THREE.BoxGeometry(W, HS, DEP), subMat); sub.position.y = -HS / 2; root.add(sub);
  // n+ 区：剖切面上的扩散区（底部圆角的「碗」形）+ 顶面一层淡色，不做成凸出的体块
  const wellMat = new THREE.MeshStandardMaterial({ color: 0x4f86d6, roughness: .5, metalness: 0, transparent: true, opacity: .78, emissive: 0x1a3d70, emissiveIntensity: .4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const wells = [];
  for (const s of [-1, 1]) {
    const x0 = wellX[0], x1 = wellX[1], r = .16, sh = new THREE.Shape();
    sh.moveTo(x0, 0); sh.lineTo(x0, -wellD + r); sh.quadraticCurveTo(x0, -wellD, x0 + r, -wellD); sh.lineTo(x1, -wellD); sh.lineTo(x1, 0); sh.closePath();
    const wf = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), wellMat); wf.scale.x = s; wf.position.z = front + .002; root.add(wf); wells.push(wf);
    const wt = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, DEP), wellMat); wt.rotation.x = -Math.PI / 2; wt.position.set(s * (x0 + x1) / 2, .0015, 0); root.add(wt);
    // 金属电极：焊盘 + 立柱
    const pad = mesh(KIT.rbox(.62, .06, DEP * .7, .02), KIT.M.aluminium({ rough: .3 })); pad.position.set(s * (wellX[0] + wellX[1]) / 2, .03, -.05); root.add(pad);
    const pil = mesh(new THREE.CylinderGeometry(.09, .09, .6, 32), KIT.M.aluminium({ rough: .3 })); pil.position.set(s * (wellX[0] + wellX[1]) / 2, .36, -.2); root.add(pil);
  }
  const oxide = mesh(new THREE.BoxGeometry(2 * gateX + .08, ox, DEP), KIT.M.glass({ thickness: .05, tint: 0xd8f0ff, rough: .08 })); oxide.position.y = ox / 2 + .001; root.add(oxide);
  const gate = mesh(KIT.rbox(2 * gateX, gateH, DEP, .02), KIT.M.aluminium({ rough: .35 })); gate.position.y = ox + gateH / 2 + .002; root.add(gate);
  const gpil = mesh(new THREE.CylinderGeometry(.09, .09, .55, 32), KIT.M.aluminium({ rough: .3 })); gpil.position.set(0, ox + gateH + .27, -.2); root.add(gpil);
  // 沟道辉光（极淡，紧贴氧化层下方）
  const chMat = new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const channel = new THREE.Mesh(new THREE.PlaneGeometry(2 * wellX[0] + .04, .06), chMat); channel.position.set(0, -.032, front + .004); root.add(channel);
  // 电子
  const N = 700, pos = new Float32Array(N * 3), alpha = new Float32Array(N);
  const electrons = KIT.points(pos, { size: 4.2, color: 0x9fe3ff, intensity: 1.15, alphas: alpha, soft: .55 }); root.add(electrons);
  const R = rng(17), E = [];
  for (let i = 0; i < N; i++) {
    const s = i % 2 ? 1 : -1, hx = s * (wellX[0] + .03 + R() * (wellX[1] - wellX[0] - .06)), hy = -.025 - R() * (wellD - .09), hz = front + .006 + R() * .03;
    E.push({ s, hx, hy, hz, ph: R() * 100, rec: R(), cx: R(), cz: front + .006 + R() * .03, cy: -.01 - R() * .045 });
  }
  // 缩小时代表晶体管的一个亮点
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.009, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .95, .85).multiplyScalar(1.6), transparent: true, opacity: 0 })); dot.position.set(0, -.03, .2); scene.add(dot);
  return { scene, root, electrons, pos, alpha, N, E, channel, wells, gate, dot, studio: st };
}
