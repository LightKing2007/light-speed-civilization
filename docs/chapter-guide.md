# 章节开发指南（给每一章的实现者）

本片 = 16 个章节文件 `src/chapters/NN-slug.js`，由 `src/engine/` 的引擎按顺序拼接播放/导出。
**你只负责自己那一章**：只改 `src/chapters/NN-slug.js`，需要拆分的辅助代码放进 `src/props/NN/`（自己建）。
**不要改** `src/engine/*`、别的章节、`docs/script.md`。引擎有缺陷或你需要新能力 → 先在本章内部绕过，并在最终报告里写明「引擎需求」。

---

## 1. 质量标准（用户原话的要求）

1. **写实风格**，告别旧版「黑底 + 霓虹点线」的同质化。PBR 材质 + HDRI/影棚布光 + 真实阴影与接触阴影；物体有倒角、厚度、磨损、真实比例（用米为单位建模，相机焦距/景深按真实摄影思路）。
2. **建模更精致**：主角道具（电键、感应线圈、真空管、晶体管、芯片封装、海缆截面、手机、基站、NeXT 电脑、卫星……）要有足够细节：倒角（`KIT.rbox`、`LatheGeometry`、`TubeGeometry`、`ExtrudeGeometry` 带 bevel）、螺丝、接线柱、刻字、线材、标签贴纸。能用真实 3D 模型（`assets/models/**`）就用。
3. **真实素材优先**：历史人物/现场用真实照片（`assets/photos/**`，看 `manifest.json` 里的说明与授权）；地球用 NASA 贴图（引擎已封装）；海缆用 TeleGeography 真实路由；卫星用 CelesTrak 真实轨道根数；数字用脚本里核查过的数据。
4. **节奏快但讲清楚**：平均镜头 3–7 秒，画面里每一刻都要有「正在发生的事」；原理用动画讲（因果关系可视化），标注要和字幕同步出现。字幕之间不留空档。
5. **辉光克制、高质量**：只有真正很亮的东西发光（火花、灯丝、激光、太阳、城市灯光）。不要用加法混合的大光斑；`emissive` 强度 > 1 才进辉光；默认辉光参数已经调好（阈值 1.0、强度 0.12、扩散 0.62），一般不要调大。
6. **机能风**用在合适的地方：原理讲解、数据、示意图 → 白色细线标注、刻度、编号、读数；历史现场/照片 → 更克制，以署名条为主。不要每一帧都堆满 HUD。
7. **转场有理由**：匹配剪辑、连续运镜、焦点虚化、卡在重拍上的硬切。禁止径向变焦模糊之类的花招。

## 2. 章节文件结构

```js
import * as THREE from 'three';
import { V, ss, win, lerp, clamp, easeIO, easeOut, prog, camPath, applyCam, ll, Path, rng, hash, noise1 } from '../engine/util.js';
import { ink } from '../engine/hud.js';        // Canvas2D 机能风绘图小工具（draw2d 里用）

export default {
  id: '05', slug: 'eniac', title: '钢铁之躯', dur: 46,          // dur 以脚本为准
  card: { act: '第二部', actName: '计算', title: '钢铁之躯', short: '钢铁之躯', meta: 'ENIAC · 1943 — 1946 · 费城' },  // 已在占位文件里给好，保持不变
  stamps: [[0, '1946']],                                         // 角标年份：[章内秒, 文本]，按剪辑直接切换
  caps: [[0.4, 6.8, '……'], ...],                                 // 字幕：照抄 docs/script.md（已核查），时间可 ±1 s 微调
  credits: ['assets/photos/act2/eniac_jennings_bilas.jpg', ...], // 本章用到的所有外部素材文件
  async build(ctx) { ... },                                      // 建场景、登记镜头/标注/音效
};
```

占位文件里已经有 `id/slug/title/dur/card/stamps/caps`，**保留这些字段**，把 `build` 换成你的实现，并补上 `credits`。

**`status` 字段**：占位文件是 `status: 'placeholder'`（画面右上角带「占位」标记，正式导出默认拒绝）。实现完成、覆盖全部字幕时段后改成 `'implemented'`，并同步更新 `docs/progress.md` 的总表与本章记录（`npm test` 会检查两者一致）。`'reviewed'` / `'deliverable'` 只在按 progress.md 的清单验收后再改。

## 3. ctx 接口

