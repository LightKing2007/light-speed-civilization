# 光速文明

一部写实风格的连续科普影片：从电报、麦克斯韦与赫兹的电磁波、马可尼的无线电，到图灵、ENIAC、晶体管与芯片，再到 ARPANET、TCP/IP、海底光缆、万维网、蜂窝通信和今天的卫星互联网。全部画面由 three.js 实时渲染（PBR 材质、HDRI 布光、真实照片与数据），可以在浏览器里播放，也可以逐帧导出成视频。

> **当前状态：制作中，还不是成片。** 时间轴共 16 章、合计 **11 分 58 秒**；其中 00–05 章（除 04 外）有具体实现，04 章已在本次实现，06–15 章仍是**占位画面**（右上角带黄色「占位」标记）。
> 「有实现」不等于「已完成」——每章的状态、待办、已知问题和验收记录见 **[docs/progress.md](docs/progress.md)**。

本项目是第二版（v2）。根目录下还留着第一版的脚本，**不要按第一版的教程操作**（见文末「旧版文件」）。

## 准备

- **Node.js 20 或更新**（开发时用的是 22）与 npm。
- **Chrome / Chromium**：截图、检查和导出都用无头浏览器。
  - macOS：自动使用 `/Applications/Google Chrome.app`（Metal GPU，速度快）。
  - 其他系统：使用 Playwright 自带的 Chromium；没有 GPU 时会自动回退到软件渲染（很慢，但结果正确）。
  - 也可以用环境变量 `CHROME_PATH` 指定浏览器。
- 安装依赖（严格按 `package-lock.json`，不要手动装其他版本）：

```bash
npm ci
```

会装上：three 0.186.1、esbuild 0.28.2、playwright-core 1.56.1、ffmpeg-static 5.3.0（自带 ffmpeg）、satellite.js 7.1.0。不需要 Python，也不需要单独安装 ffmpeg。

## 推荐流程（唯一）

| 步骤 | 命令 | 结果 |
|---|---|---|
| 1. 构建 | `npm run build` | 生成 `index.html` + `dist/film.js`（全部章节）。开发单章：`node tools/build.mjs --dev 04,05` → `dist/dev-04,05.html` |
| 2. 预览 | `npm run serve`，打开 <http://127.0.0.1:8173/index.html>（macOS 也可双击 `播放.command`） | 实时播放。**必须通过本地服务器**：直接双击 html（file://）浏览器不允许读取贴图和模型 |
| 3. 截图检查 | `npm run spot -- --only 04 --every 1 --sheet` | `_shots/04/` 下每秒一帧 + 拼图 `sheet.jpg`，并列出构建失败、素材失败、镜头错误、占位章节 |
| 4. 自动检查 | `npm test` · `npm run check:play` · `npm run check:export` | 单元测试；真实浏览器里的播放同步检查；正式导出的故障演练 |
| 4b. 性能测量 | `npm run perf -- --only 04,05` | 首次可播放时间、各章单帧耗时、GPU 资源数量、暂停时是否仍在渲染、反复跳转后的资源变化 → `_shots/perf.json` |
| 5. 导出画面 | `npm run render` | `_render/full/seg_NN.mp4` → `_render/full/video.mp4`（正式导出，可断点续渲） |
| 6. 导出配乐 | `npm run audio` | `_render/full/audio.wav` |
| 7. 合成成片 | `npm run encode` | `光速文明.mp4`（响度标准化到 -16 LUFS） |

预览页的地址参数（写在 `#` 后面，用 `&` 连接）：`only=04,05` 只载入这些章节 · `from=120` 从第 120 秒开始 · `debug` 右上角显示时间与镜头名。
快捷键：空格 暂停 · ← → 快退 / 快进 10 秒 · F 全屏 · M 静音。

### 截图检查（spot）

```bash
npm run spot -- --only 05 --every 1 --sheet            # 每秒一帧 + 拼图
npm run spot -- --only 05 --times 12.3,12.6,13 --debug  # 指定时间点
npm run spot -- --only 04,05 --times 35.5,36,36.5       # 同时载入相邻章节，检查衔接（时间是拼接后的全局秒）
```

spot 是**预览模式**：构建失败的章节显示带「构建失败」标记的错误画面，截图照常输出；有错误时退出码为 1。

### 导出（render / audio / encode）

```bash
npm run render                       # 正式导出全片（1.5 倍超采样、30 fps、crf 15）
npm run render -- --only 04 --draft  # 只导出第 04 章的预览短片 → _render/preview_04/
npm run render -- --fresh            # 全部重渲
npm run render -- --scale 1 --fps 24 --crf 18
```

