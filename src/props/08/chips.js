/* 08 · 硅上的城市：写实道具（单位：米，纳米场景除外）。
   buildFirstICs：基尔比 1958 锗片集成电路（玻璃片 + 锗条 + 飞线金丝 + 黑蜡）与诺伊斯平面工艺硅片（TO-5 管座），均为按公开资料的复原。
   buildLitho：300 mm 晶圆（薄膜干涉彩虹光泽）、铬图形掩模、投影物镜筒、紫外光束；逐个曝光的芯片格由调用方驱动。
   buildPackages：Intel 4004 白色陶瓷 16 针 DIP（金色盖板可掀开，露出裸片）+ 现代倒装芯片封装（比较用）。
   buildNano：环栅纳米片晶体管 + 铜互连 + 约 100 nm 的病毒（示意），1 单位 = 10 nm。 */
import * as THREE from 'three';
import { V, rng } from '../../engine/util.js';

const mesh = (geo, mat, { cast = true, recv = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
const tubeAlong = (pts, r, mat, seg = 48) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8, false), mat);

/** 程序化「裸片照片」：功能块、细密走线、四周焊盘 */
export function dieTex(KIT, { seed = 4, w = 1024, h = 1024, tint = '#5d6a5f', pads = 16, busy = 1 } = {}) {
  return KIT.canvasTex(w, h, (g) => {
    const r = rng(seed); g.fillStyle = '#2a2f2b'; g.fillRect(0, 0, w, h);
    const m = w * .08;
    for (let i = 0; i < 26 * busy; i++) { const x = m + r() * (w - 2 * m - 160), y = m + r() * (h - 2 * m - 160), bw = 60 + r() * 240, bh = 50 + r() * 200; g.fillStyle = `hsla(${90 + r() * 80},${12 + r() * 20}%,${26 + r() * 22}%,.9)`; g.fillRect(x, y, bw, bh);
      g.strokeStyle = 'rgba(220,210,170,.18)'; g.lineWidth = 1; for (let k = 0; k < bh; k += 3 + r() * 3) { g.beginPath(); g.moveTo(x, y + k); g.lineTo(x + bw, y + k); g.stroke(); } }
    g.strokeStyle = 'rgba(225,215,185,.5)'; g.lineWidth = 2.5;
    for (let i = 0; i < 160 * busy; i++) { let x = m + r() * (w - 2 * m), y = m + r() * (h - 2 * m); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { if (r() < .5) x += (r() - .5) * 300; else y += (r() - .5) * 300; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = tint; g.globalAlpha = .25; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    const per = pads / 4;
    for (let s = 0; s < 4; s++) for (let i = 0; i < per; i++) { const u = (i + .5) / per; const [x, y] = s === 0 ? [u * w, m * .45] : s === 1 ? [w - m * .45, u * h] : s === 2 ? [u * w, h - m * .45] : [m * .45, u * h]; g.fillStyle = '#c9c4b6'; g.fillRect(x - 16, y - 16, 32, 32); }
  }, { aniso: 16 });
}

export function buildFirstICs(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x060607, key: 1.1, fill: .08, rim: 1.4, keyPos: [-.12, .2, .16], rimPos: [.08, .3, -.12], fillPos: [.18, .06, .14], target: [0, 0, 0], floorY: 0, size: 3, env: .3, shadowRadius: 4 });
  st.key.angle = Math.PI / 9; st.key.penumbra = 1;   // 轮廓光放高：低了会在地面上形成正对镜头的反光，整片发灰
  st.cyc.material = new THREE.MeshLambertMaterial({ color: 0x0a0a0b });   // 地面不要高光：主光在粗糙地面上的大片反光会让整个背景发灰
  const gold = KIT.M.gold({ rough: .22 }), wax = new THREE.MeshPhysicalMaterial({ color: 0x0c0b0a, roughness: .35, clearcoat: .6 });
  // ---- 基尔比：玻璃片 + 锗条 ----
  const K = new THREE.Group(); K.position.set(-.022, 0, 0); scene.add(K);
  const slide = mesh(KIT.rbox(.026, .0011, .012, .0003), KIT.M.glass({ thickness: .001, tint: 0xeaf6ff, rough: .1 })); slide.position.y = .00055; K.add(slide);
  const geM = new THREE.MeshPhysicalMaterial({ color: 0x6c6f73, metalness: .6, roughness: .26 });
  const bar = mesh(new THREE.BoxGeometry(.0111, .0005, .0016), geM); bar.position.set(0, .00135, 0); K.add(bar);
  const R = rng(3);
  for (const x of [-.0052, -.0018, .0014, .0046]) { const b = mesh(new THREE.SphereGeometry(.00042, 16, 10), wax); b.scale.set(1.3, .6, 1); b.position.set(x, .0016, (R() - .5) * .0006); K.add(b); }
  for (let i = 0; i < 6; i++) { const a = V(-.0048 + i * .0019, .0016, (R() - .5) * .0008), b = V(-.009 + i * .0036 + (R() - .5) * .002, .0011, (i % 2 ? 1 : -1) * (.0045 + R() * .001)); K.add(tubeAlong([a, a.clone().add(V(0, .0025 + R() * .0015, 0)).lerp(b, .3), b], .000035, gold)); }
  // ---- 诺伊斯：TO-5 管座 + 圆形平面工艺硅片 ----
  const N = new THREE.Group(); N.position.set(.024, 0, 0); scene.add(N);
  const header = mesh(new THREE.CylinderGeometry(.0046, .0046, .0011, 48), gold); header.position.y = .0042; N.add(header);
  const rim = mesh(new THREE.CylinderGeometry(.0051, .0051, .0004, 48), gold); rim.position.y = .0036; N.add(rim);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, p = mesh(new THREE.CylinderGeometry(.00022, .00022, .0042, 10), gold); p.position.set(Math.cos(a) * .0032, .0021, Math.sin(a) * .0032); N.add(p);
    const top = mesh(new THREE.CylinderGeometry(.0003, .0003, .0003, 10), gold); top.position.set(Math.cos(a) * .0032, .0049, Math.sin(a) * .0032); N.add(top); }
  const planar = KIT.canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#1e2836'; g.fillRect(0, 0, w, w);
    const c = w / 2; g.strokeStyle = '#c7ccd2'; g.lineWidth = 14; g.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * 60, c + Math.sin(a) * 60); g.lineTo(c + Math.cos(a) * 120, c + Math.sin(a) * 90); g.lineTo(c + Math.cos(a) * 230, c + Math.sin(a) * 230); g.stroke(); }
    g.fillStyle = '#7d5f9e'; for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4; g.fillRect(c + Math.cos(a) * 140 - 30, c + Math.sin(a) * 140 - 22, 60, 44); }
    g.strokeStyle = '#c7ccd2'; g.lineWidth = 8; g.beginPath(); g.arc(c, c, 60, 0, 7); g.stroke();
  }, { aniso: 16 });
  const die = mesh(new THREE.CylinderGeometry(.0016, .0016, .00025, 48), [KIT.M.silicon(), new THREE.MeshPhysicalMaterial({ map: planar, metalness: .4, roughness: .3, iridescence: .4, iridescenceIOR: 1.6 }), KIT.M.silicon()]); die.position.y = .0049; N.add(die);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, s = V(Math.cos(a) * .0015, .0051, Math.sin(a) * .0015), e = V(Math.cos(a) * .0032, .0051, Math.sin(a) * .0032); N.add(tubeAlong([s, s.clone().lerp(e, .5).add(V(0, .0006, 0)), e], .00003, gold, 16)); }
  return { scene, kilby: K, noyce: N, anchors: { kilbyBar: V(-.022, .0016, .0005), kilbyWire: V(-.022 - .002, .0035, 0), noyceDie: V(.024, .0052, .0008) } };
}

