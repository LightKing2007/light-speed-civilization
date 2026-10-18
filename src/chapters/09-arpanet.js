/* 09 · 第一句话 —— 占位章节（待实现）。规格见 docs/script.md 与 docs/chapter-guide.md。 */
import * as THREE from 'three';

export default {
  id: '09', status: 'placeholder', slug: 'arpanet', title: '第一句话', dur: 46,
  card: {"act": "第三部", "actName": "网络", "title": "第一句话", "short": "第一句话", "meta": "ARPANET · 1969"},
  stamps: [[0, "1969"]],
  caps: [[0.4, 6.0, "计算机越来越多，却彼此孤立。1969 年，美国国防部资助的 ARPANET 开始把各地的大学和研究所连起来。"], [6.4, 12.4, "那年 10 月 29 日晚，UCLA 的学生向 500 多公里外的斯坦福研究所发送「LOGIN」。"], [12.8, 18.4, "刚传出「L」和「O」，系统就崩溃了。网络说出的第一句话，是「LO」。"], [18.8, 24.0, "大约一小时后，连接修好，完整的「LOGIN」终于送达。"], [24.4, 30.4, "电话网靠「电路交换」：通话期间，一条端到端的通路被一对用户独占，哪怕没人说话。"], [30.8, 37.0, "ARPANET 改用「分组交换」：数据被切成小包，每个包写上地址和序号，各自寻路。"], [37.4, 43.4, "某条线路断了，包会绕道而行；到了终点，再按序号重新拼合。"], [43.8, 45.8, "网络，开始生长。"]],
  async build(ctx) {
    const { KIT } = ctx;
    const scene = new THREE.Scene(); KIT.studio(scene, { floorY: -1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), KIT.M.steel()); ball.castShadow = true; scene.add(ball);
    const camera = KIT.cam(30);
    ctx.shot({ t0: 0, in: { type: 'dissolve', dur: .8 }, scene, camera, update(t) { camera.position.set(Math.sin(t * .2) * 6, 1.5, Math.cos(t * .2) * 6); camera.lookAt(0, 0, 0); } });
  },
};
