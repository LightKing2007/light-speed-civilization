'use strict';
/* ============ math & util ============ */
const D2R = Math.PI / 180;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const win = (t, a, b, f = .6) => ss(a, a + f, t) * (1 - ss(b - f, b, t));
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const $ = id => document.getElementById(id);
const fmtInt = n => Math.round(n).toLocaleString('en-US');

/* ============ renderer & post ============ */
const canvas = $('gl');
const RENDER = location.hash === '#render';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: RENDER });
const PR = Math.min(window.devicePixelRatio || 1, 1.6);
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputEncoding = THREE.LinearEncoding;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03050a);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .05, 800);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), .04).texture;
scene.add(new THREE.HemisphereLight(0x9fb8ff, 0x0a0604, .5));
const keyLight = new THREE.DirectionalLight(0xffffff, .9); keyLight.position.set(6, 10, 8); scene.add(keyLight);

const rt = new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType });
const composer = new THREE.EffectComposer(renderer, rt);
composer.setPixelRatio(PR);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new THREE.RenderPass(scene, camera));
const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 1.1, .55, .62);
composer.addPass(bloom);
const finalPass = new THREE.ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAb: { value: .0011 }, uGrain: { value: .03 }, uVig: { value: .9 }, uExpo: { value: 1.15 }, uFlash: { value: 0 }, uWarp: { value: 0 }, uTint: { value: new THREE.Color(1, .8, .6) } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uAb,uGrain,uVig,uExpo,uFlash,uWarp;uniform vec3 uTint;varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec2 c=vUv-.5;float d=length(c);float ab=uAb+uWarp*.014;vec3 col=vec3(0.);float n=uWarp>.01?10.:1.;
  for(int k=0;k<10;k++){if(float(k)>=n)break;float s=1.-float(k)*uWarp*.03;vec2 uv=.5+c*s;vec2 off=c*ab*(.4+d*2.);
  col+=vec3(texture2D(tDiffuse,uv+off).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-off).b);}
  col/=n;
  col=vec3(1.)-exp(-col*uExpo);
  col*=mix(1.,smoothstep(.95,.25,d),uVig);
  col+=uTint*uWarp*uWarp*.45*smoothstep(.8,0.,d);
  col+=(hash(vUv*vec2(1733.,977.)+fract(uTime*7.1)*91.)-.5)*uGrain;
  col=mix(col,vec3(1.,.97,.92),uFlash);
  gl_FragColor=vec4(col,1.);}`
});
composer.addPass(finalPass);

const UPX = { value: 1 };            // pixels per world unit at distance 1 — shared by every point material
const TIMED = [];                     // shader materials whose uTime follows the clock
function updUPX() { UPX.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan(camera.fov * D2R / 2)); }

/* ============ shared textures & factories ============ */
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.12, 'rgba(255,255,255,.85)'); r.addColorStop(.35, 'rgba(255,255,255,.22)'); r.addColorStop(.7, 'rgba(255,255,255,.04)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
function glow(color = 0xffffff, size = 1, intensity = 1.6) {
  const m = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(color).multiplyScalar(intensity), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const s = new THREE.Sprite(m); s.scale.setScalar(size); return s;
}
function textTex(txt, { font = '600 92px "JetBrains Mono", monospace', color = '#fff', w = 128, h = 128, bg = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function textSprite(txt, color = 0xffffff, size = 1, intensity = 2) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex(txt), color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size); return s;
}
function hdr(color, k) { return new THREE.Color(color).multiplyScalar(k); }
function lineMat(color, op = 1, k = 1) { return new THREE.LineBasicMaterial({ color: hdr(color, k), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }); }
function edges(geo, color, op = 1, k = 1.4) { return new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat(color, op, k)); }
function polyline(pts, color, op = 1, k = 1) { const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(g, lineMat(color, op, k)); l.frustumCulled = false; return l; }

const PT_VS = `attribute float aSeed,aDelay;attribute vec3 aCol;uniform float uTime,uSize,uFlick,uReveal,uPx;uniform vec3 uColor;varying vec3 vCol;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
float rv=smoothstep(aDelay,aDelay+.6,uReveal);
float f=1.-uFlick*(.5+.5*sin(uTime*(2.+aSeed*9.)+aSeed*60.));
vCol=uColor*aCol*f*rv;
gl_PointSize=min(64.,uSize*uPx/-mv.z*(.65+.7*fract(aSeed*13.7))*mix(.3,1.,rv));}`;
const PT_FS = `uniform float uOp;varying vec3 vCol;void main(){vec2 d=gl_PointCoord-.5;float a=smoothstep(.5,0.,length(d));a*=a;gl_FragColor=vec4(vCol*a*uOp,1.);}`;
function mkPoints(pos, { color = 0xffffff, size = .1, opacity = 1, flicker = 0, cols = null, delays = null, seeds = null, k = 1.5 } = {}) {
  const n = pos.length / 3, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (!seeds) { seeds = new Float32Array(n); for (let i = 0; i < n; i++) seeds[i] = Math.random(); }
  if (!cols) { cols = new Float32Array(n * 3).fill(1); }
  if (!delays) delays = new Float32Array(n);
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  g.setAttribute('aCol', new THREE.BufferAttribute(cols, 3));
  g.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: hdr(color, k) }, uSize: { value: size }, uOp: { value: opacity }, uFlick: { value: flicker }, uReveal: { value: 1e5 }, uPx: UPX },
    vertexShader: PT_VS, fragmentShader: PT_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  TIMED.push(m);
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}
/* glowing line with travelling pulses; uHead draws it on */
function flowLine(pts, o = {}) {
  const n = pts.length, pos = new Float32Array(n * 3), at = new Float32Array(n); let L = 0;
  for (let i = 0; i < n; i++) { if (i) L += pts[i].distanceTo(pts[i - 1]); at[i] = L; pos[i * 3] = pts[i].x; pos[i * 3 + 1] = pts[i].y; pos[i * 3 + 2] = pts[i].z; }
  for (let i = 0; i < n; i++) at[i] /= (L || 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(at, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHead: { value: o.head ?? 1 }, uColor: { value: hdr(o.color ?? 0xffffff, 1) }, uOp: { value: o.opacity ?? 1 }, uDash: { value: o.dash ?? Math.max(1, L / 3) }, uSpeed: { value: o.speed ?? .5 }, uBase: { value: o.base ?? .3 }, uPulse: { value: o.pulse ?? 1.8 }, uSharp: { value: o.sharp ?? 8 } },
    vertexShader: 'attribute float aT;varying float vT;void main(){vT=aT;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uTime,uHead,uOp,uDash,uSpeed,uBase,uPulse,uSharp;uniform vec3 uColor;varying float vT;
    void main(){if(vT>uHead+.0001)discard;float p=pow(fract(vT*uDash-uTime*uSpeed),uSharp);float hd=smoothstep(.04,0.,uHead-vT)*(1.-step(.999,uHead));
    gl_FragColor=vec4(uColor*(uBase+p*uPulse+hd*3.)*uOp,1.);}`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
  });
  TIMED.push(m);
  const l = new THREE.Line(g, m); l.frustumCulled = false; l.userData.len = L; return l;
}
/* constant-speed sampling along a polyline */
class Path {
  constructor(pts) { this.p = pts; this.c = [0]; for (let i = 1; i < pts.length; i++) this.c.push(this.c[i - 1] + pts[i].distanceTo(pts[i - 1])); this.L = this.c[this.c.length - 1]; }
  at(u, out = V()) {
    const d = clamp(u, 0, 1) * this.L; let lo = 0, hi = this.c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.c[m] < d) lo = m; else hi = m; }
    const seg = this.c[hi] - this.c[lo] || 1; return out.copy(this.p[lo]).lerp(this.p[hi], (d - this.c[lo]) / seg);
  }
}
/* lightning between a and b */
function makeSpark(a, b, color = 0xcfe8ff, amp = .12) {
  const grp = new THREE.Group(), segs = 16, lines = [];
  for (let k = 0; k < 3; k++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segs + 1) * 3), 3)); const l = new THREE.Line(g, lineMat(color, k ? .55 : 1, 5)); l.frustumCulled = false; grp.add(l); lines.push(l); }
  const gl = glow(color, 1, 2.2); grp.add(gl);
  const dir = b.clone().sub(a), len = dir.length(); const u = V(1, 0, 0); if (Math.abs(dir.clone().normalize().x) > .9) u.set(0, 0, 1);
  const w1 = dir.clone().cross(u).normalize(), w2 = dir.clone().cross(w1).normalize();
  const mid = a.clone().lerp(b, .5);
  return {
    grp, set(on, scale = 1) {
      grp.visible = on; if (!on) return;
      for (const l of lines) { const arr = l.geometry.attributes.position.array; for (let i = 0; i <= segs; i++) { const f = i / segs, env = Math.sin(Math.PI * f); const p = a.clone().addScaledVector(dir, f).addScaledVector(w1, (Math.random() - .5) * amp * len * env * 2).addScaledVector(w2, (Math.random() - .5) * amp * len * env * 2); arr.set([p.x, p.y, p.z], i * 3); } l.geometry.attributes.position.needsUpdate = true; }
      gl.position.copy(mid); gl.scale.setScalar(len * (1.6 + Math.random() * 1.6) * scale);
    }
  };
}
/* the converging / exploding particle swarm (prologue & finale) */
function makeSwarm(N = 7000, colA = 0xff9d52, colB = 0xbfefff) {
  const st = new Float32Array(N * 3), sd = new Float32Array(N), r = rng(11);
  for (let i = 0; i < N; i++) { const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), R = 22 + Math.pow(r(), .7) * 60; st.set([s * Math.cos(th) * R, u * R * .8, s * Math.sin(th) * R], i * 3); sd[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(st, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uPx: UPX, uA: { value: hdr(colA, 1.6) }, uB: { value: hdr(colB, 2.2) }, uOp: { value: 1 } },
    vertexShader: `attribute float aSeed;uniform float uP,uTime,uPx;uniform vec3 uA,uB;varying vec3 vC;
    void main(){float d=aSeed*.45;float p=clamp((uP-d)/(1.-d),0.,1.);p=p*p*(3.-2.*p);
    vec3 s=position;float ang=p*p*5.+uTime*.04*(1.+aSeed);float r=mix(length(s),.15+aSeed*.5,p);vec3 dir=normalize(s);
    float c=cos(ang),sn=sin(ang);dir=vec3(dir.x*c-dir.z*sn,dir.y*mix(1.,.3,p),dir.x*sn+dir.z*c);
    vec4 mv=modelViewMatrix*vec4(dir*r,1.);gl_Position=projectionMatrix*mv;
    gl_PointSize=min(40.,(.1+.12*fract(aSeed*91.))*uPx/-mv.z*(1.+p));
    vC=mix(uA,uB,p*fract(aSeed*7.3))*(.35+.65*p+.3*sin(uTime*2.+aSeed*50.));}`,
    fragmentShader: `uniform float uOp;varying vec3 vC;void main(){float a=smoothstep(.5,0.,length(gl_PointCoord-.5));gl_FragColor=vec4(vC*a*a*uOp,1.);}`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  TIMED.push(m); const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}

/* ============ globe ============ */
function b64bits(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
const LAND = b64bits(LAND_B64);
function isLand(lat, lon) { const r = clamp(Math.floor(90 - lat), 0, 179), c = ((Math.floor(lon + 180) % 360) + 360) % 360, i = r * 360 + c; return (LAND[i >> 3] >> (7 - (i & 7))) & 1; }
function ll(lat, lon, r = 10) { const phi = (90 - lat) * D2R, th = (lon + 180) * D2R; return V(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); }
function slerpV(a, b, t) { const ang = a.angleTo(b); if (ang < 1e-6) return a.clone(); const s = Math.sin(ang); return a.clone().multiplyScalar(Math.sin((1 - t) * ang) / s).add(b.clone().multiplyScalar(Math.sin(t * ang) / s)); }
function gcArc(a, b, r = 10.05, h = 0, n = 96) { const A = ll(a[0], a[1], 1), B = ll(b[0], b[1], 1), pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(slerpV(A, B, t).multiplyScalar(r + h * Math.sin(Math.PI * t))); } return pts; }
function seaRoute(wps, r = 10.045) { const out = []; for (let i = 0; i < wps.length - 1; i++) { const A = ll(wps[i][0], wps[i][1], 1), B = ll(wps[i + 1][0], wps[i + 1][1], 1), n = Math.max(2, Math.ceil(A.angleTo(B) / (1.2 * D2R))); for (let k = (i ? 1 : 0); k <= n; k++) out.push(slerpV(A, B, k / n).multiplyScalar(r)); } return out; }
const GLOBE = (() => {
  const g = new THREE.Group();
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(10, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(0x040a16) }, uRim: { value: hdr(0x3aa8ff, .9) } },
    vertexShader: 'varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uC,uRim;varying vec3 vN,vV;void main(){float f=pow(1.-max(dot(vN,vV),0.),3.);gl_FragColor=vec4(uC+uRim*f,1.);}'
  }));
  g.add(ocean);
  const N = 110000, gold = Math.PI * (3 - Math.sqrt(5)), arr = [], cols = [], r = rng(3);
  for (let i = 0; i < N; i++) {
    const y = 1 - 2 * (i + .5) / N, rr = Math.sqrt(1 - y * y), th = i * gold, x = Math.cos(th) * rr, z = Math.sin(th) * rr;
    const lat = 90 - Math.acos(y) / D2R, lon = Math.atan2(z, -x) / D2R - 180, lo = ((lon + 540) % 360) - 180;
    if (lat < -58 || !isLand(lat, lo)) continue;
    arr.push(x * 10.03, y * 10.03, z * 10.03); const v = .55 + r() * .45; cols.push(v, v, v);
  }
  const land = mkPoints(new Float32Array(arr), { color: 0xffffff, size: .085, cols: new Float32Array(cols), k: 1 });
  g.add(land);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(11.2, 64, 48), new THREE.ShaderMaterial({
    uniforms: { uC: { value: hdr(0x3aa8ff, 1.2) }, uOp: { value: 1 } }, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 uC;uniform float uOp;varying vec3 vN;void main(){float i=pow(clamp(.72-dot(vN,vec3(0.,0.,1.)),0.,1.),3.5);gl_FragColor=vec4(uC*i*uOp,1.);}'
  }));
  g.add(atm);
  const grat = []; for (let la = -60; la <= 60; la += 30) for (let lo = -180; lo < 180; lo += 3) { grat.push(ll(la, lo, 10.02), ll(la, lo + 3, 10.02)); }
  for (let lo = -180; lo < 180; lo += 30) for (let la = -80; la < 80; la += 3) { grat.push(ll(la, lo, 10.02), ll(la + 3, lo, 10.02)); }
  const gl = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grat), lineMat(0x6fb6ff, .07, 1)); g.add(gl);
  return {
    group: g, land, ocean, atm, grat: gl,
    style(land, rim, atmC, landK = 1.4) { this.land.material.uniforms.uColor.value = hdr(land, landK); this.ocean.material.uniforms.uRim.value = hdr(rim, .9); this.atm.material.uniforms.uC.value = hdr(atmC, 1.2); }
  };
})();