/** 紫外光束：加法混合，中间亮、边缘渐隐（沿视线方向越厚越亮），两端淡出 */
function beamMaterial(intensity) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(.55, .38, 1).multiplyScalar(intensity) }, uOpacity: { value: 0 } },
    vertexShader: 'varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=uv.y;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uColor;uniform float uOpacity;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float f=abs(dot(normalize(vN),normalize(vV)));float a=f*f*uOpacity*smoothstep(0.,.06,vY)*smoothstep(1.,.94,vY);gl_FragColor=vec4(uColor*a,1.);}',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}
/** 光刻机机架：花岗岩底座、两根立柱、托住物镜 / 掩模台 / 光源的横梁 */
function buildFrame(KIT, scene) {
  const paint = KIT.M.paint(0x24272c, { rough: .45 }), alu = KIT.M.aluminium({ rough: .3 });
  const granite = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: .5, metalness: 0 });
  const base = mesh(KIT.rbox(.9, .07, .62, .01), granite); base.position.set(0, -.085, -.02); scene.add(base);
  for (const s of [-1, 1]) {
    const col = mesh(KIT.rbox(.07, 1.0, .07, .008), paint); col.position.set(s * .32, .45, -.2); scene.add(col);
    // 物镜托架、掩模台、光源横梁：从立柱伸到中间（物镜筒半径约 .09）
    for (const [y, h, d, r] of [[.5, .035, .2, .1], [.609, .016, .2, .085], [.85, .04, .12, 0]]) {
      const len = .32 - r + .035, arm = mesh(KIT.rbox(len, h, d, .006), y > .6 && y < .62 ? alu : paint); arm.position.set(s * (r + len / 2), y, -.2 + d / 2 - .035); scene.add(arm);
    }
  }
  const ring = new THREE.Group(); ring.position.y = .609; scene.add(ring);      // 掩模夹具
  for (const [x, z, w, d] of [[0, -.085, .195, .025], [0, .085, .195, .025], [-.085, 0, .025, .195], [.085, 0, .025, .195]]) { const b = mesh(KIT.rbox(w, .016, d, .004), alu); b.position.set(x, 0, z); ring.add(b); }
}

