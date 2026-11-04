@echo off
title DOWNLOADYFY.AI - Universal Downloader Starter
color 0A

echo =======================================================
echo     DOWNLOADYFY.AI - Starting Local Dev Servers...
echo =======================================================
echo.

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not added to PATH.
    echo Please install Python from https://www.python.org/downloads/
    echo and make sure to check "Add Python to PATH".
    pause
    exit /b 1
)

echo [2/3] Installing/verifying backend dependencies...
pip install -r backend/requirements.txt --quiet

echo.
echo [3/3] Killing any old servers on ports 5000 and 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo =======================================================
echo   Backend Server:  http://127.0.0.1:5000
echo   Frontend Website: http://localhost:8000
echo =======================================================
echo.

:: Start Frontend server in a separate background window
start "DOWNLOADYFY Frontend (Port 8000)" cmd /k "cd /d %~dp0 && python -m http.server 8000 --directory frontend"

:: Wait 2 seconds for frontend to init, then open browser
timeout /t 2 /nobreak >nul
echo Opening website in your default browser...
start http://localhost:8000/index.html

:: Run Backend server in the current window
echo Starting Flask Backend Server (Do not close this window!)...
python backend/app.py
