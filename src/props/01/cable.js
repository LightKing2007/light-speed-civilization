/* 01 · 1866 年大西洋电缆（阶梯剖切模型）。单位：厘米（1 = 1 cm），电缆轴沿 +x，剖切端在 +x。
   结构（由内到外）：7 股铜线绞合 · 4 层古塔胶（层间夹黑色查特顿胶）· 黄麻衬垫 · 10 根镀锌铁丝（各裹白色马尼拉麻纱）· 外径 ≈ 2.9 cm。
   所有「长出 / 缠绕」动画都通过 set(p) 驱动，p 为 0..1 的各层进度，章节里按 t 计算（纯函数）。 */
import * as THREE from 'three';
import { V, clamp, rng } from '../../engine/util.js';

const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
export const CABLE = { R: 1.45, armR: 1.103, yarnR: .347, ironR: .12, juteR: .756, gp: [[.186, .30], [.315, .405], [.42, .495], [.51, .585]], cuR: .062 };

/** 绕 x 轴的螺旋曲线 */
class Helix extends THREE.Curve {
  constructor(r, x0, x1, lay, phase) { super(); Object.assign(this, { r, x0, x1, lay, phase }); }
  getPoint(u, out = new THREE.Vector3()) { const x = this.x0 + (this.x1 - this.x0) * u, a = this.phase + x / this.lay * Math.PI * 2; return out.set(x, Math.cos(a) * this.r, Math.sin(a) * this.r); }
}

