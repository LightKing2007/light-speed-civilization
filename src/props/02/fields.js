/* 02 · 场景 B/C：暗棚里的「场」——法拉第（磁铁插入线圈）、麦克斯韦（电容器充放电 → 位移电流）、
   E/B 环的接力，以及 E ⟂ B ⟂ c、同相的横波。单位：米。所有状态由 t 决定。 */
import * as THREE from 'three';
import { V, ss, clamp, lerp, easeIO } from '../../engine/util.js';
import { lathe, mesh, makeMats, wire, sag, bindingPost, screwHead, liveLine, circlePts, lin } from './common.js';
import { PL } from './common.js';

export const COL_E = 0xff9a52, COL_B = 0x86d2ff;

/* ---------- 磁通模型：磁铁 = 两个磁荷（N 在 +x 端），线圈半径 R ---------- */
const solid = (s, R) => (1 - s / Math.hypot(s, R)) / 2;   // 含磁铁内部回流的连续磁通
export function fluxAt(xm, loopX, R = .075, half = .088) { return solid(loopX - (xm + half), R) - solid(loopX - (xm - half), R); }

/* 时间表（章内秒） */
export const MAG = { x0: -1.02, x1: -.63, tIn0: 6.55, tIn1: 7.35, tOut0: 7.85, tOut1: 8.65 };
export const magX = t => lerp(MAG.x0, MAG.x1, easeIO(clamp((t - MAG.tIn0) / (MAG.tIn1 - MAG.tIn0)))) - (MAG.x1 - MAG.x0) * easeIO(clamp((t - MAG.tOut0) / (MAG.tOut1 - MAG.tOut0)));
export const CAP = { c0: 9.75, c1: 10.6, d0: 11.0, d1: 11.85 };
export const capQ = t => easeIO(clamp((t - CAP.c0) / (CAP.c1 - CAP.c0))) - easeIO(clamp((t - CAP.d0) / (CAP.d1 - CAP.d0)));

