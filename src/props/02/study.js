/* 02 · 场景 A：1864 年麦克斯韦的书桌（单位：米，桌面 y = 0）
   主角：一卷丝包铜线（线头剥开露出七股铜丝）→ 镜头沿导线滑向《电磁场的动力学理论》首页（按 Phil. Trans. 155 (1865) 版式排印复原）。 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';
import { lathe, mesh, makeMats, wire, lin } from './common.js';

const SERIF = '"Times New Roman", "Liberation Serif", Georgia, serif';

function wrapJustify(g, text, x, y, w, lh, font, indent = 0) {
  g.font = font; const words = text.split(' '); let line = [], lw = 0, first = true;
  const space = g.measureText(' ').width;
  const flush = (last) => {
    const ww = line.map(s => g.measureText(s).width), tot = ww.reduce((a, b) => a + b, 0), x0 = x + (first ? indent : 0), avail = w - (first ? indent : 0);
    const gap = last || line.length < 2 ? space : (avail - tot) / (line.length - 1);
    let xx = x0; line.forEach((s, i) => { g.fillText(s, xx, y); xx += ww[i] + gap; });
    y += lh; first = false; line = []; lw = 0;
  };
  for (const wd of words) { const ww = g.measureText(wd).width; if (lw + ww + (line.length ? space : 0) > w - (first ? indent : 0) && line.length) flush(false); line.push(wd); lw += ww + (line.length > 1 ? space : 0); }
  if (line.length) flush(true);
  return y;
}
function center(g, s, x, y, font) { g.font = font; g.textAlign = 'center'; g.fillText(s, x, y); g.textAlign = 'left'; }

/** 首页：标题 + 署名 + 收稿/宣读日期 + 正文开头 */
function titlePage(KIT) {
  return KIT.canvasTex(1100, 1432, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(28,20,14,.9)';
    center(g, '[ 459 ]', w / 2, 120, `400 30px ${SERIF}`);
    center(g, 'VIII. A Dynamical Theory of the Electromagnetic Field.', w / 2, 232, `700 41px ${SERIF}`);
    center(g, 'By J. CLERK MAXWELL, F.R.S.', w / 2, 300, `400 33px ${SERIF}`);
    center(g, 'Received October 27,—Read December 8, 1864.', w / 2, 360, `italic 400 27px ${SERIF}`);
    g.fillRect(w / 2 - 60, 392, 120, 1.6);
    center(g, 'PART I.—INTRODUCTORY.', w / 2, 452, `400 29px ${SERIF}`);
    const body = '(1.) THE most obvious mechanical phenomenon in electrical and magnetical experiments is the mutual action by which bodies in certain states set each other in motion while still at a considerable distance from each other. The first step, therefore, in reducing these phenomena into scientific form, is to ascertain the magnitude and direction of the force acting between the bodies, and when it is found that this force depends in a certain way upon the relative position of the bodies and on their electric or magnetic condition, it seems at first sight natural to explain the facts by assuming the existence of something either at rest or in motion in each body, constituting its electric or magnetic state, and capable of acting at a distance according to mathematical laws.';
    let y = wrapJustify(g, body, 110, 520, w - 220, 40, `400 28px ${SERIF}`, 40);
    const body2 = '(2.) In this way mathematical theories of statical electricity, of magnetism, of the mechanical action between conductors carrying currents, and of the induction of currents have been formed. In these theories the force acting between the two bodies is treated with reference only to the condition of the bodies and their relative position, and without any express consideration of the surrounding medium.';
    y = wrapJustify(g, body2, 110, y + 14, w - 220, 40, `400 28px ${SERIF}`, 40);
    const body3 = '(3.) The theory I propose may therefore be called a theory of the Electromagnetic Field, because it has to do with the space in the neighbourhood of the electric or magnetic bodies, and it may be called a Dynamical Theory, because it assumes that in that space there is matter in motion, by which the observed electromagnetic phenomena are produced.';
    y = wrapJustify(g, body3, 110, y + 14, w - 220, 40, `400 28px ${SERIF}`, 40);
    g.fillRect(110, h - 140, 300, 1.2);
    g.font = `400 22px ${SERIF}`; g.fillText('MDCCCLXV.', 110, h - 100); g.textAlign = 'right'; g.fillText('3 Q', w - 110, h - 100); g.textAlign = 'left';
    // 印刷油墨的不均匀
    const r = rng(9); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * .25})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); } g.globalCompositeOperation = 'source-over';
  });
}
/** 第二页：「电磁场的一般方程」（麦克斯韦原始记号 A–H） */
function eqPage(KIT) {
  return KIT.canvasTex(1100, 1432, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(28,20,14,.88)';
    center(g, '484', w - 130, 110, `400 28px ${SERIF}`);
    center(g, 'GENERAL EQUATIONS OF THE ELECTROMAGNETIC FIELD.', w / 2, 200, `400 31px ${SERIF}`);
    const rows = [
      ['(A)', "p′ = p + df/dt,    q′ = q + dg/dt,    r′ = r + dh/dt"],
      ['(B)', 'μα = dH/dy − dG/dz,    μβ = dF/dz − dH/dx,    μγ = dG/dx − dF/dy'],
      ['(C)', "dγ/dy − dβ/dz = 4πp′,    dα/dz − dγ/dx = 4πq′,    dβ/dx − dα/dy = 4πr′"],
      ['(D)', 'P = μ(γ dy/dt − β dz/dt) − dF/dt − dΨ/dx'],
      ['(E)', 'P = kf,    Q = kg,    R = kh'],
      ['(F)', 'P = −ρp,    Q = −ρq,    R = −ρr'],
      ['(G)', 'e + df/dx + dg/dy + dh/dz = 0'],
      ['(H)', 'de/dt + dp/dx + dq/dy + dr/dz = 0'],
    ];
    let y = 300; for (const [k, s] of rows) { g.font = `400 26px ${SERIF}`; g.fillText(k, 110, y); g.font = `italic 400 29px ${SERIF}`; g.fillText(s, 210, y); y += 76; }
    const txt = 'These equations are twenty in number, and they involve twenty variable quantities. The agreement of the results seems to show that light and magnetism are affections of the same substance, and that light is an electromagnetic disturbance propagated through the field according to electromagnetic laws.';
    wrapJustify(g, txt, 110, y + 40, w - 220, 40, `400 28px ${SERIF}`, 40);
  });
}

