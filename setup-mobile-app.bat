@echo off
echo ============================================
echo   Airbamin Mobile App Setup
echo ============================================
echo.

REM Check Node.js installation
echo [Step 1/3] Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found in PATH
    echo Please restart your computer or add Node.js to PATH manually
    echo Node.js installation: C:\Program Files\nodejs
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

REM Navigate to parent directory
echo [Step 2/3] Navigating to project directory...
cd /d "%~dp0"
echo Current directory: %CD%
echo.

REM Create Expo project
echo [Step 3/3] Creating Airbamin mobile app...
echo This will take 3-5 minutes...
echo.
npx -y create-expo-app@latest airbamin-mobile --template blank-typescript

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo   1. cd airbamin-mobile
echo   2. npx expo start
echo   3. Scan QR code with Expo Go on your iPhone
echo.
pause
