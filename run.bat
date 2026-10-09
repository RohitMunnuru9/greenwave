@echo off
title GreenWave prototype server
cd /d "%~dp0"
echo Starting GreenWave on http://localhost:8765 ...
start "" "http://localhost:8765/index.html#junction=A&auto"
timeout /t 2 >nul
start "" "http://localhost:8765/index.html#junction=B&auto"
timeout /t 1 >nul
start "" "http://localhost:8765/index.html#control"
python server.py 8765