- **正式导出遇到问题会停止并指出位置**：章节构建失败、素材加载失败、任意一帧的镜头更新或 HUD 绘制出错、页面报错。
- **占位章节默认拒绝导出**；只想看整片草稿时加 `--draft`（画面右上角带「占位」标记）。`npm run audio` 同样支持 `--only` 与 `--draft`。
- **断点续渲**：每个完成的分段旁有一份渲染记录 `seg_NN.json`，记下源码（含道具与引擎的依赖）、用到的素材、导出参数、浏览器版本和预期帧数。只有记录完全一致、且视频帧数完整时才复用；否则自动重渲并说明原因。
  转场时会画到上一章的最后一个镜头、尾声会引用前面各章的画面，这些依赖都会自动算进去。中断后不会把半成品当成完成结果（先写临时文件，校验帧数后才改名并写记录）。
- 导出与电脑速度无关：每一帧都按指定的影片时间渲染。

## 播放同步

画面、字幕和音效读同一个时钟（`src/engine/clock.js`）：开启声音时以音频时钟为准，渲染卡顿后下一帧直接追上声音；没有音频时用替代时钟。暂停、恢复、拖动进度条一次性同步全部状态，拖动后已经排队的旧音效会被静音。

## 目录

| 路径 | 作用 |
|---|---|
| `src/engine/` | 引擎：`film.js` 时间线 / 渲染循环 / 播放器 / 导出接口 · `clock.js` 统一播放时钟 · `assets.js` 资源加载与缓存 · `kit.js` 材质、布光、模型等工具包 · `post.js` 后期与转场 · `hud.js` 标注与字幕 · `earth.js` 写实地球 · `audio.js` 生成式配乐与音效 · `util.js` 数学与相机路径 |
| `src/chapters/NN-*.js` | 每章一个文件（`status` 字段：`placeholder` / `implemented` / `reviewed` / `deliverable`），顺序见 `index.js` |
| `src/props/NN/` | 各章的道具与场景模块 |
| `src/index.template.html` | 页面结构与样式（构建时生成 `index.html`） |
| `tools/` | 构建、预览服务器、截图、导出、检查工具（见上表） |
| `test/` | `npm test` 单元测试；`test/fixtures/chapters/` 是故障演练章节（不进正片） |
| `assets/` | 照片、HDRI、PBR 贴图、模型、地球贴图、真实数据（`assets/photos/act*/` 与 `assets/earth/` 的 `manifest.json` 写了来源与授权） |
| `docs/script.md` | 分镜脚本与字幕定稿 |
| `docs/chapter-guide.md` | 章节开发指南（引擎接口、质量标准、自检流程） |
| `docs/director-notes.md` | 逐章导演要点 |
| `docs/progress.md` | **制作进度、待办、已知问题、验收记录** |
| `docs/preview/` | 精选预览截图 |

生成物（不进 Git）：`dist/`、`assets/index.json`、`_shots/`、`_render/`、`光速文明.mp4`。`index.html` 由 `npm run build` 生成，需要和 `dist/film.js` 一起使用。

## 旧版（v1）文件：状态与归属

第一版是约 5 分 28 秒的「黑底霓虹点线」风格，已被 v2 取代。下列文件**暂时保留、不再维护**，等确认没有需要迁移的内容后再统一归档；不要用它们构建或导出 v2。

| 文件 | 第一版的用途 | 现状 |
|---|---|---|
| `build.py` | 把 `src/head.html` + `src/core.js` 等拼成 `index.html` / `test.html`（three 0.147 + CDN） | 已停用。直接运行会覆盖 v2 的 `index.html`，现在默认拒绝（需 `--force`） |
| `render.js` · `spot.js` · `audio_render.js` | v1 的逐帧导出、截图、配乐渲染（写死了 Linux 沙箱里的 Chromium 路径） | 已停用，由 `tools/render.mjs` · `tools/spot.mjs` · `tools/audio.mjs` 取代 |
| `src/head.html` · `src/core.js` · `src/audio.js` · `src/scenes1.js` · `src/scenes2.js` · `src/player.js` | v1 的页面、引擎、配乐与全部场景 | 已停用，由 `src/engine/` 与 `src/chapters/` 取代；v2 不引用它们 |
| `land.b64` · `us.b64` | v1 点阵地球与美国地图的陆地掩膜 | 只被 v1 使用 |
| `soundtrack.mp3` | v1 渲染好的配乐 | 只属于 v1；v2 配乐由 `npm run audio` 生成 |
| `_tools/` | v1 时期的辅助脚本（拼图、截图）与素材收集 / 分章制作的工作流定义（`_tools/wf/`） | 归档候选；`_tools/wf/` 记录了素材来源与分工方式，归档前可保留作参考 |
| `docs/preview/v1_old.jpg` | v1 画面截图 | 对比用 |

## 数据来源

ITU《Facts and Figures 2025》· TeleGeography 海底光缆数据（CC BY-NC-SA 3.0）· CelesTrak / J. McDowell 卫星数据 · Natural Earth · World Bank · K. Rupp 微处理器趋势数据 · NASA 地球影像 · Wikimedia Commons 历史照片 · Poly Haven（CC0 环境光、材质与模型）。照片与地球贴图的授权见对应目录的 `manifest.json`；完整的素材清单（片尾提到的 `assets/CREDITS.md`）尚未整理，见 docs/progress.md。