export async function buildStudy(KIT) {
  const s = new THREE.Scene();
  await KIT.hdri(s, KIT.hdriFile('vintage_measuring_lab'), { intensity: .3, rotation: 1.2, background: true, bgBlur: .7, bgIntensity: .05 });
  const M = makeMats(KIT);

  // ---- 灯光：右后方暖色主光（制造铜线的高光边）+ 油灯 + 极弱冷补光 ----
  const key = new THREE.SpotLight(0xffd3a2, 3.6, 0, Math.PI / 6, .85, 2); key.position.set(.78, .92, -.42); key.target.position.set(.05, 0, .02); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.00012; key.shadow.normalBias = .0012; key.shadow.radius = 4; Object.assign(key.shadow.camera, { near: .3, far: 3 }); s.add(key, key.target);
  const front = new THREE.SpotLight(0xffe6cc, 1.1, 0, Math.PI / 5, .9, 2); front.position.set(-.3, .8, .9); front.target.position.set(.05, 0, 0); s.add(front, front.target);
  const cool = new THREE.DirectionalLight(0xb8c8ff, .12); cool.position.set(-1, .6, .4); s.add(cool);

  // ---- 桌面与背景 ----
  const deskMat = await KIT.pbr('dark_wood', { repeat: 3, physical: true, extra: { clearcoat: .25, clearcoatRoughness: .4 } }); deskMat.color.setRGB(.95, .78, .66);
  const desk = mesh(new THREE.PlaneGeometry(2.4, 1.6), deskMat, { cast: false }); desk.rotation.x = -Math.PI / 2; s.add(desk);
  const wallMat = await KIT.pbr('dark_wood', { repeat: [2.4, 1.2] }); wallMat.color.setRGB(.36, .28, .23);
  const wall = mesh(new THREE.PlaneGeometry(3.4, 1.8), wallMat, { cast: false }); wall.position.set(-.1, .9, -.95); wall.rotation.y = .12; s.add(wall);
  const leather = await KIT.pbr('brown_leather', { repeat: 1.6 });
  const pad = mesh(KIT.rbox(.62, .004, .42, .0016, 2), leather, { cast: false }); pad.position.set(-.02, .002, .0); pad.rotation.y = .06; s.add(pad);

  // ---- 论文（四开本单行本：首页 + 方程页 + 下面一叠纸） ----
  const paperMat = await KIT.pbr('acg_paper006_aged_paper', { repeat: 1, extra: { roughness: .92 } }); paperMat.color.setRGB(1.06, 1.0, .9);
  const PW = .215, PH = .28;
  const sheetGeo = () => { const g = new THREE.PlaneGeometry(PW, PH, 24, 24); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / PW + .5, y = p.getY(i) / PH + .5; p.setZ(i, .006 * Math.pow(Math.max(0, x - .7) / .3, 2) * Math.pow(Math.max(0, .35 - y) / .35, 1.5) + .0004 * (1 + Math.sin(y * 9))); } g.computeVertexNormals(); return g; };
  const inkMat = tex => new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const paper = new THREE.Group(); paper.position.set(-.05, .004, -.01); paper.rotation.y = .1; s.add(paper);
  // 层次都在皮垫顶面之上、彼此留出空隙：纸面的起伏只向上（不会插进下面那张纸或纸垛），避免穿模和闪烁
  const stack = mesh(KIT.rbox(PW - .002, .004, PH - .002, .0008, 1), paperMat); stack.position.y = .0022; paper.add(stack);
  const p2 = new THREE.Group(); p2.position.set(.06, .0046, -.05); p2.rotation.y = -.16; paper.add(p2);
  const s2 = mesh(sheetGeo(), paperMat); s2.rotation.x = -Math.PI / 2; p2.add(s2);
  const i2 = mesh(sheetGeo(), inkMat(eqPage(KIT)), { cast: false }); i2.rotation.x = -Math.PI / 2; i2.position.y = .0003; p2.add(i2);
  const p1 = new THREE.Group(); p1.position.set(0, .0068, 0); paper.add(p1);
  const s1 = mesh(sheetGeo(), paperMat); s1.rotation.x = -Math.PI / 2; p1.add(s1);
  const i1 = mesh(sheetGeo(), inkMat(titlePage(KIT)), { cast: false }); i1.rotation.x = -Math.PI / 2; i1.position.y = .0003; p1.add(i1);

  // ---- 丝包铜线卷 + 引出线（线头剥开，七股铜丝微微散开） ----
  const silk = M.silk(0x3b2a1a);
  const coilC = V(.36, 0, -.08), R = .034, wr = .0017, turns = 9, pitch = .0046;
  const pts = [];
  for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2; pts.push(V(coilC.x - turns * pitch / 2 + i / 24 * pitch, R + wr + Math.cos(a) * R, coilC.z + Math.sin(a) * R)); }
  // 引线：从线圈外侧下来，在桌面上画一道弧，线头停在论文右侧
  const endP = V(.122, wr, .085), dirEnd = V(-1, 0, .18).normalize();
  const last = pts[pts.length - 1];
  pts.push(V(last.x + .01, wr + .01, last.z + .02), V(.33, wr, .05), V(.27, wr, .12), V(.2, wr, .118), V(.155, wr, .098), endP);
  const coil = wire(pts, silk, wr, 1400, 10); s.add(coil.mesh);
  // 绝缘层断口（略毛糙）+ 裸铜
  const stripC = endP.clone(); const ring = mesh(new THREE.TorusGeometry(wr * .92, wr * .28, 8, 24), new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: .95 })); ring.position.copy(stripC); ring.lookAt(stripC.clone().add(dirEnd)); s.add(ring);
  const strandMat = KIT.M.copper({ rough: .22, seed: 13 });
  for (let k = 0; k < 7; k++) {
    const a0 = k / 6 * Math.PI * 2, rr = k === 6 ? 0 : wr * .55, sp = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, L = .016 + (k % 3) * .0015, a = a0 + u * 2.4;
      const spread = 1 + Math.pow(u, 2.2) * 3.2;
      const off = V(0, Math.cos(a) * rr * spread, Math.sin(a) * rr * spread);
      const q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), dirEnd);
      off.applyQuaternion(q);
      const p = stripC.clone().addScaledVector(dirEnd, u * L).add(off); p.y = Math.max(p.y, .00045); sp.push(p);
    }
    const st = wire(sp, strandMat, .00042, 40, 6); s.add(st.mesh);
  }

  // ---- 墨水瓶（玻璃 + 墨）、羽毛笔、指南针、油灯、书 ----
  const inkwell = new THREE.Group(); inkwell.position.set(.2, 0, -.16); s.add(inkwell);
  const bottle = mesh(KIT.rbox(.052, .048, .052, .008, 3), M.glass); bottle.position.y = .024; inkwell.add(bottle);
  const inkIn = mesh(KIT.rbox(.044, .03, .044, .006, 2), new THREE.MeshPhysicalMaterial({ color: 0x06070a, roughness: .05, clearcoat: 1 })); inkIn.position.y = .017; inkwell.add(inkIn);
  const neck = mesh(lathe([[.012, 0], [.012, .006], [.0135, .007], [.0135, .012], [0, .012]]), M.oldBrass); neck.position.y = .047; inkwell.add(neck);
  const lid = mesh(lathe([[0, 0], [.0155, 0], [.0155, .004], [.012, .0065], [.004, .008], [0, .008]]), M.brass); lid.position.set(.004, .059, 0); lid.rotation.z = .08; inkwell.add(lid);
  // 羽毛笔：象牙色羽轴 + 带羽枝透明贴图的羽片
  const quill = new THREE.Group(); quill.position.set(.085, .0, -.215); quill.rotation.y = -.55; s.add(quill);
  const shaftC = new THREE.CatmullRomCurve3([V(0, .0012, 0), V(.08, .004, 0), V(.17, .009, .002), V(.27, .016, .006)]);
  const shaft = mesh(new THREE.TubeGeometry(shaftC, 64, .0018, 8, false), new THREE.MeshPhysicalMaterial({ color: 0xe8dcc0, roughness: .35, transmission: .2, thickness: .002, clearcoat: .4 })); quill.add(shaft);
  const nib = mesh(new THREE.ConeGeometry(.0016, .012, 8), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: .4 })); nib.rotation.z = Math.PI / 2; nib.position.set(-.004, .0012, 0); quill.add(nib);
  const vaneTex = KIT.canvasTex(512, 96, (g, w, h) => { g.clearRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 520; i++) { const x = i / 520 * w, y0 = h / 2, len = (h / 2 - 4) * Math.sin(Math.PI * Math.min(1, (x / w) * 1.15)) * (.82 + r() * .18); g.strokeStyle = `rgba(${236 + r() * 14},${226 + r() * 14},${206 + r() * 14},${.55 + r() * .4})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 10, y0 - len); g.moveTo(x, y0); g.lineTo(x + 10, y0 + len * .8); g.stroke(); } });
  const vaneGeo = new THREE.PlaneGeometry(.2, .036, 32, 4); { const p = vaneGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -Math.abs(y) * .25 + .02 * (x / .1) * (x / .1) * .1); } vaneGeo.computeVertexNormals(); }
  const vane = mesh(vaneGeo, new THREE.MeshPhysicalMaterial({ map: vaneTex, transparent: true, alphaTest: .05, side: THREE.DoubleSide, roughness: .7, sheen: .8, sheenColor: new THREE.Color(0xffffff), depthWrite: true }));
  vane.rotation.x = -Math.PI / 2 + .12; vane.position.set(.175, .011, .004); vane.rotation.z = -.04; quill.add(vane);
  const prop = async (id, size, p, ry = 0) => { try { const m = await KIT.model(`assets/models/polyhaven/${id}/${id}_1k.gltf`, { size }); m.position.set(...p); m.rotation.y = ry; s.add(m); return m; } catch (e) { console.warn('[02] model', id, e); return null; } };
  const [lamp] = await Promise.all([
    prop('vintage_oil_lamp', .5, [-.4, 0, -.36], .3),
    prop('book_encyclopedia_set_01', .27, [.6, 0, -.42], -.45),
    prop('round_spectacles', .13, [-.13, .006, .12], 2.2),
    prop('seadogs_compass', .085, [.3, 0, .2], .6),
  ]);
  let flame = null;
  if (lamp) lamp.traverse(o => { if (o.isMesh && /flame/i.test(o.name + (o.material && o.material.name))) { o.material = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffa04a, emissiveIntensity: 5, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }); o.castShadow = false; flame = o; } if (o.isMesh && /glass/i.test(o.name + (o.material && o.material.name))) { o.castShadow = false; } });
  const lampL = new THREE.PointLight(0xff9f55, .32, 0, 2); lampL.position.set(-.4, .5 * .62, -.36); s.add(lampL);

  s.updateMatrixWorld(true);
  return {
    scene: s, paperTitle: p1.localToWorld(V(0, 0, -.07)), paperCenter: p1.localToWorld(V(0, 0, 0)), wireEnd: endP.clone().addScaledVector(dirEnd, .008),
    update(t) { const f = .92 + .08 * Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1); lampL.intensity = .32 * f; if (flame) flame.material.emissiveIntensity = 5 * f; },
    world(o, p) { s.updateMatrixWorld(true); return o.localToWorld(p.clone()); }, p1,
  };
}
