/* 共享工具包：环境光 / 影棚布光 / 写实材质 / 程序化磨损贴图 / 照片镜头 / 光路线 / 粒子 / 模型加载。
   章节里通过 ctx.KIT 使用。物理光照单位：three r155+ 的物理光（点光源/聚光灯强度为坎德拉，平行光为勒克斯量级）。 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as A from './assets.js';
import { W, H } from './hud.js';
import { clamp, lerp, rng, ss, easeIO } from './util.js';

export { RoundedBoxGeometry };
let R = null; export function init(r) { R = r; }

/* ================= 环境与布光 ================= */
let roomEnvTex = null;
/** 通用中性影棚环境（程序化，不需要文件） */
export function roomEnv(scene, intensity = .6) { if (!roomEnvTex) roomEnvTex = A.envFromScene(new RoomEnvironment(), .04); scene.environment = roomEnvTex; scene.environmentIntensity = intensity; return roomEnvTex; }
/** HDRI 环境光（可选作为背景，bgBlur 0–1 模糊程度） */
export async function hdri(scene, file, { intensity = 1, rotation = 0, background = false, bgBlur = 0, bgIntensity = 1 } = {}) {
  const e = await A.env(file); scene.environment = e; scene.environmentIntensity = intensity; scene.environmentRotation.set(0, rotation, 0);
  if (background) { scene.background = bgBlur > 0 ? e : await A.hdrTex(file); scene.backgroundBlurriness = bgBlur; scene.backgroundIntensity = bgIntensity; scene.backgroundRotation.set(0, rotation, 0); }
  return e;
}
/** 按名字在 assets/hdri 里找 HDRI 文件（优先 2k） */
export function hdriFile(name) { const fs = A.find(new RegExp(`^assets/hdri/.*${name}.*\\.(hdr|exr)$`, 'i')); return fs.find(f => /2k/i.test(f)) || fs.find(f => /1k/i.test(f)) || fs[0] || null; }

/** 暗色无缝影棚：弧形背景 + 主光（带柔和阴影）+ 补光 + 轮廓光。返回各灯与背景，方便章节微调。 */
export function studio(scene, { bg = 0x0c0d0f, key = 160, fill = 18, rim = 90, keyPos = [5, 7, 6], rimPos = [-6, 4, -6], fillPos = [-6, 2, 5], target = [0, 0, 0], floorY = -1, size = 60, env = .25, shadowRadius = 6, keyColor = 0xfff4e8, rimColor = 0xdfeaff } = {}) {
  roomEnv(scene, env);
  scene.background = new THREE.Color(bg);
  const cyc = cyclorama({ color: bg, size, y: floorY }); scene.add(cyc);
  const tgt = new THREE.Object3D(); tgt.position.fromArray(target); scene.add(tgt);
  const k = new THREE.SpotLight(keyColor, key, 0, Math.PI / 6, .7, 2); k.position.fromArray(keyPos); k.target = tgt; k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); k.shadow.radius = shadowRadius; k.shadow.bias = -.0002; k.shadow.normalBias = .02; k.shadow.camera.near = .5; k.shadow.camera.far = 60; scene.add(k);
  const f = new THREE.PointLight(0xe8eeff, fill, 0, 2); f.position.fromArray(fillPos); scene.add(f);
  const r = new THREE.SpotLight(rimColor, rim, 0, Math.PI / 5, .8, 2); r.position.fromArray(rimPos); r.target = tgt; scene.add(r);
  return { key: k, fill: f, rim: r, cyc, target: tgt };
}
/** 弧形背景（地面平滑过渡到背墙），接收阴影 */
export function cyclorama({ color = 0x0c0d0f, size = 40, y = -1, curve = 6, rough = .85 } = {}) {
  const sh = new THREE.Shape(); const w = size;
  const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; pts.push(new THREE.Vector2(-Math.sin(a) * curve, curve - Math.cos(a) * curve)); }
  const prof = [new THREE.Vector2(w, 0), new THREE.Vector2(0, 0), ...pts.slice(1), new THREE.Vector2(-curve, w)];
  const geo = new THREE.BufferGeometry(); const pos = [], idx = [], nrm = [];
  for (let i = 0; i < prof.length; i++) for (const x of [-w, w]) { pos.push(x, prof[i].y + y, prof[i].x - w * .3); nrm.push(0, 1, 0); }
  for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 })); m.receiveShadow = true; return m;
}
/** 只接收阴影的透明地面 */
export function shadowCatcher(size = 30, opacity = .45) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; }

