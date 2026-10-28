#!/bin/bash
# 启动排版工作台：在本机 8173 端口开一个小服务器并打开浏览器
cd "$(dirname "$0")"
URL="http://127.0.0.1:8173/"
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server 8173 --bind 127.0.0.1 >/dev/null 2>&1 &
  SERVER=$!
  sleep 1
  xdg-open "$URL" >/dev/null 2>&1 || echo "请在浏览器打开 $URL"
  wait $SERVER
else
  xdg-open "index.html"
fi
