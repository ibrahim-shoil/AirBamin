@echo off
REM This script sets Java 17 and builds the Android app
REM Run this script to build the app

echo ========================================
echo Setting Java 17 for Android Build
echo ========================================

REM Set Java 17 for this session only
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo.
echo Current Java version:
java -version

echo.
echo ========================================
echo Building Android APK...
echo ========================================
cd /d "%~dp0android"

REM Clean first
call gradlew.bat clean

REM Build the APK
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo APK Location:
    echo %~dp0android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Installing to connected device...
    "C:\Users\sho3i\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r "app\build\outputs\apk\debug\app-debug.apk"
) else (
    echo.
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo Check the errors above.
)

echo.
pause
