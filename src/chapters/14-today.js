/* 14 · 今天 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '14', status: 'placeholder', slug: 'today', title: '今天', dur: 40,
  card: {"title": "今天", "short": "今天", "meta": "2026"},
  stamps: [[0, "2026"]],
  caps: [[0.4, 6.6, "今天，近地轨道上运行着上万颗卫星，把信号送到海洋、沙漠和高山。"], [7.0, 13.4, "地面与海底，数千万公里的光缆彼此交织；空中，基站与卫星昼夜不停地收发电波。"], [13.8, 20.0, "约 60 亿人连在同一张网上——差不多是全人类的四分之三。"], [20.4, 27.0, "但仍有约 22 亿人没有用上互联网，其中 96% 生活在中低收入国家。"], [27.4, 33.6, "这场跑了一百六十年的接力，还远没有跑完。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
