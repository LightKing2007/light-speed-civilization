/* 00 · 智能手机写实模型（单位：米，接近 6.1 英寸机型的真实尺寸 71.6 × 147.6 × 8.3 mm）。
   外观：带倒角的金属中框（天线断点注塑条）、前后玻璃、三摄模组（镜片带镀膜虹彩）、按键、底部 USB-C / 扬声器孔 / 螺丝。
   内部：中板、电池（标签）、主板（SoC / 存储 / 5G 基带 / 屏蔽罩 / 阻容 / 连接器）、橙色天线柔性板、无线充电线圈、振动马达、扬声器。
   setXray(k)：屏幕渐隐露出内部；setExplode(e)：各层沿机身法线分开（爆炸视图）。anchors：标注锚点。 */
import * as THREE from 'three';
import { rng } from '../../engine/util.js';

export const PW = .0716, PH = .1476, PD = .0083, PR = .0105;
const LIN = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

export function rr(w, h, r, s = new THREE.Shape()) {
  const x = w / 2, y = h / 2; r = Math.min(r, x, y);
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x, y - r); s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  s.lineTo(-x + r, y); s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -y + r); s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
/** 平面圆角矩形（UV 归一化到 0..1） */
export function flat(w, h, r, seg = 20) {
  const g = new THREE.ShapeGeometry(rr(w, h, r), seg), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  return g;
}
/** 带倒角的圆角薄板：外形 w×h、总厚 depth，中心在原点（z 为厚度方向） */
export function slab(w, h, r, depth, bev, seg = 20) {
  const g = new THREE.ExtrudeGeometry(rr(w - 2 * bev, h - 2 * bev, Math.max(r - bev, .0001)), { depth: Math.max(depth - 2 * bev, 1e-6), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: seg });
  g.translate(0, 0, -(depth - 2 * bev) / 2); g.computeVertexNormals(); return g;
}
const cyl = (r, h, n = 32) => new THREE.CylinderGeometry(r, r, h, n);

/* ---------- 贴图：电池标签 / 主板 / 芯片印字 / 天线柔性板 / 线圈 ---------- */
function batteryLabel(KIT) {
  return KIT.canvasTex(512, 680, (g, w, h) => {
    g.fillStyle = '#141416'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e8e6'; g.font = '600 30px "Helvetica Neue",Arial,sans-serif'; g.fillText('Li-ion Polymer Battery', 40, 90);
    g.font = '400 22px "Helvetica Neue",Arial,sans-serif';
    ['3.87 V  ⎓  3349 mAh  12.96 Wh', 'Rated capacity: 3274 mAh', 'Charge limit: 4.45 V', 'Do not puncture, crush or expose', 'to temperatures above 60 °C.'].forEach((s, i) => g.fillText(s, 40, 140 + i * 34));
    g.strokeStyle = '#e8e8e6'; g.lineWidth = 2; g.strokeRect(40, 340, 120, 120); g.font = '600 64px Arial'; g.fillText('⚠', 66, 425);
    g.font = '400 18px monospace'; g.fillText('BX-61 · 2026-09 · CN', 190, 380); g.fillText('S/N F2LZ8K1QJ4N7', 190, 410);
    for (let i = 0; i < 46; i++) { g.fillRect(190 + i * 6, 430, (i * 7) % 3 + 1, 40); }
    g.fillStyle = '#c9c9c4'; g.fillRect(0, h - 70, w, 4);
  });
}
function pcbTex(KIT, seed = 4) {
  return KIT.canvasTex(1024, 1024, (g, w, h) => {
    const r = rng(seed); g.fillStyle = '#0f241f'; g.fillRect(0, 0, w, h);
    g.lineCap = 'round';
    for (let i = 0; i < 520; i++) { // 走线（45° 折线）
      let x = r() * w, y = r() * h; g.strokeStyle = `rgba(${40 + r() * 30},${90 + r() * 40},${70 + r() * 30},${.35 + r() * .35})`; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { const L = 20 + r() * 140, d = (r() * 8 | 0) * Math.PI / 4; x += Math.cos(d) * L; y += Math.sin(d) * L; g.lineTo(x, y); } g.stroke();
    }
    for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, s = 3 + r() * 9; g.fillStyle = r() < .7 ? '#c8a050' : '#d9d4c8'; g.fillRect(x, y, s, s * (.5 + r())); } // 焊盘
    for (let i = 0; i < 260; i++) { g.fillStyle = '#0a1512'; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 2, 0, 7); g.fill(); } // 过孔
  });
}
function chipTex(KIT, lines, { bg = '#1b1c1e', fg = 'rgba(205,205,200,.85)', logo = false } = {}) {
  return KIT.canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.08)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textAlign = 'left';
    lines.forEach((s, i) => { g.font = i === 0 ? '600 72px "Helvetica Neue",Arial,sans-serif' : '400 34px "Menlo",monospace'; g.fillText(s, 52, 150 + i * 70 + (i ? 30 : 0)); });
    g.beginPath(); g.arc(46, h - 46, 12, 0, 7); g.fill();
    if (logo) { g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(20, 20, w - 40, h - 40); }
  });
}
function flexTex(KIT) {
  return KIT.canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#b8620f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e0a868'; g.lineWidth = 6; g.beginPath();
    for (let x = 30; x < w - 30; x += 46) { g.moveTo(x, 24); g.lineTo(x, h - 24); g.lineTo(x + 23, h - 24); g.lineTo(x + 23, 24); g.lineTo(x + 46, 24); } g.stroke();
    g.fillStyle = '#f2c46b'; for (const x of [12, w - 40]) g.fillRect(x, 30, 28, h - 60);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '500 20px monospace'; g.fillText('ANT-5G  n77/n78/n79', w * .62, h - 6);
  });
}
function coilTex(KIT) {
  return KIT.canvasTex(1024, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h); const c = w / 2;
    for (let k = 0; k < 40; k++) { const r = 222 + k * 7; g.strokeStyle = k % 2 ? '#b8703f' : '#a35f34'; g.lineWidth = 5; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
  });
}

