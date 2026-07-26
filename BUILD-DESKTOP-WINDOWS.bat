@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Disarankan build gratis melalui GitHub Actions.
  pause
  exit /b 1
)
if not exist node_modules call npm install --no-audit --no-fund
if errorlevel 1 exit /b 1
call npm run test:core
if errorlevel 1 exit /b 1
call npm run audit:static
if errorlevel 1 exit /b 1
call npm run desktop:dist
if errorlevel 1 exit /b 1
echo.
echo Build selesai. Installer ada di release\windows.
pause
endlocal
