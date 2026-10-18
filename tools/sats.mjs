// 用 satellite.js（SGP4）把 CelesTrak 真实轨道根数在历元 T0 推算成「圆轨道近似」的紧凑参数，供第 14 章在浏览器里解析推进。
// 输出 assets/data/celestrak/sats_T0.json：{ t0, count, groups, fields, data:[g, inc, raanFixed, u0, r, n, ...] }
//   坐标系：地固系（与 util.ll() 相同：经度 0 在 +x，北极 +y），r 单位 1000 km，n 单位 rad/s，raanFixed 已减去 T0 时刻的 GMST。
import fs from 'node:fs'; import path from 'node:path';
import * as sat from 'satellite.js';
import { ROOT } from './build.mjs';
const src = path.join(ROOT, 'assets/data/celestrak/gp_active_2026-10-18.json');
const T0 = new Date(Date.UTC(2026, 9, 18, 1, 42, 0));
const omm = JSON.parse(fs.readFileSync(src, 'utf8'));
const G = ['other', 'starlink', 'oneweb', 'kuiper', 'qianfan', 'guowang', 'gps', 'iss'];
const grp = n => { n = n.toUpperCase(); return n.startsWith('STARLINK') ? 1 : n.startsWith('ONEWEB') ? 2 : n.startsWith('KUIPER') ? 3 : /QIANFAN|QF-|G60/.test(n) ? 4 : /GUOWANG|SATNET/.test(n) ? 5 : /GPS|NAVSTAR/.test(n) ? 6 : /ISS|ZARYA/.test(n) ? 7 : 0; };
const gmst = sat.gstime(T0); const out = []; let bad = 0;
for (const o of omm) {
  try {
    const rec = sat.json2satrec(o); const pv = sat.propagate(rec, T0); if (!pv || !pv.position || !pv.velocity) { bad++; continue; }
    const r = pv.position, v = pv.velocity; // ECI TEME, km & km/s
    const R = Math.hypot(r.x, r.y, r.z); const hx = r.y * v.z - r.z * v.y, hy = r.z * v.x - r.x * v.z, hz = r.x * v.y - r.y * v.x, H = Math.hypot(hx, hy, hz);
    const inc = Math.acos(hz / H); const raan = Math.atan2(hx, -hy);
    // 升交点方向 N = (cos raan, sin raan, 0)；纬度幅角 u = atan2(r·(h×N)/H, r·N)
    const nx = Math.cos(raan), ny = Math.sin(raan); const ex = (hy * 0 - hz * ny) / H, ey = (hz * nx - hx * 0) / H, ez = (hx * ny - hy * nx) / H;
    const u0 = Math.atan2(r.x * ex + r.y * ey + r.z * ez, r.x * nx + r.y * ny);
    const n = Math.hypot(v.x, v.y, v.z) / R; // rad/s（圆轨道近似）
    if (!isFinite(inc + raan + u0 + n)) { bad++; continue; }
    out.push(grp(o.OBJECT_NAME), +inc.toFixed(5), +(raan - gmst).toFixed(5), +u0.toFixed(5), +(R / 1000).toFixed(4), +n.toExponential(5));
  } catch (e) { bad++; }
}
const dst = path.join(ROOT, 'assets/data/celestrak/sats_T0.json');
fs.writeFileSync(dst, JSON.stringify({ t0: T0.toISOString(), source: 'CelesTrak GP active (OMM) 2026-10-17 18:01 UTC, SGP4 via satellite.js', count: out.length / 6, skipped: bad, groups: G, fields: ['group', 'inc', 'raanFixed', 'u0', 'r_1000km', 'n_rad_s'], frame: 'Earth-fixed at t0, x→lon 0, y→north (matches util.ll)', data: out }));
console.log('sats', out.length / 6, 'skipped', bad, '→', dst, (fs.statSync(dst).size / 1e6).toFixed(1) + ' MB');
