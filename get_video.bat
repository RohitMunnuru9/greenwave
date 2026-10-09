@echo off
title GreenWave: download a traffic video
cd /d "%~dp0"
if not exist videos mkdir videos
set /p URL=Paste the YouTube URL of a traffic video and press Enter:
python -m pip install -q yt-dlp
python -m yt_dlp -f "18/b[height<=480][ext=mp4]/b" --extractor-args "youtube:player_client=android,web" --no-playlist -o "videos/%%(title).60s.%%(ext)s" "%URL%"
echo.
echo Done. In the app choose Source: Video file and pick the file from the videos folder.
pause
