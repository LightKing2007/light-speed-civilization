/* 10 · 通用语言 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '10', slug: 'tcpip', title: '通用语言', dur: 44,
  card: {"title": "通用语言", "short": "通用语言", "meta": "TCP/IP · 1974 — 1983"},
  stamps: [[0, "1974"], [38.4, "1983"]],
  caps: [[0.4, 6.4, "70 年代，无线电分组网、卫星网也纷纷出现，可它们彼此「语言」不通。"], [6.8, 12.6, "1974 年，瑟夫和卡恩提出 TCP——后来拆分成 TCP/IP，让任何网络都能互联。"], [13.0, 19.0, "数据每往下交一层，就套上一层「信封」：TCP 写上端口和序号，IP 写上收发地址。"], [19.4, 25.4, "沿途的路由器只拆到 IP 这一层：看一眼目的地址，查表，转发出去。"], [25.8, 31.6, "如果某个包在途中丢失，收不到确认的 TCP 会自动重发——可靠，就是这样「补」出来的。"], [32.0, 38.0, "分层的好处是：底层换成光纤、Wi-Fi 还是 5G，上层的程序都不必改变。"], [38.4, 43.8, "1983 年 1 月 1 日，ARPANET 正式切换到 TCP/IP。许多人把这一天看作互联网的生日。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
