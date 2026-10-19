/* 14 · 今天（2026）
   A  夜里的地球（NASA 夜光 + 大气）上空，16 754 颗真实在轨卫星（CelesTrak，2026-10-18 01:42 UTC 推算）沿各自轨道运行（时间加速 60 倍）；
      一颗星链 V2 Mini 从镜头前掠过（为看清形状，模型放大约 1 000 倍）
   B  地球缓转：约 60 亿人在线 → 约 22 亿人尚未接入（标出撒哈拉以南非洲与南亚）
   C  镜头转向晨昏线，太阳从地球边缘升起
   卫星位置在顶点着色器里算（src/props/14/orbit.js）。所有动画都是 t 的纯函数。
   数量核对：CelesTrak active 16 754 颗、其中星链 11 151 颗（2026-10-17 下载，见 assets/data/celestrak/summary_2026-10-18.json）；
            J. McDowell 统计在轨工作卫星 16 988 颗、星链 11 140 颗（2026-10-12）。两者口径不同，画面上只写两者共同的「约 1.7 万颗」（星链占比属于细节，可读性精修时从画面上拿掉）。
   可读性精修：每个镜头同一时刻最多 2 个引线标注 + 1 个信息面板；每条标注完整停留 ≥ 3.5 秒、相邻标注错开 ≥ 0.8 秒；
   面板底色不透明度 .86，主要文字 ≥ 24 px、次要 ≥ 20 px、数字 ≥ 30 px；只说「看哪个部件 / 正在发生什么」，不重复字幕。
   B 拆成两段：B1 留在美洲上空（灯光 = 在线的人），B2 换到能同时看清非洲和南亚的角度，并叠一层淡淡的海岸线（夜面原本全黑，看不出是哪块大陆）。 */
import * as THREE from 'three';
import { V, ss, lerp, clamp, easeIO, camPath, applyCam } from '../engine/util.js';
import { ink } from '../engine/hud.js';
import { satellites, starlinkV2Mini } from '../props/14/orbit.js';
/* 屏幕文字的统一样式 */
const TXT = 'rgba(246,246,242,.97)', TXT2 = 'rgba(238,238,232,.9)';
const panelBox = (g, x, y, w, h) => { g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, 'rgba(235,235,230,.22)', 1); };

const SPEED = 60, T0 = Date.UTC(2026, 9, 18, 1, 42);
const FLY0 = 2.0, FLY1 = 7.0, SAT_SCALE = 1e-6 * 1000;      // 场景 1 单位 = 1000 km，模型 1 单位 = 1 m → 真实比例 ×1e-6，再放大 1 000 倍