/** 麻纱/黄麻纤维贴图：n 股斜向缠绕的股线 + 纤维细纹（可无缝平铺） */
function fiberTex(KIT, { n = 5, base = [222, 210, 182], dark = .55, seed = 3, size = 256 } = {}) {
  const r = rng(seed); const streak = new Float32Array(size); for (let i = 0; i < size; i++) streak[i] = r();
  return KIT.canvasTex(size, size, (g, w, h) => {
    const im = g.createImageData(w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ph = (y / h * n + x / w) % 1;                         // 股线相位
      const prof = Math.sin(ph * Math.PI);                        // 股线圆截面的亮度
      const along = (x / w * 0.5 - y / h * n * .1);
      const fib = streak[Math.floor(((ph * 37 + along * 3) % 1) * size) % size] * .35 + streak[(x * 7 + y * 3) % size] * .15;
      const k = Math.pow(prof, .6) * (1 - dark) + dark * prof * prof + fib * .5 - .12;
      const i = (y * w + x) * 4;
      d[i] = clamp(base[0] * k, 0, 255); d[i + 1] = clamp(base[1] * k, 0, 255); d[i + 2] = clamp(base[2] * k, 0, 255); d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  });
}

export function buildCable(KIT, { len = 220, innerLen = 26 } = {}) {
  const C = CABLE, root = new THREE.Group();
  const X0 = -len, XI = -innerLen;
  // ---- 材质 ----
  const copper = KIT.M.copper({ rough: .24 });
  const copperCut = new THREE.MeshPhysicalMaterial({ color: lin(.98, .7, .55), metalness: 1, roughness: .32 });
  const gpMat = [0x4a2414, 0x55291a, 0x4d2616, 0x5a2c1b].map((c, i) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .42 + i * .03, clearcoat: .35, clearcoatRoughness: .4, sheen: .3, sheenColor: new THREE.Color(0x8a4a2a), roughnessMap: KIT.grunge(30 + i, { contrast: .6 }) }));
  const gpCut = new THREE.MeshPhysicalMaterial({ color: 0x6b3620, roughness: .62, sheen: .4, sheenColor: new THREE.Color(0xa86a44) });
  const compound = new THREE.MeshStandardMaterial({ color: 0x0b0806, roughness: .5 });
  const juteT = fiberTex(KIT, { n: 16, base: [128, 94, 58], dark: .22, seed: 7 }); juteT.wrapS = juteT.wrapT = THREE.RepeatWrapping;
  const jute = new THREE.MeshStandardMaterial({ map: juteT, bumpMap: juteT, bumpScale: 2, roughness: .95 });
  const juteCut = new THREE.MeshStandardMaterial({ color: 0x6e5034, roughness: 1 });
  const yarnT = fiberTex(KIT, { n: 5, base: [226, 214, 186], dark: .5, seed: 11 }); yarnT.wrapS = yarnT.wrapT = THREE.RepeatWrapping;
  const yarn = new THREE.MeshStandardMaterial({ map: yarnT, bumpMap: yarnT, bumpScale: 3, roughness: .92 });
  const yarnCut = new THREE.MeshStandardMaterial({ color: 0xbdb196, roughness: 1 });
  const iron = new THREE.MeshPhysicalMaterial({ color: lin(.6, .61, .62), metalness: 1, roughness: .42, roughnessMap: KIT.grunge(41) });
  const ironCut = new THREE.MeshPhysicalMaterial({ color: lin(.75, .76, .77), metalness: 1, roughness: .22 });
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- 7 股铜线（中心直线 + 6 根螺旋），末端 x = 4.0 ----
  const CU_END = 4.0, cu = new THREE.Group(); root.add(cu);
  { const g = new THREE.CylinderGeometry(C.cuR, C.cuR, CU_END - XI, 16); g.rotateZ(Math.PI / 2); const m = sh(new THREE.Mesh(g, copper)); m.position.x = (CU_END + XI) / 2; cu.add(m); }
  for (let k = 0; k < 6; k++) {
    const hx = new Helix(C.cuR * 2.02, XI, CU_END, 3.2, k / 6 * Math.PI * 2);
    cu.add(sh(new THREE.Mesh(new THREE.TubeGeometry(hx, 360, C.cuR, 10), copper)));
    const end = hx.getPoint(1), tan = hx.getTangent(1);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(C.cuR, 16), copperCut); cap.position.copy(end); cap.lookAt(end.clone().add(tan)); cu.add(cap);
  }
  { const cap = new THREE.Mesh(new THREE.CircleGeometry(C.cuR, 16), copperCut); cap.position.x = CU_END; cap.rotation.y = Math.PI / 2; cu.add(cap); }

  /** 一层管状外皮：侧面（单位长度，沿 +x 缩放）+ 端面环 + 内层黑胶细环。返回 {set(head)} */
  function layer(rIn, rOut, x0, mat, capMat, { uvRepeat = null, compoundRing = true } = {}) {
    const g = new THREE.Group(); root.add(g);
    const side = new THREE.CylinderGeometry(rOut, rOut, 1, 96, 1, true); side.rotateZ(-Math.PI / 2); side.translate(.5, 0, 0);
    const sm = sh(new THREE.Mesh(side, mat)); g.add(sm);
    const cap = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut - .012, 96, 1), capMat); cap.rotation.y = Math.PI / 2; cap.receiveShadow = true; g.add(cap);
    const bev = new THREE.Mesh(new THREE.TorusGeometry(rOut - .012, .012, 6, 96), mat); bev.rotation.y = Math.PI / 2; g.add(bev);
    let ring = null; if (compoundRing) { ring = new THREE.Mesh(new THREE.RingGeometry(rIn - .016, rIn, 96, 1), compound); ring.rotation.y = Math.PI / 2; g.add(ring); }
    return {
      group: g,
      set(head) {
        const L = Math.max(1e-3, head - x0); g.visible = head > x0 + .01;
        sm.scale.x = L; sm.position.x = x0; cap.position.x = head; bev.position.x = head - .012; if (ring) ring.position.x = head + .002;
        if (uvRepeat && mat.map) mat.map.repeat.set(uvRepeat[0], L / uvRepeat[1]);
      },
    };
  }
  // ---- 4 层古塔胶（外层先被剥短，形成台阶） ----
  const GP_END = [2.8, 2.4, 2.0, 1.6];
  const gps = C.gp.map((r, i) => layer(r[0], r[1], XI, gpMat[i], gpCut));
  // ---- 黄麻衬垫 ----
  const JUTE_END = .9;
  const juteL = layer(C.gp[3][1] + .002, C.juteR, X0, jute, juteCut, { compoundRing: false, uvRepeat: [2, 2.4] });
  // ---- 10 根铠装铁丝（各裹麻纱），麻纱止于 x = 0，铁丝再伸出 0.35 ----
  const LAY = 14, ARM = [];
  for (let k = 0; k < 10; k++) {
    const ph = k / 10 * Math.PI * 2;
    const hy = new Helix(C.armR, X0, 0, LAY, ph), hi = new Helix(C.armR, X0, .38, LAY, ph);
    const segY = Math.round(len / LAY * 64), segI = Math.round((len + .38) / LAY * 64);
    const gy = new THREE.TubeGeometry(hy, segY, C.yarnR, 20), gi = new THREE.TubeGeometry(hi, segI, C.ironR, 10);
    const ym = yarn.clone(); ym.map = yarnT.clone(); ym.bumpMap = ym.map; ym.map.repeat.set((len / Math.cos(Math.atan(2 * Math.PI * C.armR / LAY))) / .46, 1); ym.map.offset.set(k * .37, 0); ym.map.needsUpdate = true;
    const my = sh(new THREE.Mesh(gy, ym)), mi = sh(new THREE.Mesh(gi, iron));
    root.add(my, mi);
    const ey = hy.getPoint(1), ty = hy.getTangent(1), ei = hi.getPoint(1), ti = hi.getTangent(1);
    const yc = new THREE.Mesh(new THREE.RingGeometry(C.ironR, C.yarnR, 24, 1), yarnCut); yc.position.copy(ey); yc.lookAt(ey.clone().add(ty)); root.add(yc);
    const ic = new THREE.Mesh(new THREE.CircleGeometry(C.ironR, 16), ironCut); ic.position.copy(ei); ic.lookAt(ei.clone().add(ti)); root.add(ic);
    ARM.push({ gy, gi, segY, segI, yc, ic });
  }
  const juteSet = juteL.set;
  return {
    group: root, CU_END, GP_END, JUTE_END,
    /** p = {gp:[0..1]×4, jute, arm}：各层从左向右「长出」到剖切端；arm 为铠装缠绕进度（从 xFrom 推进到 0） */
    set({ gp = [1, 1, 1, 1], jute: pj = 1, arm = 1, xFrom = -14 } = {}) {
      const head = (p, end, start) => p <= 0 ? start : xFrom + (end - xFrom) * clamp(p);
      gps.forEach((L, i) => L.set(head(gp[i], GP_END[i], XI)));
      juteSet(head(pj, JUTE_END, X0));
      for (const a of ARM) {
        const hd = arm <= 0 ? X0 - 1 : xFrom + (0.38 - xFrom) * clamp(arm);
        const uy = clamp((hd - X0) / (0 - X0)), ui = clamp((hd - X0) / (.38 - X0));
        a.gy.setDrawRange(0, Math.floor(uy * a.segY) * 20 * 6); a.gi.setDrawRange(0, Math.floor(ui * a.segI) * 10 * 6);
        a.yc.visible = uy >= 1; a.ic.visible = ui >= 1;
      }
    },
  };
}

