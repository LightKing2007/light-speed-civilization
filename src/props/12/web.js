/* 12 · 万维网：道具（1 单位 = 1 m）。
   buildOffice：1990 年 CERN 办公室一角：金属办公桌、台灯、NeXT 立方体电脑（哑光黑镁合金，贴着「这是服务器，别关机」的手写标签）、
                MegaPixel 显示器（只有 4 级灰度：屏幕上是复原的 WorldWideWeb 浏览器与第一个网页，链接只用下划线）、键盘、
                桌上的 1989 年提案首页与 1993 年 CERN 公开声明（均按原件版式排印复原）。 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';

const mesh = (geo, mat, { cast = true, recv = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif', SERIF = '"Times New Roman", Times, serif', HAND = '"Segoe Script", "Bradley Hand", "Comic Sans MS", cursive';

/** 第一个网页（info.cern.ch/hypertext/WWW/TheProject.html 的早期版本），[文字, 是否链接] 的段落 */
export const FIRST_PAGE = [
  ['h1', 'World Wide Web'],
  ['p', [['The WorldWideWeb (W3) is a wide-area ', 0], ['hypermedia', 1], [' information retrieval initiative aiming to give universal access to a large universe of documents.', 0]]],
  ['p', [['Everything there is online about W3 is linked directly or indirectly to this document, including an ', 0], ['executive summary', 1], [' of the project, ', 0], ['Mailing lists', 1], [', ', 0], ['Policy', 1], [', November\'s ', 0], ['W3 news', 1], [', ', 0], ['Frequently Asked Questions', 1], [' .', 0]]],
  ['dt', "What's out there?"], ['dd', 'Pointers to the world\'s online information, subjects , W3 servers, etc.'],
  ['dt', 'Help'], ['dd', 'on the browser you are using'],
  ['dt', 'Software Products'], ['dd', 'A list of W3 project components and their current state.'],
  ['dt', 'Technical'], ['dd', 'Details of protocols, formats, program internals etc'],
  ['dt', 'Bibliography'], ['dd', 'Paper documentation on W3 and references.'],
  ['dt', 'People'], ['dd', 'A list of some people involved in the project.'],
  ['dt', 'History'], ['dd', 'A summary of the history of the project.'],
];
/** 在 2D 画布上排一页「第一个网页」：黑字白底，链接只加下划线；返回各链接的矩形（供点击动画用） */
export function drawFirstPage(g, x, y, w, { size = 22, lh = 1.35 } = {}) {
  const links = []; let cy = y;
  const words = (runs, font, x0, maxW) => {
    g.font = font; let cx = x0; const L = size * lh;
    for (const [text, link] of runs) for (const wd of text.split(/(\s+)/)) {
      if (!wd) continue; const ww = g.measureText(wd).width;
      if (cx + ww > x0 + maxW && wd.trim()) { cx = x0; cy += L; }
      if (!wd.trim() && cx === x0) continue;
      g.fillStyle = '#000'; g.fillText(wd, cx, cy);
      if (link && wd.trim()) { g.fillRect(cx, cy + 3, ww, 1.5); links.push({ text: wd, x: cx, y: cy - size, w: ww, h: size + 6 }); }
      cx += ww;
    }
    cy += L;
  };
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  for (const [k, v] of FIRST_PAGE) {
    if (k === 'h1') { g.font = `700 ${size * 1.6}px ${HELV}`; g.fillStyle = '#000'; cy += size * 1.6; g.fillText(v, x, cy); cy += size * .9; }
    else if (k === 'p') { cy += size * .5; words(v, `400 ${size}px ${HELV}`, x, w); }
    else if (k === 'dt') { cy += size * .35; words([[v, 1]], `400 ${size}px ${HELV}`, x, w); }
    else words([[v, 0]], `400 ${size}px ${HELV}`, x + size * 2, w - size * 2);
  }
  return links;
}