export async function buildBench(KIT) {
  const s = new THREE.Scene();
  const L = KIT.studio(s, { bg: 0x0a0b0d, floorY: 0, key: 7, keyPos: [.9, 1.9, 1.4], target: [0, .1, 0], fill: .5, fillPos: [-1.4, .8, 1.6], rim: 5, rimPos: [-.6, 1.2, -1.6], env: .22, shadowRadius: 8, size: 14 });
  L.key.angle = Math.PI / 4; L.key.penumbra = 1; L.key.shadow.camera.near = .5; L.key.shadow.camera.far = 6;
  const L2 = new THREE.SpotLight(0xfff0e0, 5, 0, Math.PI / 5, 1, 2); L2.position.set(-.5, 1.6, 1.3); L2.target.position.set(-.6, .1, 0); s.add(L2, L2.target);
  const M = makeMats(KIT);
  const wood = await KIT.pbr('dark_wood', { repeat: .5, physical: true, extra: { clearcoat: .5, clearcoatRoughness: .3 } }); wood.color.setRGB(.8, .55, .42);

  /* ===== 左站：法拉第 · 磁铁与线圈 ===== */
  const LX = -.55, LY = .13, LR = .075;
  const baseL = mesh(KIT.rbox(.16, .024, .09, .004), wood); baseL.position.set(LX, .012, 0); s.add(baseL);
  const loop = mesh(new THREE.TorusGeometry(LR, .0032, 16, 160, Math.PI * 2 - .2), M.copper); loop.rotation.set(0, Math.PI / 2, -Math.PI / 2 + .1); loop.position.set(LX, LY, 0); s.add(loop);
  // 线圈两端引下到接线柱
  const lp = (ang) => V(LX, LY + Math.sin(ang) * LR, Math.cos(ang) * LR);
  for (const [sg, a] of [[-1, -Math.PI / 2 - .1], [1, -Math.PI / 2 + .1]]) {
    const top = lp(a), post = V(LX, .024, sg * .028);
    s.add(wire([top, V(LX, top.y - .02, top.z + sg * .006), V(LX, .05, sg * .024), post.clone().add(V(0, .022, 0))], M.copper, .0026, 40, 10).mesh);
    const bp = bindingPost(M, .026, .0055); bp.position.copy(post); s.add(bp);
  }
  for (const [x, z] of [[-.065, -.035], [.065, -.035], [-.065, .035], [.065, .035]]) { const sc = screwHead(M, .003); sc.position.set(LX + x, .024, z); s.add(sc); }
  // 磁铁：红色 N 端 + 蓝灰 S 端，倒角，压印字母
  const magnet = new THREE.Group(); s.add(magnet);
  const mN = mesh(KIT.rbox(.1, .03, .03, .004, 3), KIT.M.paint(0x8f1d17, { rough: .4, clearcoat: .5, seed: 17 })); mN.position.x = .05; magnet.add(mN);
  const mS = mesh(KIT.rbox(.1, .03, .03, .004, 3), KIT.M.paint(0x2c3a4a, { rough: .45, clearcoat: .4, seed: 19 })); mS.position.x = -.05; magnet.add(mS);
  const letter = (ch) => KIT.canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(240,236,226,.88)'; g.font = '700 92px "Times New Roman", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, w / 2, h / 2 + 4); });
  for (const [ch, x] of [['N', .072], ['S', -.072]]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(.022, .022), new THREE.MeshStandardMaterial({ map: letter(ch), transparent: true, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false })); d.rotation.x = -Math.PI / 2; d.rotation.z = -Math.PI / 2; d.position.set(x, .0151, 0); magnet.add(d); }
  magnet.position.set(MAG.x0, LY, 0);
  // 磁感线（随磁铁移动）：r = L·sin²θ
  const bLines = new THREE.Group(); magnet.add(bLines); const bMat = [];
  for (let ph = 0; ph < 6; ph++) for (const Lk of [.075, .12, .19, .3]) {
    const pts = []; const th0 = Math.asin(Math.sqrt(Math.min(1, .07 / Lk)));
    for (let i = 0; i <= 80; i++) { const th = lerp(th0, Math.PI - th0, i / 80), r = Lk * Math.sin(th) ** 2; const rho = r * Math.sin(th); pts.push(V(r * Math.cos(th), rho * Math.cos(ph / 6 * Math.PI * 2 + .3), rho * Math.sin(ph / 6 * Math.PI * 2 + .3))); }
    const ln = PL(KIT, pts, { width: 1.3, color: COL_B, intensity: .85, opacity: .55, pulse: .9, pulseLen: 3, pulseSpeed: .35 }); bLines.add(ln); bMat.push(ln);
  }
  // 感生电场环（橙）：比线圈略大
  const eRing = PL(KIT, circlePts(V(LX, LY, 0), V(1, 0, 0), LR + .018, 128), { width: 2.4, color: COL_E, intensity: 1, opacity: 0, pulse: 2.2, pulseLen: 9, pulseSpeed: 1 }); s.add(eRing);
  const eRing2 = PL(KIT, circlePts(V(LX, LY, 0), V(1, 0, 0), LR + .036, 128), { width: 1.4, color: COL_E, intensity: .9, opacity: 0, pulse: 2, pulseLen: 12, pulseSpeed: 1 }); s.add(eRing2);

  /* ===== 右站：麦克斯韦 · 电容器 ===== */
  const RX = .55, RY = .13, PR = .056, GAP = .042;
  const baseR = mesh(KIT.rbox(.24, .024, .1, .004), wood); baseR.position.set(RX, .012, 0); s.add(baseR);
  const plateGeo = lathe([[0, 0], [PR - .004, 0], [PR, .0012], [PR, .0038], [PR - .004, .005], [0, .005]], 96);
  const plates = [];
  for (const sg of [-1, 1]) {
    const pl = mesh(plateGeo, M.brassPol); pl.rotation.z = -sg * Math.PI / 2; pl.position.set(RX + sg * (GAP / 2), RY, 0); s.add(pl); plates.push(pl);
    const hub = mesh(new THREE.CylinderGeometry(.009, .011, .016, 32), M.brass); hub.rotation.z = Math.PI / 2; hub.position.set(RX + sg * (GAP / 2 + .012), RY, 0); s.add(hub);
    const stem = mesh(lathe([[.009, 0], [.009, .004], [.0055, .006], [.0055, RY - .03], [.008, RY - .028], [.008, RY - .022], [0, RY - .022]]), M.ebonite); stem.position.set(RX + sg * (GAP / 2 + .012), .024, 0); s.add(stem);
    const collar = mesh(new THREE.CylinderGeometry(.0085, .0085, .012, 24), M.brass); collar.position.set(RX + sg * (GAP / 2 + .012), RY - .012, 0); s.add(collar);
    const arm = V(RX + sg * (GAP / 2 + .02), RY, 0), post = V(RX + sg * .1, .024, .03);
    s.add(wire([arm, V(RX + sg * .045, RY + .01, 0), V(RX + sg * .09, RY - .02, .015), V(RX + sg * .1, .07, .028), post.clone().add(V(0, .02, 0))], M.silk(0x6a2a1c), .0019, 60).mesh);
    const bp = bindingPost(M, .026, .0055); bp.position.copy(post); s.add(bp);
    // 导线继续离开画面（接到电源）
    s.add(wire([post.clone().add(V(0, .01, 0)), V(RX + sg * .13, .006, .05), V(RX + sg * .3, .002, .12), V(RX + sg * .55, .002, .2)], M.silk(0x6a2a1c), .0019, 60).mesh);
  }
  for (const [x, z] of [[-.105, -.038], [.105, -.038], [-.105, .038], [.105, .038]]) { const sc = screwHead(M, .003); sc.position.set(RX + x, .024, z); s.add(sc); }
  // 板间电场箭头（橙）：细杆 + 锥头（实例化）
  const nE = 9, rodG = new THREE.CylinderGeometry(.0011, .0011, 1, 8), coneG = new THREE.ConeGeometry(.0034, .008, 12);
  const eRodMat = new THREE.MeshBasicMaterial({ color: COL_E, transparent: true, opacity: 0, depthWrite: false });
  const eRods = new THREE.InstancedMesh(rodG, eRodMat, nE), eCones = new THREE.InstancedMesh(coneG, eRodMat, nE); s.add(eRods, eCones);
  const capOff = []; for (const y of [-.026, 0, .026]) for (const z of [-.026, 0, .026]) capOff.push([y, z]);
  // 板间（位移电流）与导线（传导电流）周围的磁场环（青）
  const capRings = [.072, .095, .12].map((r, i) => PL(KIT, circlePts(V(RX, RY, 0), V(1, 0, 0), r, 128), { width: i ? 1.4 : 2.2, color: COL_B, intensity: .95, opacity: 0, pulse: 2, pulseLen: 9 + i * 3, pulseSpeed: 1 }));
  capRings.forEach(r => s.add(r));
  const wireRings = [-1, 1].map(sg => PL(KIT, circlePts(V(RX + sg * .045, RY + .006, 0), V(1, 0, 0), .016, 64), { width: 1.4, color: COL_B, intensity: .9, opacity: 0, pulse: 2, pulseLen: 5, pulseSpeed: 1 }));
  wireRings.forEach(r => s.add(r));

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  const qX = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(1, 0, 0));
  const emfF = t => { const h = .01; return -(fluxAt(magX(t + h), LX) - fluxAt(magX(t - h), LX)) / (2 * h); };
  let emfMax = 1e-6; for (let t = 6; t < 9.3; t += .01) emfMax = Math.max(emfMax, Math.abs(emfF(t)));
  return {
    scene: s, emfMax, loopC: V(LX, LY, 0), capC: V(RX, RY, 0), magnet, LX, RX, LY,
    emf: emfF,
    update(t) {
      const xm = magX(t); magnet.position.x = xm;
      const emf = emfF(t), k = clamp(Math.abs(emf) / emfMax * 1.4);
      const ph = -fluxAt(xm, LX) * 3.2;   // 环上流动的相位 = 磁通（电动势的积分）
      eRing.set({ opacity: k, intensity: .7 + .5 * k, time: ph, pulse: 2.2 * k }); eRing2.set({ opacity: k * .6, time: ph * .8, pulse: 2 * k });
      const q = capQ(t), dq = (capQ(t + .01) - capQ(t - .01)) / .02, kb = clamp(Math.abs(dq) / 1.8);
      eRodMat.opacity = .9 * q;
      capOff.forEach(([y, z], i) => { _p.set(RX - .002, RY + y, z); _s.set(1, (GAP - .012) * clamp(q * 1.2), 1); _m.compose(_p, qX, _s); eRods.setMatrixAt(i, _m); _p.set(RX + GAP / 2 - .008, RY + y, z); _s.setScalar(clamp(q * 3)); _m.compose(_p, qX, _s); eCones.setMatrixAt(i, _m); });
      eRods.instanceMatrix.needsUpdate = eCones.instanceMatrix.needsUpdate = true; eRods.visible = eCones.visible = q > .01;
      capRings.forEach((r, i) => r.set({ opacity: kb * (1 - i * .22), time: q * 3.2, pulse: 2 * kb }));
      wireRings.forEach(r => r.set({ opacity: kb * .8, time: q * 3.2, pulse: 2 * kb }));
    },
  };
}

