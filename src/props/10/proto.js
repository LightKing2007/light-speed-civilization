/* 10 · 通用语言：道具（蓝图风格）。
   blueprintFloor：深蓝底 + 细网格的「蓝图」地面。
   buildIslands：三种互不相通的网络 —— ARPANET（IMP 机柜，有线）、PRNET（无线电分组网电台 + 鞭状天线）、
                 SATNET（地面站碟形天线 + 卫星）；每个网络的包形状不同（立方 / 球 / 八面体）。
   buildLab：一个可以层层封装的数据包（数据 → TCP 头 → IP 头 → 链路层帧头 / 帧尾，各自带半透明外壳）、
             开顶的机架式路由器、重传演示用的两台主机、链路介质（光纤 / Wi-Fi / 5G）、
             以及摊在桌上的 Cerf & Kahn 照片、1974 年论文首页（排印复原）与反色处理的 1977 ARPANET 逻辑图。
   单位：米（示意比例）。x 向右，z 朝向镜头，y 向上。 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';

export const COL = { data: '#f2efe8', tcp: '#5aa9ff', ip: '#5fd38d', link: '#c58bff', eth: '#ff9a4a', tcpHex: 0x5aa9ff, ipHex: 0x5fd38d, linkHex: 0xc58bff, ethHex: 0xff9a4a };
const MONO = '"JetBrains Mono", "Courier New", monospace', SANS = '"Noto Sans SC", "PingFang SC", sans-serif';
const mesh = (geo, mat, { cast = true, recv = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };

export function blueprintFloor(KIT, size = 40) {
  const tex = KIT.canvasTex(2048, 2048, (g, w) => {
    g.fillStyle = '#0c1d33'; g.fillRect(0, 0, w, w);
    const n = 40, step = w / n;                            // 一张贴图 = 10 m → 每小格 25 cm，每 4 格一条粗线
    for (let i = 0; i <= n; i++) { const major = i % 4 === 0; g.strokeStyle = major ? 'rgba(150,200,255,.2)' : 'rgba(150,200,255,.075)'; g.lineWidth = major ? 2 : 1; g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, w); g.moveTo(0, i * step); g.lineTo(w, i * step); g.stroke(); }
    g.fillStyle = 'rgba(150,200,255,.22)'; for (let i = 4; i < n; i += 4) for (let j = 4; j < n; j += 4) g.fillRect(i * step - 4, j * step - .5, 8, 1);
  }, { srgb: true, aniso: 16 });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(size / 10, size / 10);
  const floor = mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, roughness: .9, metalness: 0 }), { cast: false });
  floor.rotation.x = -Math.PI / 2; floor.position.y = .001; return floor;
}
/** 可重画的文字贴图：draw(g, w, h) 只在 key 变化时执行 */
function liveTex(KIT, w, h) {
  const tex = KIT.canvasTex(w, h, () => { }, { aniso: 16 }), g = tex.userData.g; let key = null;
  return { tex, set(k, draw) { if (k === key) return; key = k; g.clearRect(0, 0, w, h); draw(g, w, h); tex.needsUpdate = true; } };
}

