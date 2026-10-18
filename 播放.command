#!/bin/bash
# 双击即可在浏览器里播放（需要本地服务器：浏览器不允许 file:// 页面读取贴图与模型）。关闭此窗口即停止。
cd "$(dirname "$0")"
PORT=8173
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 1
open "http://127.0.0.1:$PORT/index.html"
echo "正在播放：http://127.0.0.1:$PORT/index.html"
echo "关闭此窗口即停止本地服务器。"
wait $SRV
