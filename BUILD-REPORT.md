# Build & QA Report — Bumi Makmur POS v5.1.0

Tanggal audit source: 27 Juli 2026

## Ruang lingkup

- Windows Desktop dengan installer EXE/NSIS dan MSI.
- Web/PWA dan Android tetap dipertahankan.
- Nama toko, alamat, dan telepon dapat diganti Owner.
- Scan barcode saat menambah produk melalui kamera atau scanner USB/Bluetooth.
- Shortcut kasir PC dan layar pelanggan kedua.
- Nama toko dinamis diterapkan ke login, shell, nota, faktur pembelian, QRIS default, dan customer display.

## Hasil pemeriksaan aktual

```text
Core regression tests : 81/81 lulus
Static audit          : lulus
JS/JSX/MJS/CJS audit  : 62 file
JSON validation       : 4 file valid
TypeScript parse pass : lulus, 0 syntax error
YAML workflow parse   : 4 workflow valid
Secret/private key    : tidak terdeteksi
Forbidden paid stack  : Functions dan Storage tidak ditemukan
ZIP integrity         : diverifikasi saat paket final dibuat
```

## Pemeriksaan yang dilakukan

```text
npm run test:core
npm run audit:static
tsc --noEmit --allowJs --checkJs false --jsx preserve --noResolve ...
```

## Kompilasi final

Instalasi dependency dan `npm run build` tidak dapat diselesaikan pada lingkungan penyusunan karena koneksi npm registry mengalami timeout. Source sudah memiliki workflow `test-only` yang menjalankan instalasi dependency, seluruh test, audit statis, dan kompilasi Vite pada GitHub sebelum installer dibuat.

Installer Windows final tidak disertakan di dalam source ZIP. Installer dibuat secara reproducible melalui:

```text
Actions → Build Bumi Makmur POS Desktop v5.1 → windows-release
```

## Keamanan Desktop

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`
- Preload hanya mengekspos API desktop minimum.
- Renderer dilayani melalui custom secure scheme dari folder `dist`.
- Navigasi/link eksternal dibuka di browser sistem, bukan di dalam aplikasi.
- Izin media hanya diberikan untuk origin aplikasi lokal tepercaya.

## Batasan rilis

Installer Windows belum memakai sertifikat code-signing komersial. SmartScreen dapat menampilkan publisher tidak dikenal pada pemasangan pertama. Gunakan artifact dari repository GitHub sendiri dan cocokkan `SHA256SUMS.txt`.
