@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is required. Install it from https://nodejs.org/ then run this again.
  echo.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo   ACT 1 - one passcode, every intermediate value
echo ================================================================
node demo\demo-step.mjs
echo.
pause

echo.
echo ================================================================
echo   ACT 2 - counter walk, checked against RFC 4226
echo ================================================================
node demo\demo-counter.mjs
echo.
pause

echo.
echo ================================================================
echo   ACT 3 - how a server accepts / rejects codes
echo ================================================================
node demo\demo-window.mjs
echo.
pause

echo.
echo ================================================================
echo   ACT 4 - browser demo (two devices, shared secret)
echo ================================================================
start "" "demo\demo.html"
echo.
echo   Opened demo\demo.html in your browser.
echo.
pause
