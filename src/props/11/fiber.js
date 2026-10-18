/* 11 · 海底之光：道具。
   buildFiberEnd：单模光纤的端头（1 单位 = 1 mm）：彩色涂覆层（外径 0.25 mm）剥开，露出 0.125 mm 的玻璃包层，
                  切平的端面中心是 9 µm 的纤芯，射出红光；旁边一根头发作比较。
   buildCore：纵向剖开的纤芯（1 单位 = 纤芯半径 ≈ 4.5 µm）：剖面上纤芯带比包层略亮；光线在剖面里折返。
   buildWDM：棱镜把六种颜色（示意色）的光合进一根纤芯，另一端再分开。
   buildCable：现代深海光缆（1 单位 = 1 mm，外径 17 mm），端头逐层剥开：聚乙烯护套 → 铜管 → 两层绞合钢丝 → 不锈钢管
               → 阻水膏里的 12 根彩色光纤。
   buildRepeater：海底中继器（1 单位 = 1 m）躺在海床上，两端接着光缆。 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';

const mesh = (geo, mat, { cast = true, recv = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
/** 中间亮、边缘渐隐的加法混合光束 */
export function beamMaterial(color, k = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(k) }, uOpacity: { value: 1 } },
    vertexShader: 'varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=uv.y;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uColor;uniform float uOpacity;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float f=abs(dot(normalize(vN),normalize(vV)));gl_FragColor=vec4(uColor*f*f*uOpacity,1.);}',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}
/** 光纤色谱（TIA-598）：蓝 橙 绿 棕 灰 白 红 黑 黄 紫 玫红 水绿 */
export const FIBER_COLORS = [0x2f6fd6, 0xf08a24, 0x2e9e4f, 0x7a4b2a, 0x8a9096, 0xe8e8e4, 0xd23b2f, 0x1b1b1d, 0xf2cf2a, 0x7b4bb3, 0xe58aa7, 0x3fc1c9];

/* ---------------- 光纤端头（mm） ---------------- */
export function buildFiberEnd(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x050608, key: 260, fill: 12, rim: 200, keyPos: [-2, 3, 3], rimPos: [3, 2.5, -2.5], fillPos: [3, 1, 3], target: [0, 0, 0], floorY: -.6, size: 30, env: .4, shadowRadius: 4 });
  st.key.angle = Math.PI / 6; st.key.penumbra = 1; st.cyc.material = new THREE.MeshLambertMaterial({ color: 0x08090b });
  st.key.shadow.camera.near = .1; st.key.shadow.camera.far = 20;
  const g = new THREE.Group(); g.rotation.y = -.35; scene.add(g);
  const coat = mesh(new THREE.CylinderGeometry(.125, .125, 6, 64), new THREE.MeshPhysicalMaterial({ color: 0x2f6fd6, roughness: .35, clearcoat: .6 })); coat.rotation.z = Math.PI / 2; coat.position.x = -3.6; g.add(coat);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .05, transmission: 1, thickness: .1, ior: 1.45, attenuationColor: 0xdff4ff, attenuationDistance: 2, transparent: true });
  const clad = mesh(new THREE.CylinderGeometry(.0625, .0625, 1.2, 64), glassM); clad.rotation.z = Math.PI / 2; clad.position.x = .0; g.add(clad);
  const coreGlow = mesh(new THREE.CircleGeometry(.0045, 32), KIT.M.emissive(0xff3b2a, 30), { cast: false }); coreGlow.position.set(.6005, 0, 0); coreGlow.rotation.y = Math.PI / 2; g.add(coreGlow);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(.0625, 48), new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(.6006, 0, 0); halo.rotation.y = Math.PI / 2; g.add(halo);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(.35, .006, 2.4, 48, 1, true), beamMaterial(0xff4030, 1.2)); cone.rotation.z = -Math.PI / 2; cone.position.x = .6 + 1.2; g.add(cone);
  // 头发（约 70 µm），略带弯曲，表面有鳞片状的粗糙
  const hairCurve = new THREE.CatmullRomCurve3([V(-4, -.02, .32), V(-1.5, .01, .3), V(.4, .02, .27), V(2.2, -.01, .22)]);
  const hair = mesh(new THREE.TubeGeometry(hairCurve, 160, .035, 16), new THREE.MeshPhysicalMaterial({ color: 0x2a1a10, roughness: .45, sheen: .6, sheenColor: new THREE.Color(0x8a6a50), clearcoat: .3 })); g.add(hair);
  return { scene, group: g, coreGlow, halo, cone, anchors: { coat: V(-1.2, .125, 0), clad: V(.2, .0625, 0), core: V(.6, 0, 0), hair: V(-.8, .04, .3) } };
}