/* ============ camera paths ============ */
function crs(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
function rawPath(keys) {
  return t => {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const k1 = keys[i], k2 = keys[i + 1] || k1, k0 = keys[Math.max(0, i - 1)], k3 = keys[Math.min(keys.length - 1, i + 2)];
    let u = k2 === k1 ? 0 : clamp((t - k1[0]) / (k2[0] - k1[0]), 0, 1); u = u * .55 + u * u * (3 - 2 * u) * .45;
    return k1.slice(1).map((arr, j) => Array.isArray(arr) ? arr.map((_, c) => crs(k0[j + 1][c], k1[j + 1][c], k2[j + 1][c], k3[j + 1][c], u)) : crs(k0[j + 1], k1[j + 1], k2[j + 1], k3[j + 1], u));
  };
}
const _cp = V(), _cl = V();
function camPath(keys) { const f = rawPath(keys.map(k => k.length < 4 ? [...k, 45] : k)); return t => { const r = f(t); return { p: _cp.fromArray(r[0]), l: _cl.fromArray(r[1]), fov: r[2] }; }; }
/* globe orbit: keys [t, lat, lon, dist, [lx,ly,lz]?] */
function orbitPath(keys) { const f = rawPath(keys.map(k => [k[0], [k[1], k[2], k[3]], k[4] || [0, 0, 0], k[5] || 40])); return t => { const r = f(t); const p = ll(r[0][0], r[0][1], r[0][2]); return { p: _cp.copy(p), l: _cl.fromArray(r[1]), fov: r[2] }; }; }

/* ============ scene registry & time-driven overlays ============
   Every overlay is a pure function of the timeline, so the film renders
   identically when played live and when stepped frame by frame for export. */
const SCENES = [];
function Scene(o) { o.group = new THREE.Group(); o.group.visible = false; scene.add(o.group); o.caps = o.caps || []; o.stats = o.stats || []; o.events = o.events || []; o.dom = o.dom || []; o.cuts = o.cuts || []; SCENES.push(o); return o; }
let started = false, playing = false, T = 0, prevT = 0, cur = -1, TOTAL = 0, flash = 0, kick = 0, warpK = 0;
const STARTS = [], WHIPS = [];
const labelsEl = $('labels'), LABELS = [];
function lab(S, html, pos, t0 = 0, t1 = 1e9, cls = '') {
  const el = document.createElement('div'); el.className = 'lbl ' + cls; el.innerHTML = '<i></i><span>' + html + '</span>'; labelsEl.appendChild(el);
  const L = { S, el, pos, t0, t1, a: -1, set(h) { if (h !== this._h) { this._h = h; this.el.lastChild.innerHTML = h; } } }; LABELS.push(L); return L;
}
const _pv = V();
function updLabels(S, t, dim) {
  const w = innerWidth, h = innerHeight;
  for (const L of LABELS) {
    let a = 0;
    if (L.S === S && started && !L.hidden) a = ss(L.t0, L.t0 + .4, t) * (1 - ss(L.t1 - .4, L.t1, t)) * dim;
    if (a > .002) { const p = typeof L.pos === 'function' ? L.pos(t) : L.pos; _pv.copy(p).project(camera); if (_pv.z > 1 || Math.abs(_pv.x) > 1.1 || Math.abs(_pv.y) > 1.1) a = 0; else L.el.style.transform = `translate(${((_pv.x * .5 + .5) * w).toFixed(1)}px,${((-_pv.y * .5 + .5) * h).toFixed(1)}px)`; }
    if (Math.abs(a - L.a) > .003) { L.a = a; L.el.style.opacity = a.toFixed(3); L.el.style.visibility = a > 0 ? 'visible' : 'hidden'; }
  }
}
const capEl = $('cap'); let capObj = null, capSp = [];
/* keep CJK punctuation glued to its neighbour so a line never starts with “，” or ends with “ */
function capTokens(str) { const out = [], close = '，。、：；！？”）》—…', open = '“（《'; let pend = ''; for (const c of str) { if (close.includes(c) && out.length) out[out.length - 1] += c; else if (open.includes(c)) pend += c; else { out.push(pend + c); pend = ''; } } if (pend) out.push(pend); return out; }
function updCap(S, t, dim) {
  const cp = started ? S.caps.find(x => t >= x[0] && t <= x[1]) : null;
  if (cp !== capObj) { capObj = cp; capEl.innerHTML = cp ? capTokens(cp[2]).map(c => `<span class="ch">${c === ' ' ? '&nbsp;' : c}</span>`).join('') : ''; capSp = [...capEl.children]; if (cp) speak(cp[2]); }
  if (!cp) return;
  const out = (1 - ss(cp[1] - .45, cp[1], t)) * dim;
  capSp.forEach((sp, i) => { const a = clamp((t - cp[0] - i * .018) / .45, 0, 1), s = sp.style; s.opacity = (a * out).toFixed(3); s.transform = a < 1 ? `translateY(${((1 - a) * 6).toFixed(1)}px)` : 'none'; s.filter = a < 1 ? `blur(${((1 - a) * 5).toFixed(1)}px)` : 'none'; });
}
const statEl = $('stat'); let curStat = null;
function updStat(S, t, dim) {
  const st = started ? S.stats.find(s => t >= s.t0 && t <= s.t1) : null;
  if (st !== curStat) { curStat = st; if (st) { $('statU').textContent = st.unit || ''; $('statL').textContent = st.label; } }
  const a = st ? win(t, st.t0, st.t1, .6) * dim : 0; statEl.style.opacity = a.toFixed(3);
  if (st) $('statN').textContent = st.fmt(easeOut(ss(st.t0, st.t0 + (st.dur || 2.4), t)));
}
const DOM_IDS = ['eq', 'stages', 'title', 'endc'];
function updDom(S, t, dim) {
  for (const id of DOM_IDS) { let a = 0; for (const d of S.dom) if (d[0] === id) a = Math.max(a, win(t, d[1], d[2], .9)); $(id).style.opacity = started ? (a * (id === 'endc' || id === 'title' ? 1 : dim)).toFixed(3) : 0; }
}
let yearDisp = null, yearA = 0;
function updYear(S, t, dt) {
  let target = null; const k = S.years;
  if (k && started) { target = k[0][1]; for (let i = 0; i < k.length - 1; i++) if (t >= k[i][0]) target = t >= k[i + 1][0] ? k[i + 1][1] : lerp(k[i][1], k[i + 1][1], easeIO((t - k[i][0]) / (k[i + 1][0] - k[i][0]))); }
  yearA += ((target !== null ? 1 : 0) - yearA) * Math.min(1, dt * 3);
  if (target !== null) yearDisp = yearDisp === null ? target : yearDisp + (target - yearDisp) * Math.min(1, dt * 5);
  $('year').style.opacity = (yearA * (1 - warpK * .5)).toFixed(3); if (yearDisp !== null) $('yearN').textContent = Math.round(yearDisp);
}

/* ============ speech (live only) ============ */
let voiceOn = false, zhVoice = null;
function pickVoice() { if (!('speechSynthesis' in window)) return; const vs = speechSynthesis.getVoices(); zhVoice = vs.find(v => /zh[-_]CN/i.test(v.lang) && /Xiaoxiao|Yunxi|Tingting|Google/i.test(v.name)) || vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null; }
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) { if (RENDER || !voiceOn || !playing || !('speechSynthesis' in window)) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, '')); u.lang = 'zh-CN'; if (zhVoice) u.voice = zhVoice; u.rate = 1.15; u.pitch = .95; speechSynthesis.speak(u); } catch (e) { } }
function hush() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } }

