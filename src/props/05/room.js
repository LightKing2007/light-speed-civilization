/* 05 · ENIAC 机房复原（宾夕法尼亚大学摩尔学院，1946）。单位：米，地面 y=0。
   40 块黑色钢制面板呈 U 形（左 16 / 后 8 / 右 16），开口朝 +z；面板高 2.44 m、宽 0.61 m、深 0.6 m。
   普通面板的零件全部用 InstancedMesh；左排第 6 块（index 5）是「主角累加器」，细节更高：
   精细真空管（合并几何实例化）、10×10 氖灯计数器、旋钮、插孔与可动的插线。 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, hash, clamp, lerp, ss, easeIO } from '../../engine/util.js';
import { mergedTube } from './tube.js';

export const PW = .61, PH = 2.44, PD = .6;
const v2 = (x, y) => new THREE.Vector2(x, y), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const qY = a => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
const ONE = V(1, 1, 1);

/* ---------- 布局常量（面板局部坐标：x 向右，y 向上，z 朝外，前面板在 z=0） ---------- */
export const L = {
  shelfY: k => 1.48 + k * .13, tubeX: j => -.26 + j * .04, tubeZ: .036,
  lampX: c => -.225 + c * .05, lampY: d => 1.355 - d * .031,
  knobX: c => -.225 + c * .05, knobY: .92,
  jackX: q => -.253 + q * .046, jackY: r => .76 - r * .085,
  sockX: [-.18, 0, .18], sockY: .28,
};
const LEFT = 'ctl ctl acc acc sw H acc acc sw acc acc ctl acc acc sw acc'.split(' ');
const BACK = 'acc sw ctl acc acc sw acc ctl'.split(' ');
const RIGHT = 'acc acc sw acc acc ctl acc sw acc acc sw acc ctl acc sw acc'.split(' ');
export const HERO_POS = V(-2.44, 0, -.445 - 5 * .61);

