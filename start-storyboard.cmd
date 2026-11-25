@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install it before starting the app.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8765/ in Edge or Chrome. Keep this window open.
node server.js
pause
