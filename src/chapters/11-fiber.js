/* 11 · 海底之光 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '11', status: 'placeholder', slug: 'fiber', title: '海底之光', dur: 52,
  card: {"title": "海底之光", "short": "海底之光", "meta": "光纤与海缆 · 1988 — 2026"},
  stamps: [[0, "1988"], [38.8, "2026"]],
  caps: [[0.4, 6.4, "电信号在铜线里衰减得太快。光纤把信号换成光，在和头发丝差不多粗的玻璃丝里传输。"], [6.8, 13.0, "纤芯的折射率比外面的包层略高，光几乎贴着边界掠过时，会被全部反射回来，一路折返向前。"], [13.4, 19.6, "再让几十种波长略有不同的红外光共用一根纤芯，各载一路信号，容量就成倍增长。"], [20.0, 26.0, "跨洋光缆其实只有水管粗细：中心是几对到十几对光纤，外面是钢丝、铜管和聚乙烯护套。"], [26.4, 32.0, "铜管给沿途的海底中继器供电，每隔几十公里，就把变弱的光重新放大一次。"], [32.4, 38.4, "1988 年，第一条跨大西洋光缆 TAT-8 投入使用，可同时承载约四万路电话。"], [38.8, 45.0, "如今，六百多条海底光缆纵横洋底，总长超过一百五十万公里。"], [45.4, 51.6, "你发出的跨洋数据，绝大多数不经过卫星，而是沿着这些海底的玻璃丝，以每秒约二十万公里飞驰。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
