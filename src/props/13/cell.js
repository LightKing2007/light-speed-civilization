/* 13 · 口袋里的电波：道具。
   buildCarPhone：1979 年前后的车载电话（复原示意，1 单位 = 1 m）：听筒（听筒口 / 话筒口的格栅、12 个按键）、托座、卷曲电话线，放在皮革中控台上。
   buildCity：黄昏城市（1 单位 = 10 m）：程序化楼群（窗灯）、街道、地面上的六边形「勘测图」网格（7 色频率组，同色不相邻）、
              每个小区中心一座三扇区基站；一辆会穿过小区边界的车；楼顶上的 5G 大规模天线阵列面板（8 × 8 交叉振子）与窄波束。 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';

const mesh = (geo, mat, { cast = true, recv = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
export function beamMaterial(color, k = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(k) }, uOpacity: { value: 1 } },
    vertexShader: 'varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=uv.y;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uColor;uniform float uOpacity;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float f=abs(dot(normalize(vN),normalize(vV)));gl_FragColor=vec4(uColor*f*f*uOpacity*(.35+.65*vY),1.);}',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}
/** 把 from → to 的细长圆柱 / 圆锥摆好 */
export function aimBeam(m, from, to) { const d = to.clone().sub(from), L = d.length(); m.position.copy(from).add(to).multiplyScalar(.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }   // 圆柱的上端（+y）朝向 to

/* ---------------- 车载电话 ---------------- */
export async function buildCarPhone(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x08080a, key: 6, fill: .4, rim: 5, keyPos: [-.4, .7, .5], rimPos: [.5, .5, -.5], fillPos: [.6, .25, .5], target: [0, .05, 0], floorY: 0, size: 6, env: .3, shadowRadius: 4 });
  st.key.angle = Math.PI / 6; st.key.penumbra = 1; st.cyc.material = new THREE.MeshLambertMaterial({ color: 0x0b0b0c });
  const leather = await KIT.pbr('brown_leather', { repeat: 2, color: 0x2a201a });
  const console_ = mesh(KIT.rbox(.7, .06, .5, .03), leather); console_.position.y = .03; scene.add(console_);
  const plastic = KIT.M.plastic(0x2b2b2e, { rough: .45 }), beige = KIT.M.plastic(0xcfc6b2, { rough: .5 });
  // 托座
  const cradle = mesh(KIT.rbox(.11, .05, .27, .012), plastic); cradle.position.set(.02, .085, 0); scene.add(cradle);
  const hook = mesh(KIT.rbox(.03, .02, .05, .006), plastic); hook.position.set(.02, .12, -.1); scene.add(hook);
  // 听筒：躺在托座上，按键面朝上
  const H = new THREE.Group(); H.position.set(.02, .128, 0); H.rotation.y = .02; scene.add(H);
  const body = mesh(KIT.rbox(.062, .034, .235, .014), beige); H.add(body);
  const grille = KIT.canvasTex(256, 256, (g, w) => { g.fillStyle = '#cfc6b2'; g.fillRect(0, 0, w, w); g.fillStyle = '#2a2622'; for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (i * i + j * j <= 10) { g.beginPath(); g.arc(w / 2 + i * 26, w / 2 + j * 26, 7, 0, 7); g.fill(); } });
  for (const z of [-.09, .09]) { const gr = mesh(new THREE.CircleGeometry(.022, 32), new THREE.MeshStandardMaterial({ map: grille, roughness: .6 }), { cast: false }); gr.rotation.x = -Math.PI / 2; gr.position.set(0, .0172, z); H.add(gr); }
  const keys = KIT.canvasTex(256, 384, (g, w, h) => { g.fillStyle = '#cfc6b2'; g.fillRect(0, 0, w, h); const L = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']; L.forEach((c, i) => { const x = 40 + (i % 3) * 72, y = 40 + Math.floor(i / 3) * 84; g.fillStyle = '#3a3633'; g.fillRect(x, y, 56, 64); g.fillStyle = '#e8e2d4'; g.font = '700 34px "Helvetica Neue", Arial'; g.textAlign = 'center'; g.fillText(c, x + 28, y + 44); }); });
  const kp = mesh(new THREE.PlaneGeometry(.04, .06), new THREE.MeshStandardMaterial({ map: keys, roughness: .5 }), { cast: false }); kp.rotation.x = -Math.PI / 2; kp.position.set(0, .0172, 0); H.add(kp);
  // 卷曲电话线：从听筒尾端绕到中控台后方
  const pts = []; const A0 = V(.02, .12, .125), B0 = V(-.22, .065, .12);
  for (let i = 0; i <= 600; i++) { const u = i / 600, base = A0.clone().lerp(B0, u).add(V(0, -.05 * Math.sin(Math.PI * u), .06 * Math.sin(Math.PI * u))), a = u * 70 * Math.PI * 2; pts.push(base.add(V(0, Math.cos(a) * .008, Math.sin(a) * .008))); }
  const cord = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1800, .0018, 6), plastic); scene.add(cord);
  return { scene, handset: H, anchors: { handset: V(.02, .15, -.02), keys: V(.02, .146, 0) } };
}