/* ---------- RC 分布参数线（无感长线 / 汤姆森扩散方程）的解析解 ---------- */
export function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + .3275911 * z);
  const y = t * (.254829592 + t * (-.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
  return x >= 0 ? y : 2 - y;
}
/** 宽度 w 的方波脉冲在相对位置 f（0 = 发送端，1 = 接收端）处的电压：v = erfc(f/2√(τ/T0)) − erfc(f/2√((τ−w)/T0)) */
export function rcPulse(f, tau, T0, w) {
  if (tau <= 0) return 0;
  if (f <= 1e-6) return tau < w ? 1 : 0;
  const a = erfc(f / (2 * Math.sqrt(tau / T0))), b = tau > w ? erfc(f / (2 * Math.sqrt((tau - w) / T0))) : 0;
  return a - b;
}
/** 有限长 RC 线、接收端经检流计接地时，接收电流对单位冲激的响应（本征级数，∫h dt = 1） */
export function rcGround(t, T0, N = 60) {
  if (t < .025 * T0) return 0;   // 早期值指数级地小（∝ e^(−T0/4t)），而级数在此处不收敛
  let s = 0;
  for (let n = 1; n <= N; n++) { const e = Math.exp(-n * n * Math.PI * Math.PI * t / T0); if (e < 1e-9) break; s += (n & 1 ? 1 : -1) * n * n * e; }
  return s * 2 * Math.PI * Math.PI / T0;
}
