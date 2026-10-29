# QA Report — Bumi Makmur POS v5.8.1

## Scope
Hotfix markup varian, audit menyeluruh controlled numeric input, dan regression check Business Suite v5.8.0.

## Automated checks — PASS
- Core regression suite: **167/167 PASS** melalui `node --test tests/*.test.mjs`.
- Static project audit: **PASS** — 91 file JS/JSX/MJS, 4 file JSON, relative imports, required files, forbidden paid services, dan secret scan diperiksa.
- JSX/JS syntax transpilation audit: **52 file source, 0 syntax error** menggunakan TypeScript parser/transpiler.

## Regression scenarios
- Markup varian dapat diisi saat modal = 0.
- Markup varian dapat dikosongkan sementara tanpa field memaksa nilai lama kembali saat sedang mengetik.
- Mengisi modal setelah markup menghitung harga jual otomatis.
- Mengubah harga jual menghitung ulang markup.
- Edit ulang grup varian mempertahankan markup tersimpan.
- Produk Induk + Varian dapat disimpan mulai dari satu varian tanpa dipaksa membuat varian fiktif; preset LED hanya diterapkan saat dipilih.
- Stok, stok minimum, faktor konversi, penyesuaian stok positif/negatif, opname, transfer, jumlah kasir, Split Bill, retur, pembelian/PO, warranty, loyalty, pajak/service, dan jumlah label memakai `NumberInput` yang stabil.
- Source aplikasi tidak lagi menyisakan `input type="number"` mentah untuk field numerik operasional.
- Seluruh regression Business Suite, scanner, sync, Firestore Spark rules, QRIS, quotation, PO parsial, serial/garansi, laporan, role, dan offline-first tetap lulus.

## Platform note
Binary APK/EXE final belum diklaim dibangun pada environment audit ini karena source package tidak membawa `node_modules` dan environment tidak memiliki dependency/Android SDK lengkap. Production compile tetap menjadi gate melalui GitHub Actions. Setelah workflow hijau, lakukan smoke test kamera/scanner, printer, IME keyboard, dan update-in-place pada Infinix Note 40 Pro+ serta Huawei MatePad SE 11.
