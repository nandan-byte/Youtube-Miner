@echo off
title YouTube Playback Testing Bot
echo ==========================================================
echo    YouTube Playback QA & Browser Automation Testing Bot
echo ==========================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

REM Check if root dependencies are installed
if not exist "node_modules\" (
    echo [INFO] Installing backend dependencies...
    call npm install
)

REM Check if client dependencies are installed
if not exist "client\node_modules\" (
    echo [INFO] Installing client dependencies...
    call npm --prefix client install
)

REM Check if client dist build exists
if not exist "client\dist\" (
    echo [INFO] Building production React frontend...
    call npm run build
)

REM Check if .env exists
if not exist ".env" (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env
)

echo.
echo [INFO] Starting YouTube Playback QA Server...
echo [INFO] Default Login:
echo        Username: admin
echo        Password: AdminSecurePass123!
echo.
echo [INFO] Opening dashboard in your default browser...
start http://localhost:3000

node server/index.js
pause
