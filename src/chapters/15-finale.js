/* 15 · 尾声
   A  回顾蒙太奇：直接引用前面各章的镜头（ctx.clip，不带它们的字幕和标注），每段约 1.15 秒：
      电键 → 赫兹火花 → 风筝天线 → 纸带 → 真空管灯丝 → 晶体管 → 芯片 → LO → 光纤 → 网页 → 5G 波束 → 卫星
   B  回到开头上海的那部手机：妈妈回复「好，照顾好自己。」（引用第 00 章的离线镜头 300–312，画面里自带回程计时器）
   C  片尾：渐暗，片名「光速文明」与来源（#endcard）
   被引用的章节必须同时载入（预览时用 --only 00,01,…,15，或直接预览全片）；缺了会报错，不会静默变黑。 */
import * as THREE from 'three';

const MONTAGE = [['01', 1.4, '电键'], ['02', 29.4, '赫兹火花'], ['03', 14.6, '风筝天线'], ['04', 9.0, '纸带'], ['05', 15.2, '真空管灯丝'], ['07', 8.8, '晶体管'], ['08', 23.0, '芯片'], ['09', 14.6, 'LO'], ['11', 10.8, '光纤'], ['12', 11.2, '网页'], ['13', 36.0, '5G 波束'], ['14', 9.0, '卫星']];
const STEP = 1.15, REPLY0 = 13.8, END0 = 24.0;

export default {
  id: '15', status: 'implemented', slug: 'finale', title: '尾声', dur: 34,
  card: null,
  stamps: [],
  caps: [[0.4, 6.8, "从一道跳过空气的电火花，到环绕地球的光；"], [7.2, 13.4, "从一屋子的真空管，到掌心里上百亿个开关。"], [14.0, 20.4, "每一条消息，都乘着一百六十年的接力抵达。"]],
  credits: [],   // 全部画面引用自前面各章
  async build(ctx) {
    MONTAGE.forEach(([chapter, at, name], i) => ctx.clip({ name: `15.A ${name}`, chapter, at, t0: i * STEP, in: i === 0 ? { type: 'dissolve', dur: 1.0 } : { type: 'dissolve', dur: .18 } }));
    ctx.clip({ name: '15.B 回复', chapter: '00', at: 300.4, t0: REPLY0, in: { type: 'blur', dur: 1.0, params: [6] } });
    // 片尾：一个空的黑场，片名卡在上面淡入
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
    const camera = ctx.KIT.cam(30);
    ctx.shot({ name: '15.C 片尾', t0: END0, in: { type: 'dissolve', dur: 1.6 }, scene, camera, post: { exposure: 1, vignette: 0, bloom: { strength: 0 } } });
    ctx.dom('endcard', END0 + .8, 34.2, 1.2);
    MONTAGE.forEach((m, i) => { if (i) ctx.cue(i * STEP, 'tick', .5); });
    ctx.cue(.2, 'sub', .25); ctx.cue(REPLY0 + .2, 'swoosh', .25); ctx.cue(END0 + .8, 'chime', 660, .08);
  },
};
