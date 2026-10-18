/* 故障演练（不进正片）：素材缺失。章节自己吞掉了错误继续运行（预览里能看到画面），正式导出必须拦下。 */
import * as THREE from 'three';
export default {
  id: '91', slug: 'missing-asset', title: '故障：素材缺失', dur: 2, card: null, stamps: [], caps: [[0, 2, '故障演练：素材缺失']],
  async build(ctx) {
    const { KIT, A } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const map = await A.tex('assets/__faultcheck__/missing.jpg').catch(() => null);
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map, color: 0x888888 })));
    const camera = KIT.cam(30); camera.position.set(3, 2, 4); camera.lookAt(0, 0, 0);
    ctx.shot({ t0: 0, scene, camera });
  },
};