/* ---------------- 纵剖的纤芯（单位 = 纤芯半径） ---------------- */
export const CORE = { len: 460, clad: 3.2, nCore: 1.449, nClad: 1.444 };
export function buildCore(KIT) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030406);
  KIT.roomEnv(scene, .3);
  const L = CORE.len, R = CORE.clad;
  // 剖面（y = 0 平面）：纤芯带略亮、略偏青；包层带更暗；边界有细线
  const cutTex = KIT.canvasTex(64, 1024, (g, w, h) => {
    const y = v => (1 - (v + R) / (2 * R)) * h;
    g.fillStyle = '#0a1014'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d4552'; g.fillRect(0, y(1), w, y(-1) - y(1));
    g.fillStyle = 'rgba(170,230,255,.8)'; g.fillRect(0, y(1) - 2, w, 4); g.fillRect(0, y(-1) - 2, w, 4);
  }, { srgb: true, aniso: 16 });
  const cut = mesh(new THREE.PlaneGeometry(L, 2 * R), new THREE.MeshStandardMaterial({ map: cutTex, roughness: .6, metalness: 0, emissive: 0xffffff, emissiveMap: cutTex, emissiveIntensity: .45, envMapIntensity: .2 }), { cast: false });
  cut.rotation.x = -Math.PI / 2; cut.position.x = L / 2; scene.add(cut);
  // 下半个圆柱：玻璃体
  const body = mesh(new THREE.CylinderGeometry(R, R, L, 96, 1, true, Math.PI, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0x4a6a7a, roughness: .12, metalness: 0, transparent: true, opacity: .1, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), { cast: false });
  body.rotation.z = Math.PI / 2; body.position.x = L / 2; scene.add(body);
  const coreTube = mesh(new THREE.CylinderGeometry(1, 1, L, 64, 1, true, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: 0x5fb8d8, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), { cast: false });
  coreTube.rotation.z = Math.PI / 2; coreTube.position.x = L / 2; scene.add(coreTube);
  const light = new THREE.DirectionalLight(0xdfeaff, 1.2); light.position.set(-20, 30, 20); scene.add(light);
  return { scene };
}
/** 在剖面里折返的光线：从 x0 出发，与轴成 deg 度；返回折线点与各反射点 */
export function zigzag(deg, { x0 = 0, len = CORE.len, z0 = 0, dir = 1 } = {}) {
  const k = Math.tan(deg * Math.PI / 180), pts = [V(x0, .02, z0)], hits = []; let x = x0, z = z0, s = dir;
  while (x < len) { const zt = s > 0 ? 1 : -1, dx = (zt - z) / (k * s); if (x + dx > len) { pts.push(V(len, .02, z + s * k * (len - x))); break; } x += dx; z = zt; pts.push(V(x, .02, z)); hits.push(V(x, .02, z)); s = -s; }
  return { pts, hits };
}