/* ================= 接力与横波（独立暗棚，轴线 y = 0） ================= */
export const WAVE = { lam: 1.0, A: .3, c: .95, x0: -1.65, x1: 2.75, tw: 15.2 };
export async function buildWave(KIT) {
  const s = new THREE.Scene();
  const L = KIT.studio(s, { bg: 0x08090b, floorY: -.75, key: 22, keyPos: [1.5, 3.2, 3.2], target: [.4, -.4, 0], fill: 1, rim: 10, rimPos: [-2, 1.5, -3], env: .18, size: 70 });
  L.key.angle = Math.PI / 4; L.key.penumbra = 1;
  // 接力链：E（xy 平面，橙）与 B（xz 平面，青）交替相扣
  const R = .3, D = .3, links = [];
  for (let k = 0; k < 7; k++) {
    const c = V(-1.0 + k * D, 0, 0), isE = k % 2 === 0;
    const ln = PL(KIT, circlePts(c, isE ? V(0, 0, 1) : V(0, 1, 0), R, 160, Math.PI), { width: 2.4, color: isE ? COL_E : COL_B, intensity: 1, opacity: 0, head: 0, pulse: 1.4, pulseLen: 6, pulseSpeed: .5 });
    s.add(ln); links.push({ ln, c, isE, t0: 12.7 + k * .38 });
  }
  // 坐标轴（白色细线 + 刻度）
  const axis = PL(KIT, [V(WAVE.x0 - .1, 0, 0), V(WAVE.x1 + .12, 0, 0)], { width: 1.3, color: 0xf2f2ee, intensity: .8, opacity: 0 }); s.add(axis);
  const ticks = []; for (let x = -1.5; x <= 2.51; x += .25) { const big = Math.abs((x * 4) % 4) < .01; const tk = PL(KIT, [V(x, -.012 * (big ? 2 : 1), 0), V(x, .012 * (big ? 2 : 1), 0)], { width: 1.1, color: 0xf2f2ee, intensity: .7, opacity: 0 }); s.add(tk); ticks.push(tk); }
  const arrowHead = mesh(new THREE.ConeGeometry(.018, .06, 16), new THREE.MeshBasicMaterial({ color: 0xdedcd6, transparent: true, opacity: 0 }), { cast: false }); arrowHead.rotation.z = -Math.PI / 2; arrowHead.position.set(WAVE.x1 + .15, 0, 0); s.add(arrowHead);
  const triad = [V(0, 1, 0), V(0, 0, 1)].map((d, i) => PL(KIT, [V(WAVE.x0, 0, 0), V(WAVE.x0, 0, 0).addScaledVector(d, .42)], { width: 1.2, color: i ? COL_B : COL_E, intensity: .8, opacity: 0, dash: 22 }));
  triad.forEach(x => s.add(x));
  // 波形曲线
  const N = 260, eL = liveLine(KIT, N, { width: 2.6, color: COL_E, intensity: 1.05, opacity: 0 }), bL = liveLine(KIT, N, { width: 2.6, color: COL_B, intensity: 1.05, opacity: 0 }); s.add(eL, bL);
  // 场矢量：细杆 + 锥头
  const NR = 36, rodG = new THREE.CylinderGeometry(.0028, .0028, 1, 8), coneG = new THREE.ConeGeometry(.009, .024, 12);
  const mE = new THREE.MeshBasicMaterial({ color: COL_E, transparent: true, opacity: 0, depthWrite: false }), mB = new THREE.MeshBasicMaterial({ color: COL_B, transparent: true, opacity: 0, depthWrite: false });
  const rE = new THREE.InstancedMesh(rodG, mE, NR), rB = new THREE.InstancedMesh(rodG, mB, NR), cE = new THREE.InstancedMesh(coneG, mE, NR), cB = new THREE.InstancedMesh(coneG, mB, NR);
  [rE, rB, cE, cB].forEach(m => { m.frustumCulled = false; s.add(m); });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = V(), _s = V(), up = V(0, 1, 0), dn = V(0, -1, 0), zp = V(0, 0, 1), zn = V(0, 0, -1);
  const st = { lam: WAVE.lam };
  // 相位 = k(t)·(x − XC) − Φ(t) + k0·(XC − x0)；Φ = ∫ k·c dt（λ 变短时频率升高、波速不变，画面中心不「扫」）
  const XC = .4, k0 = Math.PI * 2 / WAVE.lam, TL = 22.9;
  const lamAt = t => lerp(WAVE.lam, .32, easeIO(clamp((t - TL) / 1.6)));
  const Phi = t => { let v = k0 * (Math.min(t, TL) - WAVE.tw); if (t > TL) { const n = 48, h = (t - TL) / n; for (let i = 0; i < n; i++) v += Math.PI * 2 / lamAt(TL + (i + .5) * h) * h; } return v * WAVE.c; };
  const phase = (x, t) => Math.PI * 2 / lamAt(t) * (x - XC) - Phi(t) + k0 * (XC - WAVE.x0);
  const field = (x, t, ph0 = null) => { const front = WAVE.x0 + (t - WAVE.tw) * WAVE.c * 1.6; const env = ss(front, front - .35, x); return WAVE.A * Math.sin(phase(x, t)) * env; };
  return {
    scene: s, links, R, field, st,
    lamAt,
    crest(t, near = .6) { const lam = lamAt(t), k = Math.PI * 2 / lam; let x = XC + (Math.PI / 2 + Phi(t) - k0 * (XC - WAVE.x0)) / k; x = x - Math.round((x - near) / lam) * lam; return x; },
    update(t) {
      // 接力链：依次画出，之后渐隐
      const fadeChain = 1 - ss(15.0, 15.9, t);
      links.forEach(L => { const p = easeIO(clamp((t - L.t0) / .55)); const glow = 1 - .55 * ss(L.t0 + .5, L.t0 + 1.2, t); L.ln.set({ head: p, opacity: (p > 0 ? .95 : 0) * fadeChain * glow, time: t, intensity: .85 + .35 * (1 - ss(L.t0 + .3, L.t0 + .9, t)) }); });
      const wa = ss(15.0, 15.7, t);
      axis.set({ opacity: .55 * wa }); ticks.forEach(k => k.set({ opacity: .5 * wa })); arrowHead.material.opacity = .6 * wa; triad.forEach(x => x.set({ opacity: .8 * ss(15.6, 16.2, t) }));
      const P0 = Phi(t), lam = lamAt(t), kk = Math.PI * 2 / lam, front = WAVE.x0 + (t - WAVE.tw) * WAVE.c * 1.6;
      const fld = x => WAVE.A * Math.sin(kk * (x - XC) - P0 + k0 * (XC - WAVE.x0)) * ss(front, front - .35, x);
      eL.set({ opacity: wa }); bL.set({ opacity: wa });
      eL.setPoints((i, u, o) => { const x = lerp(WAVE.x0, WAVE.x1, u); return o.set(x, fld(x), 0); });
      bL.setPoints((i, u, o) => { const x = lerp(WAVE.x0, WAVE.x1, u); return o.set(x, 0, fld(x)); });
      mE.opacity = mB.opacity = .55 * wa;
      for (let i = 0; i < NR; i++) {
        const x = lerp(WAVE.x0 + .06, WAVE.x1 - .06, i / (NR - 1)), f = fld(x), a = Math.abs(f), sg = f >= 0;
        const len = Math.max(.0001, a - .02);
        _p.set(x, (sg ? 1 : -1) * len / 2, 0); _q.setFromUnitVectors(up, sg ? up : dn); _s.set(1, len, 1); _m.compose(_p, _q, _s); rE.setMatrixAt(i, _m);
        _p.set(x, (sg ? 1 : -1) * (a - .012), 0); _s.setScalar(a > .03 ? 1 : 0); _m.compose(_p, _q, _s); cE.setMatrixAt(i, _m);
        _p.set(x, 0, (sg ? 1 : -1) * len / 2); _q.setFromUnitVectors(up, sg ? zp : zn); _s.set(1, len, 1); _m.compose(_p, _q, _s); rB.setMatrixAt(i, _m);
        _p.set(x, 0, (sg ? 1 : -1) * (a - .012)); _s.setScalar(a > .03 ? 1 : 0); _m.compose(_p, _q, _s); cB.setMatrixAt(i, _m);
      }
      [rE, rB, cE, cB].forEach(m => { m.instanceMatrix.needsUpdate = true; m.visible = wa > .01; });
    },
  };
}
