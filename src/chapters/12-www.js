/* 12 · 万维网 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '12', status: 'placeholder', slug: 'www', title: '万维网', dur: 42,
  card: {"title": "万维网", "short": "万维网", "meta": "CERN · 1989 — 1993"},
  stamps: [[0, "1989"], [32.4, "1993"]],
  caps: [[0.4, 6.6, "1989 年，CERN 的蒂姆·伯纳斯-李交上一份提案，上司在封面批了一句：「含糊，但令人兴奋。」"], [7.0, 13.0, "他在一台 NeXT 电脑上，写出了第一个网站、第一个浏览器和第一个网页服务器程序。"], [13.4, 19.6, "网址说明文件在哪台机器、哪个位置；浏览器先把域名翻译成 IP 地址，"], [20.0, 26.0, "再用 HTTP 发出请求；服务器送回用 HTML 写成的页面，浏览器把它排版显示。"], [26.4, 32.0, "页面里的超链接指向别的网址——轻轻一点，就跳到世界另一端的文档。"], [32.4, 38.0, "1993 年 4 月，CERN 宣布这项技术免费向所有人开放。"], [38.4, 41.8, "网站从一个，增长到今天的近十五亿个。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