/* ================= 程序化纹理 ================= */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
/** 磨损/指纹/划痕的粗糙度调制贴图（灰度，均值约 0.85，用作 roughnessMap） */
const grungeCache = {};
export function grunge(seed = 1, { size = 1024, scratches = 60, smudges = 18, base = 210, contrast = 1 } = {}) {
  const key = [seed, size, scratches, smudges, base, contrast].join(); if (grungeCache[key]) return grungeCache[key];
  const [c, g] = canvas(size, size), r = rng(seed);
  g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, 0, size, size);
  // 低频斑驳
  for (let i = 0; i < 260; i++) { const x = r() * size, y = r() * size, rad = (20 + r() * 140) * size / 1024, v = (r() - .5) * 46 * contrast; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  // 指纹/擦拭（更光滑 = 更暗）
  for (let i = 0; i < smudges; i++) { const x = r() * size, y = r() * size, rad = (30 + r() * 60) * size / 1024; g.save(); g.translate(x, y); g.rotate(r() * 6.28); g.strokeStyle = 'rgba(0,0,0,.05)'; g.lineWidth = 1.2; for (let k = 0; k < 22; k++) { g.beginPath(); g.ellipse(0, 0, rad * (k / 22), rad * .7 * (k / 22), 0, 0, Math.PI * 2); g.stroke(); } g.restore(); }
  // 细划痕
  for (let i = 0; i < scratches; i++) { const x = r() * size, y = r() * size, a = r() * 6.28, L = (20 + r() * 220) * size / 1024; g.strokeStyle = `rgba(255,255,255,${.06 + r() * .12})`; g.lineWidth = .6 + r() * .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  // 颗粒
  const im = g.getImageData(0, 0, size, size), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * 14 * contrast; d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = d[i]; d[i + 2] = d[i]; } g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; grungeCache[key] = t; return t;
}
/** 拉丝金属的各向异性纹理（用作 roughnessMap / normal 细节的替代） */
export function brushed(seed = 2, size = 1024) {
  const [c, g] = canvas(size, size), r = rng(seed); g.fillStyle = 'rgb(200,200,200)'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) { const y = r() * size, v = 150 + r() * 100; g.strokeStyle = `rgba(${v},${v},${v},.25)`; g.lineWidth = r() * 1.5; g.beginPath(); g.moveTo(0, y); g.lineTo(size, y + (r() - .5) * 4); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t;
}
/** 用 Canvas2D 画一张贴图（例如手机屏幕、纸张、网页） */
export function canvasTex(w, h, draw, { srgb = true, aniso = 8 } = {}) { const [c, g] = canvas(w, h); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = aniso; t.userData.canvas = c; t.userData.g = g; return t; }