| 接口 | 说明 |
|---|---|
| `ctx.shot({ t0, in, scene, camera, post, update, name })` | 登记一个镜头。`t0` 为章内开始秒；结束时间自动 = 下一个镜头开始 + 其转场时长。`in = { type, dur, params, ease }` 为进入本镜头的转场：`cut` `dissolve` `dip`（经黑）`blur`（焦点虚化溶解，params:[强度≈5]）`wipe`（params:[角度弧度, 软边0.1–0.2, 边缘亮线0–0.5]）`luma`（按亮度溶解）`flash`（params:[强度]，经白，仅限火花/闪光母题）。**本章第一个镜头的 `in` 就是与上一章之间的转场**（见第 7 节衔接表）。`update(t, st)`：t = 章内秒，st = 镜头内秒；**必须是 t 的纯函数**。 |
| `ctx.clip({ chapter, at, t0, in, rate })` | 引用别的章节在 `at` 秒处的画面（仅尾声用）。 |
| `ctx.shot({ ..., offline: true, t0, t1 })` | 「仅供引用」的镜头：不进本章时间线，只能被尾声的 `ctx.clip({chapter, at})` 引用（at 落在 t0..t1 内）。第 00 章用它提供尾声需要的「上海手机收到回复」画面。 |
| `ctx.callout({ shot, at, title, sub, code, t0, t1, side, dx, dy, style, occlude })` | 机能风引线标注。`at` = 世界坐标 `Vector3` 或 `t => Vector3`；`side` 'left'/'right'/'auto'；`dx,dy` 标签相对锚点的像素偏移（1080p）；`style` ''/'accent'/'warn'；`occlude(camPos, p)` 返回 true 时隐藏（地球用 `E.occlude`）。 |
| `ctx.bracket({ shot, box: Box3 | t=>Box3, rect:[x0,y0,x1,y1], label, t0, t1, style })` | 角标框住一个物体。 |
| `ctx.measure({ shot, a, b, label, t0, t1, off })` | 尺寸标注线（两端刻度 + 数值）。 |
| `ctx.readout({ x, y, align, cls, html: t => string, t0, t1 })` | 屏幕固定位置的读数/计时器（舞台像素 1920×1080）。`cls`: ''/'big'/'timer'；可用 `<span class="k">灰</span><span class="a">橙</span><span class="w">红</span>`。 |
| `ctx.draw2d({ shot?, t0, t1, draw(g, t, alpha, project) })` | 每帧在 1920×1080 的 Canvas2D 上自由绘制（示波器、坐标图、原理示意、表格）。`project(Vector3)` → 舞台像素（需传 shot）。配合 `ink.*` 工具保持统一风格。 |
| `ctx.stat({ t0, t1, fmt: (p, t) => string, unit, label, src, dur, side })` | 右侧大数字（p 为 0→1 的计数进度）。一次只显示一个。 |
| `ctx.lower({ t0, t1, name, meta, credit })` | 人物/照片署名条（左下）。真实照片必须配署名条或在 credit 里写来源与授权。 |
| `ctx.cue(t, name, ...args)` | 音效（章内秒）。可用：`spark(v)` `click(v)` `clack(v)` `relay(v)` `morse(pattern,'f',unit,v)` `beep(f,d,v)` `blip(f,v)` `tick(v)` `chime(f,v)` `ding(v)` `tap(v)` `whoosh(d,v)` `swoosh(v)` `riser(d,v)` `sub(v)` `boom(v)` `glitch(v)`。配乐由引擎统一处理。 |
| `ctx.dom(id, t0, t1)` | 显示页面里固定的 DOM 块：`'title'`（片名）、`'endcard'`（片尾）。 |
| `ctx.earth(opts)` | 写实地球，见第 5 节。 |
| `ctx.KIT` / `ctx.A` / `ctx.grade` | 工具包 / 资源加载 / 调色预设。 |

### post（镜头后期参数，均可省略）
```js
post: {
  exposure: 1,                                   // 曝光
  bloom: { strength: .12, threshold: 1, knee: .5, scatter: .62, levels: 6 },  // 辉光：一般不动
  ao: true | { radius: .5, intensity: 1 },       // GTAO 环境光遮蔽（影棚/室内建议开）
  dof: { focus: 米, aperture: .015, maxBlur: 14 }, // 景深：focus = 对焦距离（相机到主体，世界单位）
  grade: ctx.grade.warm | cool | archival | sepia | space | night | studio | {lift,gamma,gain,contrast,saturation,tint,mode},
  vignette: .28, grain: .028, ca: .0007,         // 暗角 / 胶片颗粒 / 色差（很小）
  flicker: 0, weave: 0,                          // 老胶片闪烁与抖动（档案照片可用 .03 / .6）
  tonemap: true,                                 // 真实照片镜头设为 false（不压色调）
}
```

