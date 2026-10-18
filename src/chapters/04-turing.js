/* 04 · 纸带上的机器 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '04', slug: 'turing', title: '纸带上的机器', dur: 36,
  card: {"act": "第二部", "actName": "计算", "title": "纸带上的机器", "short": "纸带上的机器", "meta": "1936 · 剑桥"},
  stamps: [[0, "1936"]],
  caps: [[0.4, 6.0, "1936 年，年仅 23 岁的英国数学家图灵，构想出一台极简的机器。"], [6.4, 12.6, "一条无限长的纸带，一个读写头，一张规则表：按当前状态和读到的符号，改写一格、移动一格、切换状态。"], [13.0, 19.6, "比如给二进制数加一：从末位开始，遇到 1 写 0、向左进位；遇到 0 写 1，就此停下。"], [20.0, 26.2, "图灵进一步证明：把另一台机器的规则也写到纸带上，一台「通用机器」就能模仿它。"], [26.6, 32.2, "图灵认为：凡是能一步步算出来的问题，都能这样算。今天的每一台计算机，本质上都是这样的通用机器。"], [32.6, 35.8, "但在当时，它只存在于纸上。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
