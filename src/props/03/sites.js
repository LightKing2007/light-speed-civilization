/* 03 · 两岸现场（单位：米）
   - 波尔杜无线电站：1901 年 12 月的临时扇形天线（两根约 48 m 木桅 + 横拉索 + 54 根铜线汇成扇面）+ 发射机房
   - 信号山：旧热病医院木楼 + 卡伯特塔剪影 + 风筝天线（Baden-Powell「Levitor」六角风筝 + 约 152 m 铜线）
   - 暴风云天空（程序化 fbm，纯 t 函数漂移）、草地/岩地地面 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';

function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }

/* ---------- 木板墙贴图（白漆护墙板，底部泥污、雨痕） ---------- */
function clapTex(KIT, { color = '#d6cfbf', seed = 1, board = 22 } = {}) {
  const t = KIT.canvasTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += board) {
      const k = .9 + r() * .12; g.fillStyle = `rgba(${Math.round(60 * k)},${Math.round(55 * k)},${Math.round(45 * k)},.10)`; g.fillRect(0, y, w, board);
      g.fillStyle = 'rgba(30,26,20,.45)'; g.fillRect(0, y + board - 2.5, w, 2.5);
      g.fillStyle = 'rgba(255,255,250,.25)'; g.fillRect(0, y, w, 1.2);
      for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(90,80,60,${r() * .1})`; g.fillRect(r() * w, y + 2, 20 + r() * 120, board - 5); }
    }
    for (let i = 0; i < 70; i++) { const x = r() * w, len = 40 + r() * 200; const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(70,64,52,.14)'); gr.addColorStop(1, 'rgba(70,64,52,0)'); g.fillStyle = gr; g.fillRect(x, r() * 200, 2 + r() * 4, len); }
    const gb = g.createLinearGradient(0, h * .82, 0, h); gb.addColorStop(0, 'rgba(60,52,38,0)'); gb.addColorStop(1, 'rgba(60,52,38,.45)'); g.fillStyle = gb; g.fillRect(0, h * .82, w, h * .18);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function roofTex(KIT, seed = 3) {
  const t = KIT.canvasTex(512, 512, (g, w, h) => { const r = rng(seed); g.fillStyle = '#2b2a2a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, 0, 6, h); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x + 6, 0, 3, h); } for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '160,150,140'},${r() * .12})`; g.fillRect(r() * w, r() * h, 1 + r() * 5, 1 + r() * 3); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** 木构房屋：中心在原点，正面朝 +z。floors = 层数（窗排数） */
export function buildHut(KIT, { w = 14, d = 6, h = 3.4, ridge = 2, color = '#d6cfbf', seed = 1, floors = 1, winN = 4, chimney = true, door = true } = {}) {
  const g = new THREE.Group(); const T = clapTex(KIT, { color, seed });
  const wallMat = (sx, sy) => { const t = T.clone(); t.needsUpdate = true; t.repeat.set(sx / 4, sy / 4); return new THREE.MeshStandardMaterial({ map: t, roughness: .88 }); };
  // 墙体（盒子，前后/左右分别贴图比例）
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [wallMat(d, h), wallMat(d, h), wallMat(w, 1), wallMat(w, 1), wallMat(w, h), wallMat(w, h)]);
  body.position.y = h / 2 + .35; body.castShadow = body.receiveShadow = true; g.add(body);
  // 石基
  g.add(mesh(new THREE.BoxGeometry(w + .2, .4, d + .2), new THREE.MeshStandardMaterial({ color: 0x5f5c57, roughness: .95, roughnessMap: KIT.grunge(seed + 50) }), 0, .2, 0));
  // 山墙三角
  const gs = new THREE.Shape(); gs.moveTo(-d / 2, 0); gs.lineTo(d / 2, 0); gs.lineTo(0, ridge); gs.closePath();
  const gg = new THREE.ShapeGeometry(gs); const gm = wallMat(d, ridge); gm.side = THREE.DoubleSide;
  for (const s of [-1, 1]) { const m = mesh(gg, gm, s * w / 2, h + .35, 0); m.rotation.y = Math.PI / 2; g.add(m); }
  // 屋顶（两坡，带出檐）
  const slope = Math.atan2(ridge, d / 2), len = Math.hypot(ridge, d / 2) + .45;
  const rt = roofTex(KIT, seed + 7); rt.repeat.set(w / 4, len / 4);
  const roofM = new THREE.MeshStandardMaterial({ map: rt, roughness: .92 });
  for (const s of [-1, 1]) { const m = mesh(new THREE.BoxGeometry(w + .6, .12, len), roofM, 0, h + .35 + ridge / 2 + .03, s * (d / 4 + .1)); m.rotation.x = s * slope; g.add(m); }
  g.add(mesh(new THREE.BoxGeometry(w + .62, .14, .22), roofM, 0, h + .35 + ridge + .02, 0));
  // 转角板、檐板（白漆）
  const trim = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: .7 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(.16, h, .16), trim, sx * (w / 2 + .02), h / 2 + .35, sz * (d / 2 + .02)));
  g.add(mesh(new THREE.BoxGeometry(w + .1, .22, .08), trim, 0, h + .26, d / 2 + .05));
  // 窗：白框 + 十字窗棂 + 暗玻璃（反射天光）
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c0f12, roughness: .06, metalness: 0, clearcoat: 1, envMapIntensity: 1.4 });
  const fh = (h - .4) / floors;
  for (let f = 0; f < floors; f++) for (let i = 0; i < winN; i++) {
    const x = -w / 2 + w * (i + .5) / winN; if (door && f === 0 && i === Math.floor(winN / 2)) continue;
    const y = .35 + fh * f + fh * .55;
    g.add(mesh(new THREE.BoxGeometry(.95, 1.25, .06), glass, x, y, d / 2 + .01));
    g.add(mesh(new THREE.BoxGeometry(1.1, .1, .12), trim, x, y + .67, d / 2 + .04));
    g.add(mesh(new THREE.BoxGeometry(1.15, .08, .2), trim, x, y - .66, d / 2 + .06));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(.08, 1.3, .1), trim, x + s * .51, y, d / 2 + .04));
    g.add(mesh(new THREE.BoxGeometry(.04, 1.2, .06), trim, x, y, d / 2 + .05)); g.add(mesh(new THREE.BoxGeometry(.92, .04, .06), trim, x, y + .1, d / 2 + .05));
  }
  if (door) { const x = -w / 2 + w * (Math.floor(winN / 2) + .5) / winN; g.add(mesh(new THREE.BoxGeometry(1.05, 2.1, .08), new THREE.MeshStandardMaterial({ color: 0x24302a, roughness: .6 }), x, .35 + 1.05, d / 2 + .02)); g.add(mesh(new THREE.BoxGeometry(1.3, .12, .14), trim, x, .35 + 2.16, d / 2 + .05)); }
  if (chimney) { const c = mesh(new THREE.BoxGeometry(.6, 1.6, .6), new THREE.MeshStandardMaterial({ color: 0x6b3f30, roughness: .9, roughnessMap: KIT.grunge(seed + 9) }), w * .3, h + .35 + ridge * .7, -d * .12); g.add(c); }
  return { group: g, top: h + .35 + ridge, front: d / 2 };
}

