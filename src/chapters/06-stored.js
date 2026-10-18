/* 06 · 存储程序 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '06', slug: 'stored', title: '存储程序', dur: 38,
  card: {"title": "存储程序", "short": "存储程序", "meta": "1945 — 1949"},
  stamps: [[0, "1945"], [32, "1948"]],
  caps: [[0.4, 6.2, "1945 年，冯·诺依曼执笔的 EDVAC 报告，写下了关键的一笔："], [6.6, 12.4, "把程序也变成数字，和数据一起，存进同一个存储器。"], [12.8, 18.8, "换一道题，不必再重新接线——只要往存储器里写入新的指令。"], [19.2, 25.4, "处理器周而复始地做四件事：取出指令、译码、执行、写回结果。"], [25.8, 31.6, "这个节拍，至今仍在你手机的芯片里重复，每秒几十亿次。"], [32.0, 37.6, "1948 年 6 月，英国曼彻斯特的「宝宝」，在世界上第一次运行了存放在内存里的程序。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
