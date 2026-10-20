#!/bin/bash
# 双击即可在浏览器里播放（需要本地服务器：浏览器不允许 file:// 页面读取贴图与模型）。关闭此窗口即停止。
cd "$(dirname "$0")" || exit 1
echo "正在构建最新画面……"
if ! node tools/build.mjs; then
  echo "构建失败，未打开播放器。请查看上方错误信息。"
  read -r -p "按回车关闭窗口……"
  exit 1
fi
PORT=8174
node tools/server.mjs "$PORT" &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 1
if ! kill -0 "$SRV" 2>/dev/null; then
  echo "播放服务器启动失败，端口 $PORT 可能已被占用。请关闭之前的播放终端后重试。"
  read -r -p "按回车关闭窗口……"
  exit 1
fi
open "http://127.0.0.1:$PORT/index.html?v=$(date +%s)"
echo "正在播放：http://127.0.0.1:$PORT/index.html"
echo "关闭此窗口即停止本地服务器。"
wait $SRV
