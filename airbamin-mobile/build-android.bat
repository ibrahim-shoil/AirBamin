@echo off
REM Build Android app with Java 17
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%

echo Using Java version:
java -version

echo.
echo Building Android app...
cd /d "%~dp0"
call npx expo run:android

pause
