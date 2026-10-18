/* 通用数学 / 缓动 / 随机 / 相机路径 / 地理坐标工具。
   约定：所有动画都必须是「章内时间 t」的纯函数，这样实时播放与逐帧导出完全一致。 */
import * as THREE from 'three';

export const D2R = Math.PI / 180;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
/** smoothstep：x 从 a 到 b 平滑地 0→1（a>b 时反向） */
export const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
/** 时间窗：a 处淡入、b 处淡出，f 为淡入淡出时长 */
export const win = (t, a, b, f = .4) => ss(a, a + f, t) * (1 - ss(b - f, b, t));
export const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = t => Math.pow(clamp(t), 3);
export const expoOut = t => { t = clamp(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };
export const expoIO = t => { t = clamp(t); return t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; };
/** 平滑的 [a,b] 区间进度 + 缓动 */
export const prog = (t, a, b, ease = easeIO) => ease(invLerp(a, b, t));

/** 确定性伪随机（mulberry32） */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/** 整数/浮点哈希 → [0,1) */
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
/** 1D 平滑值噪声 [-1,1] */
export function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
/** 分形噪声 */
export function fbm1(x, oct = 3) { let a = .5, s = 0, n = 0; for (let k = 0; k < oct; k++) { s += a * noise1(x); n += a; x *= 2.03; a *= .5; } return s / n; }

/* ---------- 相机路径 ----------
   camPath([[t, [px,py,pz], [lx,ly,lz], fov?, ease?], ...]) → t => {p, l, fov}
   关键帧之间用 Catmull-Rom 插值；ease 可选 'io'（默认，略带缓入缓出）、'lin'、'out'、'in'、'hold'。 */
function crs(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
const EASES = { io: u => u * .45 + u * u * (3 - 2 * u) * .55, lin: u => u, out: u => 1 - (1 - u) * (1 - u), in: u => u * u, hold: () => 0, smooth: u => u * u * (3 - 2 * u) };
export function camPath(keys) {
  const K = keys.map(k => ({ t: k[0], p: k[1], l: k[2], fov: k[3] ?? 40, e: EASES[k[4] || 'io'] }));
  const out = { p: V(), l: V(), fov: 40 };
  return t => {
    let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
    const k1 = K[i], k2 = K[i + 1] || k1, k0 = K[Math.max(0, i - 1)], k3 = K[Math.min(K.length - 1, i + 2)];
    const u = k2 === k1 ? 0 : k1.e(clamp((t - k1.t) / (k2.t - k1.t)));
    out.p.set(crs(k0.p[0], k1.p[0], k2.p[0], k3.p[0], u), crs(k0.p[1], k1.p[1], k2.p[1], k3.p[1], u), crs(k0.p[2], k1.p[2], k2.p[2], k3.p[2], u));
    out.l.set(crs(k0.l[0], k1.l[0], k2.l[0], k3.l[0], u), crs(k0.l[1], k1.l[1], k2.l[1], k3.l[1], u), crs(k0.l[2], k1.l[2], k2.l[2], k3.l[2], u));
    out.fov = crs(k0.fov, k1.fov, k2.fov, k3.fov, u);
    return out;
  };
}
/** 把 camPath 的结果应用到相机上，可叠加手持晃动（amp 单位：弧度） */
export function applyCam(camera, c, t = 0, shake = 0) {
  camera.position.copy(c.p); camera.lookAt(c.l);
  if (shake) { camera.rotateX(fbm1(t * .7 + 3.1) * shake); camera.rotateY(fbm1(t * .6 + 17.3) * shake); camera.rotateZ(fbm1(t * .5 + 41.9) * shake * .5); }
  if (Math.abs(camera.fov - c.fov) > 1e-4) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
}

/* ---------- 地理坐标（与 SphereGeometry 的 UV 一致，等距圆柱贴图左边缘 = 西经 180°） ---------- */
export function ll(lat, lon, r = 1, out = V()) {
  const phi = (90 - lat) * D2R, th = (lon + 180) * D2R;
  return out.set(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}
export function toLatLon(v) { const r = v.length(); const lat = 90 - Math.acos(v.y / r) / D2R; let lon = Math.atan2(v.z, -v.x) / D2R - 180; lon = ((lon + 540) % 360) - 180; return [lat, lon]; }
export function slerpV(a, b, t, out = V()) { const ang = a.angleTo(b); if (ang < 1e-7) return out.copy(a); const s = Math.sin(ang); return out.copy(a).multiplyScalar(Math.sin((1 - t) * ang) / s).add(b.clone().multiplyScalar(Math.sin(t * ang) / s)); }
/** 大圆弧：a,b = [lat,lon]；h = 弧顶抬升高度（与 r 同单位） */
export function gcArc(a, b, r = 1, h = 0, n = 128) { const A = ll(a[0], a[1], 1), B = ll(b[0], b[1], 1), pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(slerpV(A, B, t).multiplyScalar(r + h * Math.sin(Math.PI * t))); } return pts; }
/** 经纬度折线 → 贴球面的点列（每段按 maxDeg 细分） */
export function surfacePath(lls, r = 1, maxDeg = .8) {
  const out = [];
  for (let i = 0; i < lls.length - 1; i++) {
    const A = ll(lls[i][0], lls[i][1], 1), B = ll(lls[i + 1][0], lls[i + 1][1], 1), n = Math.max(1, Math.ceil(A.angleTo(B) / (maxDeg * D2R)));
    for (let k = i ? 1 : 0; k <= n; k++) out.push(slerpV(A, B, k / n).multiplyScalar(r));
  }
  return out;
}
/** 给定 UTC 时间（Date.UTC 毫秒）求太阳直射点方向（与 ll() 同坐标系），精度对影片足够 */
export function sunDirection(utcMs, out = V()) {
  const d = (utcMs - Date.UTC(2000, 0, 1, 12)) / 864e5;
  const g = (357.529 + .98560028 * d) * D2R, q = 280.459 + .98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + .020 * Math.sin(2 * g)) * D2R, e = (23.439 - .00000036 * d) * D2R;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) / D2R;
  const RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / D2R;
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24 * 15;
  let lon = RA - gmst; lon = ((lon + 540) % 360) - 180;
  return ll(dec, lon, 1, out);
}

/** 匀速沿折线取点 */
export class Path {
  constructor(pts) { this.p = pts; this.c = [0]; for (let i = 1; i < pts.length; i++) this.c.push(this.c[i - 1] + pts[i].distanceTo(pts[i - 1])); this.L = this.c[this.c.length - 1] || 1; }
  at(u, out = V()) {
    const d = clamp(u) * this.L; let lo = 0, hi = this.c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.c[m] < d) lo = m; else hi = m; }
    const seg = this.c[hi] - this.c[lo] || 1; return out.copy(this.p[lo]).lerp(this.p[hi], (d - this.c[lo]) / seg);
  }
  tangent(u, out = V()) { const a = this.at(Math.max(0, u - .002)), b = this.at(Math.min(1, u + .002)); return out.copy(b).sub(a).normalize(); }
}

export const fmtInt = n => Math.round(n).toLocaleString('en-US');
/** 中文数字格式：12345 → "12 345"（细空格分组，机能风读数常用） */
export const fmtThin = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