/* ---------------- 光刻 ---------------- */
export const WAFER = { R: .15, die: .022, n: 13 };
/** 各道工序后芯片格的颜色：曝光、显影、刻蚀、掺杂、沉积 */
const LAYER = ['#3f4b63', '#46587e', '#4b3f63', '#3f6352', '#6e5536'];
export function buildLitho(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x050608, key: 40, fill: 3, rim: 30, keyPos: [-1.4, 2.4, 1.6], rimPos: [1.6, 1.6, -1.6], fillPos: [1.8, .8, 1.6], target: [0, .3, 0], floorY: -.13, size: 40, env: .45, shadowRadius: 5 });
  st.key.angle = Math.PI / 10; st.key.penumbra = 1;   // 光只落在机器附近，地面很快暗下去
  st.cyc.material.envMapIntensity = .15; scene.fog = new THREE.Fog(0x050608, 2.4, 5.5);   // 远处地面融进背景色，看不到地平线
  buildFrame(KIT, scene);
  // 工件台：吸盘 + 晶圆 + 曝光光斑一起平移（步进光刻机移动的是晶圆，物镜不动）
  const stage = new THREE.Group(); scene.add(stage);
  const chuck = mesh(new THREE.CylinderGeometry(.165, .17, .05, 96), KIT.M.aluminium({ rough: .35 })); chuck.position.y = -.025; stage.add(chuck);
  // 晶圆：薄膜干涉 + 芯片格贴图（逐个曝光时重画）
  const W = 1536, tex = KIT.canvasTex(W, W, () => { }, { aniso: 16 }), g = tex.userData.g; let key = null;
  const { R, die, n } = WAFER;
  const dies = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = (i - (n - 1) / 2) * die, z = (j - (n - 1) / 2) * die; if (Math.hypot(Math.abs(x) + die / 2, Math.abs(z) + die / 2) < R * .97) dies.push({ x, z, i, j }); }
  dies.sort((a, b) => a.j - b.j || (a.j % 2 ? b.i - a.i : a.i - b.i));          // 步进顺序：蛇形
  const px = v => (v / (2 * R) + .5) * W;
  /** 前 exposed 个芯片格画成工序 layer 的颜色，其余画成工序 prev 的颜色（prev < 0：还没曝光，只有格线） */
  const drawWafer = (exposed, layer, prev = -1) => {
    const k = exposed + '|' + layer + '|' + prev; if (k === key) return; key = k;
    g.clearRect(0, 0, W, W); g.fillStyle = '#5a6170'; g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.fill();
    dies.forEach((d, idx) => {
      const x0 = px(d.x - die / 2) + 2, y0 = px(d.z - die / 2) + 2, s = px(die) - px(0) - 4, L = idx < exposed ? layer : prev;
      if (L >= 0) { g.fillStyle = LAYER[L % LAYER.length]; g.fillRect(x0, y0, s, s); g.strokeStyle = 'rgba(230,220,190,.55)'; g.lineWidth = 1.2; for (let q = 6; q < s - 6; q += 7) { g.beginPath(); g.moveTo(x0 + 6, y0 + q); g.lineTo(x0 + s - 6, y0 + q); g.stroke(); } g.fillStyle = 'rgba(240,235,220,.35)'; g.fillRect(x0 + s * .2, y0 + s * .2, s * .25, s * .3); }
      else { g.strokeStyle = 'rgba(200,205,215,.18)'; g.lineWidth = 1; g.strokeRect(x0, y0, s, s); }
    });
    g.fillStyle = '#07080b'; g.fillRect(W / 2 - 18, W - 10, 36, 10);    // 定位缺口
    tex.needsUpdate = true;
  };
  const waferMat = new THREE.MeshPhysicalMaterial({ map: tex, metalness: .65, roughness: .12, iridescence: .75, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 650], clearcoat: .5, transparent: true, alphaTest: .5 });
  const wafer = mesh(new THREE.CylinderGeometry(R, R, .0008, 128), [KIT.M.silicon(), waferMat, KIT.M.silicon()]); wafer.position.y = .0004; stage.add(wafer);
  // 掩模（铬图形玻璃板）+ 物镜筒 + 光源罩
  const maskTex = KIT.canvasTex(1024, 1024, (gg, w) => {
    gg.fillStyle = '#000'; gg.fillRect(0, 0, w, w); const r = rng(11); gg.fillStyle = '#fff';
    gg.fillRect(w * .1, w * .1, w * .8, w * .8); gg.fillStyle = '#000';
    for (let i = 0; i < 420; i++) { const x = w * .12 + r() * w * .74, y = w * .12 + r() * w * .74; if (r() < .5) gg.fillRect(x, y, 6 + r() * 120, 6); else gg.fillRect(x, y, 6, 6 + r() * 120); }
  }, { srgb: false });
  const mask = mesh(new THREE.BoxGeometry(.152, .0064, .152), KIT.M.glass({ thickness: .006, tint: 0xeefaff, rough: .05 })); mask.position.y = .62; scene.add(mask);
  const chrome = mesh(new THREE.PlaneGeometry(.13, .13), new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: .9, roughness: .25, alphaMap: maskTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })); chrome.rotation.x = -Math.PI / 2; chrome.position.y = .6233; scene.add(chrome);
  const lens = new THREE.Group(); lens.position.y = .36; scene.add(lens);
  const body = mesh(new THREE.CylinderGeometry(.075, .09, .32, 96, 1, true), KIT.M.paint(0x202328, { rough: .4 })); body.material.side = THREE.DoubleSide; lens.add(body);
  for (const y of [-.15, -.06, .06, .15]) { const ring = mesh(new THREE.TorusGeometry(.083 - y * .05, .006, 12, 96), KIT.M.aluminium({ rough: .3 })); ring.rotation.x = Math.PI / 2; ring.position.y = y; lens.add(ring); }
  const lampHood = mesh(new THREE.CylinderGeometry(.07, .11, .1, 64), KIT.M.paint(0x1a1c20)); lampHood.position.y = .78; scene.add(lampHood);
  // 紫外光束：从物镜出口汇聚到当前曝光的芯片格（克制的蓝紫色，加法混合、很淡）
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.06, .011, 1, 48, 1, true), beamMaterial(.9)); scene.add(beam);
  const beamTop = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .24, 48, 1, true), beamMaterial(.9)); beamTop.position.y = .69; scene.add(beamTop);
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(die, die), new THREE.MeshBasicMaterial({ color: new THREE.Color(.6, .45, 1).multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); spot.rotation.x = -Math.PI / 2; spot.position.y = .0012; scene.add(spot);
  beam.position.y = .1; beam.scale.y = .2;
  return {
    scene, stage, wafer, dies, drawWafer, beam, beamTop, spot, lens, mask,
    /** 工件台把芯片格 f 移到物镜正下方（f 可为小数：在相邻两格之间移动），光束强度 k（0..1）；home 为 0..1 时向晶圆中心回位 */
    aim(f, k, home = 0) {
      const i = Math.max(0, Math.min(dies.length - 1, Math.floor(f))), j = Math.min(dies.length - 1, i + 1), u = f - Math.floor(f), m = u < .55 ? 0 : (u - .55) / .45, e = m * m * (3 - 2 * m);
      const x = (dies[i].x + (dies[j].x - dies[i].x) * e) * (1 - home), z = (dies[i].z + (dies[j].z - dies[i].z) * e) * (1 - home);
      stage.position.set(-x, 0, -z);
      beam.material.uniforms.uOpacity.value = .35 * k; beamTop.material.uniforms.uOpacity.value = .18 * k; spot.material.opacity = .55 * k;
    },
  };
}

