@echo off
echo Closing running instances of AirBamin...
taskkill /F /IM AirBamin.exe >nul 2>&1
taskkill /F /IM java.exe >nul 2>&1

echo.
echo Starting installation...
start "" "AirBamin-1.2.0.exe"
exit