## 4. KIT 工具包（`ctx.KIT`，源码 `src/engine/kit.js`）

- 环境与布光：`KIT.studio(scene, {key, fill, rim, keyPos, rimPos, fillPos, target, floorY, bg, env})` 暗色无缝影棚（弧形背景 + 带软阴影的主光）；`KIT.hdri(scene, KIT.hdriFile('vintage_measuring_lab'), {intensity, rotation, background, bgBlur, bgIntensity})`；`KIT.roomEnv(scene, k)`；`KIT.shadowCatcher()`；`KIT.cyclorama()`。
- 材质 `KIT.M.*`：`brass oldBrass copper gold steel aluminium chrome iron`（金属，带磨损粗糙度）、`paint(color) plastic(color) rubber ceramic glass({thickness, ior, tint}) emissive(color, k) silicon pcb`；`await KIT.pbr('dark_wood', {repeat})` 读取 `assets/tex/<id>/` 的 Poly Haven 贴图组。程序化：`KIT.grunge(seed)`、`KIT.brushed()`、`KIT.canvasTex(w,h,draw)`（手机屏幕、纸张、网页、标签）。
- 照片：`await KIT.photoShot(file, {from:{x,y,s}, to:{x,y,s}, fit:'cover'|'contain'})` → `{scene, camera, update(u01)}`（全屏照片慢推拉，镜头里调 `ph.update(st / 镜头时长)`；post 用 `tonemap:false` + `grade: ctx.grade.archival` 等）。`KIT.photoPrint(tex, {width})` 把照片做成实体相纸放进 3D 场景。
- 线与点：`KIT.pathLine(points, {width(px), color, opacity, intensity, head, tail, pulse, pulseSpeed, pulseLen, dash, additive, glowHead})` 屏幕等宽线（「画出」动画：每帧 `line.set({ head: x, time: t })`）；`KIT.points(Float32Array, {size(px), color, opacity, intensity, additive, atten, sizes, colors, alphas})` 柔边粒子。
- 模型：`await KIT.model('assets/models/polyhaven/xxx/xxx.gltf', {size})`；`KIT.rbox(w,h,d,r)` 圆角盒；`KIT.cam(fov)`、`KIT.fovFromMM(mm)`。
- 光照单位：three r186 物理光。`SpotLight/PointLight` 强度是坎德拉（距离 3–6 m 时常用 30–300），`DirectionalLight` 1–5；`scene.environmentIntensity` 0.2–1。渲染目标是线性 HDR，经 AgX 色调映射，亮度 > 1 的像素才会产生辉光。

## 5. 写实地球（`const E = await ctx.earth({ quality:'8k'|'4k', clouds, night, nightIntensity, sunIntensity, cloudOpacity })`）

- 单位 1 = 1000 km，`E.R = 6.371`。`scene.add(E.group); await E.addStars(scene, .25)`；每帧 `E.update(t, camera)`。
- 太阳：`E.setSunFromUTC(Date.UTC(...))`（真实日照）或 `E.setSun(dir)`；逆光镜头可加 `E.sunDisc(scene)`。
- 坐标：`E.ll(lat, lon, alt)` → 世界坐标；`import { ll } from util` 是同一套映射（地心在原点）。
- 线：`E.path([[lat,lon],...], {...pathLine 参数, alt})`、`E.arc(a, b, {h})`、`await E.cables(feature => bool, {width, color, opacity, colorFn})` 读 TeleGeography 真实海缆（`feature.properties.id/name`）。
- 标注被地球挡住时隐藏：`ctx.callout({ ..., occlude: E.occlude })`。
- 已调好的观感：白天像 NASA「蓝色弹珠」，夜面城市灯光，晨昏线柔和，边缘有蓝色大气。曝光 `post.exposure` 1–1.3 之间按镜头微调。

## 6. 构图与安全区（1920×1080 舞台坐标）

- 字幕在底部（约 y 880–1010），**主体不要放在画面下 1/5**；左下 y≈700–850 是署名条位置；右侧中部是大数字（stat）位置；左上是角标；章节开头约 0.2–3.6 秒左侧中部有章节卡（此时画面左 40% 保持简洁）。
- 标注文字字号已固定（25px 标题 / 15px 等宽副标题），不要往标注里塞长句；一个画面同时最多 3–4 个标注。
- 竖直视角 25–45° 为宜；微距用 30–40° + 景深；不要用超广角变形。

## 7. 章与章的衔接（每章**第一个镜头**的 in 转场；上一章的**最后一个镜头**要为它准备好画面）