export default {
  id: '14', status: 'implemented', slug: 'today', title: '今天', dur: 40,
  card: {"title": "今天", "short": "今天", "meta": "2026"},
  stamps: [[0, "2026"]],
  caps: [[0.4, 6.6, "今天，近地轨道上运行着上万颗卫星，把信号送到海洋、沙漠和高山。"], [7.0, 13.4, "地面与海底，数千万公里的光缆彼此交织；空中，基站与卫星昼夜不停地收发电波。"], [13.8, 20.0, "约 60 亿人连在同一张网上——差不多是全人类的四分之三。"], [20.4, 27.0, "但仍有约 22 亿人没有用上互联网，其中 96% 生活在中低收入国家。"], [27.4, 33.6, "这场跑了一百六十年的接力，还远没有跑完。"]],
  credits: ['assets/data/celestrak/sats_T0.json', 'assets/data/naturalearth/ne_110m_land.geojson', 'assets/earth/earth_day_8k.jpg', 'assets/earth/earth_clouds_8k.jpg', 'assets/earth/earth_lights_8k.jpg', 'assets/earth/earth_normal_4k.png', 'assets/earth/stars_8k.jpg'],
  async build(ctx) {
    const { KIT, A } = ctx;
    const sE = new THREE.Scene();
    const E = await ctx.earth({ quality: '8k', nightIntensity: 2.6, cloudOpacity: .6 }); sE.add(E.group); await E.addStars(sE, .22);
    E.setSunFromUTC(T0);
    const SAT = await satellites(A, { size: 2.2 }); sE.add(SAT.points); SAT.material.uniforms.uSun.value.copy(E.sun);
    // 海岸线（Natural Earth 1:110m 陆地）：只在 B2 淡淡地显示，让夜面上的非洲、南亚看得出轮廓
    const land = await A.json('assets/data/naturalearth/ne_110m_land.geojson'), coast = [];
    for (const f of land.features) for (const ring of [f.geometry.coordinates[0]]) if (ring.length >= 10) coast.push(E.path(ring.map(c => [c[1], c[0]]), { width: 1.6, color: 0xd6e4ff, opacity: 0, alt: .015, maxDeg: 1 }));
    const setCoast = k => { for (const m of coast) { m.visible = k > .002; m.material.uniforms.uOp.value = .34 * k; } };
    // 星链 V2 Mini（从镜头前掠过）+ 照亮它的阳光与一点地球反照
    const sat = starlinkV2Mini(KIT); sat.scale.setScalar(SAT_SCALE); sE.add(sat);
    const sunL = new THREE.DirectionalLight(0xfff4e6, 3.2); sunL.position.copy(E.sun).multiplyScalar(50); sE.add(sunL); sE.add(sunL.target);
    const earthL = new THREE.HemisphereLight(0x8fa8d8, 0x4a3a2a, 1.4); sE.add(earthL);
    const camFill = new THREE.PointLight(0xdfe8ff, 0, 0, 0); sE.add(camFill);   // 跟着镜头的柔光，让掠过的卫星看得清形状（夜侧本该是剪影）
    const disc = E.sunDisc(sE, { k: 40, size: 2.6 });
    const LL = (a, b, h = 0) => E.ll(a, b, h);
    const setSky = (t, cam, flyK = 0, coastK = 0) => { E.update(t, cam); SAT.material.uniforms.uTau.value = t * SPEED; sat.visible = flyK > 0; setCoast(coastK); };

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
          camFill.position.copy(camA.position); camFill.intensity = 2.2;
        }
      } });
    // 右上角信息面板：先说掠过的是什么（2.5–6.6），再说满天的光点是什么（7.0–13.8）。与卫星掠过的对角线错开。
    ctx.draw2d({ shot: shA, t0: 2.5, t1: 6.6, draw(g) {
      const Wd = 400, X = 1920 - 64 - Wd, Y = 104;
      panelBox(g, X, Y, Wd, 118);
      ink.text(g, '星链卫星', X + 22, Y + 50, { font: ink.sans(30, 600), color: ink.accent });
      ink.text(g, '翼展约 30 米 · 模型已放大', X + 22, Y + 94, { font: ink.sans(22), color: TXT2 });
    } });
    ctx.draw2d({ shot: shA, t0: 7.0, t1: 13.8, draw(g) {
      const Wd = 420, X = 1920 - 64 - Wd, Y = 104, pad = 22;
      panelBox(g, X, Y, Wd, 196);
      ink.text(g, '每个光点是一颗卫星', X + pad, Y + 48, { font: ink.sans(28, 600), color: TXT });
      ink.text(g, '约 1.7 万颗', X + pad, Y + 122, { font: ink.cond(62, 600), color: ink.accent });
      ink.text(g, '真实轨道 · 时间加速 60 倍', X + pad, Y + 170, { font: ink.sans(22), color: TXT2 });
    } });

    /* ================= B1 · 连接的人（美洲上空：灯光 = 在线的人） ================= */
    const camB = KIT.cam(34, .002, 500);
    const pB = camPath([[13.8, LL(18, -78, 11.5).toArray(), LL(28, -80).toArray(), 34], [21.2, LL(12, -70, 14).toArray(), LL(18, -66).toArray(), 34]]);
    ctx.shot({ name: '14.B1 连接的人', t0: 13.8, in: { type: 'cut' }, scene: sE, camera: camB,
      post: { exposure: 1.2, grade: ctx.grade.space, vignette: .28, grain: .02, bloom: { strength: .22 } },
      update(t) { applyCam(camB, pB(t), t, 0); setSky(t, camB); SAT.material.uniforms.uOp.value = 1 - .5 * ss(14, 16, t); } });
    // 大数字只留数字本身（「四分之三」字幕已经说了）
    ctx.stat({ t0: 14.2, t1: 20.2, fmt: p => (60 * p).toFixed(0), unit: '亿人在线', label: '', dur: 1.4 });

    /* ================= B2 · 还没上网的人（非洲与南亚同框，缓慢东移） ================= */
    const camB2 = KIT.cam(34, .002, 500);
    const pB2 = camPath([[20.4, LL(-4, 38, 14).toArray(), LL(0, 47).toArray(), 34], [28.4, LL(-3, 46, 14).toArray(), LL(1, 55).toArray(), 34]]);   // 地球偏左，右侧留给大数字
    const shB2 = ctx.shot({ name: '14.B2 还没上网的人', t0: 20.4, in: { type: 'dissolve', dur: .8 }, scene: sE, camera: camB2,
      post: { exposure: 1.2, grade: ctx.grade.space, vignette: .28, grain: .02, bloom: { strength: .22 } },
      update(t) { applyCam(camB2, pB2(t), t, 0); setSky(t, camB2, 0, ss(20.5, 21.3, t)); SAT.material.uniforms.uOp.value = .5; } });
    ctx.stat({ t0: 20.6, t1: 27.2, fmt: p => (22 * p).toFixed(0), unit: '亿人尚未上网', label: '', dur: 1.2 });
    ctx.callout({ shot: shB2, at: () => LL(2, 22, .01), title: '撒哈拉以南非洲', sub: '多数人还没有上网', t0: 21.4, t1: 27.2, side: 'left', dx: -150, dy: 120, style: 'accent', occlude: E.occlude });
    ctx.callout({ shot: shB2, at: () => LL(22, 78, .01), title: '南亚', sub: '仍有数亿人未接入', t0: 22.3, t1: 27.2, side: 'right', dx: 120, dy: -100, occlude: E.occlude });

    /* ================= C · 日出 ================= */
    const camC = KIT.cam(36, .002, 800);
    const pC = camPath([[27.4, LL(14, 14, 1.7).toArray(), LL(10, 62, 0).toArray(), 36], [40.6, LL(16, 31, 1.6).toArray(), LL(12, 78, .4).toArray(), 36]]);
    // 夜面很暗：前半段曝光提高，太阳升起前（33–36.5 s）降回，免得日出过曝
    const shC = ctx.shot({ name: '14.C 日出', t0: 27.4, in: { type: 'dissolve', dur: 1.0 }, scene: sE, camera: camC,
      post: { exposure: 1.55, grade: ctx.grade.space, vignette: .3, grain: .02, bloom: { strength: .45, radius: .8 } },
      update(t) { applyCam(camC, pC(t), t, 0); setSky(t, camC); shC.post.exposure = lerp(1.55, 1.2, ss(33, 36.5, t)); SAT.material.uniforms.uOp.value = .6; disc.userData.update && disc.userData.update(); } });

    /* ================= 音效 ================= */
    ctx.cue(.3, 'sub', .3); ctx.cue(FLY0 + .2, 'whoosh', 2.4, .22); ctx.cue(7.0, 'blip', 900, .05);
    ctx.cue(14.2, 'chime', 660, .06); ctx.cue(20.6, 'sub', .2); ctx.cue(27.4, 'riser', 8.0, .1); ctx.cue(35.4, 'chime', 880, .07);
  },
};
