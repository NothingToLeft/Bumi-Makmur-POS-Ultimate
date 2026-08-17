# Build Report — Bumi Makmur POS v5.7.0

## Pemeriksaan lokal yang berhasil

- `npm run test:core`: **134/134 lulus**.
- `npm run audit:static`: **lulus**.
- Audit statis memeriksa **87 file JS/JSX/MJS** dan **4 file JSON**.
- `node --check`: **63 file JS/MJS/CJS**, 0 error sintaks.
- Transpilasi parser JSX/TSX: **24 file**, 0 error sintaks.
- Pemeriksaan versi: `package.json` dan `VERSION.txt` = **5.7.0**.

## Build produksi

`npm install` pada lingkungan penyusunan tidak selesai dalam batas waktu jaringan, sehingga build produksi Vite/Electron/Android tidak diklaim lulus secara lokal. GitHub Actions `test-only` tetap menjadi gerbang kompilasi final karena workflow menginstal dependency lalu menjalankan core tests, audit, dan `npm run build`.

## Perubahan dependency

- Menambahkan `@zxing/browser` **0.2.1** untuk scanner kamera multi-format.
- Capacitor Android tetap dipertahankan.
- Tidak menambahkan layanan cloud berbayar.