/* ================= 写实材质预设 =================
   颜色是线性空间里的金属 F0 / 漫反射率（来自实测数据），粗糙度用 grunge 调制，避免「塑料感」与「完美镜面」。 */
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
function metal(color, rough, o = {}) { return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, roughnessMap: o.grunge === false ? null : grunge(o.seed || 3), envMapIntensity: 1, ...o.extra }); }
export const M = {
  brass: (o = {}) => metal(lin(.91, .78, .42), o.rough ?? .3, o),
  oldBrass: (o = {}) => metal(lin(.72, .55, .28), o.rough ?? .42, { ...o, seed: 5 }),
  copper: (o = {}) => metal(lin(.95, .64, .54), o.rough ?? .3, o),
  gold: (o = {}) => metal(lin(1, .77, .34), o.rough ?? .22, o),
  steel: (o = {}) => metal(lin(.56, .57, .58), o.rough ?? .32, o),
  aluminium: (o = {}) => metal(lin(.91, .92, .92), o.rough ?? .35, o),
  chrome: (o = {}) => metal(lin(.55, .55, .55), o.rough ?? .08, o),
  iron: (o = {}) => metal(lin(.33, .32, .31), o.rough ?? .55, o),
  /** 漆面（color 为 sRGB 十六进制） */
  paint: (color = 0x15171a, o = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: o.rough ?? .45, roughnessMap: grunge(o.seed || 7), clearcoat: o.clearcoat ?? .3, clearcoatRoughness: .35, ...o.extra }),
  plastic: (color = 0x111214, o = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: o.rough ?? .38, roughnessMap: grunge(o.seed || 9, { contrast: .6 }), ...o.extra }),
  rubber: (color = 0x0b0b0c, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: .85, ...o.extra }),
  ceramic: (color = 0xeeeae2, o = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: .35, clearcoat: .6, clearcoatRoughness: .2, ...o.extra }),
  /** 透明玻璃（需要背后有东西才好看；thickness 影响折射） */
  glass: (o = {}) => new THREE.MeshPhysicalMaterial({ color: o.color ?? 0xffffff, metalness: 0, roughness: o.rough ?? .04, transmission: 1, thickness: o.thickness ?? .4, ior: o.ior ?? 1.5, attenuationColor: o.tint ?? 0xffffff, attenuationDistance: o.attDist ?? 5, specularIntensity: 1, envMapIntensity: 1, transparent: false, ...o.extra }),
  /** 自发光（HDR 强度 k > 1 时才会产生辉光） */
  emissive: (color = 0xffaa66, k = 1, o = {}) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: k, roughness: 1, metalness: 0, ...o.extra }),
  silicon: (o = {}) => new THREE.MeshPhysicalMaterial({ color: lin(.34, .36, .40), metalness: .55, roughness: .18, iridescence: .6, iridescenceIOR: 1.8, iridescenceThicknessRange: [200, 700], ...o.extra }),
  pcb: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0x0f3a24, metalness: 0, roughness: .4, clearcoat: .8, clearcoatRoughness: .25, ...o.extra }),
};
/** Poly Haven 贴图组材质（assets/tex/<id>/），失败时退回纯色 */
export async function pbr(id, { repeat = 1, color = 0x777777, extra = {}, physical = false } = {}) {
  const maps = await A.pbrMaps(id, { repeat }).catch(() => ({}));
  const C = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  return new C({ color: maps.map ? 0xffffff : color, ...maps, metalness: maps.metalnessMap ? 1 : 0, roughness: 1, ...extra });
}

/* ================= 照片镜头 =================
   photoShot(file, {from, to, grade}) → { scene, camera, update(t01) }：全屏照片 + 慢推拉（Ken Burns）。
   from/to = {x, y, s}：中心偏移（-1..1，相对可移动范围）与放大倍数（≥1）。 */
export async function photoShot(file, { from = { x: 0, y: 0, s: 1.04 }, to = { x: 0, y: 0, s: 1.14 }, bg = 0x000000, fit = 'cover', margin = 0 } = {}) {
  const tex = await A.tex(file, { aniso: 16 });
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg);
  const camera = new THREE.OrthographicCamera(-W / H, W / H, 1, -1, -10, 10); camera.position.z = 5;
  const ia = tex.image.width / tex.image.height, fa = W / H;
  let w, h; if ((fit === 'cover') === (ia > fa)) { h = 2; w = h * ia; } else { w = 2 * fa; h = w / ia; }
  if (fit === 'contain') { const k = 1 - margin; w *= k; h *= k; }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scene.add(mesh);
  return {
    scene, camera, mesh, tex, aspect: ia,
    update(u) {
      const e = easeIO(clamp(u)), s = lerp(from.s, to.s, e), x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e);
      mesh.scale.setScalar(s);
      const mx = Math.max(0, (w * s - 2 * fa) / 2), my = Math.max(0, (h * s - 2) / 2);
      mesh.position.set(-x * mx, -y * my, 0);
    },
  };
}
/** 照片做成实体相纸（白边 + 轻微卷曲），放进 3D 场景里 */
export function photoPrint(tex, { width = 3, border = .06, curl = .04, back = 0xe9e4d8 } = {}) {
  const ia = tex.image.width / tex.image.height, h = width / ia;
  const grp = new THREE.Group();
  const geo = new THREE.PlaneGeometry(width + border * 2, h + border * 2, 32, 32); const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / (width / 2 + border); pos.setZ(i, curl * x * x); } geo.computeVertexNormals();
  const paper = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: back, roughness: .7, sheen: .3 })); paper.castShadow = paper.receiveShadow = true; grp.add(paper);
  const pg = new THREE.PlaneGeometry(width, h, 32, 32); const pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) / (width / 2 + border); pp.setZ(i, curl * x * x + .0015); } pg.computeVertexNormals();
  const img = new THREE.Mesh(pg, new THREE.MeshPhysicalMaterial({ map: tex, roughness: .35, clearcoat: .4, clearcoatRoughness: .3 })); img.receiveShadow = true; grp.add(img);
  return grp;
}