/* ---------------- 波分复用 ---------------- */
export const WDM_COLORS = [0xff4b3a, 0xff9a2e, 0xffe14a, 0x5fe07a, 0x4ab8ff, 0xa77bff];
export function buildWDM(KIT) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x040507); KIT.roomEnv(scene, .35);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-3, 6, 5); scene.add(key);
  const prismGeo = (() => { const s = new THREE.Shape(); s.moveTo(-.7, -.6); s.lineTo(.7, -.6); s.lineTo(0, .6); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: .9, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 }); })();
  prismGeo.translate(0, 0, -.45);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .03, transmission: 1, thickness: .6, ior: 1.52, transparent: true, clearcoat: 1 });
  const pL = mesh(prismGeo, glass); pL.position.set(-5.2, 0, 0); pL.rotation.z = Math.PI / 2; scene.add(pL);
  const pR = mesh(prismGeo, glass); pR.position.set(5.2, 0, 0); pR.rotation.z = -Math.PI / 2; scene.add(pR);
  const fiber = mesh(new THREE.CylinderGeometry(.09, .09, 9.4, 32), new THREE.MeshPhysicalMaterial({ color: 0x9fc4d6, roughness: .08, transparent: true, opacity: .18, depthWrite: false })); fiber.rotation.z = Math.PI / 2; scene.add(fiber);
  // 每种颜色：入射光束（汇聚进左棱镜）、纤芯里的细光丝、出射光束（右棱镜散开）
  const beams = WDM_COLORS.map((c, i) => {
    const a = (i - 2.5) * .11, mk = (from, to, r0, r1) => { const d = to.clone().sub(from), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, d.length(), 24, 1, true), beamMaterial(c, 1.4)); m.position.copy(from).add(to).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); scene.add(m); return m; };
    const inB = mk(V(-11, Math.sin(a) * 6, 0), V(-5.4, 0, 0), .07, .05);
    const outB = mk(V(5.4, 0, 0), V(11, Math.sin(a) * 6, 0), .05, .07);
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 10, 8), KIT.M.emissive(c, 3)); strand.rotation.z = Math.PI / 2; strand.position.set(0, Math.sin(i * 1.7) * .035, Math.cos(i * 1.7) * .035); scene.add(strand);
    return { inB, outB, strand };
  });
  return { scene, beams, fiber, prisms: [pL, pR] };
}

/* ---------------- 深海光缆（mm） ---------------- */
export const CABLE = { tube: [1.25, 1.55], w1: { r: 2.33, d: 1.56, n: 9 }, w2: { r: 3.88, d: 1.56, n: 15 }, cu: [4.68, 5.0], pe: [5.0, 8.5], steps: { pe: 0, cu: 6, w2: 11, w1: 15, tube: 19, fiber: 26 } };
export async function buildCable(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x060708, key: 2.4e5, fill: 8e3, rim: 1.3e5, keyPos: [-60, 90, 90], rimPos: [70, 60, -80], fillPos: [80, 30, 80], target: [8, 0, 0], floorY: -40, size: 2000, env: .4, shadowRadius: 5 });
  st.key.angle = Math.PI / 7; st.key.penumbra = 1; st.cyc.material = new THREE.MeshLambertMaterial({ color: 0x08090b }); st.key.shadow.camera.near = 10; st.key.shadow.camera.far = 400;
  const C = CABLE, S = C.steps, LEN = 120, g = new THREE.Group(); scene.add(g);   // 轴沿 +x，端头在 x = 0 往右逐层露出
  const along = (r0, r1, x0, x1, mat, seg = 96) => { // 一段空心圆管（含端面）
    const sh = new THREE.Shape(); sh.absarc(0, 0, r1, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, 0, r0, 0, Math.PI * 2, true); sh.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false, curveSegments: seg }); geo.rotateY(Math.PI / 2); geo.translate(x0, 0, 0);
    const m = mesh(geo, mat); g.add(m); return m;
  };
  const pe = along(C.pe[0], C.pe[1], -LEN, S.pe, new THREE.MeshPhysicalMaterial({ color: 0x141518, roughness: .38, clearcoat: .4, clearcoatRoughness: .3 }));
  const peFace = mesh(new THREE.RingGeometry(C.pe[0], C.pe[1], 128), new THREE.MeshStandardMaterial({ color: 0x23252a, roughness: .7 })); peFace.rotation.y = Math.PI / 2; peFace.position.x = S.pe + .01; g.add(peFace);
  const cu = along(C.cu[0], C.cu[1], -LEN, S.cu, KIT.M.copper({ rough: .28 }));
  // 两层绞合钢丝（螺旋，内外层反向）
  const steel = KIT.M.steel({ rough: .3 });
  const helix = (r, d, n, x1, lay, ph) => { for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2 + ph, pts = []; for (let k = 0; k <= 80; k++) { const x = -LEN + (x1 + LEN) * k / 80, a = a0 + x / lay * Math.PI * 2; pts.push(V(x, Math.cos(a) * r, Math.sin(a) * r)); } const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, d / 2 * .98, 14, false), steel); g.add(tube); const cap = mesh(new THREE.CircleGeometry(d / 2 * .98, 16), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 1, roughness: .25 })); const e = pts[pts.length - 1]; cap.position.copy(e); cap.position.x += .01; cap.rotation.y = Math.PI / 2; g.add(cap); } };
  helix(C.w2.r, C.w2.d, C.w2.n, S.w2, -220, .1); helix(C.w1.r, C.w1.d, C.w1.n, S.w1, 160, 0);
  const tube = along(C.tube[0], C.tube[1], -LEN, S.tube, KIT.M.steel({ rough: .18 }));
  const gel = mesh(new THREE.CylinderGeometry(C.tube[0] * .99, C.tube[0] * .99, S.tube + LEN - .5, 48), new THREE.MeshPhysicalMaterial({ color: 0xf2d27a, roughness: .15, transmission: .5, thickness: 1, transparent: true, opacity: .75, clearcoat: 1 })); gel.rotation.z = Math.PI / 2; gel.position.x = (S.tube - LEN) / 2 - .4; g.add(gel);
  // 12 根彩色光纤：在管口处轻轻散开
  const fibers = []; const R0 = rng(11);
  FIBER_COLORS.forEach((c, i) => {
    const a = i / 12 * Math.PI * 2, r = i < 6 ? .45 : .85, y0 = Math.cos(a) * r * .9, z0 = Math.sin(a) * r * .9, spread = 1.4 + R0() * .8;
    const pts = [V(-LEN, y0, z0), V(S.tube - 2, y0, z0), V(S.tube + 3, y0 * spread, z0 * spread), V(S.fiber + R0() * 4, y0 * (spread + .5) + (R0() - .5) * .4, z0 * (spread + .5) + (R0() - .5) * .4)];
    const f = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, .125, 12, false), new THREE.MeshPhysicalMaterial({ color: c, roughness: .3, clearcoat: .8, clearcoatRoughness: .15 })); g.add(f); fibers.push(f);
  });
  return { scene, group: g, pe, cu, tube, fibers, anchors: { fiber: V(S.fiber - 3, 1.6, 1.2), tube: V(S.tube - 2, C.tube[1], 0), w1: V(S.w1 - 2, C.w1.r + .7, 0), w2: V(S.w2 - 3, C.w2.r + .7, 0), cu: V(S.cu - 2, C.cu[1], 0), pe: V(-6, C.pe[1], 0) } };
}