/* ---------- 地面（草/岩，噪声起伏） ---------- */
export function buildGround(KIT, { size = 900, seg = 220, amp = 1.6, seed = 4, color = '#4a4c36', rock = .0 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; const r = rng(seed); const ph = [r() * 10, r() * 10, r() * 10, r() * 10];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); const k = Math.min(1, d / 60); p.setY(i, (Math.sin(x * .021 + ph[0]) * Math.cos(z * .017 + ph[1]) * amp * 2 + Math.sin(x * .07 + ph[2]) * Math.sin(z * .06 + ph[3]) * amp * .5) * k); }
  geo.computeVertexNormals();
  const tex = KIT.canvasTex(1024, 1024, (g, w, h) => {
    const rr = rng(seed + 1); g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { const v = rr(); g.fillStyle = v < .4 ? `rgba(30,32,18,${.25 * rr()})` : v < .8 ? `rgba(120,118,70,${.18 * rr()})` : `rgba(140,128,96,${.2 * rr()})`; g.fillRect(rr() * w, rr() * h, 1 + rr() * 2, 2 + rr() * 6); }
    for (let i = 0; i < 90 * rock; i++) { g.fillStyle = `rgba(120,118,112,${.5 + rr() * .3})`; g.beginPath(); g.ellipse(rr() * w, rr() * h, 4 + rr() * 26, 3 + rr() * 14, rr() * 3, 0, 7); g.fill(); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(size / 14, size / 14);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .95 })); m.receiveShadow = true; return m;
}