/* ---------------- 封装 ---------------- */
export function buildPackages(KIT) {
  const scene = new THREE.Scene();
  const st = KIT.studio(scene, { bg: 0x060607, key: 1.3, fill: .1, rim: 1.6, keyPos: [-.16, .26, .2], rimPos: [.12, .34, -.14], fillPos: [.24, .08, .2], target: [.02, 0, 0], floorY: 0, size: 3, env: .35, shadowRadius: 4 });
  st.key.angle = Math.PI / 7; st.key.penumbra = 1; st.cyc.material = new THREE.MeshLambertMaterial({ color: 0x0a0a0b });
  const ceramic = KIT.M.ceramic(0xdedad0), gold = KIT.M.gold({ rough: .2 }), tin = KIT.M.aluminium({ rough: .3 });
  // ---- 4004：16 针陶瓷 DIP ----
  const P = new THREE.Group(); scene.add(P);
  const L = .0203, Wd = .0074, Hh = .0029;
  const body = mesh(KIT.rbox(L, Hh, Wd, .0004), ceramic); body.position.y = .0011 + Hh / 2; P.add(body);
  const label = KIT.canvasTex(1024, 380, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(60,58,55,.85)'; g.font = '700 120px "JetBrains Mono", "Courier New", monospace'; g.textAlign = 'left'; g.fillText('C4004', 40, 150); g.font = '500 70px "JetBrains Mono", monospace'; g.fillText('2300 T · 10 µm', 44, 300); });
  const lab = mesh(new THREE.PlaneGeometry(L * .32, L * .32 * 380 / 1024), new THREE.MeshStandardMaterial({ map: label, transparent: true, roughness: .5, depthWrite: false }), { cast: false }); lab.rotation.x = -Math.PI / 2; lab.position.set(-L * .3, .0011 + Hh + .00005, 0); P.add(lab);
  const lidG = new THREE.Group(); lidG.position.set(L * .12, .0011 + Hh, 0); P.add(lidG);
  const lid = mesh(KIT.rbox(.0072, .00025, .0049, .00008), gold); lid.position.y = .000125; lidG.add(lid);
  const cavity = mesh(new THREE.BoxGeometry(.0058, .0003, .0038), new THREE.MeshStandardMaterial({ color: 0x8a7a50, roughness: .4, metalness: .6 })); cavity.position.set(L * .12, .0011 + Hh - .00012, 0); P.add(cavity);
  const die = mesh(new THREE.BoxGeometry(.0030, .0002, .0040), [KIT.M.silicon(), KIT.M.silicon(), new THREE.MeshPhysicalMaterial({ map: dieTex(KIT, { seed: 4004 }), metalness: .45, roughness: .3, iridescence: .35 }), KIT.M.silicon(), KIT.M.silicon(), KIT.M.silicon()]); die.position.set(L * .12, .0011 + Hh + .00005, 0); die.rotation.y = Math.PI / 2; P.add(die);
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) {
    const x = -L / 2 + .0015 + i * .00254, pin = new THREE.Group(); pin.position.set(x, .0011 + Hh * .45, s * Wd / 2); P.add(pin);
    const a = mesh(new THREE.BoxGeometry(.0012, .00025, .0012), tin); a.position.z = s * .0006; pin.add(a);
    const b = mesh(new THREE.BoxGeometry(.0005, .0036, .00025), tin); b.position.set(0, -.0016, s * .0012); pin.add(b);
  }
  // ---- 现代倒装芯片封装（比较用） ----
  const Q = new THREE.Group(); Q.position.set(.045, 0, 0); scene.add(Q);
  const sub = mesh(KIT.rbox(.017, .0012, .017, .0004), KIT.M.pcb()); sub.position.y = .0006; Q.add(sub);
  const qdie = mesh(KIT.rbox(.0105, .0008, .0105, .0002), new THREE.MeshPhysicalMaterial({ color: 0x15161a, metalness: .3, roughness: .25, clearcoat: .6 })); qdie.position.y = .0016; Q.add(qdie);
  for (let i = 0; i < 18; i++) { const c = mesh(KIT.rbox(.0011, .0006, .0007, .0001), KIT.M.ceramic(0x8a6a40)); c.position.set(-.0075 + (i % 9) * .0018, .0015, i < 9 ? -.0076 : .0076); Q.add(c); }
  return { scene, dip: P, lid: lidG, modern: Q, anchors: { die: V(L * .12, .0011 + Hh + .0002, 0), label: V(-L * .3, .0011 + Hh, 0), dipCenter: V(0, .002, 0), modern: V(.045, .0018, 0) } };
}

