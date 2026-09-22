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
echo [3/3] Launching Backend and Frontend servers...
echo.
echo =======================================================
echo   Backend Server:  http://127.0.0.1:5000
echo   Frontend Website: http://localhost:8000
echo =======================================================
echo.
echo Opening website in your default browser...
start http://localhost:8000

:: Start Frontend server in a separate background window
start "DOWNLOADYFY Frontend (Port 8000)" cmd /k "python -m http.server 8000 --directory frontend"

:: Run Backend server in the current window
echo Starting Flask Backend Server (Do not close this window!)...
python backend/app.py
