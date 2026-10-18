/* 00 · 场景搭建：纽约夜书桌 / 屋顶 5G 基站 / 光纤微距 / 太平洋海床 / 上海早晨餐桌 / 爆炸视图影棚，
   以及「折射透明波前」（电磁波）。每个函数返回 { scene, ... }，动画全部由调用方按 t 驱动。 */
import * as THREE from 'three';
import { V, clamp, lerp, ss, rng, hash } from '../../engine/util.js';
import { makePhone, PW, PH, PD } from './phone.js';

const P = (m, v) => { m.position.copy(v); return m; };
const mesh = (geo, mat, { cast = true, recv = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v) * 2 - 1; }

/* ================= 电磁波前：折射透明壳 + 极淡的掠射亮边 ================= */
const RIM_VS = `varying vec3 vN,vV;varying float vY;void main(){vY=position.y;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const RIM_FS = `uniform vec3 uC;uniform float uA,uP,uCap,uBase;varying vec3 vN,vV;varying float vY;void main(){float f=clamp(1.-abs(dot(normalize(vN),normalize(vV))),0.,1.);float a=(pow(f,uP)+uBase)*uA;if(uCap>-1.)a*=smoothstep(uCap,uCap+(1.-uCap)*.6,vY);gl_FragColor=vec4(uC,a);}`;
export function makeWaves({ count = 8, color = 0xd6ecff, rim = .45, ior = 1.14, thick = .08, pow = 6, seg = 96, cap = 0, dir = null, refract = true, refMin = 0, spec = .25, env = .4, base = 0 } = {}) {
  const group = new THREE.Group(), geo = cap ? new THREE.SphereGeometry(1, seg, seg / 2, 0, Math.PI * 2, 0, cap) : new THREE.SphereGeometry(1, seg, seg / 2), shells = [];
  const q = dir ? new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()) : null;
  for (let i = 0; i < count; i++) {
    const ref = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ transmission: 1, roughness: 0, metalness: 0, ior, thickness: thick, color: 0xffffff, specularIntensity: spec, envMapIntensity: env, depthWrite: false }));
    const rm = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: RIM_VS, fragmentShader: RIM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: 0 }, uP: { value: pow }, uBase: { value: base }, uCap: { value: cap ? Math.cos(cap) : -2 } } }));
    if (q) { ref.quaternion.copy(q); rm.quaternion.copy(q); }
    rm.renderOrder = 4; ref.frustumCulled = rm.frustumCulled = false; group.add(ref, rm); shells.push({ ref, rm });
  }
  return {
    group, shells,
    /** emit：从 t0 起每隔 lambda/speed 发出一层；burst = 只发 n 层（数据包）；返回各层半径（供标注） */
    update(t, { center, t0, speed, lambda, maxR, burst = 0, fade = 1, r0 = 0, fadeIn = .04 }) {
      const per = lambda / speed, n = shells.length, radii = [];
      const kNow = Math.floor((t - t0) / per);
      for (let j = 0; j < n; j++) {
        const S = shells[j], k = burst ? j : kNow - j;
        const r = r0 + (t - (t0 + k * per)) * speed;
        let a = (k < 0 || r <= r0) ? 0 : ss(r0, r0 + fadeIn * Math.max(maxR - r0, .01), r) * (1 - ss(r0 + (maxR - r0) * .55, maxR, r)) * fade;
        if (burst && j >= burst) a = 0;
        radii[j] = a > .01 ? r : null;
        S.ref.visible = refract && a > .01 && r - r0 > refMin; S.rm.visible = a > .01;
        if (a > .01) {
          S.ref.position.copy(center); S.ref.scale.setScalar(r); S.rm.position.copy(center); S.rm.scale.setScalar(r * 1.004 + .0005);
          S.ref.material.ior = 1 + (ior - 1) * a; S.ref.material.thickness = thick * a; S.ref.material.specularIntensity = spec * a;
          S.rm.material.uniforms.uA.value = rim * a;
        }
      }
      return radii;
    },
  };
}

/* ================= 夜景城市背景（程序化楼群 + 灯窗，HDR 亮度供景深散景） ================= */
export function cityBackdrop(KIT, { w = 16, h = 6, seed = 3, k = 1.8, horizon = .62, warm = .62, n = 760, rmin = 3, rmax = 24, blur = 2.5, towers = 46 } = {}) {
  const tex = KIT.canvasTex(2048, 900, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#03050a'); gr.addColorStop(.6, '#080d18'); gr.addColorStop(1, '#141a28'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const r = rng(seed);
    g.filter = 'blur(6px)';
    for (let i = 0; i < towers; i++) { const bw = 40 + r() * 160, bh = H * horizon * (.35 + r() * .75), x = r() * W; g.fillStyle = `rgba(${2 + r() * 6 | 0},${4 + r() * 6 | 0},${9 + r() * 8 | 0},.85)`; g.fillRect(x, H - bh, bw, bh); }
    g.filter = `blur(${blur}px)`;
    for (let i = 0; i < n; i++) {
      const y = H * (1 - horizon * Math.pow(r(), 1.5)), x = r() * W, rad = rmin + (rmax - rmin) * r() * r(), a = .18 + r() * .7, wm = r() < warm;
      const c = wm ? [255, 175 + r() * 50 | 0, 95 + r() * 60 | 0] : (r() < .7 ? [200 + r() * 40 | 0, 220 + r() * 30 | 0, 255] : [255, 255, 245]);
      const rg = g.createRadialGradient(x, y, 0, x, y, rad); rg.addColorStop(0, `rgba(${c},${a * .6})`); rg.addColorStop(.85, `rgba(${c},${a * .85})`); rg.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    }
    for (let i = 0; i < 8; i++) { const x = r() * W, y = H * (1 - horizon * (.5 + r() * .5)); g.fillStyle = 'rgba(255,50,30,.9)'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    g.filter = 'none';
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k, k, k), fog: false }));
}

/* ================= 夜景天际线（楼群剪影 + 逐层灯窗 + 航空障碍灯；远层更朦胧），景深负责虚化 ================= */
export function skyline(KIT, { w = 260, h = 110, seed = 5, k = 1.25, ground = .14, layers = 3, density = 1, soft = 0 } = {}) {
  // soft > 0：画在低分辨率画布上（逻辑坐标不变），放大采样后灯窗自然变柔，像焦外的城市；避免 Canvas 滤镜（大画布上很重）
  const f = soft ? 1 / (1 + soft) : 1;
  const tex = KIT.canvasTex(Math.round(4096 * f), Math.round(1728 * f), (g) => {
    const W = 4096, H = 1728; g.setTransform(f, 0, 0, f, 0, 0);
    const r = rng(seed), gy = H * (1 - ground);
    const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#020309'); sky.addColorStop(.55, '#060a16'); sky.addColorStop(.88, '#141a2a'); sky.addColorStop(1, '#2a2730'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let L = 0; L < layers; L++) {
      const far = 1 - L / Math.max(1, layers - 1), scale = .55 + .45 * (1 - far), haze = .55 * far;
      let x = -20; const cnt = (70 - L * 14) * density;
      while (x < W) {
        const bw = (60 + r() * 220) * scale, bh = (gy * (.12 + Math.pow(r(), 1.7) * .62)) * (.7 + .3 * scale), top = gy - bh;
        const base = 6 + r() * 7; g.fillStyle = `rgb(${base * (1 + haze) | 0},${(base + 2) * (1 + haze) | 0},${(base + 7) * (1 + haze * 1.4) | 0})`; g.fillRect(x, top, bw, bh + 4);
        if (r() < .25) { g.fillRect(x + bw * .3, top - bh * .08, bw * .4, bh * .08 + 2); if (r() < .5) g.fillRect(x + bw * .48, top - bh * .2, bw * .04, bh * .12); }
        // 灯窗：网格 + 按楼层随机点亮；暖白为主，少量冷白
        const ww = Math.max(2, 5 * scale), wh = Math.max(2, 7 * scale), gx = ww * 2.1, gyy = wh * 1.9, warm = r() < .7, lit = .18 + r() * .45;
        for (let yy = top + gyy; yy < gy - gyy; yy += gyy) {
          const floorLit = r() < .85;
          for (let xx = x + gx * .6; xx < x + bw - gx * .6; xx += gx) {
            if (!floorLit || r() > lit) continue;
            const a = (.35 + r() * .65) * (1 - haze * .6), c = warm ? (r() < .8 ? [255, 196 + r() * 40 | 0, 120 + r() * 50 | 0] : [255, 236, 210]) : [200 + r() * 30 | 0, 222 + r() * 20 | 0, 255];
            g.fillStyle = `rgba(${c},${a})`; g.fillRect(xx, yy, ww, wh);
          }
        }
        if (r() < .3) { g.fillStyle = 'rgba(255,40,24,.95)'; g.beginPath(); g.arc(x + bw / 2, top - 3, 3 + 2 * scale, 0, 7); g.fill(); }
        x += bw + (r() < .3 ? r() * 60 : 2);
        if (cnt < 0) break;
      }
      if (haze > 0) { g.fillStyle = `rgba(28,32,46,${haze * .35})`; g.fillRect(0, 0, W, gy); }
    }
    // 街道灯光的低空光晕
    const glow = g.createLinearGradient(0, gy - H * .12, 0, gy); glow.addColorStop(0, 'rgba(255,170,90,0)'); glow.addColorStop(1, 'rgba(255,170,90,.18)'); g.fillStyle = glow; g.fillRect(0, gy - H * .12, W, H * .12);
    g.fillStyle = '#030406'; g.fillRect(0, gy, W, H - gy);
  }, { aniso: 4 });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k, k, k), fog: false }));
}

/* ================= A/B1 纽约夜书桌 ================= */
export async function deskSet(ctx, screenTex) {
  const { KIT } = ctx, s = new THREE.Scene();
  KIT.roomEnv(s, .07); s.background = new THREE.Color(0x05070b);
  const city = cityBackdrop(KIT, { w: 22, h: 8.6, seed: 7, k: 1.55 }); city.position.set(-1, 2.4, -7.5); s.add(city);
  const frameM = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: .6 });
  for (const x of [-.95, .55, 2.0]) s.add(P(mesh(new THREE.BoxGeometry(.06, 3, .08), frameM), V(x, 1.2, -1.15)));
  s.add(P(mesh(new THREE.BoxGeometry(5, .07, .1), frameM), V(0, .02, -1.12)));
  const wood = await KIT.pbr('dark_wood', { repeat: 1.4, extra: { envMapIntensity: .8 } });
  const top = mesh(KIT.rbox(1.7, .036, .86, .008, 3), wood); top.position.set(.02, -.018, -.17); s.add(top);
  const phone = makePhone(KIT, { variant: 'black', screen: screenTex, screenK: .85 });
  phone.group.rotation.set(-Math.PI / 2, 0, .2); phone.group.position.set(0, PD / 2 + .0003, 0); s.add(phone.group);
  // 台灯（Poly Haven）+ 暖色主光
  const lamp = await KIT.model('assets/models/polyhaven/desk_lamp_arm_01/desk_lamp_arm_01_1k.gltf'); lamp.position.set(-.62, 0, -.02); lamp.rotation.y = 1.45; s.add(lamp);
  const key = new THREE.SpotLight(0xffc48a, 1.9, 0, Math.PI / 4.2, .8, 2); key.position.set(-.40, .46, .06); key.target.position.set(.04, 0, -.04); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0001; key.shadow.normalBias = .004; key.shadow.radius = 4; key.shadow.camera.near = .05; key.shadow.camera.far = 3; s.add(key, key.target);
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(.018, 24), KIT.M.emissive(0xffd2a0, 6)); bulb.position.copy(key.position).add(V(0, -.012, 0)); bulb.rotation.x = Math.PI / 2; bulb.material.side = THREE.DoubleSide; s.add(bulb);
  const fill = new THREE.PointLight(0x9cc0ff, .05, 0, 2); fill.position.set(.6, .35, -.3); s.add(fill);   // 窗外冷色反光
  const rim = new THREE.DirectionalLight(0x8fb3ff, .22); rim.position.set(.4, .6, -1.2); s.add(rim);
  // 笔记本电脑、便签本、笔筒
  const notes = await KIT.model('assets/models/polyhaven/office_notepads/office_notepads_1k.gltf', { center: false });
  const pad = new THREE.Group(); for (const nm of ['office_notepads_yellow_pad', 'office_notepads_sticky_stack']) { const o = notes.getObjectByName(nm); if (o) { const p = o.position.clone(); pad.add(o); o.position.set(nm.includes('sticky') ? .16 : 0, p.y, nm.includes('sticky') ? -.02 : 0); } }
  pad.position.set(-.30, 0, .02); pad.rotation.y = .35; s.add(pad);
  // 护照 + 登机牌（刚到纽约的线索）
  const pass = new THREE.Group();
  pass.add(mesh(KIT.rbox(.088, .0045, .125, .0018, 2), new THREE.MeshPhysicalMaterial({ color: 0x4a1218, roughness: .62, roughnessMap: KIT.grunge(41), sheen: .4, sheenColor: new THREE.Color(0x6a2a2a) })));
  const gold = KIT.canvasTex(512, 720, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#d4b06a'; g.textAlign = 'center'; g.font = '600 64px "Songti SC","STSong",serif'; g.fillText('护  照', w / 2, 200); g.font = '500 40px "Times New Roman",serif'; g.fillText('PASSPORT', w / 2, 600); g.strokeStyle = '#d4b06a'; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, 390, 90, 0, 7); g.stroke(); g.beginPath(); g.arc(w / 2, 390, 70, 0, 7); g.stroke(); });
  const gp = mesh(new THREE.PlaneGeometry(.080, .113), new THREE.MeshPhysicalMaterial({ map: gold, transparent: true, metalness: .8, roughness: .35, color: 0xffffff }), { cast: false }); gp.rotation.x = -Math.PI / 2; gp.position.y = .00232; pass.add(gp);
  const bp = KIT.canvasTex(1024, 400, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f4e8c'; g.fillRect(0, 0, w, 70); g.fillStyle = '#fff'; g.font = '600 38px Arial'; g.fillText('BOARDING PASS  登机牌', 30, 50);
    g.fillStyle = '#222'; g.font = '500 30px Arial'; g.fillText('FROM  SHANGHAI / PVG', 30, 130); g.fillText('TO      NEW YORK / JFK', 30, 180);
    g.font = '700 74px Arial'; g.fillText('PVG → JFK', 30, 290); g.font = '500 26px monospace'; g.fillText('FLT 0587   17OCT26   SEAT 42K   GATE D12', 30, 360);
    g.fillStyle = '#111'; for (let i = 0; i < 70; i++) g.fillRect(760 + i * 3.4, 100, (i * 13) % 3 + 1, 240);
  });
  const card = mesh(new THREE.PlaneGeometry(.205, .080), new THREE.MeshPhysicalMaterial({ map: bp, roughness: .8, side: THREE.DoubleSide }), { cast: true }); card.rotation.x = -Math.PI / 2; card.rotation.z = .3; card.position.set(.05, .0006, -.03);
  pass.position.set(.14, .0023, .01); pass.rotation.y = -.45; s.add(pass); card.position.set(.18, .0005, -.05); s.add(card);
  // 纸杯咖啡
  const cupPts = [V(0, 0), V(.030, 0), V(.032, .002), V(.043, .118), V(.045, .121), V(.044, .123), V(.040, .123)].map(p => new THREE.Vector2(p.x, p.y));
  const cup = mesh(new THREE.LatheGeometry(cupPts, 48), new THREE.MeshPhysicalMaterial({ color: 0xefe9de, roughness: .6, side: THREE.DoubleSide })); cup.position.set(-.16, 0, -.20); s.add(cup);
  const sleeve = mesh(new THREE.CylinderGeometry(.0415, .0375, .045, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x8a6440, roughness: .85, side: THREE.DoubleSide })); sleeve.position.set(-.16, .062, -.20); s.add(sleeve);
  const lid = mesh(new THREE.CylinderGeometry(.044, .046, .010, 48), new THREE.MeshPhysicalMaterial({ color: 0x1a1a1a, roughness: .45 })); lid.position.set(-.16, .127, -.20); s.add(lid);
  const waves = makeWaves({ count: 8, rim: .62, ior: 1.1, thick: .035, pow: 4.5, color: 0xcfe6ff, refMin: .035, spec: .025, env: .08 }); s.add(waves.group);
  return { scene: s, phone, waves, key };
}

/* ================= B2 屋顶 5G 基站 ================= */
export async function towerSet(ctx, { rot = 0 } = {}) {
  const { KIT } = ctx, s = new THREE.Scene();
  // 夜景城市：真实 HDRI（强虚化）作背景与环境反射
  await KIT.hdri(s, KIT.hdriFile('shanghai_bund'), { intensity: .16, rotation: rot });   // 只取城市夜景的环境反射，不作背景
  s.background = new THREE.Color(0x03050a);
  const sk1 = skyline(KIT, { w: 300, h: 126, seed: 21, k: 1.5, soft: 1.6 }); sk1.position.set(-30, 47, -110); s.add(sk1);
  const sk2 = skyline(KIT, { w: 300, h: 126, seed: 22, k: 1.4, soft: 1.6 }); sk2.position.set(-120, 47, -10); sk2.rotation.y = Math.PI / 2; s.add(sk2);
  s.fog = new THREE.FogExp2(0x101826, .012);
  const conc = await KIT.pbr('concrete_floor_worn_001', { repeat: 4 });
  const floor = mesh(new THREE.PlaneGeometry(16, 16), conc); floor.rotation.x = -Math.PI / 2; s.add(floor);
  const par = mesh(KIT.rbox(16, 1.05, .3, .02, 2), conc); par.position.set(0, .525, -2.6); s.add(par);
  const par2 = mesh(KIT.rbox(.3, 1.05, 16, .02, 2), conc); par2.position.set(-3.2, .525, 0); s.add(par2);
  const capStone = KIT.M.steel({ rough: .6, extra: { color: new THREE.Color().setRGB(.35, .36, .37, THREE.LinearSRGBColorSpace) } });
  s.add(P(mesh(KIT.rbox(16, .03, .36, .01, 2), capStone), V(0, 1.06, -2.6)), P(mesh(KIT.rbox(.36, .03, 16, .01, 2), capStone), V(-3.2, 1.06, 0)));
  const galv = KIT.M.steel({ rough: .55, extra: { color: new THREE.Color().setRGB(.52, .53, .53, THREE.LinearSRGBColorSpace) } });
  const mast = mesh(new THREE.CylinderGeometry(.057, .057, 4.7, 32), galv); mast.position.set(0, 2.35, 0); s.add(mast);
  s.add(P(mesh(KIT.rbox(.5, .03, .5, .006), galv), V(0, .015, 0)));
  for (const [x, z] of [[.19, .19], [-.19, .19], [.19, -.19], [-.19, -.19]]) s.add(P(mesh(new THREE.CylinderGeometry(.016, .016, .05, 6), galv), V(x, .045, z)));
  // 斜撑（三根拉杆把抱杆固定在屋面）
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + .2, foot = V(Math.cos(a) * 1.1, .03, Math.sin(a) * 1.1), top = V(Math.cos(a) * .06, 1.55, Math.sin(a) * .06); const d = top.clone().sub(foot), L = d.length(); const br = mesh(new THREE.CylinderGeometry(.018, .018, L, 12), galv); br.position.copy(foot).add(top).multiplyScalar(.5); br.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); s.add(br); s.add(P(mesh(KIT.rbox(.16, .02, .16, .004), galv), foot)); }
  const radome = KIT.M.plastic(0xdcdbd5, { rough: .55 }), capM = KIT.M.plastic(0x4b4d50, { rough: .5 }), alu = KIT.M.aluminium({ rough: .5 }), black = KIT.M.rubber(0x0c0c0d);
  const sticker = KIT.canvasTex(256, 384, (g, w, h) => { g.fillStyle = '#f2f1ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = '600 26px Arial'; g.fillText('ANT  3.4–3.8 GHz', 14, 46); g.font = '400 20px monospace'; ['65° · 18 dBi', '±45° POL', 'TILT 0–10°', 'SN 7Q2-41180'].forEach((t, i) => g.fillText(t, 14, 96 + i * 40)); for (let i = 0; i < 50; i++) g.fillRect(14 + i * 4.4, 290, (i * 7) % 3 + 1, 70); });
  const leds = [], panels = [];
  for (let k = 0; k < 3; k++) {
    const az = k * Math.PI * 2 / 3 + .55, sec = new THREE.Group(); sec.rotation.y = az; s.add(sec);
    sec.add(P(mesh(new THREE.BoxGeometry(.05, .05, .62), galv), V(0, 3.62, .31)));
    sec.add(P(mesh(new THREE.BoxGeometry(.05, .05, .62), galv), V(0, 2.25, .31)));
    for (const y of [3.62, 2.25]) sec.add(P(mesh(new THREE.TorusGeometry(.064, .012, 8, 24), galv), V(0, y, 0)).rotateX(Math.PI / 2));
    const pipe = mesh(new THREE.CylinderGeometry(.038, .038, 2.2, 20), galv); pipe.position.set(0, 2.95, .6); sec.add(pipe);
    const pan = new THREE.Group(); pan.position.set(0, 3.22, .74); pan.rotation.x = .07; sec.add(pan); panels.push(pan);
    pan.add(mesh(KIT.rbox(.34, 1.42, .13, .035, 4), radome));
    for (const y of [.73, -.73]) pan.add(P(mesh(KIT.rbox(.35, .045, .14, .01, 2), capM), V(0, y, 0)));
    for (const y of [.45, -.45]) pan.add(P(mesh(KIT.rbox(.12, .06, .12, .008, 2), galv), V(0, y, -.1)));
    for (const y of [.45, -.45]) for (const x of [-.04, .04]) pan.add(P(mesh(new THREE.CylinderGeometry(.007, .007, .02, 8), galv), V(x, y, -.165)).rotateX(Math.PI / 2));
    const st = mesh(new THREE.PlaneGeometry(.09, .135), new THREE.MeshPhysicalMaterial({ map: sticker, roughness: .7 }), { cast: false }); st.position.set(.09, -.55, .0655); pan.add(st);
    for (const x of [-.08, -.027, .027, .08]) pan.add(P(mesh(new THREE.CylinderGeometry(.012, .012, .05, 16), alu), V(x, -.77, 0)));
    // RRU（散热鳍片）
    const rru = new THREE.Group(); rru.position.set(0, 1.92, .74); sec.add(rru);
    rru.add(mesh(KIT.rbox(.30, .44, .12, .012, 2), new THREE.MeshPhysicalMaterial({ color: 0x9a9da1, roughness: .55, metalness: .6, roughnessMap: KIT.grunge(60 + k) })));
    for (let i = 0; i < 11; i++) rru.add(P(mesh(new THREE.BoxGeometry(.006, .42, .05), alu), V(-.135 + i * .027, 0, -.085)));
    for (const x of [-.09, -.03, .03, .09]) rru.add(P(mesh(new THREE.CylinderGeometry(.011, .011, .04, 12), alu), V(x, -.24, 0)));
    const led = new THREE.Mesh(new THREE.CircleGeometry(.006, 12), KIT.M.emissive(0x3dff6a, 3)); led.position.set(.11, .17, .0605); rru.add(led); leds.push(led);
    // 跳线（RRU → 天线）+ 光纤/电源线（RRU → 抱杆向下）
    for (const [i, x] of [[0, -.08], [1, -.027], [2, .027], [3, .08]]) {
      const a = V(x * .9, 1.68, .74), b = V(x, 2.43, .74), c = new THREE.CatmullRomCurve3([a, V(x * .9, 1.5, .86 + i * .02), V(x, 2.0, .95 + i * .015), V(x, 2.38, .80), b]);
      sec.add(mesh(new THREE.TubeGeometry(c, 48, .0065, 8), black));
    }
    for (const [i, x] of [[0, -.05], [1, .05]]) {
      const c = new THREE.CatmullRomCurve3([V(x, 1.7, .74), V(x * .6, 1.45, .6), V(x * .3, 1.2, .14), V(.07 * (i ? 1 : -1), .9, .08), V(.07 * (i ? 1 : -1), .05, .08)]);
      sec.add(mesh(new THREE.TubeGeometry(c, 64, i ? .007 : .0045, 8), i ? black : KIT.M.rubber(0x1a1a1a)));
    }
  }
  // 线缆扎带（抱杆上的不锈钢箍）
  for (let i = 0; i < 6; i++) s.add(P(mesh(new THREE.TorusGeometry(.072, .004, 6, 28), KIT.M.steel({ rough: .25 })), V(0, .25 + i * .2, 0)).rotateX(Math.PI / 2));
  // 机柜（灰色喷塑钢板，百叶散热口、门把手、标签）
  const cab = new THREE.Group(); cab.position.set(-1.25, 0, -1.25); cab.rotation.y = .35; s.add(cab);
  const cabM = new THREE.MeshPhysicalMaterial({ color: 0x8d9092, roughness: .5, metalness: .1, roughnessMap: KIT.grunge(66), clearcoat: .2 });
  cab.add(P(mesh(KIT.rbox(.7, 1.3, .55, .015, 2), cabM), V(0, .7, 0)));
  cab.add(P(mesh(KIT.rbox(.74, .04, .6, .01, 2), cabM), V(0, 1.37, 0)));
  cab.add(P(mesh(KIT.rbox(.62, .08, .5, .01, 2), galv), V(0, .04, 0)));
  for (let i = 0; i < 9; i++) cab.add(P(mesh(KIT.rbox(.42, .012, .02, .004, 1), cabM), V(0, .95 + i * .028, .285)));
  cab.add(P(mesh(KIT.rbox(.02, .16, .03, .006, 2), KIT.M.steel({ rough: .3 })), V(.29, .72, .29)));
  const lab = KIT.canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#e9c43a'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '700 34px Arial'; g.fillText('⚡ 48 V DC', 18, 58); g.font = '500 22px monospace'; g.fillText('BBU · SITE NY-1207', 18, 104); g.fillText('AUTHORIZED ONLY', 18, 138); });
  cab.add(P(mesh(new THREE.PlaneGeometry(.16, .1), new THREE.MeshPhysicalMaterial({ map: lab, roughness: .6 }), { cast: false }), V(-.12, .62, .2755)));
  // 走线架（机柜 → 抱杆）
  const tray = new THREE.Group(); s.add(tray);
  const ta = V(-1.0, .32, -1.0), tb = V(-.08, .32, -.06), td = tb.clone().sub(ta), tl = td.length(); tray.position.copy(ta).add(tb).multiplyScalar(.5); tray.rotation.y = -Math.atan2(td.z, td.x);
  for (const z of [-.08, .08]) tray.add(P(mesh(new THREE.BoxGeometry(tl, .04, .006), galv), V(0, 0, z)));
  for (let i = 0; i < 7; i++) tray.add(P(mesh(new THREE.BoxGeometry(.012, .006, .16), galv), V(-tl / 2 + .06 + i * (tl - .12) / 6, -.018, 0)));
  for (const x of [-tl / 2 + .1, tl / 2 - .1]) tray.add(P(mesh(new THREE.BoxGeometry(.03, .32, .03), galv), V(x, -.16, 0)));
  for (const z of [-.03, 0, .035]) tray.add(P(mesh(new THREE.CylinderGeometry(.009, .009, tl, 8).rotateZ(Math.PI / 2), black), V(0, -.005, z)));
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), KIT.M.emissive(0xff2a12, 3.5)); beacon.position.set(0, 4.72, 0); s.add(beacon);
  const bl = new THREE.PointLight(0xff3018, .5, 0, 2); bl.position.set(0, 4.85, 0); s.add(bl);
  const moon = new THREE.DirectionalLight(0xa9c2ff, .35); moon.position.set(-4, 6, 3); s.add(moon);
  const flood = new THREE.SpotLight(0xffb878, 16, 0, Math.PI / 4.5, .8, 2); flood.position.set(3.2, .5, 2.6); flood.target.position.set(0, 2.4, 0); flood.castShadow = true; flood.shadow.mapSize.set(2048, 2048); flood.shadow.bias = -.0002; flood.shadow.normalBias = .02; s.add(flood, flood.target);
  const waves = makeWaves({ count: 6, rim: .34, pow: 10, seg: 96, cap: 2.3 / 225, dir: V(0, 3, .3).sub(V(-175, -20, 140)), refract: false }); s.add(waves.group);
  return { scene: s, waves, leds, panels, beacon };
}

/* ================= C 光纤微距（单位：毫米） ================= */
const CORE_FS = `uniform float uT,uV,uX0,uSp,uW,uOn;uniform float uBits[12];varying float vX;
void main(){float sp=(uX0+uV*uT-vX)/uSp;float k=floor(sp);float fr=(sp-k-.5)*uSp/uW;float e=0.;if(k>=0.){int i=int(mod(k,12.));for(int j=0;j<12;j++){if(j==i)e=uBits[j]*exp(-fr*fr);}}
 vec3 c=vec3(1.,.13,.06)*(.006+e*4.5*uOn);gl_FragColor=vec4(c,1.);}`;
export async function fiberSet(ctx) {
  const { KIT } = ctx, s = new THREE.Scene();
  const st = KIT.studio(s, { bg: 0x07080a, floorY: -9, size: 220, keyPos: [26, 36, 30], key: 2600, rimPos: [-30, 18, -26], rim: 1500, fillPos: [-24, 8, 20], fill: 260, env: .9 });
  st.cyc.visible = false;
  { // 暗色渐变背景板 + 远处实验台上的指示灯（只作景深散景，亮度克制）
    const C = V(-46, -14, -44), toCam = V(3.9, 1.2, 3.1).sub(C).normalize(), rt = V(0, 1, 0).cross(toCam).normalize(), up = toCam.clone().cross(rt);
    const bgT = KIT.canvasTex(1024, 512, (g, w, h) => { const rg = g.createRadialGradient(w * .55, h * .42, 0, w * .55, h * .42, w * .62); rg.addColorStop(0, '#24272c'); rg.addColorStop(.55, '#111316'); rg.addColorStop(1, '#050607'); g.fillStyle = rg; g.fillRect(0, 0, w, h); });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.MeshBasicMaterial({ map: bgT, color: new THREE.Color(.55, .55, .55) })); bg.position.copy(C).addScaledVector(toCam, -30); bg.lookAt(V(3.9, 1.2, 3.1)); s.add(bg);
    const br = rng(31), bm = [0xffd8b0, 0xd8e6ff, 0xffe8cc, 0xffb880, 0xe8f0ff];
    for (let i = 0; i < 13; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.18 + br() * .22, 12, 8), KIT.M.emissive(bm[i % 5], .3 + br() * .7)); d.position.copy(C).addScaledVector(rt, (br() - .5) * 64).addScaledVector(up, (br() - .5) * 26 - 3).addScaledVector(toCam, (br() - .5) * 16); s.add(d); }
  }
  const X0 = -12, X1 = 46, BX = -1;   // 纤芯总长；BX 处剥去涂覆层
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.0045, .0045, X1 - X0, 8, 1, true).rotateZ(Math.PI / 2).translate((X0 + X1) / 2, 0, 0),
    new THREE.ShaderMaterial({ vertexShader: `varying float vX;void main(){vX=position.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`, fragmentShader: CORE_FS,
      uniforms: { uT: { value: 0 }, uV: { value: 14 }, uX0: { value: X0 }, uSp: { value: 3.0 }, uW: { value: .32 }, uOn: { value: 1 }, uBits: { value: [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0] } } }));
  s.add(core);
  const glass = mesh(new THREE.CylinderGeometry(.0625, .0625, X1 - BX, 48, 1, false).rotateZ(Math.PI / 2).translate((X1 + BX) / 2, 0, 0), KIT.M.glass({ thickness: .12, ior: 1.468, rough: .015 }), { cast: false }); s.add(glass);
  const coatM = new THREE.MeshPhysicalMaterial({ color: 0x1a56c4, roughness: .35, clearcoat: .35, clearcoatRoughness: .3, envMapIntensity: .5 });
  const coat = mesh(new THREE.CylinderGeometry(.125, .125, BX - X0, 48).rotateZ(Math.PI / 2).translate((BX + X0) / 2, 0, 0), coatM); s.add(coat);
  const taper = mesh(new THREE.CylinderGeometry(.0625, .125, .08, 48).rotateZ(Math.PI / 2).translate(BX + .04, 0, 0), coatM); s.add(taper);
  // 松套管 + 其余 11 根彩色光纤（TIA-598 色谱）
  const tubeEnd = V(-44, -.8, -2.2);
  const tube = mesh(new THREE.CylinderGeometry(1.05, 1.05, 60, 48, 1, true).rotateZ(Math.PI / 2).translate(tubeEnd.x - 30, tubeEnd.y, tubeEnd.z), new THREE.MeshPhysicalMaterial({ color: 0xe9e6dc, roughness: .5, side: THREE.DoubleSide, sheen: .3 })); s.add(tube);
  const ring = mesh(new THREE.RingGeometry(.92, 1.05, 48).rotateY(Math.PI / 2).translate(tubeEnd.x, tubeEnd.y, tubeEnd.z), new THREE.MeshPhysicalMaterial({ color: 0xd8d4c8, roughness: .6, side: THREE.DoubleSide })); s.add(ring);
  const cols = [0xd8701e, 0x2e9a3c, 0x6b4a2a, 0x7d8a94, 0xeeeeea, 0xc8241e, 0x101010, 0xe6c21a, 0x6a3fa0, 0xe48aa8, 0x3fb8c4];
  const r = rng(12);
  cols.forEach((c, i) => {
    const a = i / cols.length * Math.PI * 2, o = V(0, Math.cos(a) * .55, Math.sin(a) * .55).add(tubeEnd);
    const end = V(-30 - r() * 26, -8.8, -8 - r() * 18);
    const crv = new THREE.CatmullRomCurve3([o.clone().add(V(-8, 0, 0)), o, o.clone().add(V(4 + r() * 5, (r() - .5) * 2, (r() - .5) * 3)), o.clone().lerp(end, .7).add(V(0, 2, 0)), end]);
    s.add(mesh(new THREE.TubeGeometry(crv, 64, .125, 12), new THREE.MeshPhysicalMaterial({ color: c, roughness: .3, clearcoat: .7, clearcoatRoughness: .2 })));
  });
  // 蓝纤从松套管里出来、接上前景直纤
  const lead = new THREE.CatmullRomCurve3([tubeEnd.clone().add(V(-6, .1, .1)), tubeEnd.clone().add(V(0, .1, .1)), V(-30, -.35, -1.0), V(-18, -.02, -.06), V(-12, 0, 0), V(-11, 0, 0)]);
  s.add(mesh(new THREE.TubeGeometry(lead, 96, .125, 12), coatM));
  const glow = new THREE.PointLight(0xff3010, 0, 0, 2); s.add(glow);
  return { scene: s, core, glow, X0, X1, BX };
}

/* ================= E1 太平洋海床（海缆 X 光剖视） ================= */
export async function seabedSet(ctx) {
  const { KIT } = ctx, s = new THREE.Scene();
  s.background = new THREE.Color(0x02101a); s.fog = new THREE.FogExp2(0x03182a, .5);
  const sand = await KIT.pbr('damp_sand', { repeat: 9, extra: { color: 0x93a8a6 } });
  const H = (x, z) => .05 * vnoise(x * .9 + 3, z * .9 - 1) + .018 * vnoise(x * 3.1, z * 3.1 + 7) + .004 * Math.sin(x * 11 + vnoise(x * .5, z * .5) * 3);
  const fg = new THREE.PlaneGeometry(14, 14, 220, 220); fg.rotateX(-Math.PI / 2); const p = fg.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i))); fg.computeVertexNormals();
  const floor = mesh(fg, sand, { cast: false }); s.add(floor);
  // 石块
  const rk = rng(5), rockM = new THREE.MeshPhysicalMaterial({ color: 0x2b2924, roughness: .92 });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.IcosahedronGeometry(1, 3), q = g.attributes.position; for (let k = 0; k < q.count; k++) { const v = V(q.getX(k), q.getY(k), q.getZ(k)); v.multiplyScalar(1 + .28 * vnoise(v.x * 2 + i, v.y * 2 + v.z * 1.7)); q.setXYZ(k, v.x, v.y * .6, v.z); } g.computeVertexNormals();
    const m = mesh(g, rockM); const sc = .04 + rk() * .16; m.scale.setScalar(sc); const x = (rk() - .5) * 5, z = -rk() * 4 + 1.2; if (Math.abs(z - .15 * Math.sin(x * .8)) < .25) continue; m.position.set(x, H(x, z) - sc * .25, z); m.rotation.y = rk() * 6; s.add(m);
  }
  // 海缆：沿海床起伏、略陷入沙中；中段做成「X 光」剖视
  const R = .0105, pts = []; for (let i = 0; i <= 40; i++) { const x = -7 + i * .35, z = .15 * Math.sin(x * .8) + .05 * Math.sin(x * 2.3); pts.push(V(x, H(x, z) + R * .55, z)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  class Sub extends THREE.Curve { constructor(a, b) { super(); this.a = a; this.b = b; } getPoint(u, o = V()) { return o.copy(curve.getPointAt(lerp(this.a, this.b, u))); } }
  const ua = .487, ub = .523, jacket = new THREE.MeshPhysicalMaterial({ color: 0x0d0e0f, roughness: .5, roughnessMap: KIT.grunge(17), clearcoat: .25, clearcoatRoughness: .5 });
  s.add(mesh(new THREE.TubeGeometry(new Sub(0, ua), 360, R, 20), jacket), mesh(new THREE.TubeGeometry(new Sub(ub, 1), 360, R, 20), jacket));
  for (const u of [ua, ub]) { const c = mesh(new THREE.CircleGeometry(R, 24), new THREE.MeshPhysicalMaterial({ color: 0x0d0e0f, roughness: .6, side: THREE.DoubleSide })); c.position.copy(curve.getPointAt(u)); c.lookAt(c.position.clone().add(curve.getTangentAt(u))); s.add(c); }
  const ghost = (r, col, a, pw = 3) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new Sub(ua, ub), 120, r, 32), new THREE.ShaderMaterial({ vertexShader: RIM_VS, fragmentShader: RIM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color(col) }, uA: { value: a }, uP: { value: pw }, uCap: { value: -2 } } })); m.renderOrder = 3; s.add(m); return m; };
  const gJ = ghost(R, 0xbfe4ff, .42, 2.4), gC = ghost(.0047, 0xff9a5a, .4, 2), gT = ghost(.0017, 0xd8dde2, .5, 2);
  // 内部：钢丝（螺旋）与光纤（带脉冲）
  const frames = (u) => { const t = curve.getTangentAt(u), n = V(0, 1, 0).cross(t).normalize(), b = t.clone().cross(n).normalize(); return [n, b]; };
  const helix = (rad, phase, turns, n = 220) => { const out = []; for (let i = 0; i <= n; i++) { const f = i / n, u = lerp(ua - .001, ub + .001, f), c = curve.getPointAt(u), [nn, bb] = frames(u), a = phase + f * turns * Math.PI * 2; out.push(c.clone().addScaledVector(nn, Math.cos(a) * rad).addScaledVector(bb, Math.sin(a) * rad)); } return out; };
  const wires = []; for (let i = 0; i < 8; i++) { const l = KIT.pathLine(helix(.0031, i / 8 * Math.PI * 2, 6), { width: 1.1, color: 0xc9d4dc, opacity: .38 }); s.add(l); wires.push(l); }
  const fibers = []; [0xff5a3a, 0xff7a3a, 0xff4a4a, 0xff8a5a].forEach((c, i) => { const l = KIT.pathLine(helix(.0007, i * Math.PI / 2, 1.2), { width: 1.4, color: c, opacity: .9, intensity: .7, pulse: 5, pulseSpeed: .55, pulseLen: 3 + i * .3 }); s.add(l); fibers.push(l); });
  // 海雪（悬浮颗粒）
  const N = 2600, ps = new Float32Array(N * 3), pr = rng(9), sz = new Float32Array(N); for (let i = 0; i < N; i++) { ps[i * 3] = (pr() - .5) * 4; ps[i * 3 + 1] = pr() * 1.4; ps[i * 3 + 2] = (pr() - .5) * 4; sz[i] = .5 + pr() * 1.2; }
  const snow = KIT.points(ps, { size: 2.6, color: 0xcfe6e0, opacity: .55, atten: 1.2, sizes: sz, soft: .8 }); s.add(snow);
  // 光照：ROV 灯 + 极弱的天光
  s.add(new THREE.HemisphereLight(0x2c7a86, 0x061412, .08));
  const rov = new THREE.SpotLight(0xe6f4ff, 9, 0, .5, .9, 2); rov.position.set(-.75, .95, .95); rov.target.position.set(.15, 0, -.1); rov.castShadow = true; rov.shadow.mapSize.set(2048, 2048); rov.shadow.bias = -.0002; rov.shadow.normalBias = .01; rov.shadow.radius = 5; s.add(rov, rov.target);
  const xr = { center: curve.getPointAt((ua + ub) / 2), a: curve.getPointAt(ua), b: curve.getPointAt(ub), curve, ua, ub };
  return { scene: s, snow, fibers, wires, ghosts: [gJ, gC, gT], xr, rov, H };
}

/* ================= F 上海早晨餐桌 ================= */
export async function kitchenSet(ctx, screenTex) {
  const { KIT } = ctx, s = new THREE.Scene();
  await KIT.hdri(s, KIT.hdriFile('combination_room'), { intensity: .22, background: true, bgBlur: .6, bgIntensity: .75, rotation: .8 });
  const TY = .9;
  const counter = mesh(KIT.rbox(2.2, .04, .75, .008, 3), new THREE.MeshPhysicalMaterial({ color: 0xe4ded3, roughness: .32, roughnessMap: KIT.grunge(53, { contrast: .5 }), clearcoat: .35, clearcoatRoughness: .25 })); counter.position.set(.1, TY - .02, -.12); s.add(counter);
  const backsplash = mesh(new THREE.PlaneGeometry(3, 1.2), new THREE.MeshPhysicalMaterial({ color: 0xd9d4ca, roughness: .6 })); backsplash.position.set(.1, TY + .6, -.5); s.add(backsplash);
  const phone = makePhone(KIT, { variant: 'white', screen: screenTex, screenK: .82 });
  phone.group.rotation.set(-Math.PI / 2, 0, -.28); phone.group.position.set(0, TY + PD / 2 + .0003, .05); s.add(phone.group);
  const mug = new THREE.Group(); const prof = [[0, .002], [.036, 0], [.040, .004], [.042, .09], [.044, .094], [.040, .094], [.037, .012], [0, .012]].map(([x, y]) => new THREE.Vector2(x, y));
  mug.add(mesh(new THREE.LatheGeometry(prof, 64), KIT.M.ceramic(0xf1ede4)));
  const hd = mesh(new THREE.TorusGeometry(.024, .006, 16, 32, Math.PI * 1.1), KIT.M.ceramic(0xf1ede4)); hd.rotation.z = -Math.PI * .55; hd.position.set(.044, .05, 0); mug.add(hd);
  const tea = mesh(new THREE.CircleGeometry(.0385, 48), new THREE.MeshPhysicalMaterial({ color: 0x6a3f14, roughness: .05, transmission: 0, clearcoat: 1 })); tea.rotation.x = -Math.PI / 2; tea.position.y = .078; mug.add(tea);
  mug.position.set(.15, TY, -.07); mug.rotation.y = 2.4; s.add(mug);
  const bowlP = [[0, 0], [.03, 0], [.032, .003], [.058, .035], [.062, .048], [.059, .048], [.054, .036], [.028, .008], [0, .008]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = mesh(new THREE.LatheGeometry(bowlP, 64), KIT.M.ceramic(0xf4f1ea)); bowl.position.set(-.17, TY, -.13); s.add(bowl);
  const rimLine = mesh(new THREE.TorusGeometry(.0605, .0012, 8, 64), KIT.M.ceramic(0x2f5f9e)); rimLine.rotation.x = Math.PI / 2; rimLine.position.set(-.17, TY + .047, -.13); s.add(rimLine);
  const gobo = new THREE.Group(), gm = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  for (const [x, y, w, h] of [[0, 0, .035, 1.6], [-.55, 0, .05, 1.6], [.55, 0, .05, 1.6], [0, .18, 1.2, .035], [0, -.62, 1.2, .05]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .02), gm); b.position.set(x, y, 0); b.castShadow = true; gobo.add(b); }
  s.add(gobo);
  const sun = new THREE.DirectionalLight(0xffe6c8, 5.5); sun.position.set(-1.9, 1.7, -.6); sun.target.position.set(0, TY, 0); sun.castShadow = true; gobo.position.copy(sun.target.position).addScaledVector(sun.position.clone().sub(sun.target.position).normalize(), .9).add(V(.06, 0, .05)); gobo.lookAt(sun.position);
  Object.assign(sun.shadow.camera, { left: -.6, right: .6, top: .6, bottom: -.6, near: .5, far: 6 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0002; sun.shadow.normalBias = .01; sun.shadow.radius = 3; s.add(sun, sun.target);
  return { scene: s, phone, TY };
}

/* ================= H 爆炸视图影棚 ================= */
export function studioSet(ctx, screenTex) {
  const { KIT } = ctx, s = new THREE.Scene();
  const st = KIT.studio(s, { bg: 0x07080a, floorY: 0, size: 40, key: 120, keyPos: [2.9, 4.8, 2.7], rim: 190, rimPos: [-3.3, 2.7, -3.4], fill: 7, fillPos: [-3.2, 1.3, 3.1], env: .28, target: [.1, .72, 0], shadowRadius: 8 });
  if (st.cyc.material) st.cyc.material.envMapIntensity = .5;
  const phone = makePhone(KIT, { variant: 'black', screen: screenTex, glass: 'real', screenK: .7 });
  // 手机竖立、屏幕朝右前方并略微仰起；爆炸时各层沿屏幕法线分开 → 从正面偏左看过去，五层像扇开的卡片
  const K = 5, YAW = .95, TILT = -.16;
  phone.group.scale.setScalar(K); phone.group.rotation.set(TILT, YAW, 0, 'YXZ'); phone.group.position.set(0, .72, 0); s.add(phone.group);
  const top = new THREE.SpotLight(0xeef2ff, 45, 0, Math.PI / 8, .9, 2); top.position.set(.5, 4.4, .4); top.target = st.target; s.add(top);
  const normal = V(0, 0, 1).applyEuler(phone.group.rotation);
  const L = phone.layers, OFF = { back: [-.016, 0, -.052], board: [-.004, .004, .034], disp: [.030, 0, .080], glass: [.044, 0, .104] };
  const explode = e => { phone.setExplode(0); for (const k in OFF) L[k].position.set(OFF[k][0] * e, OFF[k][1] * e, OFF[k][2] * e); };
  return { scene: s, phone, st, K, normal, explode };
}