/* ================= 光路线（屏幕空间等宽线，带「画出」与流动脉冲） =================
   pathLine(points, {width(px@1080p), color, opacity, intensity, head, tail, pulse, pulseSpeed, pulseLen, dash, additive, depthTest})
   - head/tail: 0..1 控制显示的弧长区间（做「画出来」的动画）；
   - pulse: 流动亮脉冲的强度（0 = 无）；intensity >1 会进入辉光（请克制）。 */
const PL_VS = `attribute vec3 aPrev,aNext;attribute float aSide,aU;uniform vec2 uRes;uniform float uWidth;varying float vU,vSide;
void main(){vU=aU;vSide=aSide;
 vec4 c=projectionMatrix*modelViewMatrix*vec4(position,1.);vec4 p=projectionMatrix*modelViewMatrix*vec4(aPrev,1.);vec4 n=projectionMatrix*modelViewMatrix*vec4(aNext,1.);
 vec2 cs=c.xy/c.w*uRes,ps=p.xy/p.w*uRes,ns=n.xy/n.w*uRes;vec2 d1=normalize(cs-ps+1e-6),d2=normalize(ns-cs+1e-6);vec2 d=normalize(d1+d2+1e-6);if(length(cs-ps)<1e-4)d=d2;if(length(ns-cs)<1e-4)d=d1;
 vec2 nr=vec2(-d.y,d.x);float w=uWidth*uRes.y/1080.;c.xy+=nr*aSide*w*.5/uRes*c.w*2.;gl_Position=c;}`;
const PL_FS = `uniform vec3 uColor;uniform float uOp,uHead,uTail,uPulse,uPulseSpeed,uPulseLen,uTime,uDash,uK,uGlowHead;varying float vU,vSide;
void main(){if(vU>uHead||vU<uTail)discard;
 float edge=1.-smoothstep(.6,1.,abs(vSide));
 float k=uK;
 if(uPulse>0.){float x=fract(vU*uPulseLen-uTime*uPulseSpeed);k+=uPulse*pow(x,8.)*(1.-smoothstep(.92,1.,x));}
 if(uDash>0.){if(fract(vU*uDash)>.55)discard;}
 k+=uGlowHead*smoothstep(.025,0.,uHead-vU)*step(uHead,.999);
 gl_FragColor=vec4(uColor*k,uOp*edge);}`;
