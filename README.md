# 光速文明 · 项目文件

一部约 5 分 28 秒的连续科普影片：从麦克斯韦、赫兹的电磁波，到图灵、ENIAC、冯·诺依曼、晶体管与摩尔定律，再到 ARPANET、TCP/IP、蜂窝通信、海底光缆、万维网和今天的全球互联网。所有画面都是 three.js 实时程序化生成的 3D 场景，配乐由 Web Audio 生成。

## 直接观看

双击 `index.html`，用 Chrome / Edge 打开（需要联网加载 three.js 和字体），点中间的播放键。
空格 暂停 · ← → 快退/快进 10 秒 · F 全屏 · M 静音。

## 目录

| 文件 | 作用 |
|---|---|
| `index.html` | 可直接播放的成品网页（由 build.py 生成，three.js 与字体走 CDN） |
| `src/head.html` | 页面结构与样式（字幕、年份、数据、片尾） |
| `src/core.js` | 渲染器、后期（辉光、色差、转场穿梭模糊）、地球与通用 3D 构件、时间轴驱动的字幕与标注 |
| `src/audio.js` | 生成式配乐与音效；同一套代码既能实时播放，也能离线渲染成 WAV |
| `src/scenes1.js` | 第 0–5 幕：序章、电磁波、电报与无线电、图灵与 ENIAC、冯·诺依曼、晶体管与摩尔定律 |
| `src/scenes2.js` | 第 6–12 幕：ARPANET、TCP/IP、蜂窝 1G–5G、光纤与海缆、万维网、今天、尾声 |
| `src/player.js` | 播放器与启动；地址带 `#render` 时进入逐帧导出模式 |
| `land.b64` / `us.b64` | 全球与美国陆地掩膜（1° 与 0.25° 精度），用来生成点阵地球和地图 |
| `build.py` | 拼装：`python3 build.py cdn` → index.html；`python3 build.py local` → test.html（用本地 node_modules，离线渲染用） |
| `render.js` | 逐帧导出 1280×720 / 30fps JPEG（可断点续渲） |
| `audio_render.js` | 跑一遍时间轴记录音效时间点，离线渲染整条配乐为 audio.wav |
| `spot.js` | 抽取任意时间点截图，用于检查画面 |
| `soundtrack.mp3` | 已渲染好的配乐 |

## 自己导出视频

```bash
npm install three@0.147.0 @fontsource/big-shoulders-display @fontsource/jetbrains-mono @fontsource/noto-sans-sc @fontsource/noto-serif-sc playwright
python3 build.py local
node audio_render.js            # → audio.wav
node render.js 0 99999          # → frames/f00000.jpg …（中断后重跑会接着渲染）
ffmpeg -framerate 30 -i frames/f%05d.jpg -i audio.wav -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -af loudnorm -shortest -movflags +faststart 光速文明.mp4
```

render.js / audio_render.js 里写死了 Chromium 路径，换到自己电脑时改成本机 Chrome 路径即可（有显卡时会快很多）。

## 数据来源

ITU《Facts and Figures 2025》（约 60 亿人在线、22 亿人未接入）· TeleGeography 2026（607 条在役海底光缆）· KeepTrack 2026 年 10 月（约 16,800 颗在轨工作卫星）。