/* ---------------- 海底中继器（m） ---------------- */
export async function buildRepeater(KIT) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x02070b); scene.fog = new THREE.FogExp2(0x02070b, .09);
  KIT.roomEnv(scene, .15);
  const key = new THREE.SpotLight(0xbfe4ff, 140, 0, Math.PI / 5, .9, 2); key.position.set(-1.5, 5, 3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; scene.add(key);
  const tgt = new THREE.Object3D(); scene.add(tgt); key.target = tgt;
  const sand = await KIT.pbr('damp_sand', { repeat: 6, color: 0x7a6a50 });
  const bed = mesh(new THREE.PlaneGeometry(40, 40, 1, 1), sand, { cast: false }); bed.rotation.x = -Math.PI / 2; scene.add(bed);
  const hous = KIT.M.copper({ rough: .5 }); hous.color.multiplyScalar(.6);
  const prof = [[0, -.75], [.06, -.75], [.11, -.6], [.15, -.45], [.15, .45], [.11, .6], [.06, .75], [0, .75]].map(([r, y]) => new THREE.Vector2(r, y));
  const rep = mesh(new THREE.LatheGeometry(prof, 64), hous); rep.rotation.z = Math.PI / 2; rep.position.y = .15; scene.add(rep);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const ring = mesh(new THREE.TorusGeometry(.15, .012, 8, 48), hous); ring.rotation.y = Math.PI / 2; ring.position.set(s * (.3 - i * .02 + i * .12), .15, 0); scene.add(ring); }
  const cableM = new THREE.MeshPhysicalMaterial({ color: 0x141518, roughness: .4, clearcoat: .3 });
  const cables = [];
  for (const s of [-1, 1]) {
    const pts = [V(s * .75, .15, 0), V(s * 1.4, .05, .05), V(s * 4, .0085, .3 * s), V(s * 12, .0085, 1.4 * s)];
    const c = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, .0085 * 4, 12, false), cableM); scene.add(c); cables.push(c);
    const restr = mesh(new THREE.CylinderGeometry(.03, .06, .5, 24), cableM); restr.rotation.z = Math.PI / 2; restr.position.set(s * 1.0, .1, .02 * s); scene.add(restr);
  }
  return { scene, repeater: rep, cables, key, target: tgt };
}
