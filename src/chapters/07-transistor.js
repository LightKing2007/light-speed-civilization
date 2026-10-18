/* 07 · 晶体管 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '07', slug: 'transistor', title: '晶体管', dur: 44,
  card: {"title": "晶体管", "short": "晶体管", "meta": "1947 · 贝尔实验室"},
  stamps: [[0, "1947"], [13.6, "1959"]],
  caps: [[0.4, 6.6, "真空管太大、太热、太容易坏。1947 年底，贝尔实验室造出了第一只晶体管。"], [7.0, 13.2, "它只用一小块锗晶体就能放大信号：没有灯丝，不用预热，体积小、耗电少。"], [13.6, 19.6, "今天芯片里的晶体管叫 MOSFET。纯硅几乎不导电，掺入百万分之一的杂质，导电性就能提高上百万倍。"], [20.0, 26.0, "给栅极加上正电压，电场把电子吸到氧化层下方，形成一条导电的「沟道」，"], [26.4, 31.4, "电子便从源极流向漏极；撤掉电压，沟道消失，开关断开。"], [31.8, 37.4, "它不靠加热、也不需要真空，开关一次只需不到十亿分之一秒。"], [37.8, 43.6, "更重要的是：它可以越做越小。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
