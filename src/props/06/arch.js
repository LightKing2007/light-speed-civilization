/* 06 · 存储程序：机能风「冯·诺依曼结构」桌面模型。
   暗色技术网格上的机加工阳极氧化铝块（存储器 / 控制器 / 运算器 / 输入 / 输出），之间是贴地的金属总线走线。
   存储器顶面是 8 × 4 的存储格：紫色 = 指令，琥珀色 = 数据（Canvas 贴图，内容变化时才重画）。
   单位：米。x 向右，z 朝向镜头，y 向上。 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';

export const COL = { ins: '#a98bff', data: '#ffb347', insHex: 0xa98bff, dataHex: 0xffb347 };
export const MOD = {
  M: { name: 'MEMORY', zh: '存储器', c: [0, -.95], s: [2.5, .3, 1.05] },
  CC: { name: 'CONTROL', zh: '控制器', c: [-1.25, .62], s: [.95, .34, .7] },
  CA: { name: 'ARITHMETIC', zh: '运算器', c: [1.25, .62], s: [.95, .34, .7] },
  I: { name: 'INPUT', zh: '输入', c: [-2.85, -.95], s: [.7, .24, .55] },
  O: { name: 'OUTPUT', zh: '输出', c: [2.85, -.95], s: [.7, .24, .55] },
};
export const COLS = 8, ROWS = 4;
const TOP = MOD.M.s[1];
/** 存储格 i（0..31）中心的世界坐标（存储器顶面上方一点） */
export const cellPos = i => V(MOD.M.c[0] - 1.05 + (i % COLS) * .3, TOP + .012, MOD.M.c[1] - .4 + Math.floor(i / COLS) * .27);
export const modTop = k => V(MOD[k].c[0], MOD[k].s[1] + .02, MOD[k].c[1]);
const Y = .006;                                        // 走线高度
/** 总线走线（贴地折线，世界坐标点列），数据包沿这些路线跑 */
export const BUS = {
  IM: [V(-2.5, Y, -.95), V(-1.25, Y, -.95)],
  MCC: [V(-1.0, Y, -.42), V(-1.0, Y, .27)],
  MCA: [V(1.0, Y, -.42), V(1.0, Y, .27)],
  CCCA: [V(-.775, Y, .62), V(.775, Y, .62)],
  MO: [V(1.25, Y, -.95), V(2.5, Y, -.95)],
};

