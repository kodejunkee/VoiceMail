@echo off
title VoiceMail Assist - Launcher
color 0E

echo.
echo  ========================================
echo     VoiceMail Assist - One-Click Start
echo  ========================================
echo.
echo  [1/3] Detecting your IP address...
echo.

:: Update the IP in app.json
node scripts\update-ip.js
if %ERRORLEVEL% neq 0 (
    echo  ERROR: Failed to update IP. Is Node.js installed?
    pause
    exit /b 1
)

echo.
echo  [2/3] Starting backend server...
echo.

:: Start backend in a new window
start "VoiceMail Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Wait for backend to start
timeout /t 3 /nobreak > nul

echo  [3/3] Starting Expo (mobile app)...
echo.
echo  ==========================================
echo    INSTRUCTIONS:
echo    1. Make sure your PHONE and PC are on
echo       the SAME WiFi network.
echo    2. Open the Expo Go / dev client app
echo       on your phone.
echo    3. Scan the QR code that appears below.
echo  ==========================================
echo.

:: Start Expo with cache clear
cd /d %~dp0app
npx expo start --dev-client --clear
