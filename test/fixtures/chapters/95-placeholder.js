/* 故障演练（不进正片）：占位章节。正式导出默认拒绝；加 --draft 时允许（画面带「占位」标记）。 */
import * as THREE from 'three';
export default {
  id: '95', status: 'placeholder', slug: 'placeholder', title: '占位章节', dur: 2, card: null, stamps: [], caps: [],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), KIT.M.steel()));
    const camera = KIT.cam(30); camera.position.set(3, 2, 4); camera.lookAt(0, 0, 0);
    ctx.shot({ t0: 0, scene, camera });
  },
};
