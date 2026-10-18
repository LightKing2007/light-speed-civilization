/* 04 · 「想象中的图灵机」写实道具：黑漆铸铁底座 + 黄铜读写头小车（双导轨）+ 状态拨盘 + 两端纸带卷 + 方格纸带。
   单位：米。x 沿纸带方向，y 向上，z 朝向镜头（前）。纸带格 i 的中心在 X(i)。 */
import * as THREE from 'three';
import { rng, hash } from '../../engine/util.js';

export const P = 0.03, TW = 0.035, X0 = 0.42;          // 格距 3 cm、纸带宽 3.5 cm、第 0 格位置
export const YB = 0.064, YT = YB + 0.0064;             // 底座顶面 / 纸带上表面
export const X = i => X0 + i * P;
export const CELL0 = -40, CELL1 = 16;                   // 纸带上建模的格子范围
export const INK = 0x17120e;
export const RP = 0.05;                                 // 纸卷半径
export const REEL_X = 0.93;

const UP = new THREE.Vector3(0, 1, 0);
function add(parent, geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast ?? true; m.receiveShadow = o.recv ?? true; parent.add(m); return m;
}

/* ---------------- 小零件 ---------------- */
const _sg = {};
function screwGeo(r) {
  if (_sg[r]) return _sg[r]; const h = r * .6;
  const prof = [[0, 0], [r, 0], [r, h * .42], [r * .84, h * .86], [r * .42, h], [0, h]].map(p => new THREE.Vector2(p[0], p[1]));
  return (_sg[r] = new THREE.LatheGeometry(prof, 24));
}
/** 槽头螺丝：pos 处、法线 n 方向 */
export function screw(parent, r, mat, slotMat, pos, n, seed = 1) {
  const g = new THREE.Group(); g.position.copy(pos); g.quaternion.setFromUnitVectors(UP, n.clone().normalize());
  const head = new THREE.Mesh(screwGeo(r), mat); head.castShadow = true; g.add(head);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(r * 2.05, r * .5, r * .24), slotMat); slot.position.y = r * .62; slot.rotation.y = hash(seed * 7.3) * Math.PI; g.add(slot);
  parent.add(g); return g;
}
/** 滚花圆柱（轴向 y） */
export function knurlGeo(r, h, n = 36) {
  const g = new THREE.CylinderGeometry(r, r, h, n * 2, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z);
    if (rr > r * .9) { const a = Math.atan2(z, x), j = Math.round((a / (Math.PI * 2)) * n * 2); const k = (((j % 2) + 2) % 2) ? .925 : 1; p.setX(i, x / rr * r * k); p.setZ(i, z / rr * r * k); }
  }
  g.computeVertexNormals(); return g;
}
export function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function frameGeo(w, h, t, r, depth) {
  const s = rrShape(w + 2 * t, h + 2 * t, r + t); const hole = rrShape(w, h, r); s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * .35, bevelSize: t * .3, bevelSegments: 2, curveSegments: 6 });
}
function helix(r, h, turns, tube) {
  const pts = []; const N = turns * 24; for (let i = 0; i <= N; i++) { const a = i / 24 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, i / N * h, Math.sin(a) * r)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, tube, 6, false);
}

