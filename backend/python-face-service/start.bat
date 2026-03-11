@echo off
REM Start InsightFace Python Service for Windows

echo 🚀 Starting InsightFace Face Recognition Service...
cd /d %~dp0
python app.py
pause

