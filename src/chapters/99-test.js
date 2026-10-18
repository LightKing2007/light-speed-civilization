/* 引擎自检章节（不进正片）：地球 + 真实海缆、档案照片、影棚玻璃与灯丝辉光 + 景深、日出逆光。 */
import * as THREE from 'three';
import { V, camPath, applyCam, ss, Path, surfacePath } from '../engine/util.js';

export default {
  id: '99', slug: 'test', title: '引擎自检', dur: 28,
  card: { title: '引擎自检', meta: 'ENGINE TEST' }, stamps: [[0, '2026']],
  caps: [[1, 6, '测试：写实地球、真实海缆路由、标注线与计时器。'], [8.5, 13, '测试：档案照片的慢推与署名条。'], [14.5, 19.5, '测试：玻璃透射、灯丝辉光与景深。'], [21, 27, '测试：日出逆光与大气散射。']],
  async build(ctx) {
    const { KIT, A } = ctx;
    // A: earth
    const sa = new THREE.Scene(); const E = await ctx.earth({ quality: '8k' }); sa.add(E.group); await E.addStars(sa, .25);
    E.setSunFromUTC(Date.UTC(2026, 9, 18, 1, 42));
    const ncp = await E.cables(f => f.properties.id === 'new-cross-pacific-ncp-cable-system', { width: 2.2, color: 0xffd6a0, intensity: 1.6 });
    const all = await E.cables(f => f.properties.id !== 'new-cross-pacific-ncp-cable-system', { width: 1, color: 0x8fc8ff, opacity: .35 });
    const ca = KIT.cam(30, .01, 2000);
    const pathA = camPath([[0, [5, 12, 22], [0, 2.2, 0], 30], [8, [-2, 9, 21], [0, 3, 0], 26]]);
    ctx.shot({ t0: 0, scene: sa, camera: ca, post: { exposure: 1.1, bloom: { strength: .2 } }, update(t) { applyCam(ca, pathA(t)); E.update(t, ca); ncp.lines.forEach(l => l.mesh.set({ head: ss(1, 5, t) })); } });
    ctx.callout({ shot: ctx.chapter.shots[0], at: () => E.ll(40.71, -74.0), title: '纽约', sub: '40.71°N 74.01°W · 21:42', t0: 1.2, t1: 8.5 });
    ctx.callout({ shot: ctx.chapter.shots[0], at: () => E.ll(31.23, 121.47), title: '上海', sub: '31.23°N 121.47°E · 09:42', t0: 2, t1: 8.5, style: 'accent' });
    ctx.readout({ x: 1780, y: 120, align: 'right', cls: 'timer', t0: 1, t1: 8.5, html: t => `T + ${Math.round(ss(1, 7, t) * 97)} ms` });
    // B: photo
    const ph = await KIT.photoShot('assets/photos/act2/eniac_jennings_bilas.jpg', { from: { x: -.3, y: 0, s: 1.05 }, to: { x: .2, y: -.1, s: 1.2 } });
    ctx.shot({ t0: 8, in: { type: 'dissolve', dur: 1 }, scene: ph.scene, camera: ph.camera, post: { tonemap: false, grade: ctx.grade.archival, grain: .05, vignette: .4, weave: .6, flicker: .03 }, update(t, st) { ph.update(st / 7); } });
    ctx.lower({ t0: 9, t1: 13.6, name: 'ENIAC', meta: '宾夕法尼亚大学 · 1946', credit: '照片：美国陆军 · 公有领域' });
    // C: studio glass + filament
    const sc = new THREE.Scene(); KIT.studio(sc, { key: 60, rim: 120, floorY: 0 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 2.2, 96, 1, false), KIT.M.glass({ thickness: .05 })); glass.position.y = 1.15; sc.add(glass);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.55, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), KIT.M.glass({ thickness: .05 })); dome.position.y = 2.25; sc.add(dome);
    const fil = new THREE.Mesh(new THREE.TorusGeometry(.12, .012, 12, 64), KIT.M.emissive(0xff9a4a, 14)); fil.position.y = 1.2; sc.add(fil);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, 1.2, 64, 1, true), KIT.M.iron({ rough: .5 })); plate.position.y = 1.2; plate.material.side = THREE.DoubleSide; sc.add(plate);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.58, .62, .3, 96), KIT.M.plastic(0x1a1410)); base.position.y = .15; base.castShadow = true; sc.add(base);
    const cc = KIT.cam(32);
    const pathC = camPath([[14, [2.6, 1.8, 3.6], [0, 1.2, 0], 32], [21, [1.6, 1.4, 2.9], [0, 1.2, 0], 30]]);
    ctx.shot({ t0: 14, in: { type: 'blur', dur: 1, params: [6] }, scene: sc, camera: cc, post: { exposure: 1, bloom: { strength: .18, scatter: .55 }, dof: { focus: 3.4, aperture: .02, maxBlur: 10 }, ao: true }, update(t) { applyCam(cc, pathC(t), t, .002); } });
    ctx.measure({ shot: ctx.chapter.shots[2], a: V(.62, 0, .3), b: V(.62, 2.8, .3), label: '≈ 7 cm', t0: 15, t1: 20 });
    ctx.bracket({ shot: ctx.chapter.shots[2], box: new THREE.Box3(V(-.15, 1.05, -.15), V(.15, 1.35, .15)), label: 'FIL-01', t0: 16, t1: 20 });
    ctx.callout({ shot: ctx.chapter.shots[2], at: V(0, 1.2, .12), title: '灯丝', sub: '约 1000 °C · 热电子发射', t0: 16.2, t1: 20, dx: 160, dy: -90 });
    // D: sunrise
    const sd = new THREE.Scene(); const E2 = await ctx.earth({ quality: '4k' }); sd.add(E2.group); await E2.addStars(sd, .2);
    const cd = KIT.cam(28, .01, 3000); const sunD = V(-1, .05, -.25).normalize(); E2.setSun(sunD); const disc = E2.sunDisc(sd, { k: 40, size: 2.4 });
    ctx.shot({ t0: 20, in: { type: 'wipe', dur: 1.2, params: [0, .15, .4] }, scene: sd, camera: cd, post: { exposure: 1.2, bloom: { strength: .25, scatter: .65 } }, update(t) { const u = ss(20, 28, t); cd.position.set(4 + u, 1.2, 9.6); cd.lookAt(-30, 0.4 + u * .3, -12); E2.update(t, cd); disc.userData.update(); } });
    ctx.cue(1, 'whoosh', 1.2); ctx.cue(14.5, 'spark', .8);
  },
};
