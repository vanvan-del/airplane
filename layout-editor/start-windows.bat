@echo off
rem Start the layout editor on http://127.0.0.1:8173/ and open the browser
cd /d "%~dp0"
where python >nul 2>nul && (start "" "http://127.0.0.1:8173/" & python -m http.server 8173 --bind 127.0.0.1 & goto :eof)
where py >nul 2>nul && (start "" "http://127.0.0.1:8173/" & py -m http.server 8173 --bind 127.0.0.1 & goto :eof)
start "" "index.html"