| 边界 | 第一个镜头 in | 匹配要点 |
|---|---|---|
| 00→01 | blur 1.4 [5] | 00 末尾：片名后镜头推向手机的天线/「电波」标注 → 01 开头：电键特写（同为「发送信号的开关」），构图都把主体放在画面中心偏右。 |
| 01→02 | luma 1.2 | 01 末尾：地球大西洋 + 对比条 → 02 开头：麦克斯韦肖像（暗背景，亮度溶解）。 |
| 02→03 | dissolve 1.0 | 02 末尾：拉远的火花实验台 → 03 开头：马可尼照片。 |
| 03→04 | dissolve 1.0 | **匹配剪辑**：03 末尾 = 一条横穿画面中心、从左向右移动的摩尔斯纸带（纸带水平居中，宽约占画面高度的 12%）→ 04 开头 = 同样构图的纸带，上面出现方格。 |
| 04→05 | dip 0.8 | 04 末尾纸带停下变暗 → 05 开头 ENIAC 档案照片。 |
| 05→06 | blur 1.0 | — |
| 06→07 | dissolve 1.0 | — |
| 07→08 | dissolve 1.2 | 07 末尾：晶体管缩小成画面中心的一点 → 08 开头：基尔比芯片照片/晶圆。 |
| 08→09 | wipe 1.2 [0, .14, .35] | 第二部→第三部：从左到右的扫描式擦除。 |
| 09→10 | dissolve 1.0 | — |
| 10→11 | blur 1.0 | — |
| 11→12 | dissolve 1.0 | — |
| 12→13 | wipe 1.0 [0, .14, .3] | — |
| 13→14 | dissolve 1.4 | 13 末尾：城市/基站拉高到夜空 → 14 开头：夜半球地球。 |
| 14→15 | dissolve 1.0 | 尾声用 clip 引用前面各章画面。 |

章内转场你自己定：大多用 `cut`（卡在字幕/音效节点上）与 `dissolve 0.6–1.0`，偶尔 `blur`。

## 8. 资源

- `assets/index.json` 是全部文件列表（构建时自动生成）。各目录的 `manifest.json` 写了每个文件的内容、授权、署名方式与使用建议——**先读它**，挑最合适的。
- `assets/photos/act1|act2|act3/`、`assets/hdri/`（.hdr）、`assets/tex/<id>/`（PBR 贴图组）、`assets/models/polyhaven/<id>/`（glTF）、`assets/models/other/`、`assets/earth/`、`assets/data/telegeography|celestrak|naturalearth|moore|worldbank/`。
- 用了哪个文件就写进本章 `credits` 数组；照片署名条的 credit 写「照片：作者/机构 · 授权」。
- 不要下载新东西；确实缺关键素材，在最终报告里列出。

## 9. 自检流程（必须做）

```bash
node tools/spot.mjs --only 05 --every 1 --sheet          # 每秒一帧 + 拼图 _shots/05/sheet.jpg
node tools/spot.mjs --only 05 --times 12.3,12.6,13 --debug  # 指定时间点；--debug 在右上角显示时间与镜头名
node tools/spot.mjs --only 04,05 --times 35.5,36,36.5     # 同时载入相邻章节，检查衔接（时间是两章拼接后的全局秒）
```
- 用 Read 工具看截图（先看 sheet，再看关键帧原图）。逐条对照：写实度、细节、构图与安全区、字幕与画面是否同步、标注是否清楚不拥挤、辉光是否克制、有无穿模/闪烁/锯齿/黑屏、转场是否自然。
- 控制台报错必须为零（spot 会打印 CONSOLE，有 ERRORS / FAILED ASSETS 时退出码为 1）。资源 404 要修。
- **素材加载失败不能只靠 `.catch()` 吞掉**：预览里可以降级显示，但正式导出（`npm run render`）会因为素材失败而中止。模型文件名注意大小写（Linux 区分大小写）。
- 用 `npm run render -- --only NN` 正式导出本章短片，确认能通过（镜头 `update` 或 `draw2d` 抛出的错误会让导出停在出错的那一帧并报出镜头名与时间）。
- 单帧渲染保持流畅：避免上百万三角形、每帧重建几何体、每帧 new 大量对象；粒子 < 20 万。
- 所有动画是 t 的纯函数：不用 `Math.random()`/`Date.now()` 驱动画面（build 时可用 `rng(seed)`）。
- 至少迭代 3 轮「渲染 → 看图 → 改」，直到你自己觉得能拿去给挑剔的导演看。

## 10. 最终报告（你的最后一条消息）

简要说明：每个镜头做了什么、用了哪些真实素材、你认为还不够好的地方、「引擎需求」（如有）、sheet 拼图路径。
