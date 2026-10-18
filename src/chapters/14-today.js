/* 14 · 今天（2026）
   A  夜里的地球（NASA 夜光 + 大气）上空，16 754 颗真实在轨卫星（CelesTrak，2026-10-18 01:42 UTC 推算）沿各自轨道运行（时间加速 60 倍）；
      一颗星链 V2 Mini 从镜头前掠过（为看清形状，模型放大约 1 000 倍）
   B  地球缓转：约 60 亿人在线 → 约 22 亿人尚未接入（标出撒哈拉以南非洲与南亚）
   C  镜头转向晨昏线，太阳从地球边缘升起
   卫星位置在顶点着色器里算（src/props/14/orbit.js）。所有动画都是 t 的纯函数。
   数量核对：CelesTrak active 16 754 颗、其中星链 11 151 颗（2026-10-17 下载，见 assets/data/celestrak/summary_2026-10-18.json）；
            J. McDowell 统计在轨工作卫星 16 988 颗、星链 11 140 颗（2026-10-12）。两者口径不同，画面上两个都写明。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { satellites, starlinkV2Mini } from '../props/14/orbit.js';

const SPEED = 60, T0 = Date.UTC(2026, 9, 18, 1, 42);
const FLY0 = 2.2, FLY1 = 6.6, SAT_SCALE = 1e-6 * 1000;      // 场景 1 单位 = 1000 km，模型 1 单位 = 1 m → 真实比例 ×1e-6，再放大 1 000 倍

export default {
  id: '14', status: 'implemented', slug: 'today', title: '今天', dur: 40,
  card: {"title": "今天", "short": "今天", "meta": "2026"},
  stamps: [[0, "2026"]],
  caps: [[0.4, 6.6, "今天，近地轨道上运行着上万颗卫星，把信号送到海洋、沙漠和高山。"], [7.0, 13.4, "地面与海底，数千万公里的光缆彼此交织；空中，基站与卫星昼夜不停地收发电波。"], [13.8, 20.0, "约 60 亿人连在同一张网上——差不多是全人类的四分之三。"], [20.4, 27.0, "但仍有约 22 亿人没有用上互联网，其中 96% 生活在中低收入国家。"], [27.4, 33.6, "这场跑了一百六十年的接力，还远没有跑完。"]],
  credits: ['assets/data/celestrak/sats_T0.json', 'assets/data/worldbank/wb_internet_users_pct_WLD.json', 'assets/earth/earth_day_8k.jpg', 'assets/earth/earth_clouds_8k.jpg', 'assets/earth/earth_lights_8k.jpg', 'assets/earth/earth_normal_4k.png', 'assets/earth/stars_8k.jpg'],
  async build(ctx) {
    const { KIT, A } = ctx;
    const sE = new THREE.Scene();
    const E = await ctx.earth({ quality: '8k', nightIntensity: 2.6, cloudOpacity: .6 }); sE.add(E.group); await E.addStars(sE, .22);
    E.setSunFromUTC(T0);
    const SAT = await satellites(A, { size: 2.2 }); sE.add(SAT.points); SAT.material.uniforms.uSun.value.copy(E.sun);
    const wb = await A.json('assets/data/worldbank/wb_internet_users_pct_WLD.json'), wbRow = wb[1].find(r => r.value != null), wbPct = wbRow.value.toFixed(1), wbYear = wbRow.date;
    // 星链 V2 Mini（从镜头前掠过）+ 照亮它的阳光与一点地球反照
    const sat = starlinkV2Mini(KIT); sat.scale.setScalar(SAT_SCALE); sE.add(sat);
    const sunL = new THREE.DirectionalLight(0xfff4e6, 3.2); sunL.position.copy(E.sun).multiplyScalar(50); sE.add(sunL); sE.add(sunL.target);
    const earthL = new THREE.HemisphereLight(0x8fa8d8, 0x4a3a2a, 1.4); sE.add(earthL);
    const camFill = new THREE.PointLight(0xdfe8ff, 0, 0, 0); sE.add(camFill);   // 跟着镜头的柔光，让掠过的卫星看得清形状（夜侧本该是剪影）
    const disc = E.sunDisc(sE, { k: 40, size: 2.6 });
    const LL = (a, b, h = 0) => E.ll(a, b, h);
    const setSky = (t, cam, flyK = 0) => { E.update(t, cam); SAT.material.uniforms.uTau.value = t * SPEED; sat.visible = flyK > 0; };

    /* ================= A · 轨道 ================= */
    const camA = KIT.cam(34, .002, 500);
    const pA = camPath([[0, LL(22, -96, 13).toArray(), LL(30, -92).toArray(), 34], [13.8, LL(18, -78, 11.5).toArray(), LL(28, -80).toArray(), 34]]);
    const shA = ctx.shot({ name: '14.A 轨道', t0: 0, in: { type: 'dissolve', dur: 1.2 }, scene: sE, camera: camA,
      post: { exposure: 1.15, grade: ctx.grade.space, vignette: .28, grain: .02, bloom: { strength: .22 } },
      update(t) {
        applyCam(camA, pA(t), t, 0); const fk = t > FLY0 && t < FLY1 ? 1 : 0; setSky(t, camA, fk); camFill.intensity = 0;
        if (fk) { // 在镜头前方约 150 km 处，从右下掠向左上，机身慢慢翻转
          const u = (t - FLY0) / (FLY1 - FLY0), f = V(0, 0, -1).applyQuaternion(camA.quaternion), r = V(1, 0, 0).applyQuaternion(camA.quaternion), up = V(0, 1, 0).applyQuaternion(camA.quaternion);
          sat.position.copy(camA.position).add(f.multiplyScalar(.085)).add(r.multiplyScalar(lerp(.06, -.065, u))).add(up.multiplyScalar(lerp(-.028, .02, u)));
          sat.quaternion.copy(camA.quaternion); sat.rotateX(.95 - .3 * u); sat.rotateZ(.15 - .12 * u); sat.rotateY(.2);
          camFill.position.copy(camA.position); camFill.intensity = .9;
        }
      } });
    ctx.draw2d({ shot: shA, t0: 7.4, t1: 13.8, draw(g, t) {
      const x = 1290, y = 140;
      g.fillStyle = 'rgba(6,10,16,.78)'; g.fillRect(x - 24, y - 40, 560, 214); ink.corners(g, x - 24, y - 40, 560, 214, 12, ink.dim);
      ink.text(g, 'IN ORBIT · 在轨工作卫星', x, y - 8, { font: ink.mono(16), color: ink.dim });
      ink.text(g, '约 1.7 万颗', x, y + 50, { font: ink.cond(56, 600), color: ink.accent });
      ink.text(g, '其中星链约 1.1 万颗', x + 290, y + 46, { font: ink.sans(21, 600) });
      ink.text(g, 'J. McDowell：16 988 / 11 140（2026-10-12）', x, y + 96, { font: ink.mono(15), color: ink.dim });
      ink.text(g, `CelesTrak：${SAT.count.toLocaleString('en').replace(/,/g, ' ')} / ${SAT.byGroup[1].toLocaleString('en').replace(/,/g, ' ')}（2026-10-17）`, x, y + 122, { font: ink.mono(15), color: ink.dim });
      ink.text(g, '画面中的点 = 真实轨道推算 · 时间加速 60 倍', x, y + 152, { font: ink.sans(15), color: ink.dim });
    } });
    ctx.readout({ x: 64, y: 110, t0: FLY0 + .4, t1: FLY1, html: '<span class="a">星链 V2 Mini</span> · 翼展约 30 m <span class="k">（模型已放大，便于看清）</span>' });

    /* ================= B · 连接的人 ================= */
    const camB = KIT.cam(34, .002, 500);
    const pB = camPath([[13.8, LL(18, -78, 11.5).toArray(), LL(28, -80).toArray(), 34], [20.4, LL(12, -35, 10.5).toArray(), LL(18, -30).toArray(), 34], [27.4, LL(6, 12, 10).toArray(), LL(12, 18).toArray(), 34]]);
    const shB = ctx.shot({ name: '14.B 连接的人', t0: 13.8, in: { type: 'cut' }, scene: sE, camera: camB,
      post: { exposure: 1.15, grade: ctx.grade.space, vignette: .28, grain: .02, bloom: { strength: .22 } },
      update(t) { applyCam(camB, pB(t), t, 0); setSky(t, camB); SAT.material.uniforms.uOp.value = 1 - .5 * ss(14, 16, t); } });
    ctx.stat({ t0: 14.2, t1: 20.2, fmt: p => (60 * p).toFixed(0), unit: '亿人在线', label: `约占全人类的四分之三（世界银行：${wbYear} 年 ${wbPct}%）`, src: '数据：ITU《Facts and Figures 2025》· 世界银行', dur: 1.4 });
    ctx.stat({ t0: 20.6, t1: 27.2, fmt: p => (22 * p).toFixed(0), unit: '亿人尚未上网', label: '其中 96% 生活在中低收入国家', src: '数据：ITU《Facts and Figures 2025》', dur: 1.2 });
    ctx.callout({ shot: shB, at: () => LL(2, 22, .01), title: '撒哈拉以南非洲', sub: '多数人还没有上网', t0: 21.6, t1: 27.2, side: 'left', dx: -150, dy: 110, style: 'accent', occlude: E.occlude });
    ctx.callout({ shot: shB, at: () => LL(22, 78, .01), title: '南亚', sub: '仍有数亿人未接入', t0: 22.4, t1: 27.2, side: 'right', dx: 120, dy: -90, occlude: E.occlude });

    /* ================= C · 日出 ================= */
    const camC = KIT.cam(36, .002, 800);
    const pC = camPath([[27.4, LL(14, 14, 1.7).toArray(), LL(10, 62, 0).toArray(), 36], [40.6, LL(16, 31, 1.6).toArray(), LL(12, 78, .4).toArray(), 36]]);
    ctx.shot({ name: '14.C 日出', t0: 27.4, in: { type: 'dissolve', dur: 1.0 }, scene: sE, camera: camC,
      post: { exposure: 1.15, grade: ctx.grade.space, vignette: .3, grain: .02, bloom: { strength: .45, radius: .8 } },
      update(t) { applyCam(camC, pC(t), t, 0); setSky(t, camC); SAT.material.uniforms.uOp.value = .6; disc.userData.update && disc.userData.update(); } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(FLY0 + .2, 'whoosh', 2.4, .22); ctx.cue(7.4, 'blip', 900, .05);
    ctx.cue(14.2, 'chime', 660, .06); ctx.cue(20.6, 'sub', .2); ctx.cue(27.4, 'riser', 8.0, .1); ctx.cue(35.4, 'chime', 880, .07);
  },
};
