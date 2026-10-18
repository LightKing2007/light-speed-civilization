/* 02 · 共享道具工具：车削件、滚花、胶木、丝包线、火花、电磁波前。单位：米。 */
import * as THREE from 'three';
import { V, ss, rng, clamp } from '../../engine/util.js';

/** KIT.pathLine 的包装：set() 额外支持 opacity → uOp、intensity → uK（引擎的 set 只认 u+首字母大写的名字） */
export function PL(KIT, pts, o = {}) {
  const m = KIT.pathLine(pts, o), U = m.material.uniforms, base = m.set;
  m.set = (k) => { const r = { ...k }; if ('opacity' in r) { U.uOp.value = r.opacity; delete r.opacity; } if ('intensity' in r) { U.uK.value = r.intensity; delete r.intensity; } return base(r); };
  return m;
}

export const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

/** 车削件：profile = [[r, y], ...]（自下而上） */
export function lathe(profile, seg = 48) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg);
  g.computeVertexNormals(); return g;
}
export function mesh(geo, mat, { cast = true, recv = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }

let _knurl = null;
/** 滚花凹凸贴图（竖纹） */
export function knurlTex(KIT) {
  if (_knurl) return _knurl;
  _knurl = KIT.canvasTex(256, 32, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 64; i++) { const x = i * w / 64; const gr = g.createLinearGradient(x, 0, x + w / 64, 0); gr.addColorStop(0, '#303030'); gr.addColorStop(.5, '#d0d0d0'); gr.addColorStop(1, '#303030'); g.fillStyle = gr; g.fillRect(x, 0, w / 64, h); } }, { srgb: false });
  _knurl.wrapS = _knurl.wrapT = THREE.RepeatWrapping; return _knurl;
}
/** 车床纹（同心细纹，给黄铜/锌件） */
export function latheLinesTex(KIT, n = 180) {
  const t = KIT.canvasTex(16, 512, (g, w, h) => { const r = rng(11); for (let y = 0; y < h; y++) { const v = 118 + (r() - .5) * 60; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 1); } }, { srgb: false });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, n / 512 * 4); return t;
}

/** 材质库（在 KIT 预设基础上做 19 世纪实验室的变体） */
export function makeMats(KIT) {
  const kn = knurlTex(KIT);
  const brass = KIT.M.brass({ rough: .24 });
  const brassPol = KIT.M.brass({ rough: .12, seed: 21 });
  const brassKnurl = KIT.M.brass({ rough: .3, extra: { bumpMap: kn, bumpScale: 1.5 } });
  const oldBrass = KIT.M.oldBrass({ rough: .38 });
  const copper = KIT.M.copper({ rough: .26 });
  const copperDark = KIT.M.copper({ rough: .42, extra: { color: lin(.62, .36, .25) } });
  const steel = KIT.M.steel({ rough: .3 });
  const iron = KIT.M.iron({ rough: .5 });
  const zinc = KIT.M.steel({ rough: .36, seed: 31, extra: { color: lin(.66, .68, .7) } });
  const ebonite = new THREE.MeshPhysicalMaterial({ color: 0x0c0b0a, roughness: .3, clearcoat: .55, clearcoatRoughness: .25, roughnessMap: KIT.grunge(41, { contrast: .5 }) });
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x0a0807, roughness: .32, clearcoat: .9, clearcoatRoughness: .18, roughnessMap: KIT.grunge(43) });
  const glass = KIT.M.glass({ thickness: .004, ior: 1.5, tint: 0xeef4ea, attDist: .4 });
  const silk = (color = 0x2a3a22) => new THREE.MeshPhysicalMaterial({ color, roughness: .78, sheen: 1, sheenColor: new THREE.Color(color).multiplyScalar(1.8), sheenRoughness: .5, bumpMap: braidTex(KIT), bumpScale: 1.2 });
  return { brass, brassPol, brassKnurl, oldBrass, copper, copperDark, steel, iron, zinc, ebonite, lacquer, glass, silk };
}
let _braid = null;
export function braidTex(KIT) {
  if (_braid) return _braid;
  _braid = KIT.canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); g.lineWidth = 5; for (let i = -4; i < 8; i++) { g.strokeStyle = '#c8c8c8'; g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 32, h); g.stroke(); g.strokeStyle = '#3a3a3a'; g.beginPath(); g.moveTo(i * 16 + 6, 0); g.lineTo(i * 16 + 38, h); g.stroke(); } }, { srgb: false });
  _braid.wrapS = _braid.wrapT = THREE.RepeatWrapping; return _braid;
}

