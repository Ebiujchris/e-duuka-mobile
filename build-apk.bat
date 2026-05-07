@echo off
echo ========================================
echo E-Duuka Mobile - APK Build Script
echo ========================================
echo.

echo Checking if EAS CLI is installed...
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo EAS CLI not found. Installing...
    call npm install -g eas-cli
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install EAS CLI
        pause
        exit /b 1
    )
)

echo.
echo EAS CLI is ready!
echo.
echo ========================================
echo IMPORTANT: Before building
echo ========================================
echo 1. Make sure you have an Expo account
echo 2. Update API_BASE_URL in src/services/ApiService.js
echo    Change from: http://localhost:3001/api
echo    Change to: http://YOUR_SERVER_IP:3001/api
echo.
echo ========================================
echo.

set /p continue="Continue with build? (y/n): "
if /i not "%continue%"=="y" (
    echo Build cancelled
    pause
    exit /b 0
)

echo.
echo Logging in to Expo...
call eas login

if %ERRORLEVEL% NEQ 0 (
    echo Login failed
    pause
    exit /b 1
)

echo.
echo Configuring project...
call eas build:configure

echo.
echo Starting APK build...
echo This will take 10-20 minutes...
call eas build --platform android --profile preview

echo.
echo ========================================
echo Build complete!
echo ========================================
echo Download the APK from the link above
echo Transfer it to your Android device
echo Enable "Install from Unknown Sources"
echo Install the APK
echo ========================================
pause