/* ---------------- A · 三种网络 ---------------- */
export const ISLES = { arpa: { x: -3.3, col: 0xffb347 }, prnet: { x: 0, col: 0x8fd8ff }, satnet: { x: 3.3, col: 0x7ee08a } };
export function buildIslands(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x07101c, key: 300, fill: 14, rim: 120, keyPos: [-4, 9, 7], rimPos: [5, 5, -6], fillPos: [6, 3, 6], target: [0, .4, 0], floorY: 0, env: .35, shadowRadius: 5 });
  st.key.shadow.camera.far = 30; st.key.angle = Math.PI / 4.2; st.key.penumbra = .9;
  scene.add(blueprintFloor(KIT)); scene.fog = new THREE.Fog(0x07101c, 12, 26);
  const dark = KIT.M.paint(0x1a1d22, { rough: .4 }), cream = KIT.M.paint(0xd9d2bf, { rough: .55 }), olive = KIT.M.paint(0x4a5236, { rough: .5 }), white = KIT.M.paint(0xe8e8e4, { rough: .45 }), steel = KIT.M.steel({ rough: .35 });
  const isles = {};
  for (const [k, o] of Object.entries(ISLES)) {
    const g = new THREE.Group(); g.position.x = o.x; scene.add(g);
    const plinth = mesh(new THREE.CylinderGeometry(1.15, 1.2, .12, 96), dark); plinth.position.y = .06; g.add(plinth);
    const ring = mesh(new THREE.TorusGeometry(1.17, .012, 8, 128), KIT.M.emissive(o.col, .8), { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.y = .125; g.add(ring);
    // 边界：一圈很淡的竖直光幕，外来的包撞上时变红
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.17, 1.17, .7, 96, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    wall.position.y = .47; g.add(wall);
    isles[k] = { group: g, ring, wall };
  }
  // ARPANET：IMP 机柜 + 电传终端
  const A = isles.arpa.group;
  const cab = mesh(KIT.rbox(.42, 1.3, .42, .02), cream); cab.position.set(-.15, .77, -.1); A.add(cab);
  for (const y of [1.22, 1.0]) { const pn = mesh(KIT.rbox(.34, .1, .02, .01), dark); pn.position.set(-.15, y, .115); A.add(pn); for (let i = 0; i < 8; i++) { const l = mesh(new THREE.CylinderGeometry(.009, .009, .012, 10), KIT.M.emissive(0xffd08a, i % 3 ? .2 : 1.4), { cast: false }); l.rotation.x = Math.PI / 2; l.position.set(-.29 + i * .04, y, .128); A.add(l); } }
  const tty = mesh(KIT.rbox(.4, .22, .32, .03), cream); tty.position.set(.45, .23, .25); A.add(tty);
  const wire = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-.15, .14, .1), V(.1, .13, .3), V(.3, .14, .25)]), 24, .012, 8), dark); A.add(wire);
  // PRNET：电台 + 鞭状天线 + 电波环
  const P = isles.prnet.group;
  const radio = mesh(KIT.rbox(.7, .32, .45, .03), olive); radio.position.set(0, .28, 0); P.add(radio);
  for (let i = 0; i < 3; i++) { const kn = mesh(new THREE.CylinderGeometry(.03, .03, .03, 20), dark); kn.rotation.x = Math.PI / 2; kn.position.set(-.2 + i * .14, .28, .23); P.add(kn); }
  const whip = mesh(new THREE.CylinderGeometry(.006, .012, 1.5, 10), steel); whip.position.set(.25, 1.18, -.1); P.add(whip);
  const tip = mesh(new THREE.SphereGeometry(.022, 12, 8), steel); tip.position.set(.25, 1.93, -.1); P.add(tip);
  const waves = []; for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(.3, .008, 8, 96), new THREE.MeshBasicMaterial({ color: ISLES.prnet.col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); w.rotation.x = Math.PI / 2; w.position.set(.25, 1.6, -.1); P.add(w); waves.push(w); }
  // SATNET：碟形天线 + 馈源支架 + 卫星
  const S = isles.satnet.group, f = .32, pts = []; for (let i = 0; i <= 24; i++) { const r = .62 * i / 24; pts.push(new THREE.Vector2(r, r * r / (4 * f))); }
  const dishG = new THREE.Group(); dishG.position.set(0, .75, 0); dishG.rotation.set(-.5, 0, .55); S.add(dishG);
  const dish = mesh(new THREE.LatheGeometry(pts, 96), white); dish.material.side = THREE.DoubleSide; dishG.add(dish);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, b = V(Math.cos(a) * .55, .55 * .55 / (4 * f), Math.sin(a) * .55), c = V(0, f, 0), d = c.clone().sub(b); const leg = mesh(new THREE.CylinderGeometry(.008, .008, d.length(), 8), steel); leg.position.copy(b).add(c).multiplyScalar(.5); leg.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); dishG.add(leg); }
  const horn = mesh(new THREE.CylinderGeometry(.03, .05, .1, 16), dark); horn.position.y = f; dishG.add(horn);
  const ped = mesh(new THREE.CylinderGeometry(.08, .12, .7, 24), dark); ped.position.y = .4; S.add(ped);
  const sat = new THREE.Group(); sat.position.set(-1.2, 2.9, -1.4); S.add(sat);
  sat.add(mesh(KIT.rbox(.24, .24, .3, .02), KIT.M.gold({ rough: .35 })));
  for (const s of [-1, 1]) { const pnl = mesh(new THREE.BoxGeometry(.62, .01, .24), new THREE.MeshPhysicalMaterial({ color: 0x1b2a55, metalness: .4, roughness: .3, clearcoat: .8 })); pnl.position.x = s * .46; sat.add(pnl); }
  // 各网络自己的包：立方 / 球 / 八面体
  const shapes = { arpa: new THREE.BoxGeometry(.13, .13, .13), prnet: new THREE.SphereGeometry(.075, 20, 14), satnet: new THREE.OctahedronGeometry(.09) };
  const pkts = {}; for (const k of Object.keys(ISLES)) { pkts[k] = []; for (let i = 0; i < 4; i++) { const m = mesh(shapes[k], KIT.M.emissive(ISLES[k].col, 2), { recv: false }); m.visible = false; scene.add(m); pkts[k].push(m); } }
  return { scene, isles, waves, sat, pkts, studio: st };
}

