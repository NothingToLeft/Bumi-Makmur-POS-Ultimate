@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Gunakan installer EXE/MSI dari GitHub Actions untuk pemakaian normal.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Menginstal dependency pengembangan...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Instalasi gagal. Periksa koneksi internet lalu jalankan ulang.
    pause
    exit /b 1
  )
)
echo Menjalankan Bumi Makmur POS Desktop v5.4.0 dalam mode pengembangan...
call npm run desktop:dev
endlocal