/** NeXTSTEP 上的 WorldWideWeb 浏览器画面（1120 × 832，4 级灰度） */
function drawScreen(g, W, H) {
  g.fillStyle = '#555555'; g.fillRect(0, 0, W, H);
  // 主菜单
  const MENU = ['Info', 'Navigate', 'Document', 'Find', 'Edit', 'Links', 'Style', 'Print...', 'Windows', 'Services', 'Hide', 'Quit'], mx = 14, my = 14, mw = 150, mh = 26;
  g.fillStyle = '#000'; g.fillRect(mx, my, mw, mh); g.fillStyle = '#fff'; g.font = `700 15px ${HELV}`; g.fillText('WorldWideWeb', mx + 10, my + 18);
  MENU.forEach((s, i) => { const y = my + mh + i * mh; g.fillStyle = '#aaaaaa'; g.fillRect(mx, y, mw, mh); g.fillStyle = '#fff'; g.fillRect(mx, y, mw, 1); g.fillStyle = '#555555'; g.fillRect(mx, y + mh - 1, mw, 1); g.fillStyle = '#000'; g.font = `400 15px ${HELV}`; g.fillText(s, mx + 10, y + 18); if (i < 10) g.fillText('▸', mx + mw - 20, y + 18); });
  // 文档窗口
  const wx = 190, wy = 40, ww = 900, wh = 760;
  g.fillStyle = '#000'; g.fillRect(wx, wy, ww, 24); g.fillStyle = '#fff'; g.font = `700 15px ${HELV}`; g.textAlign = 'center'; g.fillText('The World Wide Web project', wx + ww / 2, wy + 17); g.textAlign = 'left';
  g.fillStyle = '#aaaaaa'; g.fillRect(wx, wy + 24, ww, wh - 24); g.fillStyle = '#fff'; g.fillRect(wx + 4, wy + 28, ww - 26, wh - 34);
  g.fillStyle = '#aaaaaa'; g.fillRect(wx + ww - 20, wy + 28, 16, wh - 34); g.fillStyle = '#555555'; g.fillRect(wx + ww - 18, wy + 34, 12, 120);
  return drawFirstPage(g, wx + 30, wy + 40, ww - 90, { size: 21 });
}