/** 管线（沿控制点的平滑导线）；返回 {mesh, curve} */
export function wire(points, mat, r = .0016, segs = null, radial = 10) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const L = curve.getLength(); const geo = new THREE.TubeGeometry(curve, segs || Math.max(16, Math.ceil(L / .006)), r, radial, false);
  if (mat.bumpMap) { const k = L / (r * 7); geo.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = v * k; }); }
  const m = mesh(geo, mat); return { mesh: m, curve };
}
/** 下垂导线：两端点之间的悬链近似 */
export function sag(a, b, drop = .05, n = 8) { const pts = []; for (let i = 0; i <= n; i++) { const u = i / n; const p = a.clone().lerp(b, u); p.y -= drop * 4 * u * (1 - u); pts.push(p); } return pts; }

/** 接线柱：底座垫圈 + 柱身 + 滚花螺帽 */
export function bindingPost(M, h = .028, r = .006) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [r * 1.6, 0], [r * 1.6, .002], [r * 1.1, .003], [r * .8, .004], [r * .8, h * .55], [0, h * .55]]), M.brass));
  const nut = mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, h * .4, 32), M.brassKnurl); nut.position.y = h * .55 + h * .2; g.add(nut);
  const cap = mesh(lathe([[0, 0], [r * 1.25, 0], [r * 1.15, .0015], [r * .6, .003], [0, .0034]]), M.brassPol); cap.position.y = h * .95; g.add(cap);
  return g;
}
/** 一字螺钉头（嵌在表面） */
export function screwHead(M, r = .0035) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [r, 0], [r * .95, r * .3], [r * .6, r * .5], [0, r * .55]], 24), M.oldBrass));
  const slot = mesh(new THREE.BoxGeometry(r * 2.1, r * .5, r * .28), new THREE.MeshStandardMaterial({ color: 0x050403, roughness: .9 })); slot.position.y = r * .45; g.add(slot);
  return g;
}

/* ================= 火花：极细 HDR 核心 + 很小的外晕（交给辉光） ================= */
export function sparkSet(KIT, a, b, { variants = 6, seed = 1, core = 0xe8ecff, halo = 0x9fb0ff, coreK = 9, haloK = 1.4, width = 1.7, haloW = 4.5, jag = .2, n = 14 } = {}) {
  const grp = new THREE.Group(), list = [];
  const d = b.clone().sub(a), L = d.length(); const t = d.clone().normalize();
  const u1 = Math.abs(t.y) < .9 ? V(0, 1, 0).cross(t).normalize() : V(1, 0, 0).cross(t).normalize(), u2 = t.clone().cross(u1).normalize();
  for (let v = 0; v < variants; v++) {
    const r = rng(seed * 97 + v * 13), pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, env = Math.sin(Math.PI * u); const p = a.clone().addScaledVector(d, u); p.addScaledVector(u1, (r() - .5) * 2 * jag * L * env).addScaledVector(u2, (r() - .5) * 2 * jag * L * env); pts.push(p); }
    const c = PL(KIT, pts, { width, color: core, intensity: coreK, opacity: 1, renderOrder: 6 });
    const h = PL(KIT, pts, { width: haloW, color: halo, intensity: haloK, opacity: .4, renderOrder: 5 });
    c.visible = h.visible = false; grp.add(h, c); list.push({ c, h });
  }
  return {
    group: grp,
    /** k: 0..1 亮度；idx: 变体序号 */
    set(k, idx = 0) { list.forEach((s, i) => { const on = k > .01 && i === idx % list.length; s.c.visible = s.h.visible = on; if (on) { s.c.set({ intensity: coreK * k, opacity: Math.min(1, k * 1.5) }); s.h.set({ intensity: haloK * k, opacity: .4 * Math.min(1, k * 1.4) }); } }); },
  };
}
/** 火花时间表：从 t0 到 t1，间隔 base±jit；返回 [ts...] */
export function sparkTimes(t0, t1, base = .16, jit = .07, seed = 3) { const r = rng(seed), out = []; let t = t0; while (t < t1) { out.push(t); t += base + (r() - .5) * 2 * jit; } return out; }
/** 在时间表上求 t 时刻的火花亮度与序号 */
export function sparkAt(times, t, dur = .05) {
  let lo = 0, hi = times.length - 1; if (hi < 0 || t < times[0]) return { k: 0, i: -1 };
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= t) lo = m; else hi = m; }
  const i = times[hi] <= t ? hi : lo; const dt = t - times[i];
  if (dt < 0 || dt > dur) return { k: 0, i };
  return { k: (1 - ss(dur * .35, dur, dt)) * (.75 + .25 * Math.sin(i * 12.9898) ** 2), i };
}