/* ---------- 面板正面贴图（Canvas2D 画在面板局部米坐标上） ---------- */
function drawFront(g, W, H, o) {
  const { type, y0 = 0, y1 = PH } = o, S = W / PW, X = x => (x + PW / 2) * S, Y = y => (y1 - y) * S, r = rng(o.seed || 3), px = m => m * S;
  g.fillStyle = '#1c1d1f'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) { const rr = px(.006 + r() * .03); g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${.004 + r() * .009})`; g.beginPath(); g.ellipse(r() * W, r() * H, rr * (1 + r() * 2), rr, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H, l = px(.005 + r() * .05); g.strokeStyle = `rgba(200,200,190,${.03 + r() * .06})`; g.lineWidth = Math.max(.6, px(.0006)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * (r() - .5), y + l * (r() - .5) * .3); g.stroke(); }
  const T = (s, x, y, size, { color = 'rgba(226,222,208,.88)', align = 'center', w = 600, font = 'mono' } = {}) => {
    g.font = font === 'mono' ? `${w} ${px(size)}px "JetBrains Mono", ui-monospace, Menlo, monospace` : `${w} ${px(size)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, X(x), Y(y));
  };
  const screw = (x, y) => { const R = px(.0042), cx = X(x), cy = Y(y); const gr = g.createRadialGradient(cx - R * .3, cy - R * .3, R * .1, cx, cy, R); gr.addColorStop(0, '#8d8a83'); gr.addColorStop(1, '#3b3a37'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = Math.max(1, px(.0008)); const a = r() * 3; g.beginPath(); g.moveTo(cx - Math.cos(a) * R * .8, cy - Math.sin(a) * R * .8); g.lineTo(cx + Math.cos(a) * R * .8, cy + Math.sin(a) * R * .8); g.stroke(); };
  const plate = (xa, ya, xb, yb, fill = 'rgba(255,255,255,.022)') => {
    g.fillStyle = fill; g.fillRect(X(xa), Y(yb), px(xb - xa), px(yb - ya));
    g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = Math.max(1, px(.0024)); g.strokeRect(X(xa), Y(yb), px(xb - xa), px(yb - ya));
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = Math.max(1, px(.001)); g.strokeRect(X(xa) + px(.002), Y(yb) + px(.002), px(xb - xa - .004), px(yb - ya - .004));
    for (const [x, y] of [[xa + .012, ya + .012], [xb - .012, ya + .012], [xa + .012, yb - .012], [xb - .012, yb - .012]]) screw(x, y);
  };
  const hole = (x, y, R) => { const cx = X(x), cy = Y(y); g.fillStyle = '#5d5b56'; g.beginPath(); g.arc(cx, cy, px(R * 1.25), 0, 7); g.fill(); g.fillStyle = '#050505'; g.beginPath(); g.arc(cx, cy, px(R), 0, 7); g.fill(); };
  const dial = (x, y, R, n = 10, size = .0065) => {
    g.strokeStyle = 'rgba(220,216,204,.75)'; g.lineWidth = Math.max(1, px(.0009)); g.beginPath(); g.arc(X(x), Y(y), px(R), 0, 7); g.stroke();
    for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + k / n * Math.PI * 2 * .9 - Math.PI * .4; const c = Math.cos(a), s = Math.sin(a);
      g.beginPath(); g.moveTo(X(x) + c * px(R), Y(y) + s * px(R)); g.lineTo(X(x) + c * px(R * 1.18), Y(y) + s * px(R * 1.18)); g.stroke();
      g.font = `600 ${px(size)}px "JetBrains Mono", monospace`; g.fillStyle = 'rgba(226,222,208,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(k), X(x) + c * px(R * 1.45), Y(y) + s * px(R * 1.45)); }
  };
  const vents = (ya, yb) => { for (let y = ya; y < yb; y += .016) { g.fillStyle = '#070707'; g.fillRect(X(-.22), Y(y + .006), px(.44), px(.006)); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(X(-.22), Y(y), px(.44), Math.max(1, px(.0012))); } };
  // 页眉铭牌
  const NAMES = { acc: 'ACCUMULATOR', sw: 'MASTER PROGRAMMER', ctl: 'CYCLING UNIT' };
  plate(-.29, 2.28, .29, 2.43);
  g.fillStyle = '#cfc8b3'; g.fillRect(X(-.17), Y(2.385), px(.34), px(.05)); g.strokeStyle = '#6b6658'; g.lineWidth = px(.0015); g.strokeRect(X(-.17), Y(2.385), px(.34), px(.05));
  T(NAMES[type] + (o.num ? '  ' + o.num : ''), 0, 2.36, .021, { color: '#141414', w: 700, font: 'cond' });
  // 底部踢脚、通风百叶
  g.fillStyle = '#0d0d0e'; g.fillRect(0, Y(.1), W, px(.1));
  plate(-.29, .11, .29, .42); vents(.14, .23);
  ['IN α', 'IN β', 'OUT A'].forEach((s, i) => T(s, L.sockX[i], .355, .0085));
  if (type === 'acc') {
    // 管架凹槽 + 背板上的电阻与走线
    g.fillStyle = '#0a0a0b'; g.fillRect(X(-.285), Y(2.27), px(.57), px(.83));
    for (let k = 0; k < 6; k++) {
      const yb = L.shelfY(k);
      const grd = g.createLinearGradient(0, Y(yb + .125), 0, Y(yb)); grd.addColorStop(0, 'rgba(0,0,0,.6)'); grd.addColorStop(1, 'rgba(40,40,42,.4)'); g.fillStyle = grd; g.fillRect(X(-.285), Y(yb + .125), px(.57), px(.125));
      for (let i = 0; i < 12; i++) { const x = -.27 + r() * .54, y = yb + .095 + r() * .02; g.fillStyle = ['#8a6f4e', '#6e5a3e', '#9b8460'][i % 3]; g.fillRect(X(x), Y(y + .002), px(.014), px(.004)); g.fillStyle = '#3a1d10'; g.fillRect(X(x + .004), Y(y + .002), px(.0015), px(.004)); g.fillStyle = '#b08a2c'; g.fillRect(X(x + .008), Y(y + .002), px(.0015), px(.004)); }
      g.strokeStyle = 'rgba(150,140,120,.25)'; g.lineWidth = Math.max(1, px(.0008)); for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(X(-.28), Y(yb + .08 + r() * .03)); g.bezierCurveTo(X(-.1), Y(yb + .12), X(.1), Y(yb + .06), X(.28), Y(yb + .08 + r() * .03)); g.stroke(); }
    }
    // 氖灯区
    plate(-.295, 1.035, .295, 1.405);
    for (let d = 0; d < 10; d++) { T(String(d), -.268, L.lampY(d), .0105, { w: 700 }); T(String(d), .262, L.lampY(d), .0085, { color: 'rgba(226,222,208,.62)' }); }
    for (let c = 0; c < 10; c++) { T(String(10 - c), L.lampX(c), 1.387, .0075, { color: 'rgba(226,222,208,.6)' }); for (let d = 0; d < 10; d++) hole(L.lampX(c), L.lampY(d), .0058); }

    // 旋钮刻度
    plate(-.295, .83, .295, 1.025);
    for (let c = 0; c < 10; c++) dial(L.knobX(c), L.knobY, .0175, 10, .0058);
    T('SIGNIFICANT FIGURES · REPEAT · OPERATION', 0, .848, .0062, { color: 'rgba(226,222,208,.6)' });
    // 插孔区
    plate(-.295, .44, .295, .82);
    ['α', 'β', 'γ', 'δ'].forEach((s, i) => T(s, -.282, L.jackY(i), .011, { w: 700 }));
    for (let q = 0; q < 12; q++) { T(String(q + 1), L.jackX(q), .8, .0062, { color: 'rgba(226,222,208,.55)' }); for (let rr = 0; rr < 4; rr++) hole(L.jackX(q), L.jackY(rr), .0058); }
    T('PROGRAM IN · OUT', 0, .458, .0065, { color: 'rgba(226,222,208,.55)' });
  } else if (type === 'sw') {
    plate(-.295, 1.16, .295, 2.26);
    for (let rr = 0; rr < 8; rr++) for (let c = 0; c < 6; c++) dial(-.225 + c * .09, 2.15 - rr * .13, .026, 10, .0075);
    for (let rr = 0; rr < 8; rr++) T('STEPPER ' + 'ABCDEFGH'[rr], -.27, 2.15 - rr * .13 + .052, .0062, { align: 'left', color: 'rgba(226,222,208,.55)' });
    plate(-.295, .44, .295, 1.13);
    for (let rr = 0; rr < 6; rr++) for (let q = 0; q < 10; q++) hole(-.234 + q * .052, 1.06 - rr * .1, .0058);
  } else {
    plate(-.295, 1.72, .295, 2.26);
    for (const sx of [-1, 1]) { const cx = X(sx * .14), cy = Y(1.97), R = px(.042); g.fillStyle = '#e4ddc9'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
      g.strokeStyle = '#222'; g.lineWidth = px(.0012); g.beginPath(); g.arc(cx, cy + R * .35, R * .75, -Math.PI * .8, -Math.PI * .2); g.stroke();
      for (let k = 0; k <= 10; k++) { const a = -Math.PI * .8 + k / 10 * Math.PI * .6; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * .75, cy + R * .35 + Math.sin(a) * R * .75); g.lineTo(cx + Math.cos(a) * R * .65, cy + R * .35 + Math.sin(a) * R * .65); g.stroke(); }
      const a = -Math.PI * .55 + sx * .1; g.strokeStyle = '#111'; g.lineWidth = px(.0016); g.beginPath(); g.moveTo(cx, cy + R * .35); g.lineTo(cx + Math.cos(a) * R * .78, cy + R * .35 + Math.sin(a) * R * .78); g.stroke();
      T(sx < 0 ? 'VOLTS' : 'AMPS', sx * .14, 1.985 - .02, .006, { color: '#333' }); }
    plate(-.295, 1.40, .295, 1.71); T('OSCILLOSCOPE', 0, 1.425, .0075, { color: 'rgba(226,222,208,.6)' });
    plate(-.295, 1.15, .295, 1.39); ['MODE', 'PULSE', 'ADD', 'CONT.'].forEach((s, i) => { dial(-.18 + i * .12, 1.27, .024, 10, .0068); T(s, -.18 + i * .12, 1.175, .0068); });
    plate(-.295, .98, .295, 1.14); for (let i = 0; i < 6; i++) T('ON', -.2 + i * .08, 1.115, .0058, { color: 'rgba(226,222,208,.6)' });
    plate(-.295, .44, .295, .96); for (let rr = 0; rr < 5; rr++) for (let q = 0; q < 10; q++) hole(-.234 + q * .052, .9 - rr * .1, .0058);
  }
}
function frontTex(KIT, o, W = 512) {
  const H = Math.round(W * ((o.y1 ?? PH) - (o.y0 ?? 0)) / PW);
  const t = KIT.canvasTex(W, H, (g, w, h) => drawFront(g, w, h, o), { aniso: 16 });
  const b = new THREE.CanvasTexture(t.userData.canvas); b.colorSpace = THREE.NoColorSpace; b.anisotropy = 8;
  return { map: t, bump: b };
}