/** 1989 年提案首页（按原件版式排印；页首是上司的手写批注） */
function drawProposal(g, w, h) {
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
  const r = rng(1989); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(110,100,80,${r() * .035})`; g.fillRect(r() * w, r() * h, 2, 2); }
  g.fillStyle = '#151515'; g.textBaseline = 'alphabetic';
  g.font = `400 26px ${SERIF}`; g.textAlign = 'left'; g.fillText('Information Management: A Proposal', 110, 300);
  g.font = `400 22px ${SERIF}`; g.fillText('Tim Berners-Lee, CERN', 110, 350); g.fillText('March 1989, May 1990', 110, 382);
  g.font = `700 22px ${SERIF}`; g.fillText('Abstract', 110, 450);
  g.font = `400 22px ${SERIF}`;
  ['This proposal concerns the management of general information about', 'accelerators and experiments at CERN. It discusses the problems of', 'loss of information about complex evolving systems and derives a', 'solution based on a distributed hypertext system.'].forEach((l, i) => g.fillText(l, 110, 490 + i * 32));
  g.font = `700 22px ${SERIF}`; g.fillText('Keywords:', 110, 660); g.font = `400 22px ${SERIF}`; g.fillText('Hypertext, Computer conferencing, Document retrieval, Information', 225, 660); g.fillText('management, Project control', 110, 692);
  // 下半页的气泡图（示意：几个标签之间的连线）
  const N = [['Linked information', 600, 900], ['Hypertext', 360, 1000], ['Hypermedia', 250, 1140], ['This document', 760, 1080], ['Tim Berners-Lee', 960, 980], ['CERN', 900, 1250], ['Proposal "Mesh"', 520, 1270], ['ENQUIRE', 300, 1380], ['Computer conferencing', 760, 1440]];
  g.strokeStyle = '#333'; g.lineWidth = 1.6;
  for (const [a, b] of [[0, 1], [0, 3], [1, 2], [3, 4], [3, 6], [6, 5], [6, 7], [6, 8], [1, 7], [4, 5]]) { g.beginPath(); g.moveTo(N[a][1], N[a][2]); g.lineTo(N[b][1], N[b][2]); g.stroke(); }
  g.font = `400 20px ${HELV}`; g.textAlign = 'center';
  for (const [s, x, y] of N) { const tw = g.measureText(s).width + 34; g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(x, y, tw / 2, 26, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#151515'; g.fillText(s, x, y + 7); }
  // 手写批注
  g.save(); g.translate(760, 150); g.rotate(-.04); g.fillStyle = '#1d2c6b'; g.font = `400 40px ${HAND}`; g.textAlign = 'left'; g.fillText('Vague but exciting ...', 0, 0); g.restore();
}

/** 1993 年 4 月 30 日 CERN 声明（标题与日期按原件；正文以灰条示意） */
function drawStatement(g, w, h) {
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111'; g.textAlign = 'left'; g.font = `700 34px ${HELV}`; g.fillText('CERN', 110, 150);
  g.font = `400 20px ${HELV}`; g.fillText('European Organization for Nuclear Research', 110, 182); g.textAlign = 'right'; g.fillText('Geneva, 30 April 1993', w - 110, 260); g.textAlign = 'left';
  g.font = `700 25px ${HELV}`; g.fillText('Statement concerning CERN W3 software', 110, 360); g.fillText('release into public domain', 110, 394);
  const r = rng(1993); g.fillStyle = 'rgba(30,30,30,.2)';
  for (let i = 0; i < 24; i++) { const y = 470 + i * 38 + (i > 8 ? 30 : 0) + (i > 17 ? 30 : 0); g.fillRect(110, y, (w - 220) * (i % 9 === 8 ? .5 : .92 + r() * .08), 13); }
}

export async function buildOffice(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x0b0b0c, key: 38, fill: 2.5, rim: 22, keyPos: [-1.4, 2.6, 1.8], rimPos: [1.8, 2, -1.6], fillPos: [2, 1.2, 2], target: [0, .8, 0], floorY: 0, size: 30, env: .2, shadowRadius: 5 });
  st.key.angle = Math.PI / 5; st.key.penumbra = 1; st.cyc.material = new THREE.MeshLambertMaterial({ color: 0x0d0d0e });
  const wall = mesh(new THREE.PlaneGeometry(6, 3), KIT.M.paint(0x8f8a7e, { rough: .85 }), { cast: false }); wall.position.set(0, 1.5, -.75); scene.add(wall);
  let deskTop = .74;
  try { const desk = await KIT.model('assets/models/polyhaven/metal_office_desk/metal_office_desk_1k.gltf', { size: 1.6 }); scene.add(desk); deskTop = new THREE.Box3().setFromObject(desk).max.y; } catch (e) { console.warn('[12] desk', e); const top = mesh(KIT.rbox(1.6, .04, .8, .01), KIT.M.paint(0x6b6f72)); top.position.y = .72; scene.add(top); }
  try { const lamp = await KIT.model('assets/models/polyhaven/desk_lamp_arm_01/desk_lamp_arm_01_1k.gltf', { size: .55 }); lamp.position.set(.62, deskTop, -.22); lamp.rotation.y = -2.2; scene.add(lamp); } catch (e) { console.warn('[12] lamp', e); }
  const Y = deskTop;
  // ---- NeXT 立方体（边长 1 英尺）----
  const mag = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: .7, metalness: 0, clearcoat: .12 });
  const cube = new THREE.Group(); cube.position.set(-.55, Y, -.12); cube.rotation.y = .32; scene.add(cube);
  const body = mesh(KIT.rbox(.305, .305, .305, .006), mag); body.position.y = .1525; cube.add(body);
  const seam = mesh(new THREE.BoxGeometry(.306, .003, .306), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .9 }), { cast: false }); seam.position.y = .04; cube.add(seam);
  const badge = KIT.canvasTex(256, 256, (g, w) => { g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, w, w); g.translate(w / 2, w / 2); g.rotate(-.21); g.fillStyle = '#222'; g.fillRect(-80, -80, 160, 160); const L = [['N', '#e0457b'], ['e', '#f6c548'], ['X', '#4fc06a'], ['T', '#d9443a']]; g.font = `700 54px ${HELV}`; g.textAlign = 'center'; g.textBaseline = 'middle'; L.forEach(([c, col], i) => { g.fillStyle = col; g.fillText(c, -48 + i * 32, (i % 2 ? 10 : -10)); }); });
  const bd = mesh(new THREE.PlaneGeometry(.06, .06), new THREE.MeshStandardMaterial({ map: badge, roughness: .4 }), { cast: false }); bd.position.set(.1535, .24, .1); bd.rotation.y = Math.PI / 2; cube.add(bd);
  const label = KIT.canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#f3f0e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#c0261e'; g.font = `400 34px ${HAND}`; g.fillText('This machine is a server.', 22, 70); g.font = `700 40px ${HAND}`; g.fillText('DO NOT POWER IT', 22, 140); g.fillText('DOWN!!', 22, 200); });
  const lb = mesh(new THREE.PlaneGeometry(.12, .06), new THREE.MeshStandardMaterial({ map: label, roughness: .8 }), { cast: false }); lb.position.set(.02, .2, .1535); lb.rotation.z = .03; cube.add(lb);
  // ---- MegaPixel 显示器 ----
  const scrTex = KIT.canvasTex(1120, 832, () => { }, { aniso: 16 }); const links = drawScreen(scrTex.userData.g, 1120, 832); scrTex.needsUpdate = true;
  const mon = new THREE.Group(); mon.position.set(-.02, Y, -.2); mon.rotation.y = .05; scene.add(mon);
  const stand = mesh(new THREE.CylinderGeometry(.09, .12, .05, 32), mag); stand.position.y = .025; mon.add(stand);
  const neck = mesh(KIT.rbox(.08, .1, .08, .01), mag); neck.position.y = .09; mon.add(neck);
  const shell = mesh(KIT.rbox(.42, .37, .2, .02), mag); shell.position.set(0, .33, .02); mon.add(shell);
  const back = mesh(KIT.rbox(.3, .27, .2, .03), mag); back.position.set(0, .33, -.15); mon.add(back);
  const screen = mesh(new THREE.PlaneGeometry(.318, .236), new THREE.MeshStandardMaterial({ map: scrTex, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: .85, roughness: .25 }), { cast: false }); screen.position.set(0, .335, .121); mon.add(screen);
  const glass = mesh(new THREE.PlaneGeometry(.32, .238), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .05, transparent: true, opacity: .12, clearcoat: 1 }), { cast: false }); glass.position.set(0, .335, .123); mon.add(glass);
  // ---- 键盘与鼠标 ----
  const keysTex = KIT.canvasTex(1024, 384, (g, w, h) => { g.fillStyle = '#121214'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2b2e'; for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) g.fillRect(24 + c * 57 + (r % 2) * 14, 24 + r * 66, 48, 54); g.fillRect(24 + 3 * 57, 24 + 5 * 66 - 6, 7 * 57, 30); });
  const kb = mesh(KIT.rbox(.45, .025, .16, .006), new THREE.MeshStandardMaterial({ map: keysTex, roughness: .6 })); kb.position.set(-.02, Y + .0125, .2); kb.rotation.y = .03; scene.add(kb);
  const mouse = mesh(KIT.rbox(.06, .025, .1, .012), mag); mouse.position.set(.32, Y + .0125, .2); scene.add(mouse);
  // ---- 桌上的两份文件 ----
  const paperMat = tex => new THREE.MeshPhysicalMaterial({ map: tex, roughness: .85, sheen: .3, sheenColor: new THREE.Color(0xfff0d0) });
  const prop = mesh(new THREE.PlaneGeometry(.21, .297), paperMat(KIT.canvasTex(1240, 1754, drawProposal, { aniso: 16 })), { cast: false }); prop.rotation.set(-Math.PI / 2, 0, -.1); prop.position.set(.62, Y + .002, .16); scene.add(prop);
  const stmt = mesh(new THREE.PlaneGeometry(.21, .297), paperMat(KIT.canvasTex(1240, 1754, drawStatement, { aniso: 16 })), { cast: false }); stmt.rotation.set(-Math.PI / 2, 0, .06); stmt.position.set(.62, Y + .002, .16); stmt.visible = false; scene.add(stmt);
  return { scene, deskTop: Y, cube, monitor: mon, screen, links, proposal: prop, statement: stmt, anchors: { label: V(-.55, Y + .2, -.12), screen: V(-.02, Y + .335, -.08), note: V(.47, Y + .003, .1) } };
}