/* ================= 电磁波前：折射透明壳 + 极淡掠射亮边（可按偶极方向图加权） ================= */
const RIM_VS = `varying vec3 vN,vV,vWN;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vWN=normalize(mat3(modelMatrix)*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const RIM_FS = `uniform vec3 uC,uAxis;uniform float uA,uP,uDip;varying vec3 vN,vV,vWN;void main(){float f=1.-abs(dot(normalize(vN),normalize(vV)));float c=dot(normalize(vWN),uAxis);float w=mix(1.,1.-c*c,uDip);gl_FragColor=vec4(uC,pow(f,uP)*uA*w);}`;
export function makeWaves({ count = 6, color = 0xdcecff, rim = .5, ior = 1.12, thick = .06, pow = 5, seg = 96, axis = V(1, 0, 0), dip = 1, spec = .2, env = .35, refract = true } = {}) {
  const group = new THREE.Group(), geo = new THREE.SphereGeometry(1, seg, seg / 2), shells = [];
  for (let i = 0; i < count; i++) {
    const ref = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ transmission: 1, roughness: 0, metalness: 0, ior, thickness: thick, color: 0xffffff, specularIntensity: spec, envMapIntensity: env, depthWrite: false }));
    const rm = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: RIM_VS, fragmentShader: RIM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: 0 }, uP: { value: pow }, uAxis: { value: axis.clone().normalize() }, uDip: { value: dip } } }));
    rm.renderOrder = 4; ref.frustumCulled = rm.frustumCulled = false; ref.visible = rm.visible = false; group.add(ref, rm); shells.push({ ref, rm });
  }
  return {
    group, shells,
    /** list = [{r, a}]：每层半径与强度（0..1） */
    set(center, list) {
      shells.forEach((S, j) => {
        const L = list[j]; const on = !!L && L.a > .01 && L.r > .01;
        S.ref.visible = refract && on; S.rm.visible = on; if (!on) return;
        S.ref.position.copy(center); S.ref.scale.setScalar(L.r); S.rm.position.copy(center); S.rm.scale.setScalar(L.r * 1.004 + .0005);
        S.ref.material.ior = 1 + (ior - 1) * L.a; S.ref.material.thickness = thick * L.a; S.ref.material.specularIntensity = spec * L.a;
        S.rm.material.uniforms.uA.value = rim * L.a;
      });
    },
  };
}

/** 可每帧改写顶点的屏幕等宽线（KIT.pathLine 的点数固定版本） */
export function liveLine(KIT, n, o = {}) {
  const pts = []; for (let i = 0; i < n; i++) pts.push(V(i / (n - 1), 0, 0));
  const m = PL(KIT, pts, o); const g = m.geometry;
  const P = g.attributes.position, Pr = g.attributes.aPrev, Nx = g.attributes.aNext;
  m.setPoints = (fn) => {   // fn(i, u, out:Vector3)
    const tmp = []; for (let i = 0; i < n; i++) { const v = fn(i, i / (n - 1), new THREE.Vector3()); tmp.push(v); }
    for (let i = 0; i < n; i++) { const p = tmp[i], a = tmp[Math.max(0, i - 1)], b = tmp[Math.min(n - 1, i + 1)]; for (let s = 0; s < 2; s++) { const k = i * 2 + s; P.setXYZ(k, p.x, p.y, p.z); Pr.setXYZ(k, a.x, a.y, a.z); Nx.setXYZ(k, b.x, b.y, b.z); } }
    P.needsUpdate = Pr.needsUpdate = Nx.needsUpdate = true;
  };
  return m;
}
/** 圆环点列：center，法向 normal，半径 r */
export function circlePts(center, normal, r, n = 96, start = 0) {
  const nn = normal.clone().normalize(); const a = Math.abs(nn.y) < .9 ? V(0, 1, 0).cross(nn).normalize() : V(1, 0, 0).cross(nn).normalize(); const b = nn.clone().cross(a).normalize();
  const out = []; for (let i = 0; i <= n; i++) { const th = start + i / n * Math.PI * 2; out.push(center.clone().addScaledVector(a, Math.cos(th) * r).addScaledVector(b, Math.sin(th) * r)); } return out;
}
export const clamp01 = x => clamp(x, 0, 1);
