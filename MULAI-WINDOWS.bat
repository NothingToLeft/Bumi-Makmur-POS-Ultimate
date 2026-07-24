@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Instal Node.js LTS terlebih dahulu.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Menginstal dependency...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Instalasi gagal. Periksa koneksi internet lalu jalankan ulang.
    pause
    exit /b 1
  )
)
echo Menjalankan BUMI MAKMUR POS...
call npm run dev
endlocal
