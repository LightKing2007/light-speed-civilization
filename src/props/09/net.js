/* 09 · 第一句话：道具。
   usStates：美国本土各州边界（Natural Earth 1:50m），贴在地球表面的极淡细线。
   buildBoard：机能风「网络沙盘」—— 暗色技术网格上的主机（左右两端）与路由节点（铝制圆台 + 状态灯），
               节点之间是镀金走线；每条走线上方有一条可单独点亮 / 变红的发光条；数据包是小发光块。
   单位：米。x 向右，z 朝向镜头，y 向上。 */
import * as THREE from 'three';
import { V, ll } from '../../engine/util.js';

/* ---------------- 地图 ---------------- */
export async function usStates(A, E, { alt = .0025, color = 0xdfe8ff, opacity = .2 } = {}) {
  const gj = await A.json('assets/data/naturalearth/ne_50m_admin_1_states_provinces.geojson');
  const pos = [], a = V(), b = V();
  for (const f of gj.features) {
    const p = f.properties; if (p.adm0_a3 !== 'USA' || p.name === 'Alaska' || p.name === 'Hawaii') continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) for (let i = 0; i < ring.length - 1; i++) {
      ll(ring[i][1], ring[i][0], E.R + alt, a); ll(ring[i + 1][1], ring[i + 1][0], E.R + alt, b); pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  if (pos.length < 6000) throw new Error('州界数据不完整');
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  lines.renderOrder = 2; E.group.add(lines); return lines;
}

/** 1969 年 12 月 ARPANET 的四个节点 */
export const SITES = {
  UCLA: { ll: [34.069, -118.445], zh: '加州大学洛杉矶分校', host: 'SDS Sigma 7' },
  SRI: { ll: [37.457, -122.176], zh: '斯坦福研究所', host: 'SDS 940' },
  UCSB: { ll: [34.414, -119.848], zh: '加州大学圣巴巴拉分校', host: 'IBM 360/75' },
  UTAH: { ll: [40.764, -111.842], zh: '犹他大学', host: 'DEC PDP-10' },
};
export const LINKS69 = [['UCLA', 'SRI'], ['UCLA', 'UCSB'], ['SRI', 'UCSB'], ['SRI', 'UTAH']];

/* ---------------- 网络沙盘 ---------------- */
export const NODES = {
  S: [-3.0, .15], D: [3.0, -.05],
  R1: [-1.6, -.85], R2: [-1.5, 1.0], R3: [-.1, -.05], R4: [.15, 1.25], R5: [1.45, -1.0], R6: [1.6, .75],
};
export const LINKS = [['S', 'R1'], ['S', 'R2'], ['R1', 'R3'], ['R2', 'R3'], ['R2', 'R4'], ['R1', 'R5'], ['R3', 'R4'], ['R3', 'R5'], ['R3', 'R6'], ['R4', 'R6'], ['R5', 'D'], ['R6', 'D'], ['R5', 'R6']];
/** 网络「生长」时冒出来的外围节点与它们的连线 */
export const GROW = {
  nodes: { G1: [-4.5, -1.5], G2: [-4.6, 1.5], G3: [-2.7, 2.4], G4: [.9, 2.7], G5: [3.3, 2.0], G6: [4.6, .7], G7: [4.4, -1.8], G8: [1.0, -2.5], G9: [-2.1, -2.4] },
  links: [['G1', 'S'], ['G2', 'S'], ['G3', 'R2'], ['G4', 'R4'], ['G5', 'R6'], ['G6', 'D'], ['G7', 'D'], ['G8', 'R5'], ['G9', 'R1'], ['G1', 'G9'], ['G2', 'G3'], ['G4', 'G5'], ['G6', 'G7'], ['G8', 'G9'], ['G3', 'G4'], ['G5', 'G6'], ['G7', 'G8']],
};
const HOSTS = new Set(['S', 'D']);
export const Y_PKT = .1;                       // 数据包离地高度
export const nodePos = (k, y = 0) => { const p = NODES[k] || GROW.nodes[k]; return V(p[0], y, p[1]); };
export const linkKey = (a, b) => a < b ? a + '-' + b : b + '-' + a;

function gridTex(KIT) {
  return KIT.canvasTex(2048, 2048, (g, w) => {
    g.fillStyle = '#0a0b0d'; g.fillRect(0, 0, w, w);
    const n = 64, step = w / n;                          // 地面 16 m → 每格 25 cm
    for (let i = 0; i <= n; i++) { const major = i % 4 === 0; g.strokeStyle = major ? 'rgba(150,170,190,.15)' : 'rgba(150,170,190,.055)'; g.lineWidth = major ? 2 : 1; g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, w); g.moveTo(0, i * step); g.lineTo(w, i * step); g.stroke(); }
    g.fillStyle = 'rgba(150,170,190,.18)';
    for (let i = 4; i < n; i += 4) for (let j = 4; j < n; j += 4) { g.fillRect(i * step - 3, j * step - .5, 6, 1); g.fillRect(i * step - .5, j * step - 3, 1, 6); }
  }, { srgb: true, aniso: 16 });
}