/* ---------- 波尔杜：临时扇形天线 + 机房（局部坐标：两桅沿 x，扇面在 z=0 平面） ---------- */
export const POLDHU = { H: 48, SX: 30, NW: 54 };
export function buildPoldhu(KIT, pathLine) {
  const g = new THREE.Group(); const { H, SX, NW } = POLDHU;
  const wood = new THREE.MeshStandardMaterial({ color: 0x4f4234, roughness: .85, roughnessMap: KIT.grunge(41) });
  const iron = KIT.M.iron({ rough: .6 });
  for (const s of [-1, 1]) {
    const x = s * SX;
    g.add(mesh(new THREE.CylinderGeometry(.21, .34, 30, 20), wood, x, 15, 0));
    g.add(mesh(new THREE.CylinderGeometry(.1, .19, 20.5, 16), wood, x, 38.3, 0));
    for (const y of [28.6, 29.8]) g.add(mesh(new THREE.CylinderGeometry(.27, .27, .35, 20), iron, x, y, 0));
    const ct = mesh(new THREE.BoxGeometry(.2, .2, 4.2), wood, x, 30.1, 0); g.add(ct);
    g.add(mesh(new THREE.BoxGeometry(.45, .3, .45), iron, x, H + .1, 0));
    g.add(mesh(new THREE.BoxGeometry(1.6, .7, 1.6), new THREE.MeshStandardMaterial({ color: 0x77736c, roughness: .95 }), x, .3, 0));
  }
  const lines = [];
  const add = (pts, o) => { const m = pathLine(pts, o); g.add(m); lines.push(m); return m; };
  const cat = (a, b, sag, n = 16) => { const out = []; for (let i = 0; i <= n; i++) { const u = i / n; out.push(a.clone().lerp(b, u).add(V(0, -sag * 4 * u * (1 - u), 0))); } return out; };
  // 拉线（每根桅杆 3 层 × 4 方向，地锚）
  for (const s of [-1, 1]) for (const y of [H - .3, 30, 16]) for (const a of [0, 1, 2, 3]) {
    const ang = a * Math.PI / 2 + Math.PI / 4 + (s > 0 ? 0 : 0); const R = 26 + y * .2;
    add(cat(V(s * SX, y, 0), V(s * SX + Math.cos(ang) * R, 0, Math.sin(ang) * R), .4, 6), { width: 1.1, color: 0x34302b, opacity: .55 });
  }
  // 两桅顶之间的横拉索（悬链）
  const stay = (x) => V(x, H - .4 - 1.6 * (1 - (x / SX) ** 2), 0);
  add(Array.from({ length: 41 }, (_, i) => stay(-SX + 2 * SX * i / 40)), { width: 1.6, color: 0x2b2722, opacity: .85 });
  // 54 根扇形铜线：上端均布在横拉索上，下端汇聚到机房屋顶的引入绝缘子
  const C = V(0, 9.2, 1.2);
  for (let i = 0; i < NW; i++) { const x = -SX * .86 + 2 * SX * .86 * i / (NW - 1); const top = stay(x); add(cat(top, C, .25 + Math.abs(x) * .012, 10), { width: 1.15, color: 0x2a2520, opacity: .78 }); }
  // 机房（发射机 + 发电机）与附属小屋
  const hut = buildHut(KIT, { w: 16, d: 7, h: 3.6, ridge: 2.2, seed: 11, winN: 5 }); hut.group.position.set(0, 0, -1.5); g.add(hut.group);
  const shed = buildHut(KIT, { w: 7, d: 5, h: 3, ridge: 1.6, seed: 23, winN: 2, chimney: false }); shed.group.position.set(-15, 0, -6); shed.group.rotation.y = .08; g.add(shed.group);
  const ins = mesh(new THREE.CylinderGeometry(.12, .16, .6, 16), KIT.M.ceramic(0xe8e4da), 0, 8.4, 1.2); g.add(ins);
  return { group: g, lines, lead: C, fanMid: V(-8, 27, 0), mastTop: V(SX, H, 0), mastBase: V(SX, 0, 0), hut: V(0, 4.5, -1.5) };
}

