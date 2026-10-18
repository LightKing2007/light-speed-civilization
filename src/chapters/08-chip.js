/* 08 · 硅上的城市 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '08', status: 'placeholder', slug: 'chip', title: '硅上的城市', dur: 52,
  card: {"title": "硅上的城市", "short": "硅上的城市", "meta": "1958 — 2024"},
  stamps: [[0, "1958"], [18.8, "1971"], [31.4, "2024"]],
  caps: [[0.4, 6.6, "1958 年基尔比把多个元件做进一块锗片，1959 年诺伊斯又把连线也做在硅片上——集成电路诞生了。"], [7.0, 12.8, "方法很像洗印照片：紫外光经过掩模，把电路图形缩小投射到涂着光刻胶的硅片上，"], [13.2, 18.4, "再经过刻蚀、掺杂、沉积，一层层「印」出成千上万个晶体管。"], [18.8, 24.6, "1971 年，英特尔 4004 把 2300 个晶体管装进指甲盖大小的芯片——第一款商用微处理器。"], [25.0, 31.0, "1965 年，摩尔预言芯片上的元件每年翻一番，十年后改为每两年——此后半个世纪大致如此。"], [31.4, 37.4, "2024 年，一颗双硅片 AI 芯片共有 2080 亿个晶体管，约是 4004 的九千万倍。"], [37.8, 44.0, "如今最精细的结构只有几十个原子宽，比大多数病毒还要小得多。"], [44.4, 51.6, "当年塞满一个房间的计算能力，如今被压缩进你的掌心，还快了上亿倍。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