export function buildBoard(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x07080a, key: 260, fill: 10, rim: 90, keyPos: [-4, 8, 6], rimPos: [5, 4, -6], fillPos: [6, 3, 6], target: [0, 0, 0], floorY: 0, env: .35, shadowRadius: 5 });
  st.key.shadow.camera.far = 30; st.key.angle = Math.PI / 4.5; st.key.penumbra = .9;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: gridTex(KIT), roughness: .85, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = .001; floor.receiveShadow = true; scene.add(floor);

  const anod = KIT.M.aluminium({ rough: .45 }); anod.color.setRGB(.44, .46, .5);
  const dark = KIT.M.paint(0x1c1f24, { rough: .4 }), trace = KIT.M.gold({ rough: .5 });
  const nodes = {};
  const addNode = (k, [x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    let led;
    if (HOSTS.has(k)) {   // 主机：机箱 + 发光屏
      const body = new THREE.Mesh(KIT.rbox(.62, .34, .44, .03, 4), dark); body.position.y = .17; body.castShadow = body.receiveShadow = true; g.add(body);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(.4, .16), KIT.M.emissive(0x9fd8ff, .5)); scr.position.set(0, .2, .221); g.add(scr);
      led = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .01, 20), KIT.M.emissive(0xffb347, 0)); led.position.set(.24, .345, .16); g.add(led);
    } else {              // 路由节点：铝制圆台
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .14, 48), anod); body.position.y = .07; body.castShadow = body.receiveShadow = true; g.add(body);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .012, 48), dark); top.position.y = .146; g.add(top);
      led = new THREE.Mesh(new THREE.TorusGeometry(.17, .008, 8, 64), KIT.M.emissive(0x9fd8ff, 0)); led.rotation.x = Math.PI / 2; led.position.y = .141; g.add(led);
    }
    nodes[k] = { group: g, led };
  };
  for (const [k, p] of Object.entries(NODES)) addNode(k, p);
  for (const [k, p] of Object.entries(GROW.nodes)) addNode(k, p);

  // 走线：镀金铜条 + 上方的发光条（点亮 = 被占用 / 正在传输；红 = 断开）
  const links = {};
  const addLink = (a, b) => {
    const A = nodePos(a), B = nodePos(b), d = B.clone().sub(A), L = d.length(), ang = Math.atan2(-d.z, d.x), mid = A.clone().add(B).multiplyScalar(.5);
    const grp = new THREE.Group(); grp.position.copy(mid); grp.rotation.y = ang; scene.add(grp);
    for (const off of [-.035, .035]) { const m = new THREE.Mesh(new THREE.BoxGeometry(L, .005, .022), trace); m.position.set(0, .004, off); m.receiveShadow = true; grp.add(m); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(L - .3, .12), new THREE.MeshBasicMaterial({ color: 0xff7a30, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = .012; grp.add(glow);
    links[linkKey(a, b)] = { a, b, group: grp, glow, len: L };
  };
  for (const [a, b] of LINKS) addLink(a, b);
  for (const [a, b] of GROW.links) addLink(a, b);

  // 数据包：消息包（琥珀）与其他用户的包（蓝灰）
  const pkts = [];
  const pktGeo = KIT.rbox(.2, .09, .14, .025, 3);
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(pktGeo, KIT.M.emissive(0xffb347, 2)); m.visible = false; m.castShadow = true; scene.add(m); pkts.push(m); }
  return {
    scene, nodes, links, pkts, studio: st,
    /** 一条走线的发光：k 0..1，color 默认橙色 */
    lightLink(a, b, k, color = 0xff7a30) { const l = links[linkKey(a, b)]; l.glow.material.opacity = k * .55; l.glow.material.color.set(color); },
    /** 显示 / 隐藏一组节点与走线（网络生长） */
    showGrowth(k) {
      const keys = Object.keys(GROW.nodes);
      keys.forEach((n, i) => { const u = Math.min(1, Math.max(0, k * keys.length - i * .6)); nodes[n].group.visible = u > 0; nodes[n].group.scale.setScalar(Math.max(.001, u)); });
      GROW.links.forEach(([a, b], i) => { const u = Math.min(1, Math.max(0, k * 1.6 - .3 - i * .04)); const l = links[linkKey(a, b)]; l.group.visible = u > 0; l.group.scale.set(Math.max(.001, u), 1, 1); });
    },
  };
}
