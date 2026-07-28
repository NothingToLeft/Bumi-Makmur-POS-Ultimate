# Build & QA Report — Bumi Makmur POS v5.6.0

## Ringkasan Pemeriksaan Lokal

| Pemeriksaan | Hasil |
|---|---|
| `npm run test:core` | 125/125 lulus |
| `npm run audit:static` | Lulus |
| JavaScript/JSX/MJS diperiksa | 82 file |
| Parser source | 82/82, 0 error sintaks |
| JSON | 4 file valid |
| Secret/private key scan | Lulus |
| Forbidden paid services scan | Lulus |
| Relative import dan file wajib | Lulus |
| ZIP integrity | Diperiksa setelah paket dibuat |

## Cakupan Regression Test

- HPP, refund, pembelian bersih, dan laporan produk.
- Barcode/SKU, scanner, varian, shared barcode, barcode internal, dan SKU otomatis.
- Login Owner, Store Manager, Kasir, PIN, biometrik manual, dan direktori nama karyawan.
- Firebase Spark Auth/Firestore tanpa Functions, Storage, atau Blaze.
- Offline cache, antrean mutasi, rebase konflik, idempotensi, dan sinkronisasi lintas perangkat.
- Role serta batas cabang pada klien dan Firestore Rules.
- Produk & Stok, penjualan pecahan, konversi roll/pack/dus, pembelian, transfer, opname, refund, dan nota.
- Kategori, lifecycle produk, arsip, reset stok, dan hapus permanen aman.
- Impor Excel/CSV, validasi backup, label barcode massal, riwayat harga, PO, approval diskon, dan closing shift.
- Web/PWA, Android workflow, Windows workflow, GitHub Releases, dan Cloudflare SPA.

## Keterbatasan Pemeriksaan Lokal

Instalasi dependency melalui registry npm tidak selesai pada lingkungan penyusunan karena timeout jaringan. Karena itu, `vite build`, Electron packaging, dan Gradle Android tidak diklaim telah dijalankan secara lokal. Workflow GitHub `test-only` tetap menjadi gerbang kompilasi produksi final sebelum rilis EXE/MSI/APK/AAB.

## Langkah Wajib di GitHub

1. Jalankan `Build Bumi Makmur POS v5.6.0 → test-only`.
2. Jalankan `Deploy Firebase Spark Rules`.
3. Setelah keduanya hijau, jalankan `android-release` dan `windows-release`.
4. Pastikan Cloudflare Pages deployment dari branch `main` berstatus sukses.