/* ---------------- 贴图 ---------------- */
/** 印刷字符（白字黑底，作 alphaMap 用）：油墨不均、轻微晕开、每个字符略有歪斜 */
export function makeGlyphs(KIT) {
  const out = {};
  for (const s of ['0', '1', 'A', 'B', 'H', 'L', 'R', 'N', '_']) out[s] = KIT.canvasTex(256, 256, (g, w, h) => {
    const r = rng(s.charCodeAt(0) * 13 + 5);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2 + (r() - .5) * 8, h / 2 + 4 + (r() - .5) * 8); g.rotate((r() - .5) * .06);
    g.fillStyle = '#fff'; g.font = 'bold 190px "Courier New", Courier, "Nimbus Mono PS", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(255,255,255,.75)'; g.shadowBlur = 3.5;
    if (s === '_') { g.fillRect(-62, 56, 124, 16); } else g.fillText(s, 0, 8);
    g.restore();
    g.globalCompositeOperation = 'multiply';                       // 油墨覆盖不均
    for (let i = 0; i < 1400; i++) { const v = 120 + r() * 135 | 0; g.fillStyle = `rgb(${v},${v},${v})`; const q = 1 + r() * 4; g.fillRect(r() * w, r() * h, q, q); }
    g.globalCompositeOperation = 'source-over';
  }, { srgb: false });
  return out;
}
/** 读写头小窗里的字符牌（白珐琅底黑字） */
function windowTex(KIT, s) {
  return KIT.canvasTex(160, 120, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e9e2d0'); gr.addColorStop(1, '#d6cdb8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16120e'; g.font = 'bold 96px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (s === '_') { g.font = '500 34px Georgia, serif'; g.fillText('BLANK', w / 2, h / 2 + 2); } else g.fillText(s, w / 2, h / 2 + 6);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
  });
}
/** 状态拨盘表盘：A 右行 / B 进位 / H 停机 */
export const DIAL_ANG = { A: -52, B: 0, H: 52 };
function dialTex(KIT) {
  return KIT.canvasTex(1024, 1024, (g, w) => {
    const c = w / 2, R = w / 2;
    const gr = g.createRadialGradient(c, c * .9, R * .1, c, c, R); gr.addColorStop(0, '#f3eddf'); gr.addColorStop(.85, '#e6dcc6'); gr.addColorStop(1, '#bfb293');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    const r = rng(41); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(90,70,40,${r() * .05})`; g.fillRect(r() * w, r() * w, 2, 2); }
    g.strokeStyle = '#1b1712'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, R * .93, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(c, c, R * .89, 0, Math.PI * 2); g.stroke();
    const pol = (deg, rr) => { const a = (deg - 90) * Math.PI / 180; return [c + Math.cos(a) * rr, c + Math.sin(a) * rr]; };
    for (let d = -80; d <= 80; d += 4) {                      // 刻度
      const major = Math.abs(d) % 52 === 0 || d === 0; const [x0, y0] = pol(d, R * .89), [x1, y1] = pol(d, R * (major ? .76 : .82));
      g.lineWidth = major ? 7 : 2.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.strokeStyle = '#8c1f16'; g.lineWidth = 14; g.beginPath(); g.arc(c, c, R * .855, (52 - 14 - 90) * Math.PI / 180, (80 - 90) * Math.PI / 180); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [k, zh] of [['A', '右行'], ['B', '进位'], ['H', '停机']]) {
      const [x, y] = pol(DIAL_ANG[k], R * .6);
      g.fillStyle = k === 'H' ? '#8c1f16' : '#16120e'; g.font = 'bold 150px Georgia, "Times New Roman", serif'; g.fillText(k, x, y);
      g.font = '600 50px "Noto Sans SC", "PingFang SC", sans-serif'; g.fillText(zh, x, y + 100);
    }
    g.fillStyle = '#2a241c'; g.font = '600 46px Georgia, serif'; g.fillText('STATE', c, c + R * .5);
    g.font = '500 26px Georgia, serif'; g.fillStyle = '#5a4f40'; g.fillText('CAMBRIDGE · 1936', c, c + R * .62);
  });
}
/** 刻字黄铜板（深色填蜡的刻字） */
function plateTex(KIT, lines, w = 1024, h = 160, size = 64) {
  return KIT.canvasTex(w, h, (g) => {
    g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a2016'; g.lineWidth = 5; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#2a2016'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((s, i) => { g.font = `600 ${i ? size * .55 : size}px Georgia, "Times New Roman", serif`; g.fillText(s, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * .95); });
  });
}
/** 前沿黄铜刻度尺：每格一刻，每 5 格一个数字 */
function rulerTex(KIT, x0, x1) {
  const W = 4096, H = 96;
  return KIT.canvasTex(W, H, (g) => {
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H);
    const px = x => (x - x0) / (x1 - x0) * W;
    g.fillStyle = '#251c12'; g.textAlign = 'center'; g.font = '600 30px Georgia, serif';
    for (let i = CELL0; i <= CELL1; i++) {
      const xb = px(X(i) - P / 2); const major = i % 5 === 0; g.fillRect(xb - 1.5, 0, 3, major ? 42 : 26);
      if (major) g.fillText(String(i), px(X(i)), 76);
    }
  });
}
/** 纸边毛刺（alpha）：中间白，两侧不规则纤维 */
function edgeTex(KIT) {
  return KIT.canvasTex(2048, 128, (g, w, h) => {
    const r = rng(77); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    const e = 5; g.fillRect(0, e, w, h - 2 * e);
    for (let x = 0; x < w; x += 2) { const a = 2 + r() * 3, b = 2 + r() * 3; g.fillRect(x, e - a + 2, 2, a); g.fillRect(x, h - e - 2, 2, b); }
    g.strokeStyle = '#fff'; g.lineWidth = 1.2;
    for (let i = 0; i < 260; i++) { const x = r() * w, top = r() < .5, L = 2 + r() * 5; g.beginPath(); g.moveTo(x, top ? e + 1 : h - e - 1); g.lineTo(x + (r() - .5) * 6, top ? e + 1 - L : h - e - 1 + L); g.stroke(); }
  }, { srgb: false });
}
/** 摩尔斯墨迹（alpha）：TURING TURING …… */
const MORSE = { T: '-', U: '..-', R: '.-.', I: '..', N: '-.', G: '--.', C: '-.-.', Q: '--.-', A: '.-', M: '--', B: '-...', E: '.', S: '...' };
function morseTex(KIT, len) {
  const W = 4096, H = 128, u = 15;
  return KIT.canvasTex(W, H, (g) => {
    const r = rng(9); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff';
    g.shadowColor = 'rgba(255,255,255,.7)'; g.shadowBlur = 4;
    let x = 30; const msg = 'TURING CAMBRIDGE TURING CAMBRIDGE TURING CAMBRIDGE';
    for (const ch of msg) {
      if (ch === ' ') { x += u * 4; continue; }
      for (const s of MORSE[ch] || '.') { const L = s === '-' ? u * 3 : u; const y = H / 2 + (r() - .5) * 3, hh = 22 + r() * 5; g.beginPath(); g.roundRect(x, y - hh / 2, L, hh, hh / 2); g.fill(); x += L + u; if (x > W - 60) return; }
      x += u * 2;
    }
  }, { srgb: false });
}
function ringsTex(KIT) {
  return KIT.canvasTex(512, 512, (g, w) => {
    const r = rng(5), c = w / 2; g.fillStyle = '#d9cdb2'; g.fillRect(0, 0, w, w);
    for (let rr = c * .28; rr < c; rr += 1.6 + r() * 1.2) { g.strokeStyle = `rgba(${120 + r() * 40 | 0},${100 + r() * 30 | 0},${70 + r() * 20 | 0},${.25 + r() * .35})`; g.lineWidth = .8; g.beginPath(); g.arc(c, c, rr, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#6b5a40'; g.beginPath(); g.arc(c, c, c * .28, 0, Math.PI * 2); g.fill();
  });
}

/** 纸张材质：Poly Haven/ambientCG 旧纸贴图组（克隆贴图以便独立平移） */
export async function paperMaterial(KIT, tile = .22) {
  const base = await KIT.pbr('acg_paper006_aged_paper', {});
  const m = new THREE.MeshPhysicalMaterial({ color: base.map ? 0xffffff : 0xd8ccb0, roughness: 1, metalness: 0, sheen: .35, sheenRoughness: .8, sheenColor: new THREE.Color(0xfff0d8) });
  for (const k of ['map', 'normalMap', 'roughnessMap']) if (base[k]) { const t = base[k].clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; m[k] = t; }
  if (m.normalMap) m.normalScale.set(.45, .45);
  m.userData.tile = tile;
  return m;
}

/* ---------------- 纸带 ---------------- */
/** 平铺在 y 平面上的纸带：纸 + 方格线 + 每格一个印刷字符 + 可选摩尔斯墨迹。返回控制接口。 */
export async function buildTape(KIT, { glyphs, paper, xa, xb, y, c0, c1, Xf, morse = false, tw = TW }) {
  const group = new THREE.Group();
  const L = xb - xa, tile = paper.userData.tile, twe = tw * 1.05;
  const mat = paper.clone(); for (const k of ['map', 'normalMap', 'roughnessMap']) if (paper[k]) mat[k] = paper[k];
  const edge = edgeTex(KIT); edge.wrapS = edge.wrapT = THREE.RepeatWrapping; edge.repeat.set(tile / .4, tile / twe); edge.offset.set(0, .5);
  mat.alphaMap = edge; mat.alphaTest = .5;
  const geo = new THREE.PlaneGeometry(L, twe, 1, 1); geo.rotateX(-Math.PI / 2); geo.translate((xa + xb) / 2, 0, 0);
  const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / tile, -pos.getZ(i) / tile);
  const sheet = new THREE.Mesh(geo, mat); sheet.position.y = y; sheet.receiveShadow = true; sheet.castShadow = true; group.add(sheet);
  // 印刷边线
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x3a2b20, roughness: .6, transparent: true, opacity: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const borders = [];
  for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(L, .0007); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, lineMat); m.position.set((xa + xb) / 2, y + .0001, s * (tw / 2 - .0032)); m.receiveShadow = true; group.add(m); borders.push(m); }
  const cells = {};
  const gGeo = new THREE.PlaneGeometry(.0228, .0228); gGeo.rotateX(-Math.PI / 2);
  const lGeo = new THREE.PlaneGeometry(.0008, tw - .0064); lGeo.rotateX(-Math.PI / 2);
  for (let i = c0; i <= c1; i++) {
    const gm = new THREE.MeshStandardMaterial({ color: INK, alphaMap: glyphs['1'], transparent: true, opacity: 0, roughness: .42, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const gl = new THREE.Mesh(gGeo, gm); gl.position.set(Xf(i), y + .00015, 0); gl.receiveShadow = true; gl.visible = false; group.add(gl);
    const lm = lineMat.clone(); const ln = new THREE.Mesh(lGeo, lm); ln.position.set(Xf(i) - P / 2, y + .0001, 0); ln.receiveShadow = true; group.add(ln);
    cells[i] = { glyph: gl, line: ln, sym: null };
  }
  let morseMesh = null;
  if (morse) {
    const mL = morse.len, mt = morseTex(KIT, mL);
    const mg = new THREE.PlaneGeometry(mL, tw * .62); mg.rotateX(-Math.PI / 2);
    morseMesh = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ color: 0x14131a, alphaMap: mt, transparent: true, opacity: 1, roughness: .35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    morseMesh.position.set(morse.x, y + .00016, 0); morseMesh.receiveShadow = true; group.add(morseMesh);
  }
  return {
    group, sheet, cells, borders, morse: morseMesh,
    /** 设置格 i 的字符与不透明度（sym 为 null/空格 表示空白），k = 印字时的「落印」缩放 */
    set(i, sym, a = 1, k = 1) {
      const c = cells[i]; if (!c) return;
      if (!sym || sym === ' ' || a <= .003) { c.glyph.visible = false; return; }
      if (c.sym !== sym) { c.glyph.material.alphaMap = glyphs[sym]; c.sym = sym; }
      c.glyph.visible = true; c.glyph.material.opacity = Math.min(1, a) * .94; c.glyph.scale.setScalar(k);
    },
    grid(i, a) { const c = cells[i]; if (c) { c.line.visible = a > .003; c.line.material.opacity = .85 * a; } },
    border(a) { lineMat.opacity = .85 * a; borders.forEach(b => b.visible = a > .003); },
  };
}

/* ---------------- 整机 ---------------- */
export async function buildMachine(KIT, { glyphs, paper }) {
  const M = KIT.M, root = new THREE.Group();
  const brass = M.brass({ rough: .26 }), brassOld = M.oldBrass({ rough: .38 }), steel = M.steel({ rough: .16 }), iron = M.iron({ rough: .5 });
  const black = M.paint(0x0b0b0c, { rough: .36, clearcoat: .55 }), ebon = M.plastic(0x0a0909, { rough: .3 });
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x120d06, roughness: .7, metalness: .3 });
  const gold = M.gold({ rough: .3 });

  /* 底座：黑漆铸铁，四只黄铜脚，金色饰线，铭牌 */
  add(root, KIT.rbox(1.64, .052, .27, .012, 4), black, 0, .012 + .026, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(root, new THREE.CylinderGeometry(.02, .022, .012, 28), brassOld, sx * .75, .006, sz * .11);
  for (const yy of [.02, .056]) add(root, new THREE.BoxGeometry(1.6, .0012, .0008), gold, 0, yy, .1353, { cast: false });
  const plate = M.brass({ rough: .3, extra: { map: plateTex(KIT, ['A. M. TURING · a-MACHINE', 'No. 1 · CAMBRIDGE · 1936']) } });
  add(root, KIT.rbox(.2, .026, .002, .0008, 2), plate, -.36, .038, .1355);
  for (const sx of [-1, 1]) screw(root, .0022, brass, slotMat, new THREE.Vector3(-.36 + sx * .094, .038, .1366), new THREE.Vector3(0, 0, 1), 3 + sx);
  // 胶木压板 + 黄铜导边 + 前沿刻度尺
  add(root, KIT.rbox(1.44, .006, .052, .002, 2), ebon, 0, YB + .003, 0);
  for (const s of [-1, 1]) add(root, KIT.rbox(1.44, .0045, .003, .0008, 2), brass, 0, YB + .0062 + .0012, s * (TW / 2 + .0028));
  add(root, KIT.rbox(1.44, .0025, .024, .0008, 2), M.brass({ rough: .3, extra: { map: rulerTex(KIT, -.72, .72) } }), 0, YB + .00125, .068);
  for (const x of [-.7, -.35, 0, .35, .7]) screw(root, .0024, brass, slotMat, new THREE.Vector3(x, YB + .0025, .068), UP, x * 9 + 2);
  // 导轨立柱 + 两根抛光钢导轨
  const RZ = -.085, RY1 = YT + .045, RY2 = YT + .125;
  for (const sx of [-1, 1]) {
    add(root, KIT.rbox(.046, .19, .056, .006, 3), black, sx * .775, YB + .095, RZ);
    add(root, KIT.rbox(.054, .012, .064, .003, 2), brass, sx * .775, YB + .196, RZ);
    for (const yy of [RY1, RY2]) { add(root, new THREE.CylinderGeometry(.011, .011, .05, 28), brassOld, sx * .775, yy, RZ, { rz: Math.PI / 2 }); }
    for (const yy of [YB + .03, YB + .17]) screw(root, .0028, brass, slotMat, new THREE.Vector3(sx * .775, yy, RZ + .0285), new THREE.Vector3(0, 0, 1), sx * 5 + yy * 100);
  }
  for (const yy of [RY1, RY2]) add(root, new THREE.CylinderGeometry(.0065, .0065, 1.6, 32), steel, 0, yy, RZ, { rz: Math.PI / 2 });

  /* 纸带卷：黄铜镂空轮缘 + 纸卷（端面年轮）+ 铸铁支架 */
  const flangeShape = new THREE.Shape(); flangeShape.absarc(0, 0, .082, 0, Math.PI * 2, false);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + .3, h = new THREE.Path(); h.absarc(Math.cos(a) * .058, Math.sin(a) * .058, .016, 0, Math.PI * 2, true); flangeShape.holes.push(h); }
  { const h = new THREE.Path(); h.absarc(0, 0, .009, 0, Math.PI * 2, true); flangeShape.holes.push(h); }
  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, { depth: .0024, bevelEnabled: true, bevelThickness: .0006, bevelSize: .0006, bevelSegments: 2, curveSegments: 48 });
  const rings = new THREE.MeshStandardMaterial({ map: ringsTex(KIT), roughness: .9 });
  const reels = [];
  for (const sx of [-1, 1]) {
    const reel = new THREE.Group(); reel.position.set(sx * REEL_X, YT + RP, 0); root.add(reel);
    const spin = new THREE.Group(); reel.add(spin);
    const sg = new THREE.CylinderGeometry(RP, RP, TW - .001, 96, 1); sg.rotateX(Math.PI / 2);
    const side = paper.clone(); for (const k of ['map', 'normalMap', 'roughnessMap']) side[k] = paper[k];
    add(spin, sg, [side, rings, rings], 0, 0, 0);
    for (const s of [-1, 1]) { const f = add(spin, flangeGeo, brass, 0, 0, s > 0 ? TW / 2 + .0004 : -TW / 2 - .0028); }
    add(spin, new THREE.CylinderGeometry(.012, .012, TW + .016, 32), brassOld, 0, 0, 0, { rx: Math.PI / 2 });
    add(spin, knurlGeo(.014, .008, 24), brass, 0, 0, TW / 2 + .012, { rx: Math.PI / 2 });
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + .93; screw(spin, .0019, brass, slotMat, new THREE.Vector3(Math.cos(a) * .072, Math.sin(a) * .072, TW / 2 + .0034), new THREE.Vector3(0, 0, 1), k + sx * 10); }
    // 支架（在纸卷后方）
    add(root, KIT.rbox(.034, YT + RP + .02, .016, .005, 3), black, sx * REEL_X, (YT + RP + .02) / 2, -TW / 2 - .03);
    add(root, KIT.rbox(.09, .01, .07, .004, 2), black, sx * REEL_X, .005, -TW / 2 - .03);
    add(root, new THREE.CylinderGeometry(.006, .006, .035, 20), steel, sx * REEL_X, YT + RP, -TW / 2 - .02, { rx: Math.PI / 2 });
    reels.push(spin);
  }

  /* 纸带：从左卷底部一直铺到右卷底部 */
  const tape = await buildTape(KIT, { glyphs, paper, xa: -REEL_X, xb: REEL_X, y: YT, c0: CELL0, c1: CELL1, Xf: X, morse: { len: 1.5, x: .1 } });
  root.add(tape.group);

  /* 读写头小车（局部原点 = 当前格中心、纸带表面） */
  const car = new THREE.Group(); root.add(car);
  add(car, KIT.rbox(.12, .15, .012, .003, 3), brass, 0, .08, -.068);
  for (const yy of [.045, .125]) {
    add(car, KIT.rbox(.1, .03, .032, .005, 3), brassOld, 0, yy, -.085);
    add(car, new THREE.CylinderGeometry(.004, .004, .006, 16), brass, .03, yy + .018, -.085);
    add(car, new THREE.SphereGeometry(.0042, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass, .03, yy + .021, -.085);
  }
  add(car, KIT.rbox(.074, .032, .118, .004, 3), brass, 0, .078, -.004);
  for (const s of [-1, 1]) add(car, KIT.rbox(.006, .058, .1, .0015, 2), brass, s * .034, .04, -.012);
  add(car, KIT.rbox(.074, .052, .007, .003, 3), brass, 0, .07, .058);
  // 小窗：边框 + 字符牌 + 玻璃
  const winMaps = { '0': windowTex(KIT, '0'), '1': windowTex(KIT, '1'), '_': windowTex(KIT, '_') };
  const winMat = new THREE.MeshStandardMaterial({ map: winMaps['1'], roughness: .45 });
  add(car, new THREE.PlaneGeometry(.024, .018), winMat, 0, .074, .0618, { cast: false });
  add(car, frameGeo(.024, .018, .0032, .002, .0012), brassOld, 0, .074, .0614);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .1, roughness: .03, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.4, depthWrite: false });
  add(car, new THREE.PlaneGeometry(.025, .019), glassMat, 0, .074, .0626, { cast: false, recv: false });
  // 指针（箭头片，尖端指向当前格）
  const ps = new THREE.Shape(); ps.moveTo(-.002, .06); ps.lineTo(.002, .06); ps.lineTo(.002, .024); ps.lineTo(.0065, .024); ps.lineTo(0, .005); ps.lineTo(-.0065, .024); ps.lineTo(-.002, .024); ps.closePath();
  const pg = new THREE.ExtrudeGeometry(ps, { depth: .0015, bevelEnabled: true, bevelThickness: .0003, bevelSize: .0003, bevelSegments: 1 });
  add(car, pg, brass, 0, 0, .029);
  // 写字笔：钢杆 + 墨笔尖 + 压簧 + 滚花帽（整体可下压）
  const sty = new THREE.Group(); car.add(sty);
  add(sty, new THREE.CylinderGeometry(.0021, .0021, .106, 16), steel, 0, .067, .012);
  add(sty, new THREE.ConeGeometry(.0029, .009, 16), new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: .3, metalness: .6 }), 0, .0095, .012, { rx: Math.PI });
  add(sty, new THREE.CylinderGeometry(.0034, .0029, .006, 16), brass, 0, .017, .012);
  add(sty, knurlGeo(.0058, .008, 18), brass, 0, .123, .012);
  const spring = new THREE.Group(); spring.position.set(0, .0945, .012); car.add(spring);
  add(spring, helix(.0042, .024, 8, .00055), steel, 0, 0, 0);
  // 侧面滚花旋钮
  add(car, knurlGeo(.011, .012, 30), brass, .044, .078, .02, { rz: Math.PI / 2 });
  add(car, new THREE.CylinderGeometry(.004, .004, .008, 16), brassOld, .039, .078, .02, { rz: Math.PI / 2 });
  // 铭牌
  add(car, KIT.rbox(.088, .015, .0015, .0006, 2), M.brass({ rough: .3, extra: { map: plateTex(KIT, ['READ · WRITE  HEAD'], 1024, 170, 78) } }), 0, .115, -.0614);
  // 螺丝
  const Z = new THREE.Vector3(0, 0, 1);
  for (const sx of [-1, 1]) {
    for (const yy of [.016, .145]) screw(car, .0028, brass, slotMat, new THREE.Vector3(sx * .05, yy, -.0618), Z, sx * 3 + yy * 50);
    for (const zz of [-.045, .04]) screw(car, .0024, brass, slotMat, new THREE.Vector3(sx * .025, .094, zz), UP, sx * 7 + zz * 90);
    for (const zz of [-.04, .025]) screw(car, .0022, brass, slotMat, new THREE.Vector3(sx * .037, .055, zz), new THREE.Vector3(sx, 0, 0), sx * 11 + zz * 70);
    for (const yy of [.05, .09]) screw(car, .0018, brass, slotMat, new THREE.Vector3(sx * .03, yy, .0617), Z, sx * 13 + yy * 40);
  }
  // 状态拨盘
  const dial = new THREE.Group(); dial.position.set(0, .19, -.058); dial.rotation.x = -.38; car.add(dial);
  add(car, KIT.rbox(.03, .032, .012, .003, 2), brass, 0, .152, -.066);
  add(dial, new THREE.CylinderGeometry(.053, .055, .016, 64), brass, 0, 0, 0, { rx: Math.PI / 2 });
  add(dial, new THREE.CircleGeometry(.0465, 64), new THREE.MeshStandardMaterial({ map: dialTex(KIT), roughness: .32 }), 0, 0, .0082, { cast: false });
  add(dial, new THREE.TorusGeometry(.049, .0036, 12, 72), brass, 0, 0, .0084);
  const needle = new THREE.Group(); needle.position.z = .0094; dial.add(needle);
  const ns = new THREE.Shape(); ns.moveTo(-.0016, -.012); ns.lineTo(.0016, -.012); ns.lineTo(.0009, .036); ns.lineTo(0, .041); ns.lineTo(-.0009, .036); ns.closePath();
  const ng = new THREE.ExtrudeGeometry(ns, { depth: .0007, bevelEnabled: false });
  add(needle, ng, new THREE.MeshPhysicalMaterial({ color: 0x1a2440, metalness: .9, roughness: .28, clearcoat: .6 }), 0, 0, 0);
  add(needle, new THREE.CylinderGeometry(.0042, .0042, .0012, 20), new THREE.MeshPhysicalMaterial({ color: 0x1a2440, metalness: .9, roughness: .28 }), 0, -.012, .0003, { rx: Math.PI / 2 });
  add(dial, new THREE.SphereGeometry(.0032, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass, 0, 0, .0103, { rx: Math.PI / 2 });
  const dome = new THREE.SphereGeometry(.12, 48, 6, 0, Math.PI * 2, 0, Math.asin(.0475 / .12)); dome.rotateX(Math.PI / 2);
  add(dial, dome, glassMat, 0, 0, .0084 - .12 * Math.cos(Math.asin(.0475 / .12)), { cast: false, recv: false });
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; screw(dial, .0021, brass, slotMat, new THREE.Vector3(Math.cos(a) * .0505, Math.sin(a) * .0505, .0082), Z, 20 + k); }

  return {
    root, car, sty, spring, needle, dial, reels, tape, winMat, winMaps,
    /** 小车位置（格坐标，可为小数） */
    setHead(cell, press = 0) { car.position.set(X(cell), YT, 0); sty.position.y = -.0078 * press; spring.scale.y = 1 - .3 * press; },
    setDial(deg) { needle.rotation.z = -deg * Math.PI / 180; },
    setWindow(sym) { const m = winMaps[sym || '_'] || winMaps['_']; if (winMat.map !== m) winMat.map = m; },
    setReels(a) { reels[0].rotation.z = a; reels[1].rotation.z = a; },
  };
}
