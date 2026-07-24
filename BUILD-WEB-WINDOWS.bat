@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Instal Node.js LTS terlebih dahulu.
  pause
  exit /b 1
)
if not exist node_modules call npm install --no-audit --no-fund
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1
echo.
echo Build selesai. Hasil ada di folder dist.
pause
endlocal
