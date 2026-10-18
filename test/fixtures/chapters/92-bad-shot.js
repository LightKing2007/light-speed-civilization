/* 故障演练（不进正片）：镜头更新在 1.2 秒后出错。正式导出应在出错的那一帧停下，并报出章节、镜头与时间。 */
import * as THREE from 'three';
export default {
  id: '92', slug: 'bad-shot', title: '故障：镜头出错', dur: 2, card: null, stamps: [], caps: [[0, 2, '故障演练：镜头出错']],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), KIT.M.steel()); scene.add(box);
    const camera = KIT.cam(30); camera.position.set(3, 2, 4); camera.lookAt(0, 0, 0);
    ctx.shot({ t0: 0, scene, camera, name: '92.旋转', update(t) { if (t > 1.2) throw new Error('故意的错误：rotation 读取了未定义的对象'); box.rotation.y = t; } });
  },
};
