@echo off
setlocal

REM =========================================================
REM AirBamin - Windows Build Script
REM Creates both EXE and MSI installers
REM =========================================================

REM Configuration
set APP_NAME=Airbamin

REM Extract version from pom.xml dynamically
for /f "tokens=*" %%i in ('powershell -command "[xml]$pom = Get-Content pom.xml; $pom.project.version"') do set APP_VERSION=%%i

set VENDOR=Tecbamin
set MAIN_JAR=airbamin-desktop-%APP_VERSION%.jar
set MAIN_CLASS=com.airbamin.desktop.Launcher
set UPGRADE_UUID=5465c87f-3922-4c23-88ee-b388ca6521d8
set ICON_PATH=src\main\resources\favicon_io\favicon.ico

REM Check JAVA_HOME
if "%JAVA_HOME%"=="" (
    echo Error: JAVA_HOME is not set.
    echo Please install JDK 17+ and set JAVA_HOME.
    exit /b 1
)

echo.
echo ========================================================
echo  Building %APP_NAME% %APP_VERSION% for Windows
echo ========================================================
echo.

REM 1. Clean and Package with Maven
echo [1/4] Running Maven Clean Package...
call mvn clean package -DskipTests
if %ERRORLEVEL% NEQ 0 (
    echo Maven build failed.
    exit /b %ERRORLEVEL%
)

REM 2. Prepare Output Directory
echo.
echo [2/4] Preparing distribution directory...
if exist dist rmdir /s /q dist
mkdir dist
copy "target\%MAIN_JAR%" dist\ >nul

REM 3. Clean output directory
echo.
echo [3/4] Preparing output directory...
if exist output rmdir /s /q output
mkdir output

REM 4. Run jpackage for EXE
echo.
echo [4/4] Generating Windows Installers...
echo.
echo Creating EXE installer...

"%JAVA_HOME%\bin\jpackage" ^
  --type exe ^
  --dest output ^
  --name "%APP_NAME%" ^
  --app-version "%APP_VERSION%" ^
  --vendor "%VENDOR%" ^
  --input dist ^
  --main-jar "%MAIN_JAR%" ^
  --main-class "%MAIN_CLASS%" ^
  --icon "%ICON_PATH%" ^
  --win-dir-chooser ^
  --win-menu ^
  --win-menu-group "%APP_NAME%" ^
  --win-shortcut ^
  --win-shortcut-prompt ^
  --win-upgrade-uuid "%UPGRADE_UUID%"

if %ERRORLEVEL% NEQ 0 (
    echo EXE creation failed.
    exit /b %ERRORLEVEL%
)

echo.
echo Creating MSI installer...

"%JAVA_HOME%\bin\jpackage" ^
  --type msi ^
  --dest output ^
  --name "%APP_NAME%" ^
  --app-version "%APP_VERSION%" ^
  --vendor "%VENDOR%" ^
  --input dist ^
  --main-jar "%MAIN_JAR%" ^
  --main-class "%MAIN_CLASS%" ^
  --icon "%ICON_PATH%" ^
  --win-dir-chooser ^
  --win-menu ^
  --win-menu-group "%APP_NAME%" ^
  --win-shortcut ^
  --win-upgrade-uuid "%UPGRADE_UUID%"

if %ERRORLEVEL% NEQ 0 (
    echo MSI creation failed.
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo  Build Complete!
echo  Installers are in the 'output' directory:
echo    - %APP_NAME%-%APP_VERSION%.exe
echo    - %APP_NAME%-%APP_VERSION%.msi
echo ========================================================
echo.
echo EXE: User-friendly installer with wizard
echo MSI: For enterprise/silent deployment (msiexec /i)
echo.