/* ---------------- 纳米尺度（1 单位 = 10 nm） ---------------- */
export function buildNano(KIT) {
  const scene = new THREE.Scene();
  KIT.studio(scene, { bg: 0x07080a, key: 180, fill: 12, rim: 110, keyPos: [-6, 9, 8], rimPos: [8, 5, -7], fillPos: [8, 3, 8], target: [0, 1, 0], floorY: -1.6, size: 80, env: .35, shadowRadius: 5 });
  const si = new THREE.MeshPhysicalMaterial({ color: 0x9aa3b0, roughness: .35, metalness: .2, clearcoat: .3 });
  const ox = KIT.M.glass({ thickness: .2, tint: 0xdff4ff, rough: .1 });
  const T = new THREE.Group(); scene.add(T);
  const base = mesh(KIT.rbox(9, 1.6, 4.4, .1), new THREE.MeshPhysicalMaterial({ color: 0x5d6470, roughness: .5, metalness: .15 })); base.position.y = -.8; T.add(base);
  const fin = mesh(KIT.rbox(7, .5, 1.2, .08), si); fin.position.y = .25; T.add(fin);
  // 三层纳米片（宽 3、厚 0.5、间距 1）穿过栅极
  for (let k = 0; k < 3; k++) { const s = mesh(KIT.rbox(7, .5, 3, .12), si); s.position.y = 1.0 + k * 1.0; T.add(s); }
  // 栅极（金属，包住纳米片；做成剖开一半，露出里面的纳米片）
  const gateM = new THREE.MeshPhysicalMaterial({ color: 0xd8b25a, metalness: .9, roughness: .3 });
  const gate = mesh(KIT.rbox(1.6, 3.6, 4.0, .12), gateM); gate.position.set(0, 2.0, -.6); gate.scale.z = .5; T.add(gate);
  const gateTop = mesh(KIT.rbox(1.6, .6, 4.0, .12), gateM); gateTop.position.set(0, 4.1, 0); T.add(gateTop);
  for (const s of [-1, 1]) {   // 源 / 漏外延区：多面体
    const epi = mesh(new THREE.OctahedronGeometry(1.7, 0), new THREE.MeshPhysicalMaterial({ color: 0x6f8fc8, roughness: .3, metalness: .2 })); epi.scale.set(1, 1.15, 1.2); epi.position.set(s * 3.1, 2.0, 0); T.add(epi);
    const ct = mesh(KIT.rbox(1.2, 2.2, 1.4, .1), KIT.M.copper({ rough: .3 })); ct.position.set(s * 3.1, 4.4, 0); T.add(ct);
  }
  // 铜互连层（M1）
  const cu = KIT.M.copper({ rough: .28 });
  for (let i = 0; i < 4; i++) { const line = mesh(KIT.rbox(14, 1.2, 1.4, .1), cu); line.position.set(0, 6.2, -3 + i * 2.2); T.add(line); }
  const ild = mesh(new THREE.BoxGeometry(16, .4, 10), ox); ild.position.y = 5.4; T.add(ild);
  // 病毒（示意）：直径约 100 nm = 10 单位，带刺突
  const virus = new THREE.Group(); virus.position.set(14, 5.5, -1); scene.add(virus);
  virus.add(mesh(new THREE.SphereGeometry(5, 64, 40), new THREE.MeshPhysicalMaterial({ color: 0xb9a8a0, roughness: .6, sheen: .5, sheenColor: new THREE.Color(0xffd0c0) })));
  const R = rng(7), spikeM = new THREE.MeshPhysicalMaterial({ color: 0xc66a5c, roughness: .5 });
  for (let i = 0; i < 70; i++) { const v = V(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize(), sp = mesh(new THREE.CylinderGeometry(.25, .1, 1.4, 8), spikeM); sp.position.copy(v.clone().multiplyScalar(5.6)); sp.quaternion.setFromUnitVectors(V(0, 1, 0), v); virus.add(sp);
    const tip = mesh(new THREE.SphereGeometry(.38, 10, 6), spikeM); tip.position.copy(v.clone().multiplyScalar(6.3)); virus.add(tip); }
  return { scene, transistor: T, virus, anchors: { sheets: V(3.6, 2.0, 1.5), gate: V(0, 4.4, 2.0), cu: V(-5, 6.8, 1.6), virus: V(14, 9.5, 2.5) } };
}
