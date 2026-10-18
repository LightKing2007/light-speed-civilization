/* 地球外观调参用（不进正片） */
import * as THREE from 'three';
import { V, ll } from '../engine/util.js';
export default {
  id: '98', slug: 'earthtest', title: '地球调参', dur: 16, card: null, stamps: [], caps: [],
  async build(ctx) {
    const { KIT } = ctx;
    const views = [
      { name: 'day full', cam: () => ll(20, -40, 22), look: V(0, 0, 0), fov: 32, sun: ll(10, -30, 1) },
      { name: 'terminator', cam: () => ll(25, -40, 18), look: V(0, 0, 0), fov: 34, sun: ll(5, 20, 1) },
      { name: 'close atlantic', cam: () => ll(38, -40, 7.9), look: ll(48, -30, 6.371), fov: 40, sun: ll(15, -35, 1) },
      { name: 'night limb', cam: () => ll(30, -100, 9.2), look: ll(45, -85, 6.371), fov: 45, sun: ll(-5, 110, 1) },
    ];
    for (let i = 0; i < views.length; i++) {
      const v = views[i], s = new THREE.Scene(), E = await ctx.earth({ quality: '8k' }); s.add(E.group); await E.addStars(s, .2); E.setSun(v.sun);
      const c = KIT.cam(v.fov, .01, 3000);
      ctx.shot({ t0: i * 4, scene: s, camera: c, update(t) { c.position.copy(v.cam()); c.lookAt(v.look); E.update(t, c); } });
    }
  },
};