function gridTex(KIT) {
  return KIT.canvasTex(2048, 2048, (g, w) => {
    g.fillStyle = '#0a0b0d'; g.fillRect(0, 0, w, w);
    const step = w / 56;                                  // 地面 14 m → 每格 25 cm
    for (let i = 0; i <= 56; i++) { const major = i % 4 === 0; g.strokeStyle = major ? 'rgba(150,170,190,.16)' : 'rgba(150,170,190,.06)'; g.lineWidth = major ? 2 : 1; g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, w); g.moveTo(0, i * step); g.lineTo(w, i * step); g.stroke(); }
    g.fillStyle = 'rgba(150,170,190,.18)'; g.font = '500 15px "JetBrains Mono", monospace';
    for (let i = 4; i < 56; i += 4) for (let j = 4; j < 56; j += 4) { g.fillRect(i * step - 3, j * step - .5, 6, 1); g.fillRect(i * step - .5, j * step - 3, 1, 6); }
  }, { srgb: true, aniso: 16 });
}
function plateTex(KIT, a, b) {
  return KIT.canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#b9bcc0'; g.fillRect(0, 0, w, h);
    const r = rng(a.length * 7); for (let i = 0; i < 1600; i++) { const v = 150 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v},${v},.25)`; g.fillRect(0, r() * h, w, 1); }
    g.strokeStyle = '#2b2d31'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#1d1f23'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = '700 92px "JetBrains Mono", "Courier New", monospace'; g.fillText(a, 52, h * .42);
    g.font = '500 44px "JetBrains Mono", "Courier New", monospace'; g.fillStyle = '#3a3d43'; g.fillText(b, 54, h * .78);
  });
}

/** 存储器顶面贴图：state = { cells: [{ text, kind:'ins'|'data'|'' , hi: 0..1 }], pc: 序号或 -1 } */
function memoryCanvas(KIT) {
  const W = 1600, H = 720;
  const tex = KIT.canvasTex(W, H, () => { }, { aniso: 16 });
  const g = tex.userData.g; let key = null;
  const cw = W / COLS, ch = H / ROWS;
  const draw = st => {
    const k = JSON.stringify(st); if (k === key) return; key = k;
    g.fillStyle = '#1a1c20'; g.fillRect(0, 0, W, H);
    st.cells.forEach((c, i) => {
      const x = (i % COLS) * cw, y = Math.floor(i / COLS) * ch, col = c.kind === 'ins' ? COL.ins : c.kind === 'data' ? COL.data : null;
      g.fillStyle = '#0d0e11'; g.fillRect(x + 10, y + 10, cw - 20, ch - 20);
      if (col) {
        g.globalAlpha = .22 + .5 * (c.hi || 0); g.fillStyle = col; g.fillRect(x + 10, y + 10, cw - 20, ch - 20); g.globalAlpha = 1;
        g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(x + 12, y + 12, cw - 24, ch - 24);
        g.fillStyle = c.hi > .5 ? '#ffffff' : '#f2efe8'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `600 ${c.text.length > 7 ? 36 : 44}px "JetBrains Mono", "Courier New", monospace`; g.fillText(c.text, x + cw / 2, y + ch / 2 + 4);
      }
      g.fillStyle = 'rgba(200,205,212,.45)'; g.textAlign = 'left'; g.font = '500 22px "JetBrains Mono", monospace'; g.fillText(String(i).padStart(2, '0'), x + 22, y + 34);
      if (st.pc === i) { g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(x + 4, y + 4, cw - 8, ch - 8); }
    });
    tex.needsUpdate = true;
  };
  return { tex, draw };
}

export async function buildArch(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x07080a, key: 240, fill: 10, rim: 90, keyPos: [-3.5, 7.5, 6], rimPos: [4, 4, -6], fillPos: [5, 3, 5], target: [0, 0, -.2], floorY: 0, env: .35, shadowRadius: 5 });
  st.key.shadow.camera.far = 30; st.key.angle = Math.PI / 5;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: gridTex(KIT), roughness: .8, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = .001; floor.receiveShadow = true; scene.add(floor);

  const anod = KIT.M.aluminium({ rough: .48 }); anod.color.setRGB(.44, .46, .5);
  const edge = KIT.M.aluminium({ rough: .25 });
  const screwM = KIT.M.steel({ rough: .3 });
  const mods = {};
  const memC = memoryCanvas(KIT);
  for (const [k, m] of Object.entries(MOD)) {
    const g = new THREE.Group(); g.position.set(m.c[0], 0, m.c[1]); scene.add(g);
    const [w, h, d] = m.s;
    const body = new THREE.Mesh(KIT.rbox(w, h, d, .025, 4), anod); body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
    // 底部倒角座 + 侧面散热槽
    const base = new THREE.Mesh(KIT.rbox(w + .04, .02, d + .04, .008, 2), edge); base.position.y = .01; base.receiveShadow = true; g.add(base);
    for (let i = 0; i < Math.floor(w / .09); i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(.035, h * .45, .006), new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: .8 })); sl.position.set(-w / 2 + .09 + i * .09, h * .45, d / 2 + .001); g.add(sl); }
    // 铭牌（存储器的铭牌在前侧面，其余在顶面）
    const plate = new THREE.Mesh(KIT.rbox(k === 'M' ? .62 : w * .78, .006, k === 'M' ? .155 : .17, .004, 2), new THREE.MeshStandardMaterial({ map: plateTex(KIT, m.name, k === 'M' ? 'M · STORES INSTRUCTIONS + DATA' : k), metalness: .6, roughness: .4 }));
    if (k === 'M') { plate.rotation.x = Math.PI / 2; plate.position.set(-.85, h * .5, d / 2 + .004); }
    else plate.position.set(0, h + .004, d * .18);
    plate.castShadow = true; g.add(plate);
    // 螺丝
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .006, 16), screwM); s.position.set(sx * (w / 2 - .05), h + .003, sz * (d / 2 - .05)); g.add(s); }
    // 状态灯（模块工作时亮）
    const led = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .01, 20), KIT.M.emissive(k === 'M' ? 0xffd08a : 0x9fd8ff, 0)); led.position.set(w / 2 - .09, h + .006, -d / 2 + .09); g.add(led);
    mods[k] = { group: g, led, body };
  }
  // 存储器顶面：存储格贴图（自发光，强度 < 1，不进辉光）
  const memTop = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.08), new THREE.MeshStandardMaterial({ map: memC.tex, emissiveMap: memC.tex, emissive: 0xffffff, emissiveIntensity: .55, roughness: .55, metalness: 0 }));
  memTop.rotation.x = -Math.PI / 2; memTop.position.set(MOD.M.c[0], TOP + .003, MOD.M.c[1] + .015); memTop.receiveShadow = true; scene.add(memTop);

  // 总线：每条三根平行的镀金走线 + 两端焊盘
  const trace = KIT.M.gold({ rough: .32 });
  for (const pts of Object.values(BUS)) {
    const [a, b] = pts, dir = b.clone().sub(a), L = dir.length(), horiz = Math.abs(dir.x) > Math.abs(dir.z);
    for (const off of [-.045, 0, .045]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? L : .018, .004, horiz ? .018 : L), trace);
      m.position.copy(a).add(b).multiplyScalar(.5); if (horiz) m.position.z += off; else m.position.x += off; m.position.y = .003; m.receiveShadow = true; scene.add(m);
      for (const e of [a, b]) { const pad = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .005, 16), trace); pad.position.copy(e); pad.position.y = .003; if (horiz) pad.position.z += off; else pad.position.x += off; scene.add(pad); }
    }
  }
  // 总线上的光脉冲（数据包）：一个小发光块 + 一段拖尾
  const packet = new THREE.Mesh(KIT.rbox(.09, .05, .09, .015, 2), KIT.M.emissive(COL.dataHex, 2.2)); packet.visible = false; scene.add(packet);
  const trailPts = 40, trailGeo = new Float32Array(trailPts * 3), trailA = new Float32Array(trailPts);
  const trail = KIT.points(trailGeo, { size: 7, color: 0xffffff, intensity: 1.3, alphas: trailA, soft: .7 }); scene.add(trail);

  return {
    scene, mods, memC, packet, trail, trailGeo, trailA, trailPts, studio: st,
    setLeds(on) { for (const [k, m] of Object.entries(mods)) m.led.material.emissiveIntensity = (on[k] || 0) * 2.4; },
  };
}