/* ---------------- 黄昏城市（1 单位 = 10 m） ---------------- */
export const HEX = { R: 13, n: 4 };     // 小区半径 130 m；以原点为中心铺 4 圈
const SQ3 = Math.sqrt(3);
export const hexCenter = (q, r) => V(HEX.R * SQ3 * (q + r / 2), 0, HEX.R * 1.5 * r);
export const reuse = (q, r) => (((q + 3 * r) % 7) + 7) % 7;      // 7 色频率组：相邻小区永远不同色
export const GROUP_COLORS = ['#ff7a30', '#5aa9ff', '#5fd38d', '#c58bff', '#ffd23f', '#ff6fa8', '#3fc1c9'];

export async function buildCity(KIT) {
  const scene = new THREE.Scene();
  await KIT.hdri(scene, KIT.hdriFile('shanghai_bund'), { intensity: .25, rotation: 1.2, background: true, bgBlur: .35, bgIntensity: .22 });
  scene.fog = new THREE.Fog(0x2a2a3a, 60, 260);
  const sun = new THREE.DirectionalLight(0xffb27a, 1.6); sun.position.set(-120, 40, -60); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 400 }); sun.shadow.bias = -.0005; scene.add(sun);
  const sky = new THREE.HemisphereLight(0x6a78a8, 0x1a1410, .5); scene.add(sky);
  const asphalt = await KIT.pbr('asphalt_02', { repeat: 40, color: 0x2a2a2c });
  const ground = mesh(new THREE.PlaneGeometry(400, 400), asphalt, { cast: false }); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // 楼群：街区网格（街宽 2 = 20 m），每个街区 1–4 栋楼
  const R = rng(13), B = 9, ST = 2.2, blds = [];
  const winTex = (seed, floors, cols) => KIT.canvasTex(256, 512, (g, w, h) => { const r = rng(seed); g.fillStyle = '#1b1d22'; g.fillRect(0, 0, w, h); const fw = w / cols, fh = h / floors; for (let i = 0; i < cols; i++) for (let j = 0; j < floors; j++) { const lit = r() < .42; g.fillStyle = lit ? `rgba(255,${190 + r() * 40 | 0},${120 + r() * 60 | 0},${.75 + r() * .25})` : `rgba(40,48,60,${.6 + r() * .3})`; g.fillRect(i * fw + fw * .18, j * fh + fh * .22, fw * .64, fh * .56); } }, { aniso: 8 });
  const facades = [winTex(1, 10, 5), winTex(2, 24, 6), winTex(3, 40, 7)];
  const mats = facades.map(t => new THREE.MeshStandardMaterial({ color: 0x9aa0a8, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .9, roughness: .7, metalness: .1 }));
  const roofM = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .9 });
  for (let bx = -6; bx <= 6; bx++) for (let bz = -6; bz <= 6; bz++) {
    const cx = bx * (B + ST), cz = bz * (B + ST), split = R() < .5;
    const parts = split ? [[-B / 4, 0, B / 2 - .4, B], [B / 4, 0, B / 2 - .4, B]] : [[0, 0, B, B]];
    for (const [ox, oz, w, d] of parts) {
      const dist = Math.hypot(cx, cz), h = (1.5 + R() * 3.5) * (dist < 30 ? 1.8 + R() * 2.2 : dist < 60 ? 1.2 : .8), cls = h > 8 ? 2 : h > 4 ? 1 : 0;
      const b = mesh(new THREE.BoxGeometry(w * (.8 + R() * .15), h, d * (.8 + R() * .15)), [mats[cls], mats[cls], roofM, roofM, mats[cls], mats[cls]]);
      b.position.set(cx + ox, h / 2, cz + oz); scene.add(b); blds.push(b);
    }
  }
  const roofAt = (x, z) => { let y = 0; for (const b of blds) { const p = b.geometry.parameters; if (Math.abs(x - b.position.x) < p.width / 2 && Math.abs(z - b.position.z) < p.depth / 2) y = Math.max(y, b.position.y + p.height / 2); } return y; };
  // 六边形网格（地面上的勘测图）：线条 + 频率组颜色，用 uReveal（半径）控制显示范围
  const SPAN = 240, cv = 2048, toPx = v => (v / SPAN + .5) * cv;
  const hexTex = KIT.canvasTex(cv, cv, (g) => {
    g.clearRect(0, 0, cv, cv);
    for (let q = -HEX.n - 3; q <= HEX.n + 3; q++) for (let r = -HEX.n - 3; r <= HEX.n + 3; r++) {
      const c = hexCenter(q, r); if (Math.hypot(c.x, c.z) > 110) continue;
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3, x = toPx(c.x + Math.cos(a) * HEX.R), y = toPx(c.z + Math.sin(a) * HEX.R); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath();
      const col = GROUP_COLORS[reuse(q, r)]; g.globalAlpha = .33; g.fillStyle = col; g.fill(); g.globalAlpha = 1; g.strokeStyle = 'rgba(220,235,255,.85)'; g.lineWidth = 3; g.stroke();
    }
  }, { aniso: 16 });
  const hexMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: hexTex }, uReveal: { value: 0 }, uFill: { value: 0 }, uOp: { value: 1 } },
    vertexShader: 'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'uniform sampler2D map;uniform float uReveal,uFill,uOp;varying vec2 vUv;varying vec3 vW;void main(){vec4 c=texture2D(map,vUv);float line=step(.6,c.a)*step(.55,min(c.r,min(c.g,c.b)));float k=smoothstep(uReveal,uReveal-12.,length(vW.xz));vec3 col=mix(c.rgb,vec3(.86,.92,1.),line);float a=c.a*(line>0.?1.:uFill)*k*uOp;gl_FragColor=vec4(col*1.4,a);}',
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
  });
  const hex = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, SPAN), hexMat); hex.rotation.x = -Math.PI / 2; hex.position.y = .05; hex.renderOrder = 2; scene.add(hex);
  // 基站：每个小区中心（落在楼顶或地面）一根桅杆 + 三扇区天线
  const mastM = KIT.M.paint(0xb8bcc2, { rough: .4 }), panelM = KIT.M.paint(0xe6e6e2, { rough: .45 });
  const sites = [];
  for (let q = -HEX.n; q <= HEX.n; q++) for (let r = -HEX.n; r <= HEX.n; r++) {
    const c = hexCenter(q, r); if (Math.hypot(c.x, c.z) > 100) continue;
    const y0 = roofAt(c.x, c.z), g = new THREE.Group(); g.position.set(c.x, y0, c.z); scene.add(g);
    const mast = mesh(new THREE.CylinderGeometry(.06, .09, 2.6, 12), mastM); mast.position.y = 1.3; g.add(mast);
    for (let k = 0; k < 3; k++) { const a = k * 2 * Math.PI / 3, p = mesh(KIT.rbox(.22, .9, .08, .02), panelM); p.position.set(Math.cos(a) * .2, 2.3, Math.sin(a) * .2); p.rotation.y = -a + Math.PI / 2; g.add(p); }
    const led = mesh(new THREE.SphereGeometry(.07, 12, 8), KIT.M.emissive(0xff3b2f, 2), { cast: false }); led.position.y = 2.85; g.add(led);
    sites.push({ q, r, group: g, top: V(c.x, y0 + 2.4, c.z), group7: reuse(q, r), led });
  }
  // 车（穿过小区边界）
  const car = new THREE.Group(); scene.add(car);
  const carBody = mesh(KIT.rbox(.45, .14, .2, .04), KIT.M.paint(0x8a1f1f, { rough: .3, clearcoat: .8 })); carBody.position.y = .11; car.add(carBody);
  const cab = mesh(KIT.rbox(.26, .11, .18, .04), new THREE.MeshPhysicalMaterial({ color: 0x15181c, roughness: .1, metalness: .3 })); cab.position.set(-.02, .22, 0); car.add(cab);
  const marker = mesh(new THREE.RingGeometry(1.5, 1.9, 48), new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: .9, depthWrite: false }), { cast: false }); marker.rotation.x = -Math.PI / 2; marker.position.y = .4; car.add(marker);
  const dot = mesh(new THREE.CircleGeometry(.75, 32), KIT.M.emissive(0x9fdcff, 4), { cast: false }); dot.rotation.x = -Math.PI / 2; dot.position.y = .38; car.add(dot);
  for (const s of [-1, 1]) { const hl = mesh(new THREE.SphereGeometry(.025, 10, 6), KIT.M.emissive(0xfff2d8, 6), { cast: false }); hl.position.set(.225, .12, s * .07); car.add(hl); const tl = mesh(new THREE.SphereGeometry(.02, 10, 6), KIT.M.emissive(0xff2a1a, 4), { cast: false }); tl.position.set(-.225, .12, s * .07); car.add(tl); }
  const links = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, 1, 16, 1, true), beamMaterial(0x9fdcff, 2.6)); scene.add(m); return m; });
  // 楼顶的 5G 大规模天线阵列（8 × 8 交叉振子，外面是半透明天线罩）
  const AX = 2.25, AZ = 33.6, aauY = roofAt(AX, AZ), aau = new THREE.Group(); aau.position.set(AX, aauY, AZ); scene.add(aau);   // 街区东半栋楼的楼顶，面朝 +z
  const aMast = mesh(new THREE.CylinderGeometry(.05, .07, 1.6, 12), mastM); aMast.position.y = .8; aau.add(aMast);
  const back = mesh(KIT.rbox(.5, .8, .1, .02), KIT.M.paint(0xd8d8d4, { rough: .5 })); back.position.set(0, 1.4, .1); aau.add(back);
  const elTex = KIT.canvasTex(512, 820, (g, w, h) => { g.fillStyle = '#2b3138'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b26a'; g.lineWidth = 7; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = 40 + i * 61, y = 50 + j * 100; g.beginPath(); g.moveTo(x - 18, y - 18); g.lineTo(x + 18, y + 18); g.moveTo(x + 18, y - 18); g.lineTo(x - 18, y + 18); g.stroke(); } });
  const face = mesh(new THREE.PlaneGeometry(.46, .76), new THREE.MeshStandardMaterial({ map: elTex, roughness: .5, metalness: .3 }), { cast: false }); face.position.set(0, 1.4, .152); aau.add(face);
  const radome = mesh(KIT.rbox(.5, .8, .02, .01), new THREE.MeshPhysicalMaterial({ color: 0xf2f2ee, roughness: .3, transparent: true, opacity: .35, depthWrite: false }), { cast: false }); radome.position.set(0, 1.4, .16); aau.add(radome);
  const mimo = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.4, .03, 1, 24, 1, true), beamMaterial(0xffc27a, 1.6)); scene.add(m); return m; });
  const phones = new Float32Array(4 * 3), phoneA = new Float32Array(4);
  const phonePts = KIT.points(phones, { size: 16, color: 0xffe0b0, intensity: 2.4, alphas: phoneA, soft: .85, additive: true }); scene.add(phonePts);
  return { scene, hex, hexMat, sites, car, links, aau, aauFace: face, mimo, phones, phoneA, phonePts, roofAt, sun };
}