export function pathLine(points, o = {}) {
  const n = points.length, pos = [], prev = [], next = [], side = [], u = [], idx = [];
  let L = 0; const acc = [0]; for (let i = 1; i < n; i++) { L += points[i].distanceTo(points[i - 1]); acc.push(L); }
  for (let i = 0; i < n; i++) {
    const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    for (const s of [-1, 1]) { pos.push(p.x, p.y, p.z); prev.push(a.x, a.y, a.z); next.push(b.x, b.y, b.z); side.push(s); u.push(L ? acc[i] / L : 0); }
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aPrev', new THREE.Float32BufferAttribute(prev, 3)); g.setAttribute('aNext', new THREE.Float32BufferAttribute(next, 3));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1)); g.setAttribute('aU', new THREE.Float32BufferAttribute(u, 1)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    vertexShader: PL_VS, fragmentShader: PL_FS, transparent: true, depthWrite: false, depthTest: o.depthTest ?? true,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
    uniforms: { uRes: { value: new THREE.Vector2(W, H) }, uWidth: { value: o.width ?? 2 }, uColor: { value: new THREE.Color(o.color ?? 0xffffff) }, uOp: { value: o.opacity ?? 1 }, uHead: { value: o.head ?? 1 }, uTail: { value: o.tail ?? 0 }, uPulse: { value: o.pulse ?? 0 }, uPulseSpeed: { value: o.pulseSpeed ?? .5 }, uPulseLen: { value: o.pulseLen ?? 3 }, uTime: { value: 0 }, uDash: { value: o.dash ?? 0 }, uK: { value: o.intensity ?? 1 }, uGlowHead: { value: o.glowHead ?? 0 } },
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = o.renderOrder ?? 2; mesh.userData.length = L;
  mesh.onBeforeRender = (r) => { const s = r.getDrawingBufferSize(_v2); const t = r.getRenderTarget(); if (t) m.uniforms.uRes.value.set(t.width, t.height); else m.uniforms.uRes.value.copy(s); };
  /** 便捷设置 */
  mesh.set = (k) => { for (const key in k) { const U = 'u' + key[0].toUpperCase() + key.slice(1); if (m.uniforms[U]) { if (m.uniforms[U].value.isColor) m.uniforms[U].value.set(k[key]); else m.uniforms[U].value = k[key]; } } return mesh; };
  return mesh;
}
const _v2 = new THREE.Vector2();

/* ================= 粒子（圆形柔边点，像素尺寸） ================= */
const PT_VS = `attribute float aSize;attribute vec3 aColor;attribute float aAlpha;uniform float uSize,uScale,uAtten;varying vec3 vC;varying float vA;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;vC=aColor;vA=aAlpha;float s=uSize*aSize*uScale;gl_PointSize=uAtten>0.?s*uAtten/-mv.z:s;}`;
const PT_FS = `uniform vec3 uColor;uniform float uOp,uK,uSoft;varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=1.-smoothstep(1.-uSoft,1.,d);if(a<=0.)discard;gl_FragColor=vec4(uColor*vC*uK,a*uOp*vA);}`;
/** points(Float32Array 位置, {size(px@1080p), color, opacity, intensity, additive, atten(距离衰减参考距离，0=不衰减), soft}) */
export function points(posArr, o = {}) {
  const n = posArr.length / 3, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(o.sizes || new Float32Array(n).fill(1), 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(o.colors || new Float32Array(n * 3).fill(1), 3));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(o.alphas || new Float32Array(n).fill(1), 1));
  const m = new THREE.ShaderMaterial({ vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uSize: { value: o.size ?? 3 }, uScale: { value: 1 }, uAtten: { value: o.atten ?? 0 }, uColor: { value: new THREE.Color(o.color ?? 0xffffff) }, uOp: { value: o.opacity ?? 1 }, uK: { value: o.intensity ?? 1 }, uSoft: { value: o.soft ?? .6 } } });
  const p = new THREE.Points(g, m); p.frustumCulled = false;
  p.onBeforeRender = r => { const t = r.getRenderTarget(); m.uniforms.uScale.value = (t ? t.height : r.getDrawingBufferSize(_v2).y) / 1080; };
  return p;
}

/* ================= 模型 ================= */
/** 加载 glTF 并返回克隆（开启阴影）；size = 把最大边缩放到该尺寸；center = 底部居中到原点 */
export async function model(url, { size = null, center = true, shadows = true } = {}) {
  const gl = await A.gltf(url); const root = gl.scene.clone(true);
  root.traverse(o => { if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = shadows; if (o.material) o.material = o.material.clone(); } });
  if (size || center) {
    const b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = size ? size / Math.max(s.x, s.y, s.z) : 1; root.scale.multiplyScalar(k);
    if (center) root.position.set(-c.x * k, -b.min.y * k, -c.z * k);
    const wrap = new THREE.Group(); wrap.add(root); return wrap;
  }
  return root;
}
/** 圆角盒 */
export const rbox = (w, h, d, r = .05, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, r);
/** 透视相机（16:9），fov 为垂直视角 */
export const cam = (fov = 35, near = .05, far = 2000) => new THREE.PerspectiveCamera(fov, W / H, near, far);
/** 由焦距（mm，35mm 全画幅）换算垂直视角 */
export const fovFromMM = mm => 2 * Math.atan(12 / mm) * 180 / Math.PI;