/* ============ player ============ */
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
function locate(t) { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= STARTS[i]) return i; return 0; }
function applyBloom(S) { const b = S.bloom || {}; bloom.strength = b.s ?? 1.1; bloom.radius = b.r ?? .55; bloom.threshold = b.th ?? .62; finalPass.uniforms.uExpo.value = b.e ?? 1.15; }
function enterScene(i) {
  if (cur >= 0) { const P = SCENES[cur]; P.group.visible = false; P.exit && P.exit(); }
  cur = i; const S = SCENES[i]; S.group.visible = true; S.enter && S.enter();
  document.documentElement.style.setProperty('--era', S.era);
  finalPass.uniforms.uTint.value.set(S.era);
  applyBloom(S);
  if (started) AU.scene(i, S);
}
function seek(t) { T = clamp(t, 0, TOTAL - .05); prevT = T; hush(); capObj = undefined; yearDisp = null; AU.resync(); }
function step(dt, ck) {
  const i = locate(T); if (i !== cur) enterScene(i);
  const S = SCENES[i], t = T - STARTS[i];
  if (playing) {
    for (const e of S.events) { const et = STARTS[i] + e[0]; if (prevT < et && T >= et && T - et < .25) e[1](); }
    for (const W of WHIPS) { if (prevT < W - .75 && T >= W - .75) AU.riser(.75); if (prevT < W && T >= W) { AU.boom(.8); kick = 1.1; } }
  }
  prevT = T;
  for (const m of TIMED) m.uniforms.uTime.value = ck;
  S.update(started ? t : 0, dt, ck);
  // whip-pan transitions: camera dives into the outgoing shot and pulls out of the incoming one
  let w = 0; if (started) for (const W of WHIPS) { const d = Math.abs(T - W); if (d < .6) w = Math.max(w, 1 - d / .6); }
  const k = w * w * (3 - 2 * w); warpK = k;
  const c = S.cam(started ? t : 0);
  camera.position.copy(c.p).lerp(c.l, .62 * k);
  camera.position.x += Math.sin(ck * .37) * .05; camera.position.y += Math.sin(ck * .29 + 1) * .04;
  camera.lookAt(c.l);
  if (!RENDER) { mouse.sx += (mouse.x - mouse.sx) * .04; mouse.sy += (mouse.y - mouse.sy) * .04; camera.rotateY(-mouse.sx * .03); camera.rotateX(-mouse.sy * .02); }
  camera.rotateZ(Math.sin(T * 1.7) * .01 * k);
  const fov = c.fov + k * 24; if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  updUPX();
  const dim = 1 - k;
  updLabels(S, t, dim); updStat(S, t, dim); updCap(S, t, dim); updDom(S, t, dim); updYear(S, t, dt);
  $('veil').style.opacity = started ? Math.max(1 - ss(0, 1.6, T), ss(TOTAL - 1.8, TOTAL - .1, T)).toFixed(3) : 0;
  kick *= Math.pow(.03, dt); flash *= Math.pow(.004, dt);
  const fu = finalPass.uniforms;
  fu.uWarp.value = k; fu.uAb.value = .0011 + kick * .012; fu.uFlash.value = clamp(flash, 0, .9); fu.uTime.value = ck;
  if (!window.LOGIC_ONLY) composer.render(dt);
}
function onResize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w / 2, h / 2);
  camera.aspect = w / h; camera.updateProjectionMatrix(); updUPX();
}
addEventListener('resize', onResize);