/* ---------- 风筝：六角「Levitor」式，竹骨 + 清漆布面；正面（+z，牵引侧）朝向放飞者 ---------- */
export function buildKite(KIT) {
  const g = new THREE.Group();
  const hex = [[0, 1.35], [.82, .68], [.82, -.68], [0, -1.35], [-.82, -.68], [-.82, .68]].map(p => V(p[0], p[1], 0));
  const perim = u => { const n = hex.length, f = u * n, i = Math.floor(f) % n, k = f - Math.floor(f); return hex[i].clone().lerp(hex[(i + 1) % n], k); };
  const S = 72, K = 10, pos = [], uv = [], idx = [];
  for (let k = 0; k <= K; k++) for (let i = 0; i <= S; i++) {
    const rk = k / K, p = perim(i / S).multiplyScalar(rk);
    const sag = (1 - rk * rk) * .17 + Math.sin(i / S * Math.PI * 12) * .01 * rk * (1 - rk) * 4;
    pos.push(p.x, p.y, -sag); uv.push(p.x / 1.7 + .5, p.y / 2.7 + .5);
  }
  for (let k = 0; k < K; k++) for (let i = 0; i < S; i++) { const a = k * (S + 1) + i, b = a + S + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const cloth = KIT.canvasTex(512, 768, (c, w, h) => {
    const r = rng(8); c.fillStyle = '#d3c6a6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${r() < .5 ? '90,76,50' : '255,248,230'},${r() * .06})`; c.fillRect(r() * w, r() * h, 1, 3 + r() * 8); }
    c.strokeStyle = 'rgba(110,92,62,.55)'; c.lineWidth = 3; for (const y of [.25, .5, .75]) { c.beginPath(); c.moveTo(0, h * y); c.lineTo(w, h * y); c.stroke(); }
    for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(80,66,40,${.05 + r() * .08})`; c.beginPath(); c.ellipse(r() * w, r() * h, 20 + r() * 60, 10 + r() * 40, r() * 3, 0, 7); c.fill(); }
  });
  const fab = new THREE.MeshPhysicalMaterial({ map: cloth, roughness: .82, sheen: .5, sheenColor: new THREE.Color(0xfff0d0), side: THREE.DoubleSide, emissive: new THREE.Color(0x3a3428), emissiveIntensity: .25 });
  const sail = new THREE.Mesh(geo, fab); sail.castShadow = true; g.add(sail);
  const bamboo = new THREE.MeshStandardMaterial({ color: 0xa88a55, roughness: .55 });
  const rod = (a, b, r) => { const d = b.clone().sub(a), L = d.length(); const m = mesh(new THREE.CylinderGeometry(r, r, L, 10), bamboo); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(m); return m; };
  rod(V(0, -1.38, .02), V(0, 1.38, .02), .014); rod(V(-.84, .68, .03), V(.84, .68, .03), .011); rod(V(-.84, -.68, .03), V(.84, -.68, .03), .011);
  const cord = new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: .8 });
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...hex, hex[0]].map(p => p.clone().add(V(0, 0, .01))), false, 'centripetal'), 120, .006, 5), cord));
  const tow = V(0, .3, 1.05);
  for (const a of [V(0, .95, .02), V(0, -.95, .02), V(.6, 0, .03), V(-.6, 0, .03)]) g.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, tow), 2, .0035, 4), cord));
  return { group: g, tow };
}

/* ---------- 暴风云天空：方向 → 云平面投影 fbm；uTime 驱动漂移 ---------- */
export function stormSky({ radius = 1500, k = 1 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uK: { value: k } },
    vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vD;uniform float uTime,uK;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),u.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<8;i++){s+=a*vn(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return s;}
void main(){vec3 d=normalize(vD);float h=max(d.y,0.);
 vec2 p=d.xz/(h+.16)*2.4;vec2 w=vec2(uTime*.11,-uTime*.07);
 float n=fbm(p+w);float n2=fbm(p*2.6-w*1.6+4.3);
 float c=smoothstep(.36,.72,n*.78+n2*.32);
 vec3 base=mix(vec3(.30,.31,.32),vec3(.16,.175,.195),smoothstep(0.,.7,h));
 float shade=smoothstep(.25,.85,n2*.6+n*.5);
 vec3 cl=mix(vec3(.055,.06,.068),vec3(.40,.405,.41),shade);
 vec3 col=mix(base,cl,c*.92);
 col=mix(col,vec3(.33,.34,.35),exp(-h*7.)*.75);
 gl_FragColor=vec4(col*uK,1.);}`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat); m.renderOrder = -10; m.frustumCulled = false;
  return { mesh: m, set(t) { mat.uniforms.uTime.value = t; } };
}

/* ---------- 卡伯特塔（1900 年落成，信号山地标）：石砌方塔 + 八角角楼，远景剪影即可 ---------- */
export function buildCabotTower(KIT) {
  const g = new THREE.Group(); const stone = new THREE.MeshStandardMaterial({ color: 0x7b766c, roughness: .95, roughnessMap: KIT.grunge(61) });
  g.add(mesh(new THREE.BoxGeometry(8, 13, 8), stone, 0, 6.5, 0));
  const tur = mesh(new THREE.CylinderGeometry(2.2, 2.2, 17, 8), stone, 3.6, 8.5, 3.6); g.add(tur);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(mesh(new THREE.BoxGeometry(.8, .9, .8), stone, 3.6 + Math.cos(a) * 2.1, 17.4, 3.6 + Math.sin(a) * 2.1)); }
  for (let i = 0; i < 12; i++) { const s = i % 3, side = Math.floor(i / 3); const off = -2.6 + s * 2.6; const p = [[off, 4], [4, off], [off, -4], [-4, off]][side]; g.add(mesh(new THREE.BoxGeometry(1, 1, 1), stone, p[0], 13.5, p[1])); }
  return g;
}