/* ---------- 主体 ---------- */
export function makePhone(KIT, { variant = 'black', screen = null, glass = 'overlay', screenK = .9 } = {}) {
  const V2 = variant === 'white';
  const frameM = new THREE.MeshPhysicalMaterial({ color: V2 ? LIN(.80, .80, .79) : LIN(.23, .22, .215), metalness: 1, roughness: V2 ? .26 : .34, roughnessMap: KIT.brushed(21), clearcoat: .2, clearcoatRoughness: .3 });
  const backM = new THREE.MeshPhysicalMaterial({ color: V2 ? 0xe4e2dc : 0x1f2023, roughness: .42, roughnessMap: KIT.grunge(31, { contrast: .4 }), clearcoat: .55, clearcoatRoughness: .35, metalness: 0 });
  const bumpM = new THREE.MeshPhysicalMaterial({ color: V2 ? 0xdcdad4 : 0x18191b, roughness: .08, clearcoat: 1, clearcoatRoughness: .05 });
  const lineM = new THREE.MeshPhysicalMaterial({ color: V2 ? 0xcfcfcb : 0x2b2c2f, roughness: .55 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: .5 });
  const blackGloss = new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: .05, clearcoat: 1, iridescence: .9, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520] });
  const steel = KIT.M.steel({ rough: .3 }), alu = KIT.M.aluminium({ rough: .42 }), tin = KIT.M.steel({ rough: .22, extra: { color: LIN(.72, .73, .74) } });

  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const L = { back: new THREE.Group(), mid: new THREE.Group(), board: new THREE.Group(), disp: new THREE.Group(), glass: new THREE.Group() };
  for (const k in L) body.add(L[k]);
  const add = (grp, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };

  // ----- 中框（空心带倒角） -----
  const wall = .0012, bt = .0008, bs = .0007;
  const sh = rr(PW - 2 * bs, PH - 2 * bs, PR - bs); sh.holes.push(rr(PW - 2 * wall, PH - 2 * wall, PR - wall, new THREE.Path()));
  const bandG = new THREE.ExtrudeGeometry(sh, { depth: PD - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 4, curveSegments: 28 });
  bandG.translate(0, 0, -(PD - 2 * bt) / 2); bandG.computeVertexNormals();
  add(L.mid, bandG, frameM);
  // 天线断点（注塑条）
  const aw = wall + bs + .0004;
  for (const sx of [-1, 1]) for (const yy of [.0575, -.0585]) add(L.mid, new THREE.BoxGeometry(aw, .0011, PD * .86), lineM, sx * (PW / 2 - aw / 2 + .0002), yy, 0);
  add(L.mid, new THREE.BoxGeometry(.0011, aw, PD * .86), lineM, .016, PH / 2 - aw / 2 + .0002, 0);
  add(L.mid, new THREE.BoxGeometry(.0011, aw, PD * .86), lineM, -.019, -PH / 2 + aw / 2 - .0002, 0);
  // 按键
  const btn = (x, y, len) => add(L.mid, KIT.rbox(.0014, len, .0031, .0005, 3), frameM, x, y, 0);
  btn(-PW / 2 - .0002, .041, .0065); btn(-PW / 2 - .0002, .0265, .0105); btn(-PW / 2 - .0002, .0125, .0105); btn(PW / 2 + .0002, .029, .0165);
  // 底部：USB-C、扬声器孔、螺丝
  add(L.mid, KIT.rbox(.0090, .0016, .0032, .0007, 3), black, 0, -PH / 2 + .0006, 0);
  add(L.mid, new THREE.BoxGeometry(.0064, .0003, .0007), alu, 0, -PH / 2 - .00012, 0);
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) add(L.mid, cyl(.00052, .0005, 12), black, sx * (.0112 + i * .00215), -PH / 2 + .00005, 0);
  for (const sx of [-1, 1]) add(L.mid, cyl(.00062, .0004, 16), steel, sx * .0064, -PH / 2 - .00005, 0);
  // 中板 / 电池 / 马达 / 扬声器 / 摄像头模组
  add(L.mid, slab(PW - .004, PH - .004, PR - .002, .0006, .0001), new THREE.MeshPhysicalMaterial({ color: LIN(.06, .062, .066), metalness: .8, roughness: .5, roughnessMap: KIT.grunge(27) }), 0, 0, -PD / 2 + .0013);
  const batt = add(L.mid, KIT.rbox(.058, .076, .0045, .0012, 3), new THREE.MeshPhysicalMaterial({ color: 0x17181a, roughness: .5, clearcoat: .3 }), 0, -.020, -.0004);
  const bl = add(L.mid, new THREE.PlaneGeometry(.054, .0717), new THREE.MeshPhysicalMaterial({ map: batteryLabel(KIT), roughness: .45, clearcoat: .4, clearcoatRoughness: .3 }), 0, -.020, .00186); bl.castShadow = false;
  add(L.mid, KIT.rbox(.030, .0085, .0034, .0008, 3), steel, -.012, -.0632, -.0004);
  add(L.mid, KIT.rbox(.016, .0085, .0034, .0008, 3), black, .016, -.0632, -.0004);
  for (const [x, y] of [[-.0217, .0597], [-.0217, .0427], [-.0047, .0512]]) { add(L.mid, KIT.rbox(.0092, .0092, .0055, .0008, 2), black, x, y, -.0012); add(L.mid, cyl(.0034, .0012, 24), alu, x, y, .0021, Math.PI / 2); }

  // ----- 主板 -----
  const bz = -.0012, bTop = bz + .0005;
  add(L.board, KIT.rbox(.034, .046, .0010, .0008, 2), new THREE.MeshPhysicalMaterial({ map: pcbTex(KIT), roughness: .45, clearcoat: .7, clearcoatRoughness: .25 }), .016, .044, bz);
  const B = (x, y) => [.016 + x, .044 + y];
  const chip = (x, y, w, h, d, lines, o) => {
    const [px, py] = B(x, y); const m = add(L.board, KIT.rbox(w, h, d, Math.min(.0004, d * .45), 2), new THREE.MeshPhysicalMaterial({ color: 0x1b1c1e, roughness: .45 }), px, py, bTop + d / 2);
    if (lines) { const l = add(L.board, new THREE.PlaneGeometry(w * .94, h * .94), new THREE.MeshPhysicalMaterial({ map: chipTex(KIT, lines, o), roughness: .5, metalness: 0 }), px, py, bTop + d + .00002); l.castShadow = false; }
    return m;
  };
  chip(-.003, .007, .0135, .0140, .0013, ['SoC', '3 nm · 6-core', '2603 · TW'], { logo: true });
  chip(.009, .012, .0090, .0110, .0009, ['NAND', '256 GB'], {});
  chip(.008, -.008, .0090, .0095, .0009, ['5G', 'MODEM · RF', 'n77 n78 n79'], {});
  chip(.006, -.019, .0070, .0060, .0007, null);
  { const [px, py] = B(-.0045, -.0085); add(L.board, KIT.rbox(.0130, .0092, .0011, .0003, 2), tin, px, py, bTop + .00055); }
  for (const [x, y, w] of [[-.012, .0205, .0062], [-.0125, -.0205, .0058], [.0125, .0205, .0050]]) { const [px, py] = B(x, y); add(L.board, KIT.rbox(w, .0022, .0009, .0002, 2), black, px, py, bTop + .00045); add(L.board, new THREE.BoxGeometry(w * .86, .0005, .0001), KIT.M.gold({ rough: .25 }), px, py - .0007, bTop + .0001); }
  { // 阻容元件（实例化）
    const N = 160, r = rng(77), im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .5 }), N); im.castShadow = im.receiveShadow = true;
    const keep = [[-.003, .007, .0082], [.009, .012, .0065], [.008, -.008, .0058], [.006, -.019, .0048], [-.0045, -.0085, .0078]];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let n = 0, guard = 0;
    while (n < N && guard++ < 5000) {
      const x = (r() - .5) * .032, y = (r() - .5) * .043; if (keep.some(k => Math.abs(x - k[0]) < k[2] && Math.abs(y - k[1]) < k[2] * .95)) continue;
      const big = r() < .2, w = big ? .0010 : .0006, h = w / 2, d = big ? .0006 : .0003; const [px, py] = B(x, y);
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), r() < .5 ? 0 : Math.PI / 2); m4.compose(new THREE.Vector3(px, py, bTop + d / 2), q, new THREE.Vector3(w, h, d)); im.setMatrixAt(n, m4);
      c.set(r() < .55 ? 0x9a8460 : r() < .5 ? 0x1c1c1c : 0x6e6a62); im.setColorAt(n, c); n++;
    }
    im.count = n; L.board.add(im);
  }
  // 天线柔性板（橙色聚酰亚胺 + 铜走线）
  const flexM = new THREE.MeshPhysicalMaterial({ map: flexTex(KIT), roughness: .35, clearcoat: .7, clearcoatRoughness: .2 });
  add(L.board, KIT.rbox(.060, .0034, .0003, .0001, 1), flexM, 0, PH / 2 - .0036, .0006);
  add(L.board, KIT.rbox(.050, .0034, .0003, .0001, 1), flexM, 0, -PH / 2 + .0036, .0006);
  add(L.board, KIT.rbox(.0030, .030, .0003, .0001, 1), flexM, PW / 2 - .0036, .050, .0006);
  for (const x of [-.022, .006, .024]) add(L.board, KIT.rbox(.0018, .0016, .0009, .0002, 1), KIT.M.gold({ rough: .2 }), x, PH / 2 - .0036, .0010);

  // ----- 后盖：玻璃、镜头模组、线圈 -----
  add(L.back, slab(PW - .0016, PH - .0016, PR - .0008, .0009, .0003), backM, 0, 0, -(PD / 2 - .00035));
  const bx = -PW / 2 + .0226, by = PH / 2 - .0226, bzz = -PD / 2 - .00045;
  add(L.back, slab(.0372, .0372, .0098, .0011, .0003), bumpM, bx, by, bzz);
  for (const [dx, dy] of [[-.0085, .0085], [-.0085, -.0085], [.0085, 0]]) {
    add(L.back, cyl(.0069, .0016, 48), frameM, bx + dx, by + dy, bzz - .0011, Math.PI / 2);
    add(L.back, cyl(.0058, .0003, 48), black, bx + dx, by + dy, bzz - .0019, Math.PI / 2);
    add(L.back, cyl(.0046, .0002, 48), blackGloss, bx + dx, by + dy, bzz - .00205, Math.PI / 2);
  }
  add(L.back, cyl(.0021, .0004, 24), new THREE.MeshPhysicalMaterial({ color: 0xf2ead2, roughness: .6 }), bx + .0085, by + .0092, bzz - .0006, Math.PI / 2);
  add(L.back, cyl(.0019, .0004, 24), blackGloss, bx + .0085, by - .0092, bzz - .0006, Math.PI / 2);
  const coilM = new THREE.MeshPhysicalMaterial({ map: coilTex(KIT), transparent: true, alphaTest: .3, metalness: .75, roughness: .42, color: 0xa8a29a, side: THREE.DoubleSide });
  add(L.back, new THREE.CircleGeometry(.0225, 64), new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: .7 }), 0, -.006, -PD / 2 + .00095);
  add(L.back, new THREE.PlaneGeometry(.045, .045), coilM, 0, -.006, -PD / 2 + .0011);

  // ----- 显示屏与前玻璃 -----
  const backing = add(L.disp, slab(PW - .0032, PH - .0032, PR - .0016, .0007, .0001), new THREE.MeshPhysicalMaterial({ color: 0x08090a, roughness: .6, transparent: true }), 0, 0, PD / 2 - .00125);
  const dispMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screen, emissiveIntensity: screenK, roughness: .9, metalness: 0, transparent: glass === 'overlay' });
  const disp = add(L.disp, flat(PW - .0042, PH - .0042, PR - .0021), dispMat, 0, 0, PD / 2 - .00084); disp.castShadow = false;
  let coverM;
  if (glass === 'overlay') coverM = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .035, metalness: 0, clearcoat: 1, clearcoatRoughness: .03, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  else coverM = KIT.M.glass({ thickness: .0009, ior: 1.5, rough: .02 });
  const cover = add(L.glass, slab(PW - .0016, PH - .0016, PR - .0008, .0009, .0003, 28), coverM, 0, 0, PD / 2 - .00035); cover.castShadow = glass !== 'overlay';

  // ----- 锚点 -----
  const anchor = (grp, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); grp.add(o); return o; };
  const anchors = {
    antenna: anchor(L.board, .012, PH / 2 - .0036, .0008), antennaSide: anchor(L.mid, PW / 2, .0575, 0), top: anchor(L.mid, 0, PH / 2 - .004, .002),
    soc: anchor(L.board, ...B(-.003, .007), bTop + .0014), modem: anchor(L.board, ...B(.008, -.008), bTop + .001), battery: anchor(L.mid, -.012, -.030, .0019), board: anchor(L.board, ...B(-.01, .0), bTop),
    screen: anchor(L.disp, 0, 0, PD / 2), cam: anchor(L.back, bx, by, bzz - .002),
  };
  const P = {
    group: root, body, layers: L, anchors, dispMat, coverM, backing,
    setScreenK(k) { dispMat.emissiveIntensity = k; },
    setXray(k) {
      dispMat.opacity = 1 - .9 * k; dispMat.emissiveIntensity = screenK * (1 - k * .96); backing.material.opacity = 1 - .93 * k;
      backing.visible = k < .99; disp.visible = k < .995; dispMat.depthWrite = k < .05; backing.material.depthWrite = k < .05;
    },
    setExplode(e, { spread = 1 } = {}) {
      const s = spread * e;
      L.back.position.set(-.010 * s, 0, -.036 * s); L.mid.position.set(0, 0, 0); L.board.position.set(.006 * s, 0, .024 * s);
      L.disp.position.set(.012 * s, 0, .050 * s); L.glass.position.set(.017 * s, 0, .069 * s);
    },
  };
  P.setXray(0); P.setExplode(0);
  return P;
}