/* ---------------- 实验台：封装、路由、重传、分层、论文与地图 ---------------- */
export const PK = { y: .62, d: .5, h: .3 };
/** 包的各段（x 范围），从右到左：数据、TCP 头、IP 头、链路层帧头；帧尾在最右 */
export const SEG = { data: [-.3, .9], tcp: [-.78, -.3], ip: [-1.3, -.78], link: [-1.85, -1.3], fcs: [.9, 1.08] };
export const LAB = { router: V(5.2, 0, 0), lane: { z: -7, x0: -3.6, x1: 3.6 }, layers: V(0, 0, 7), desk: V(0, 0, 15), map: V(0, 0, 23) };

export function buildLab(KIT, { cerf, kahn, mapImg }) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x07101c, key: 0, fill: 0, rim: 0, floorY: 0, env: .4 });
  for (const l of [st.key, st.fill, st.rim]) { l.visible = false; l.castShadow = false; }   // 影棚自带的灯不用，下面按区域布光
  scene.add(blueprintFloor(KIT, 80)); scene.fog = new THREE.Fog(0x07101c, 14, 30);
  // 灯：一盏大面积主光跟着镜头所在的区域走（由章节设置 key.position / target）
  const key = new THREE.SpotLight(0xfff4e8, 320, 0, Math.PI / 4, .9, 2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -.0002; key.shadow.normalBias = .02; key.shadow.camera.near = .5; key.shadow.camera.far = 40;
  const tgt = new THREE.Object3D(); scene.add(tgt); key.target = tgt; scene.add(key);
  const rim = new THREE.SpotLight(0xdfeaff, 120, 0, Math.PI / 4, .9, 2); rim.target = tgt; scene.add(rim);
  const fill = new THREE.PointLight(0xe8eeff, 14, 0, 2); scene.add(fill);
  const aim = (c, k = 1) => { tgt.position.copy(c); key.position.set(c.x - 4, 8, c.z + 6); rim.position.set(c.x + 5, 5, c.z - 6); fill.position.set(c.x + 6, 3, c.z + 6); key.intensity = 320 * k; rim.intensity = 120 * k; fill.intensity = 14 * k; };

  /* ---- 数据包 ---- */
  const pk = new THREE.Group(); pk.position.y = PK.y; scene.add(pk);
  const block = (seg, color, label) => {
    const [x0, x1] = SEG[seg], L = x1 - x0, g = new THREE.Group(); g.position.x = (x0 + x1) / 2; pk.add(g);
    const body = mesh(KIT.rbox(L - .02, PK.h, PK.d, .03, 3), new THREE.MeshPhysicalMaterial({ color, roughness: .35, metalness: .1, clearcoat: .5, emissive: color, emissiveIntensity: .12, transparent: true }));
    g.add(body);
    const lt = liveTex(KIT, Math.round(L * 600), 180), face = new THREE.Mesh(new THREE.PlaneGeometry(L - .06, PK.h - .04), new THREE.MeshBasicMaterial({ map: lt.tex, transparent: true, toneMapped: false }));
    face.position.z = PK.d / 2 + .002; face.renderOrder = 4; g.add(face);   // 画在半透明「信封」之后：字不被外壳染淡
    const top = face.clone(); top.rotation.x = -Math.PI / 2; top.position.set(0, PK.h / 2 + .002, 0); g.add(top);
    if (label) lt.set(label.join('|'), (gg, w, h) => drawLabel(gg, w, h, label));
    return { group: g, body, lt };
  };
  // 可读性精修：每段只写一个大字（数据 / TCP / IP / 链路名），去掉看不清的小字第二行（端口、TTL 等改由章节里的标注说明）
  const drawLabel = (g, w, h, [big, small, col = '#0b1220']) => { if (!big) return; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; const cjk = /[\u4e00-\u9fff]/.test(big); g.font = `700 ${Math.min(small ? 76 : 96, w / Math.max(3, big.length) * (cjk ? 1.15 : 1.5))}px ${cjk ? SANS : MONO}`; g.fillText(big, w / 2, small ? h * .38 : h * .53); if (small) { g.font = `600 ${Math.min(36, w / small.length * 1.7)}px ${MONO}`; g.fillText(small, w / 2, h * .76); } };
  const data = block('data', new THREE.Color(COL.data), ['数据']);
  const tcp = block('tcp', new THREE.Color(COL.tcp), ['TCP']);
  const ip = block('ip', new THREE.Color(COL.ip), ['IP']);
  const link = block('link', new THREE.Color(COL.link), null);
  const fcs = block('fcs', new THREE.Color(COL.link), null);
  const LINKS = { wifi: ['Wi-Fi', COL.link], eth: ['以太网', COL.eth], fiber: ['光纤', COL.eth], g5: ['5G', '#ff6fa8'] };
  const setLink = kind => { const [a, c] = LINKS[kind]; link.lt.set(kind, (g, w, h) => drawLabel(g, w, h, [a])); const col = new THREE.Color(c); link.body.material.color.copy(col); link.body.material.emissive.copy(col); fcs.body.material.color.copy(col); fcs.body.material.emissive.copy(col); };
  setLink('wifi');
  // 半透明外壳（「信封」）
  const shell = (x0, x1, pad, color) => { const m = new THREE.Mesh(KIT.rbox(x1 - x0 + 2 * pad, PK.h + 2 * pad, PK.d + 2 * pad, .04, 3), new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0, roughness: .15, metalness: 0, depthWrite: false, side: THREE.DoubleSide })); m.position.x = (x0 + x1) / 2; m.renderOrder = 3; pk.add(m); return m; };
  const shells = { tcp: shell(SEG.tcp[0], SEG.data[1], .05, COL.tcpHex), ip: shell(SEG.ip[0], SEG.data[1], .1, COL.ipHex), link: shell(SEG.link[0], SEG.fcs[1], .15, COL.linkHex) };
  const parts = { data, tcp, ip, link, fcs };

  /* ---- 路由器（开顶机架，前面板有网口与指示灯） ---- */
  const R = new THREE.Group(); R.position.copy(LAB.router); scene.add(R);
  const rDark = KIT.M.paint(0x202429, { rough: .4 }), rAlu = KIT.M.aluminium({ rough: .35 });
  const base = mesh(KIT.rbox(3.6, .1, 2.0, .02), rDark); base.position.y = .05; R.add(base);
  for (const s of [-1, 1]) { const side = mesh(KIT.rbox(.08, .5, 2.0, .015), rAlu); side.position.set(s * 1.76, .3, 0); R.add(side); }
  const front = mesh(KIT.rbox(3.6, .5, .06, .015), rDark); front.position.set(0, .3, .97); R.add(front);
  const back = mesh(KIT.rbox(3.6, .5, .06, .015), rDark); back.position.set(0, .3, -.97); R.add(back);
  const leds = [];
  for (let i = 0; i < 8; i++) {
    const port = mesh(KIT.rbox(.2, .16, .04, .01), new THREE.MeshStandardMaterial({ color: 0x050607, roughness: .6 })); port.position.set(-1.25 + i * .36, .26, 1.0); R.add(port);
    const led = mesh(new THREE.BoxGeometry(.05, .025, .01), KIT.M.emissive(0x7ee08a, .3), { cast: false }); led.position.set(-1.25 + i * .36, .4, 1.005); R.add(led); leds.push(led);
  }
  const plate = mesh(KIT.rbox(.5, .1, .01, .01), rAlu); plate.position.set(1.45, .38, 1.0); R.add(plate);

  /* ---- 重传演示：两台主机 ---- */
  // 主机和包都做得比较大，远景里也看得清（可读性精修）；主机屏幕上直接写「发送方 / 接收方」，包的正面写序号，确认包写「确认」
  const textTex = (w, h, text, { bg = null, color = '#06101a', k = .7 } = {}) => {
    const W = 512, H = Math.round(W * h / w);
    return KIT.canvasTex(W, H, (g) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); } g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(Math.min(H * k, W / (text.length * 1.05)))}px ${SANS}`; g.fillText(text, W / 2, H * .54); }, { aniso: 16 });
  };
  const host = (x, label) => {
    const g = new THREE.Group(); g.position.set(x, 0, LAB.lane.z); scene.add(g);
    const b = mesh(KIT.rbox(1.15, .62, .86, .05), rDark); b.position.y = .31; g.add(b);
    const s = mesh(new THREE.PlaneGeometry(.98, .38), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: textTex(.98, .38, label, { bg: '#9fd8ff', color: '#0a1622', k: .62 }), emissiveIntensity: .62, roughness: 1, metalness: 0 }), { cast: false });
    s.position.set(0, .33, .432); g.add(s); return g;
  };
  const sender = host(LAB.lane.x0, '发送方'), receiver = host(LAB.lane.x1, '接收方');
  const lane = mesh(new THREE.BoxGeometry(LAB.lane.x1 - LAB.lane.x0 - 1.15, .008, .08), KIT.M.gold({ rough: .45 })); lane.position.set(0, .005, LAB.lane.z); scene.add(lane);
  const face = (parent, w, h, z, text) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(w, h, text), transparent: true, toneMapped: false, depthWrite: false })); m.position.z = z; parent.add(m); return m; };
  const segGeo = KIT.rbox(.6, .3, .4, .04, 3), segs = [], acks = [];
  ['#1', '#2', '#3', '#2'].forEach(n => { const m = mesh(segGeo, KIT.M.emissive(COL.tcpHex, 1.6)); m.visible = false; scene.add(m); face(m, .54, .27, .202, n); segs.push(m); });
  for (let i = 0; i < 3; i++) { const m = mesh(KIT.rbox(.52, .26, .3, .03, 2), KIT.M.emissive(0x7ee08a, 1.6)); m.visible = false; scene.add(m); face(m, .48, .23, .152, '确认'); acks.push(m); }

  /* ---- 分层：三种链路介质 ---- */
  const media = new THREE.Group(); media.position.copy(LAB.layers); scene.add(media);
  const fiber = new THREE.Group(); media.add(fiber);
  fiber.add(mesh(new THREE.CylinderGeometry(.05, .05, 7, 24), new THREE.MeshPhysicalMaterial({ color: 0xffd9b0, roughness: .1, transmission: .6, thickness: .1, transparent: true, opacity: .6 })));
  fiber.add(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 7, 12), KIT.M.emissive(0xff9a4a, 2.4)));
  fiber.rotation.z = Math.PI / 2; fiber.position.y = .12;
  const wifi = new THREE.Group(); media.add(wifi);
  const ap = mesh(KIT.rbox(.6, .1, .4, .04), KIT.M.paint(0xe8e8e4, { rough: .4 })); ap.position.set(-2.6, .05, 0); wifi.add(ap);
  const arcs = []; for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(.5 + i * .45, .014, 8, 64, Math.PI * .5), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false })); a.position.set(-2.6, .12, 0); a.rotation.set(0, 0, -Math.PI * .25); wifi.add(a); arcs.push(a); }
  const g5 = new THREE.Group(); media.add(g5);
  const mast = mesh(new THREE.CylinderGeometry(.05, .07, 2.4, 16), rAlu); mast.position.set(-2.8, 1.2, -.4); g5.add(mast);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, p = mesh(KIT.rbox(.16, .6, .06, .02), KIT.M.paint(0xe8e8e4, { rough: .4 })); p.position.set(-2.8 + Math.cos(a) * .14, 2.1, -.4 + Math.sin(a) * .14); p.rotation.y = -a + Math.PI / 2; g5.add(p); }

  /* ---- 桌上的照片与论文首页 ---- */
  const desk = new THREE.Group(); desk.position.copy(LAB.desk); scene.add(desk);
  const pc = KIT.photoPrint(cerf, { width: 1.6, border: .07, curl: .02, lift: .004 }); pc.rotation.set(-Math.PI / 2, 0, .07); pc.position.set(-2.3, .01, .2); desk.add(pc);
  const pkh = KIT.photoPrint(kahn, { width: 2.0, border: .07, curl: .02, lift: .004 }); pkh.rotation.set(-Math.PI / 2, 0, -.05); pkh.position.set(2.35, .01, .35); desk.add(pkh);
  const pageTex = KIT.canvasTex(1275, 1650, (g, w, h) => drawPaper(g, w, h), { aniso: 16 });
  const page = mesh(new THREE.PlaneGeometry(1.7, 2.2), new THREE.MeshPhysicalMaterial({ map: pageTex, roughness: .85, sheen: .3, sheenColor: new THREE.Color(0xfff0d0) }), { cast: false });
  page.rotation.set(-Math.PI / 2, 0, -.02); page.position.set(0, .012, -.1); desk.add(page);

  /* ---- 1977 ARPANET 逻辑图（反色：浅蓝线条印在深蓝底上，像一张蓝图） ---- */
  const mapTex = KIT.canvasTex(2000, 1432, (g, w, h) => {
    g.drawImage(mapImg, 0, 0, w, h); const im = g.getImageData(0, 0, w, h), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const v = 1 - (d[i] + d[i + 1] + d[i + 2]) / 765; d[i] = 12 + v * 200; d[i + 1] = 29 + v * 205; d[i + 2] = 51 + v * 204; }
    g.putImageData(im, 0, 0);
  }, { aniso: 16 });
  const map = mesh(new THREE.PlaneGeometry(7.0, 5.0), new THREE.MeshStandardMaterial({ map: mapTex, roughness: .8, emissive: 0xffffff, emissiveMap: mapTex, emissiveIntensity: .25 }), { cast: false });
  map.rotation.x = -Math.PI / 2; map.position.copy(LAB.map).add(V(0, .006, 0)); scene.add(map);

  return { scene, aim, pk, parts, shells, setLink, router: R, leds, sender, receiver, lane, segs, acks, media: { fiber, wifi, g5, arcs }, desk, map, studio: st };
}

/* 1974 年论文首页：按 IEEE Trans. Commun. 版式排印（标题、作者、摘要第一句与引言第一句；其余正文用灰条示意） */
function drawPaper(g, w, h) {
  g.fillStyle = '#f1ecdf'; g.fillRect(0, 0, w, h);
  const r = rng(1974); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(120,100,60,${r() * .04})`; g.fillRect(r() * w, r() * h, 2, 2); }
  g.fillStyle = '#1b1b1b'; g.textBaseline = 'alphabetic';
  g.font = `500 22px "Times New Roman", serif`; g.textAlign = 'left'; g.fillText('IEEE TRANSACTIONS ON COMMUNICATIONS, VOL. COM-22, NO. 5, MAY 1974', 90, 110); g.textAlign = 'right'; g.fillText('637', w - 90, 110);
  g.textAlign = 'center'; g.font = `400 54px "Times New Roman", serif`; g.fillText('A Protocol for Packet Network', w / 2, 240); g.fillText('Intercommunication', w / 2, 305);
  g.font = `400 28px "Times New Roman", serif`; g.fillText('VINTON G. CERF  AND  ROBERT E. KAHN, MEMBER, IEEE', w / 2, 380);
  g.textAlign = 'left'; g.font = `italic 600 25px "Times New Roman", serif`;
  const abs = ['Abstract—A protocol that supports the sharing of resources that', 'exist in different packet switching networks is presented. The', 'protocol provides for variation in individual network packet sizes,', 'transmission failures, sequencing, flow control, end-to-end error', 'checking, and the creation and destruction of logical process-to-', 'process connections.'];
  abs.forEach((l, i) => g.fillText(l, 130, 470 + i * 36));
  g.font = `400 24px "Times New Roman", serif`; g.fillText('INTRODUCTION', 130, 760); g.fillText('IN THE LAST few years considerable effort has been', 130, 800);
  g.fillStyle = 'rgba(40,40,40,.22)';
  for (let col = 0; col < 2; col++) for (let i = 0; i < 26; i++) { const x = 130 + col * 530, y = (col ? 760 : 830) + i * 32, len = 460 - (i % 7 === 6 ? 160 : r() * 30); g.fillRect(x, y - 12, len, 12); }
}
