@echo off
echo Starting VendorVision AI...

:: Kill anything on these ports first
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173"') do taskkill /PID %%a /F >nul 2>&1

:: Start backend
start "VendorVision Backend :8000" cmd /k "cd /d "%~dp0backend" && python main.py"

:: Wait 3s for backend to come up
timeout /t 3 /nobreak >nul

:: Start frontend
start "VendorVision Frontend :5173" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Both servers starting in separate windows.
echo   Backend  ^> http://localhost:8000
echo   Frontend ^> http://localhost:5173
echo.
pause
