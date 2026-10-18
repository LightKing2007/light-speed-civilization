/* 故障演练（不进正片）：修好之后的正常章节，正式导出应当通过。 */
import * as THREE from 'three';
export default {
  id: '94', slug: 'ok', title: '正常章节', dur: 2, card: null, stamps: [], caps: [[0, 2, '故障演练：修复后正常导出']],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), KIT.M.steel()); scene.add(box);
    const camera = KIT.cam(30); camera.position.set(3, 2, 4); camera.lookAt(0, 0, 0);
    ctx.shot({ t0: 0, scene, camera, update(t) { box.rotation.y = t; } });
  },
};
