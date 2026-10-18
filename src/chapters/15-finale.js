/* 15 · 尾声 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '15', slug: 'finale', title: '尾声', dur: 34,
  card: null,
  stamps: [],
  caps: [[0.4, 6.8, "从一道跳过空气的电火花，到环绕地球的光；"], [7.2, 13.4, "从一屋子的真空管，到掌心里上百亿个开关。"], [14.0, 20.4, "每一条消息，都乘着一百六十年的接力抵达。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