/* ---------- 实例化收集器 ---------- */
class Bag {
  constructor() { this.k = {}; }
  add(key, M, pos, rot = null, scl = null) { const m = new THREE.Matrix4().compose(pos, rot ? new THREE.Quaternion().setFromEuler(rot) : new THREE.Quaternion(), scl || ONE); (this.k[key] ||= []).push(new THREE.Matrix4().multiplyMatrices(M, m)); }
  build(scene, defs) {
    const out = {};
    for (const key in this.k) {
      const d = defs[key]; if (!d) { console.warn('[05] no def', key); continue; }
      const L = this.k[key], im = new THREE.InstancedMesh(d.geo, d.mat, L.length);
      L.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = d.shadow !== false; im.receiveShadow = d.receive !== false;
      if (d.color) { const c = new THREE.Color(); L.forEach((m, i) => im.setColorAt(i, d.color(i, c))); }
      im.computeBoundingSphere(); scene.add(im); out[key] = im;
    }
    return out;
  }
}

/* 面板部件几何 */
function knobGeo(s = 1) { const g = new THREE.LatheGeometry([v2(0, 0), v2(.0135, 0), v2(.0137, .0025), v2(.0108, .0038), v2(.0098, .0055), v2(.0094, .0155), v2(.0085, .0188), v2(.006, .0196), v2(0, .0197)].map(p => p.multiplyScalar(s)), 20); g.rotateX(Math.PI / 2); return g; }
function knobMarkGeo(s = 1) { const g = new THREE.BoxGeometry(.0016 * s, .0085 * s, .0012 * s); g.translate(0, .0042 * s, .0197 * s); const sk = new THREE.BoxGeometry(.0012 * s, .004 * s, .0014 * s); sk.translate(0, .0118 * s, .003 * s); return mergeGeometries([g, sk]); }
function lampBezelGeo() { const g = new THREE.LatheGeometry([v2(.0042, -.001), v2(.0042, .0035), v2(.0072, .0035), v2(.0078, .002), v2(.0078, 0)], 16); g.rotateX(Math.PI / 2); return g; }
function lampBulbGeo() { const g = new THREE.SphereGeometry(.0048, 12, 8); g.scale(1, 1, .8); g.translate(0, 0, .0045); return g; }
function jackGeo() { const g = new THREE.LatheGeometry([v2(.0034, -.002), v2(.0034, .0045), v2(.0058, .0045), v2(.0064, .003), v2(.0066, .001), v2(.0066, 0)], 16); g.rotateX(Math.PI / 2); return g; }
function plugGeo() { // 沿 +z：插头尖在 z<0（插进面板），胶木手柄在外
  const tip = new THREE.CylinderGeometry(.0028, .0028, .012, 10); tip.translate(0, -.004, 0);
  const ring = new THREE.CylinderGeometry(.0052, .0052, .004, 14); ring.translate(0, .004, 0);
  const body = new THREE.LatheGeometry([v2(.0052, .006), v2(.0062, .008), v2(.0062, .028), v2(.0056, .032), v2(.004, .038), v2(.0035, .044)], 14);
  const ns = [tip, ring].map(g => g.toNonIndexed()); const b = body.toNonIndexed();
  const met = mergeGeometries(ns); met.rotateX(Math.PI / 2); b.rotateX(Math.PI / 2);
  return { metal: met, body: b };
}

