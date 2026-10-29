# Build & QA Report — Bumi Makmur POS v5.3.0

## Hasil pemeriksaan lokal

- Core/regression tests: **106/106 lulus**
- Static audit: **lulus**
- Parser JS/JSX/MJS: **0 error sintaks**
- JSON: **4 file valid**
- Secret/private-key scan: **lulus**
- Pemeriksaan layanan berbayar terlarang: **lulus**

## Cakupan baru yang diuji

- SKU otomatis watt: `BM-PHI-LED-006`, `BM-PHI-LED-010`, dan suffix anti-duplikasi.
- Barcode kemasan bersama menghasilkan daftar pilihan varian.
- SKU/barcode internal langsung memilih satu varian.
- Produk varian dikelompokkan di katalog tetapi tetap menyimpan stok sebagai productId/SKU terpisah.
- Editor Produk Induk + Varian, validasi kode, stok awal, harga, dan pengarsipan aman.
- Pembelian/restok, kasir, transfer, opname, refund, HPP, dan laporan tetap memakai record varian biasa sehingga alur lama tidak diputus.
- Label barcode internal memakai SVG Code 39 tanpa layanan eksternal.

## Catatan build produksi

`npm install` pada lingkungan penyusunan tidak selesai karena akses registry mengalami timeout. Karena itu, kompilasi Vite/Electron/Capacitor final harus dikonfirmasi oleh workflow GitHub Actions `test-only`, `windows-release`, dan `android-release`. Tidak ada kegagalan source yang ditemukan oleh test, audit, atau parser lokal.
