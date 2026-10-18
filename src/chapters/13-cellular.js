/* 13 · 口袋里的电波 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '13', status: 'placeholder', slug: 'cellular', title: '口袋里的电波', dur: 46,
  card: {"title": "口袋里的电波", "short": "口袋里的电波", "meta": "蜂窝网络 · 1979 — 2019"},
  stamps: [[0, "1979"], [38.8, "2019"]],
  caps: [[0.4, 6.4, "电波也在走进口袋。早在 1979 年，东京就开通了第一代商用蜂窝网络——起初装在汽车里。"], [6.8, 13.0, "频谱有限，怎样让成千上万人同时通话？办法是把城市切成许多「蜂窝」小区："], [13.4, 19.4, "每个小区一座基站，用较低的功率只覆盖一小片；相隔足够远的小区，可以重复使用同一段频率。"], [19.8, 25.4, "你移动时，通话会被无缝交给下一座基站——这叫「切换」。"], [25.8, 32.0, "从模拟到数字，每一代都在榨取频谱：把更多比特编进电波的振幅和相位里；"], [32.4, 38.4, "再用上百个天线单元组成阵列，把波束精确地对准每一部手机。"], [38.8, 45.6, "从 2G 的每秒 9.6 千比特，到 5G 标准峰值的每秒 20 吉比特，不到三十年，无线速率提升了约两百万倍。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