/* ---------- 主函数 ---------- */
export async function buildRoom(KIT) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e0e0f);
  await KIT.hdri(scene, KIT.hdriFile('vintage_measuring_lab'), { intensity: .32, rotation: 1.2 });
  const R = rng(1946), bag = new Bag();

  /* 材质 */
  const M = {
    body: KIT.M.paint(0x151618, { rough: .55, clearcoat: .12 }),
    trim: KIT.M.paint(0x0f1011, { rough: .42, clearcoat: .2, seed: 8 }),
    steel: KIT.M.steel({ rough: .42 }), nickel: KIT.M.steel({ rough: .24 }), brass: KIT.M.oldBrass({ rough: .35 }),
    bake: KIT.M.plastic(0x120f0c, { rough: .33, extra: { clearcoat: .4, clearcoatRoughness: .35 } }),
    white: new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: .5 }),
    rglass: new THREE.MeshPhysicalMaterial({ color: 0xdfe8e4, roughness: .04, metalness: 0, transparent: true, opacity: .1, depthWrite: false, specularIntensity: .55, envMapIntensity: .45 }),
    rgetter: new THREE.MeshStandardMaterial({ color: 0x6a6763, metalness: 1, roughness: .16 }),
    rplate: new THREE.MeshStandardMaterial({ color: 0x1c1c1d, metalness: .3, roughness: .65 }),
    rmica: new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: .4 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    cable: new THREE.MeshPhysicalMaterial({ color: 0x0d0d0e, roughness: .5, clearcoat: .25, clearcoatRoughness: .5 }),
    meterG: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .04, transparent: true, opacity: .12, depthWrite: false }),
    scope: new THREE.MeshPhysicalMaterial({ color: 0x1a2a22, roughness: .15, clearcoat: 1, emissive: 0x2a6a48, emissiveIntensity: .25 }),
  };
  const fronts = {};
  for (const type of ['acc', 'sw', 'ctl']) { const t = frontTex(KIT, { type, seed: type.length * 7 }); fronts[type] = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: .6, roughness: .62, metalness: .15, roughnessMap: KIT.grunge(12) }); }

  /* 几何 */
  const G = {
    body: KIT.rbox(PW - .004, PH, PD, .01), trim: KIT.rbox(.02, PH, .03, .006), top: KIT.rbox(PW, .035, PD + .03, .008), plinth: KIT.rbox(PW - .01, .09, .03, .004),
    front: new THREE.PlaneGeometry(PW, PH), shelf: KIT.rbox(.56, .008, .07, .002), cheek: KIT.rbox(.02, .84, .075, .004),
    knob: knobGeo(), knobMark: knobMarkGeo(), knobL: knobGeo(1.35), knobLMark: knobMarkGeo(1.35),
    lampB: lampBezelGeo(), lampG: lampBulbGeo(), jack: jackGeo(),
    sock: (() => { const g = new THREE.CylinderGeometry(.026, .026, .016, 24); g.rotateX(Math.PI / 2); g.translate(0, 0, .008); return g; })(),
    sockIn: (() => { const g = new THREE.CylinderGeometry(.019, .019, .018, 20); g.rotateX(Math.PI / 2); g.translate(0, 0, .009); return g; })(),
    rbase: (() => { const g = new THREE.CylinderGeometry(.0135, .014, .02, 10); g.translate(0, .01, 0); return g; })(),
    rglass: new THREE.LatheGeometry([v2(.0128, .016), v2(.0128, .066), v2(.011, .073), v2(.007, .078), v2(.002, .080), v2(0, .0805)], 10),
    rgetter: new THREE.LatheGeometry([v2(0, .0792), v2(.006, .0762), v2(.0103, .0715), v2(.0121, .0655)], 10),
    rplate: (() => { const g = new THREE.BoxGeometry(.019, .032, .011); g.translate(0, .042, 0); return g; })(),
    rmica: (() => { const g = new THREE.CylinderGeometry(.0115, .0115, .0008, 8); g.translate(0, .0575, 0); return g; })(),
    rheat: (() => { const g = new THREE.BoxGeometry(.003, .004, .003); g.translate(0, .0595, 0); return g; })(),
    meterB: new THREE.TorusGeometry(.046, .0055, 8, 40), meterG: (() => { const g = new THREE.CylinderGeometry(.045, .045, .002, 32); g.rotateX(Math.PI / 2); g.translate(0, 0, .004); return g; })(),
    scopeB: new THREE.TorusGeometry(.066, .009, 10, 48), scopeS: (() => { const g = new THREE.SphereGeometry(.2, 32, 16, 0, Math.PI * 2, 0, .33); g.rotateX(Math.PI / 2); g.translate(0, 0, -.19); return g; })(),
    nut: (() => { const g = new THREE.CylinderGeometry(.0065, .0065, .005, 6); g.rotateX(Math.PI / 2); g.translate(0, 0, .0025); return g; })(),
    tog: (() => { const g = new THREE.CylinderGeometry(.0018, .0028, .022, 8); g.translate(0, .011, 0); g.rotateX(Math.PI / 2 - .35); g.translate(0, 0, .004); return g; })(),
  };
  const P = plugGeo(); G.plugM = P.metal; G.plugB = P.body;

  /* 面板布局 */
  const panels = [];
  const put = (type, pos, ang, run, i) => { const q = qY(ang); const Mx = new THREE.Matrix4().compose(pos, q, ONE); panels.push({ type, M: Mx, q, n: V(0, 0, 1).applyQuaternion(q), run, i, pos }); };
  LEFT.forEach((t, i) => put(t, V(-2.44, 0, -.445 - i * .61), Math.PI / 2, 'L', i));
  BACK.forEach((t, i) => put(t, V(-2.135 + i * .61, 0, -9.9), 0, 'B', i));
  RIGHT.forEach((t, i) => put(t, V(2.44, 0, -.445 - i * .61), -Math.PI / 2, 'R', i));
  const hero = panels.find(p => p.type === 'H');
  const accPanels = [];
  for (const p of panels) {
    const Mx = p.M, ty = p.type === 'H' ? 'acc' : p.type;
    bag.add('body', Mx, V(0, PH / 2, -PD / 2)); bag.add('top', Mx, V(0, PH + .0175, -PD / 2 + .015)); bag.add('plinth', Mx, V(0, .045, .012));
    for (const s of [-1, 1]) bag.add('trim', Mx, V(s * (PW / 2 - .01), PH / 2, .015));
    if (p.type !== 'H') bag.add('front_' + ty, Mx, V(0, PH / 2, .0012));
    for (const x of L.sockX) { bag.add('sock', Mx, V(x, L.sockY, 0)); bag.add('sockIn', Mx, V(x, L.sockY, 0)); }
    if (ty === 'acc') {
      for (let k = 0; k < 6; k++) bag.add('shelf', Mx, V(0, L.shelfY(k), .035));
      for (const s of [-1, 1]) bag.add('cheek', Mx, V(s * .293, 1.855, .0375));
      for (let c = 0; c < 10; c++) for (let d = 0; d < 10; d++) bag.add('lampB', Mx, V(L.lampX(c), L.lampY(d), .0005));
      if (p.type !== 'H') {
        accPanels.push(p);
        for (let k = 0; k < 6; k++) for (let j = 0; j < 14; j++) { const pos = V(L.tubeX(j), L.shelfY(k) + .004, L.tubeZ), rot = new THREE.Euler(0, R() * 6.28, 0); for (const key of ['rbase', 'rglass', 'rgetter', 'rplate', 'rmica', 'rheat']) bag.add(key, Mx, pos, rot); }
        for (let c = 0; c < 10; c++) for (let d = 0; d < 10; d++) bag.add('lampG', Mx, V(L.lampX(c), L.lampY(d), .001));
        for (let c = 0; c < 10; c++) { const rot = new THREE.Euler(0, 0, -Math.floor(R() * 10) * .5655 + 1.13); bag.add('knob', Mx, V(L.knobX(c), L.knobY, .001), rot); bag.add('knobMark', Mx, V(L.knobX(c), L.knobY, .001), rot); }
      }
    } else if (ty === 'sw') {
      for (let rr = 0; rr < 8; rr++) for (let c = 0; c < 6; c++) { const rot = new THREE.Euler(0, 0, -Math.floor(R() * 10) * .5655 + 1.13); const pos = V(-.225 + c * .09, 2.15 - rr * .13, .001); bag.add('knobL', Mx, pos, rot); bag.add('knobLMark', Mx, pos, rot); }
    } else {
      for (const s of [-1, 1]) { bag.add('meterB', Mx, V(s * .14, 1.97, .004)); bag.add('meterG', Mx, V(s * .14, 1.97, 0)); }
      bag.add('scopeB', Mx, V(0, 1.55, .006)); bag.add('scopeS', Mx, V(0, 1.55, 0));
      for (let i = 0; i < 4; i++) { const rot = new THREE.Euler(0, 0, -Math.floor(R() * 10) * .5655 + 1.13), pos = V(-.18 + i * .12, 1.27, .001); bag.add('knobL', Mx, pos, rot); bag.add('knobLMark', Mx, pos, rot); }
      for (let i = 0; i < 6; i++) { bag.add('nut', Mx, V(-.2 + i * .08, 1.06, 0)); bag.add('tog', Mx, V(-.2 + i * .08, 1.06, 0), new THREE.Euler(0, 0, R() < .5 ? 0 : Math.PI)); }
    }
  }
  // 后排两端的转角柜
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(KIT.rbox(.6, PH, .6, .01), M.body); m.position.set(sx * 2.74, PH / 2, -10.2); m.castShadow = m.receiveShadow = true; scene.add(m); }

  /* 普通氖灯的颜色：每列一盏亮 */
  const NEON_ON = new THREE.Color(1.5, .3, .05), NEON_OFF = new THREE.Color(.075, .05, .042);
  const defs = {
    body: { geo: G.body, mat: M.body }, top: { geo: G.top, mat: M.trim }, plinth: { geo: G.plinth, mat: M.trim }, trim: { geo: G.trim, mat: M.trim },
    front_acc: { geo: G.front, mat: fronts.acc, shadow: false }, front_sw: { geo: G.front, mat: fronts.sw, shadow: false }, front_ctl: { geo: G.front, mat: fronts.ctl, shadow: false },
    shelf: { geo: G.shelf, mat: M.steel }, cheek: { geo: G.cheek, mat: M.trim },
    sock: { geo: G.sock, mat: M.nickel }, sockIn: { geo: G.sockIn, mat: M.bake },
    rbase: { geo: G.rbase, mat: M.bake }, rglass: { geo: G.rglass, mat: M.rglass, shadow: false }, rgetter: { geo: G.rgetter, mat: M.rgetter }, rplate: { geo: G.rplate, mat: M.rplate }, rmica: { geo: G.rmica, mat: M.rmica },
    rheat: { geo: G.rheat, mat: M.glow, shadow: false, color: (i, c) => c.setRGB(2.6, .95, .3).multiplyScalar(.65 + hash(i * 1.7) * .45) },
    lampB: { geo: G.lampB, mat: M.nickel }, lampG: { geo: G.lampG, mat: M.glow, shadow: false, color: (i, c) => c.copy(NEON_OFF) },
    knob: { geo: G.knob, mat: M.bake }, knobMark: { geo: G.knobMark, mat: M.white, shadow: false }, knobL: { geo: G.knobL, mat: M.bake }, knobLMark: { geo: G.knobLMark, mat: M.white, shadow: false },
    meterB: { geo: G.meterB, mat: M.nickel }, meterG: { geo: G.meterG, mat: M.meterG, shadow: false }, scopeB: { geo: G.scopeB, mat: M.trim }, scopeS: { geo: G.scopeS, mat: M.scope },
    nut: { geo: G.nut, mat: M.nickel }, tog: { geo: G.tog, mat: M.nickel },
    plugM: { geo: G.plugM, mat: M.brass }, plugB: { geo: G.plugB, mat: M.bake }, jack: { geo: G.jack, mat: M.nickel },
    tplugM: { geo: G.sockIn, mat: M.nickel }, tplugB: { geo: (() => { const g = new THREE.CylinderGeometry(.021, .017, .06, 18); g.rotateX(Math.PI / 2); g.translate(0, 0, .046); return g; })(), mat: M.bake },
  };

  /* ---------- 插线（悬垂的电缆） ---------- */
  const cables = [];
  const jackW = (p, q, r) => V(L.jackX(q), L.jackY(r), 0).applyMatrix4(p.M);
  const sag = (A, B, n, depth, out, rad, seg = 36) => {
    const pts = [A.clone(), A.clone().addScaledVector(n, .045)];
    for (let k = 1; k < 8; k++) { const u = k / 8; const p = A.clone().lerp(B, u).addScaledVector(n, .045 + out * Math.sin(Math.PI * u)); p.y -= depth * 4 * u * (1 - u); pts.push(p); }
    pts.push(B.clone().addScaledVector(n, .045), B.clone());
    cables.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), seg, rad, 6, false));
  };
  const byRun = { L: panels.filter(p => p.run === 'L'), B: panels.filter(p => p.run === 'B'), R: panels.filter(p => p.run === 'R') };
  for (const run of Object.values(byRun)) for (let i = 0; i < run.length; i++) {
    const p = run[i], nC = 2 + Math.floor(R() * 3);
    for (let k = 0; k < nC; k++) {
      const j = i + 1 + Math.floor(R() * 2); if (j >= run.length) continue; const pB = run[j];
      const qa = Math.floor(R() * 12), ra = Math.floor(R() * 4), qb = Math.floor(R() * 12), rb = Math.floor(R() * 4);
      const busy = (pp, q, r) => pp.type === 'H' && ((r === 1 && q === 3) || (r === 2 && q === 8));
      if (busy(p, qa, ra) || busy(pB, qb, rb)) continue;
      const A = jackW(p, qa, ra), B = jackW(pB, qb, rb);
      sag(A, B, p.n, .25 + R() * .4, .03 + R() * .12, .0042);
      for (const [pp, w] of [[p, A], [pB, B]]) { bag.add('plugM', new THREE.Matrix4(), w, new THREE.Euler().setFromQuaternion(pp.q)); bag.add('plugB', new THREE.Matrix4(), w, new THREE.Euler().setFromQuaternion(pp.q)); }
    }
    if (i < run.length - 1 && R() < .8) { // 数字干线（粗缆）
      const A = V(L.sockX[2], L.sockY, 0).applyMatrix4(p.M), B = V(L.sockX[0], L.sockY, 0).applyMatrix4(run[i + 1].M);
      sag(A.clone().addScaledVector(p.n, .03), B.clone().addScaledVector(p.n, .03), p.n, .16, .06, .011, 24);
      for (const [pp, w] of [[p, A], [run[i + 1], B]]) bag.add('tplugB', new THREE.Matrix4(), w, new THREE.Euler().setFromQuaternion(pp.q));
    }
  }
  const cableMesh = new THREE.Mesh(mergeGeometries(cables), M.cable); cableMesh.castShadow = cableMesh.receiveShadow = true; scene.add(cableMesh);

  const I = bag.build(scene, defs);

  /* ---------- 主角累加器：局部坐标组 ---------- */
  const H = new THREE.Group(); H.position.copy(hero.pos); H.quaternion.copy(hero.q); scene.add(H);
  const hz = frontTex(KIT, { type: 'acc', y0: .40, y1: 1.42, seed: 77, num: '07' }, 2048);
  const hFull = frontTex(KIT, { type: 'acc', seed: 77, num: '07' }, 768);
  const hm = new THREE.Mesh(G.front, new THREE.MeshStandardMaterial({ map: hFull.map, bumpMap: hFull.bump, bumpScale: .6, roughness: .62, metalness: .15, roughnessMap: KIT.grunge(12) })); hm.position.set(0, PH / 2, .0012); hm.receiveShadow = true; H.add(hm);
  const zg = new THREE.PlaneGeometry(PW, 1.02); const zm = new THREE.Mesh(zg, new THREE.MeshStandardMaterial({ map: hz.map, bumpMap: hz.bump, bumpScale: .5, roughness: .58, metalness: .15, roughnessMap: KIT.grunge(14) }));
  zm.position.set(0, .91, .0018); zm.receiveShadow = true; H.add(zm);
  // 精细真空管 6×14
  const TG = mergedTube(.088), TM = {
    glass: KIT.M.glass({ thickness: .002, ior: 1.5, tint: 0xeef8f0, attDist: 1, rough: .03, extra: { depthWrite: false } }), getter: new THREE.MeshPhysicalMaterial({ color: 0xb8b2a8, metalness: 1, roughness: .14, side: THREE.DoubleSide }),
    base: M.bake, stem: new THREE.MeshPhysicalMaterial({ color: 0x9fb2a6, roughness: .1, transparent: true, opacity: .16, depthWrite: false }), nickel: M.nickel,
    mica: new THREE.MeshPhysicalMaterial({ color: 0xa9a291, roughness: .4, metalness: .05, transparent: true, opacity: .72, iridescence: .45, iridescenceIOR: 1.6, side: THREE.DoubleSide }),
    plate: new THREE.MeshPhysicalMaterial({ color: 0x2e2e30, metalness: .55, roughness: .5, side: THREE.DoubleSide }), copper: KIT.M.copper({ rough: .28 }),
    cathode: new THREE.MeshStandardMaterial({ color: 0xc2bcb0, roughness: .92, side: THREE.DoubleSide }), heater: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  };
  const NT = 84, tubeIM = {}, tmp = new THREE.Matrix4();
  for (const k in TG) {
    const im = new THREE.InstancedMesh(TG[k], TM[k], NT); im.castShadow = !['glass', 'stem', 'heater'].includes(k); im.receiveShadow = true;
    for (let kk = 0; kk < 6; kk++) for (let j = 0; j < 14; j++) { const i = kk * 14 + j; tmp.compose(V(L.tubeX(j), L.shelfY(kk) + .004, L.tubeZ), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (hash(i * 3.1) - .5) * .8, 0)), ONE); im.setMatrixAt(i, tmp); }
    if (k === 'heater') for (let i = 0; i < NT; i++) im.setColorAt(i, new THREE.Color(1, 1, 1));
    im.computeBoundingSphere(); H.add(im); tubeIM[k] = im;
  }
  // 灯丝透过云母孔的暖光（小而柔，按管单独控制；坏管熄灭）
  const gPos = new Float32Array(NT * 2 * 3), gCol = new Float32Array(NT * 2 * 3).fill(1);
  for (let kk = 0; kk < 6; kk++) for (let j = 0; j < 14; j++) { const i = kk * 14 + j, y = L.shelfY(kk) + .004; gPos.set([L.tubeX(j), y + .833 * .088, L.tubeZ, L.tubeX(j), y + .37 * .088, L.tubeZ], i * 6); }
  const glowPts = KIT.points(gPos, { size: 13, color: 0xff7a2e, intensity: 1.25, opacity: .55, additive: true, atten: .3, colors: gCol, soft: 1 }); H.add(glowPts);
  // 氖灯 10×10（局部 InstancedMesh，每帧改颜色）
  const hl = new THREE.InstancedMesh(G.lampG, M.glow, 100); hl.castShadow = false;
  for (let c = 0; c < 10; c++) for (let d = 0; d < 10; d++) { tmp.compose(V(L.lampX(c), L.lampY(d), .001), new THREE.Quaternion(), ONE); hl.setMatrixAt(c * 10 + d, tmp); hl.setColorAt(c * 10 + d, NEON_OFF); }
  hl.computeBoundingSphere(); H.add(hl);
  // 旋钮：第 4 个可动
  const hk = new THREE.InstancedMesh(G.knob, M.bake, 9), hkm = new THREE.InstancedMesh(G.knobMark, M.white, 9); let n = 0;
  const knobSteps = [3, 7, 0, 5, 0, 2, 9, 4, 1, 6];
  for (let c = 0; c < 10; c++) { if (c === 4) continue; tmp.compose(V(L.knobX(c), L.knobY, .001), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -knobSteps[c] * .5655 + 1.13)), ONE); hk.setMatrixAt(n, tmp); hkm.setMatrixAt(n, tmp); n++; }
  hk.castShadow = hk.receiveShadow = true; H.add(hk, hkm);
  const knob4 = new THREE.Group(); knob4.add(new THREE.Mesh(G.knob, M.bake), new THREE.Mesh(G.knobMark, M.white)); knob4.children[0].castShadow = true; knob4.position.set(L.knobX(4), L.knobY, .001); H.add(knob4);
  // 插孔衬套 4×12
  const hj = new THREE.InstancedMesh(G.jack, M.nickel, 48); for (let r = 0; r < 4; r++) for (let q = 0; q < 12; q++) { tmp.compose(V(L.jackX(q), L.jackY(r), 0), new THREE.Quaternion(), ONE); hj.setMatrixAt(r * 12 + q, tmp); } hj.receiveShadow = true; H.add(hj);
  // 可动插头 + 电缆
  const plug = new THREE.Group(); const pm = new THREE.Mesh(G.plugM, M.brass), pb = new THREE.Mesh(G.plugB, M.bake); pm.castShadow = pb.castShadow = true; plug.add(pm, pb); H.add(plug);
  const CSEG = 48, CRAD = 6; let liveGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, -.1, .1), V(0, -.3, .2)]), CSEG, .0042, CRAD, false);
  const liveCable = new THREE.Mesh(liveGeo, M.cable); liveCable.castShadow = true; H.add(liveCable);
  const PLUG_A = [1, 3], PLUG_B = [2, 8], CABLE_END = V(.42, .02, .55);
  // 主角面板上方的检修灯（带阴影）
  const hs = new THREE.SpotLight(0xfff1dc, 10, 0, .72, .85, 2); hs.position.set(1.9, 3.25, .55); hs.target.position.set(0, 1.0, 0); H.add(hs, hs.target);
  hs.castShadow = true; hs.shadow.mapSize.set(2048, 2048); hs.shadow.bias = -.0003; hs.shadow.normalBias = .01; hs.shadow.radius = 4; hs.shadow.camera.near = .5; hs.shadow.camera.far = 6;
  const warm = new THREE.PointLight(0xff8a3a, 0, .6, 2); warm.position.set(0, 1.86, .12); H.add(warm);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(.004, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); flash.visible = false; H.add(flash);

  /* ---------- 函数表（带脚轮，可推动）+ 椅子 ---------- */
  const FT = new THREE.Group(); FT.position.set(.55, 0, -6.9); FT.rotation.y = -.22; scene.add(FT);
  { const b = new THREE.Mesh(KIT.rbox(1.3, 1.5, .5, .012), M.body); b.position.set(0, .24 + .75, 0); b.castShadow = b.receiveShadow = true; FT.add(b);
    const ftTex = KIT.canvasTex(1024, 1180, (g, w, h) => { g.fillStyle = '#1c1d1f'; g.fillRect(0, 0, w, h); const S = w / 1.26;
      g.fillStyle = '#cfc8b3'; g.fillRect(w / 2 - 170, 26, 340, 40); g.fillStyle = '#141414'; g.font = '700 30px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PORTABLE FUNCTION TABLE  B', w / 2, 47);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) { const x = (.08 + c * .1) * S, y = (.2 + r * .12) * S; g.strokeStyle = 'rgba(220,216,204,.7)'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, .028 * S, 0, 7); g.stroke(); g.fillStyle = 'rgba(220,216,204,.7)'; g.font = '600 9px monospace'; for (let k = 0; k < 10; k++) { const a = -Math.PI * .9 + k / 10 * Math.PI * 1.8; g.fillText(String(k), x + Math.cos(a) * .037 * S, y + Math.sin(a) * .037 * S); } }
    });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.45), new THREE.MeshStandardMaterial({ map: ftTex, roughness: .6, metalness: .15 })); f.position.set(0, .99, .2505); FT.add(f);
    const fk = new THREE.InstancedMesh(G.knobL, M.bake, 108), fkm = new THREE.InstancedMesh(G.knobLMark, M.white, 108); let i = 0;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) { tmp.compose(V(-.63 + .08 + c * .1, .99 + .725 - .2 - r * .12, .251), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.floor(hash(r * 12 + c) * 10) * .5655 + 1.13)), ONE); fk.setMatrixAt(i, tmp); fkm.setMatrixAt(i, tmp); i++; }
    fk.castShadow = true; FT.add(fk, fkm);
    const frame = new THREE.Mesh(KIT.rbox(1.36, .06, .56, .01), M.steel); frame.position.y = .2; frame.castShadow = true; FT.add(frame);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .035, 24), KIT.M.rubber(0x161616)); w.rotation.z = Math.PI / 2; w.position.set(sx * .58, .075, sz * .2); w.castShadow = true; FT.add(w); const fork = new THREE.Mesh(KIT.rbox(.012, .12, .05, .004), M.steel); fork.position.set(sx * .58 + .025, .12, sz * .2); FT.add(fork); }
  }
  try { const ch = await KIT.model('assets/models/polyhaven/woodenchair_01/WoodenChair_01_1k.gltf', { size: .92 }); ch.position.set(1.35, 0, -7.55); ch.rotation.y = -2.3; /* 函数表旁的操作员椅 */ scene.add(ch); } catch (e) { console.warn('[05] chair', e); }

  /* ---------- 房间壳体 ---------- */
  const floorM = await KIT.pbr('concrete_floor_worn_001', { repeat: 7, extra: { roughness: 1 } }); floorM.color.setRGB(.4, .37, .33);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -3.5); floor.receiveShadow = true; scene.add(floor);
  const plaster = KIT.canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#918b80'; g.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${.02 + r() * .03})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } });
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping; plaster.repeat.set(6, 2);
  const wallM = new THREE.MeshStandardMaterial({ map: plaster, roughness: .92 }), dadoM = new THREE.MeshStandardMaterial({ color: 0x3f3d38, roughness: .7 });
  const wall = (w, h, pos, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); m.position.copy(pos); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); const d = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.05), dadoM); d.position.copy(pos).setY(.525); d.position.addScaledVector(V(Math.sin(ry), 0, Math.cos(ry)), .004); d.rotation.y = ry; scene.add(d); };
  wall(18, 3.5, V(-4.3, 1.75, -3.5), Math.PI / 2); wall(18, 3.5, V(4.3, 1.75, -3.5), -Math.PI / 2); wall(8.6, 3.5, V(0, 1.75, -11.2), 0); wall(8.6, 3.5, V(0, 1.75, 5.5), Math.PI);
  const tile = KIT.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c9c4b7'; g.fillRect(0, 0, w, h); const r = rng(4); g.fillStyle = 'rgba(60,55,45,.35)'; for (let y = 8; y < h; y += 10) for (let x = 8; x < w; x += 10) { g.beginPath(); g.arc(x + (r() - .5) * 2, y + (r() - .5) * 2, 1.4, 0, 7); g.fill(); } g.strokeStyle = 'rgba(70,65,55,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(14, 28);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 16.8), new THREE.MeshStandardMaterial({ map: tile, roughness: .95 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.5, -2.85); scene.add(ceil);
  // 日光灯槽（发光面克制在 1.6 左右）+ 圆形送风口
  const lampHousing = new THREE.MeshStandardMaterial({ color: 0xdedad0, roughness: .5 }), lampPanel = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.55, 1.5, 1.38) });
  for (const x of [-1.25, 1.25]) for (let k = 0; k < 6; k++) { const z = 1.5 - k * 2.05; const h = new THREE.Mesh(KIT.rbox(.42, .07, 1.3, .01), lampHousing); h.position.set(x, 3.465, z); scene.add(h); const p = new THREE.Mesh(new THREE.PlaneGeometry(.34, 1.22), lampPanel); p.rotation.x = Math.PI / 2; p.position.set(x, 3.428, z); scene.add(p); }
  for (const z of [-2.4, -6.6]) { const d = new THREE.Mesh(new THREE.LatheGeometry([v2(.34, 0), v2(.3, -.02), v2(.26, -.02), v2(.22, -.045), v2(.18, -.045), v2(.14, -.07), v2(.1, -.07), v2(.06, -.09), v2(0, -.09)], 40), new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: .55, side: THREE.DoubleSide })); d.position.set(0, 3.5, z); scene.add(d); }
  // 灯光：环境 + 顶灯点光 + 两盏带阴影的顶光
  for (let k = 0; k < 5; k++) { const pl = new THREE.PointLight(0xfff3e2, 5.5, 0, 2); pl.position.set(0, 3.2, 1.2 - k * 2.4); scene.add(pl); }
  const key = new THREE.SpotLight(0xfff4e6, 30, 0, 1.05, 1, 2); key.position.set(.3, 3.4, -4.2); key.target.position.set(0, 0, -4.6); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.camera.near = .5; key.shadow.camera.far = 12;

  /* ---------- 状态更新（t 的纯函数，由章节传入） ---------- */
  const accLamp = I.lampG, NAcc = accPanels.length, cTmp = new THREE.Color();
  H.updateMatrixWorld(true);
  const heroW = (x, y, z) => V(x, y, z).applyMatrix4(H.matrixWorld);
  const plugPose = (u) => { // u: 0..3 → 拔出 / 移动 / 插入
    const A = V(L.jackX(PLUG_A[1]), L.jackY(PLUG_A[0]), 0), B = V(L.jackX(PLUG_B[1]), L.jackY(PLUG_B[0]), 0);
    const pull = ss(0, 1, u) * (1 - ss(2, 3, u)), mv = easeIO(clamp(u - 1));
    const p = A.clone().lerp(B, mv); p.z = .062 * pull; p.y += Math.sin(Math.PI * mv) * .03; return p;
  };
  return {
    scene, hero: H, heroW, panels, tubeIM, I, knob4, plug, liveCable, spot: hs, _u: NaN,
    lampW: (c, d) => heroW(L.lampX(c), L.lampY(d), .006),
    tubeW: (k, j) => heroW(L.tubeX(j), L.shelfY(k) + .045, L.tubeZ),
    jackW: (r, q) => heroW(L.jackX(q), L.jackY(r), .005),
    knobW: c => heroW(L.knobX(c), L.knobY, .012),
    plugW: u => { const p = plugPose(u); return heroW(p.x, p.y, p.z + .02); },
    PLUG_A, PLUG_B, FAIL: [3, 10],
    /** st: { value: 10 位数（主角累加器显示）, fail: 0..1 故障管灯丝亮度, flash: 0..1, plugU: 0..3, knob: 档位 } */
    update(t, st = {}) {
      // 其他累加器：每列一个亮灯，缓慢随机跳动
      for (let p = 0; p < NAcc; p++) for (let c = 0; c < 10; c++) {
        const dg = Math.floor(hash(p * 31.7 + c * 7.3 + Math.floor(t * (.8 + hash(p * 3 + c) * 1.6) + hash(p + c * 13) * 9) * 1.91) * 10);
        for (let d = 0; d < 10; d++) accLamp.setColorAt(p * 100 + c * 10 + d, d === dg ? NEON_ON : NEON_OFF);
      }
      accLamp.instanceColor.needsUpdate = true;
      // 主角累加器
      const v = st.value ?? 3141592653; let x = Math.floor(v);
      for (let c = 9; c >= 0; c--) { const dg = ((x % 10) + 10) % 10; x = Math.floor(x / 10); for (let d = 0; d < 10; d++) hl.setColorAt(c * 10 + d, d === dg ? NEON_ON : NEON_OFF); }
      hl.instanceColor.needsUpdate = true;
      // 灯丝：故障管
      const fi = this.FAIL[0] * 14 + this.FAIL[1], hi = tubeIM.heater;
      for (let i = 0; i < NT; i++) { const k = i === fi ? (st.fail ?? 1) : 1; hi.setColorAt(i, cTmp.setRGB(4.2 * k, 1.5 * k * k, .38 * k * k).multiplyScalar(.75 + hash(i * 5.3) * .4)); }
      hi.instanceColor.needsUpdate = true;
      const gk = st.fail ?? 1; for (let q = 0; q < 6; q++) glowPts.geometry.attributes.aColor.array[fi * 6 + q] = gk; glowPts.geometry.attributes.aColor.needsUpdate = true;
      warm.intensity = st.warm ?? 0; hs.intensity = st.spot ?? 10;
      const fl = st.flash ?? 0; flash.visible = fl > .01; if (flash.visible) { const p = V(L.tubeX(this.FAIL[1]), L.shelfY(this.FAIL[0]) + .004 + .072, L.tubeZ); flash.position.copy(p); flash.scale.setScalar(.6 + fl * 1.4); flash.material.color.setRGB(9 * fl, 6 * fl, 3.5 * fl); }
      // 旋钮
      knob4.rotation.z = -(st.knob ?? 2) * .5655 + 1.13;
      // 插头 + 电缆
      const u = st.plugU ?? 0, p = plugPose(u); plug.position.copy(p);
      if (u === this._u) return; this._u = u;   // 电缆形状只取决于 u：u 不变就不重建
      const rear = p.clone().add(V(0, 0, .044)), c1 = rear.clone().add(V(0, -.005, .05)), c2 = V(lerp(p.x, CABLE_END.x, .45), Math.min(p.y, .2) - .12, .28), c3 = CABLE_END.clone();
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([rear, c1, c2, c3], false, 'centripetal'), CSEG, .0042, CRAD, false);
      liveGeo.attributes.position.array.set(tg.attributes.position.array); liveGeo.attributes.normal.array.set(tg.attributes.normal.array);
      liveGeo.attributes.position.needsUpdate = liveGeo.attributes.normal.needsUpdate = true; liveGeo.computeBoundingSphere(); tg.dispose();
    },
  };
}
