#!/bin/bash
# 双击启动排版工作台：在本机 8173 端口开一个小服务器并打开浏览器
cd "$(dirname "$0")"
URL="http://127.0.0.1:8173/"
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server 8173 --bind 127.0.0.1 >/dev/null 2>&1 &
  SERVER=$!
  sleep 1
  open "$URL"
  echo "排版工作台已打开：$URL"
  echo "用完后关掉这个窗口即可。"
  wait $SERVER
else
  open "index.html"
fi
