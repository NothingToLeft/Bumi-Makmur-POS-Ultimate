# Bumi Makmur POS Ultimate v3.0

POS local-first untuk toko bahan bangunan, listrik, air, perlengkapan proyek, dan toko retail teknis. Project ini dibangun dari fondasi React/Vite dan sudah disiapkan untuk Web, PWA, HP/tablet Android melalui Capacitor, serta build APK cloud lewat GitHub Actions.

## Target perangkat

- Infinix Note 40 Pro+ portrait
- Huawei MatePad SE 11 portrait dan landscape
- Browser PC/laptop untuk administrasi dan pengujian

## PIN demo

- Owner: `1608`
- Store Manager: `2468`
- Kasir: `1234`

PIN tidak disimpan sebagai teks biasa. Data demo memakai PBKDF2-SHA256.

## Modul yang tersedia

1. Dashboard per cabang
2. Kasir cepat dan barcode
3. Open bill / pending bill
4. Split bill dan split payment
5. Produk, varian, bundle, favorit, kategori, SKU, barcode
6. Satuan dan konversi satuan
7. Harga eceran, grosir, proyek, modal, dan markup
8. Promo otomatis, diskon item, diskon transaksi, pajak, service charge, pembulatan
9. Stok, stock movement, adjustment, opname, transfer cabang, stok minimum, rak
10. Pembelian, purchase order, penerimaan barang, hutang pemasok, retur pembelian
11. Pemasok
12. Pelanggan, member, loyalty, reward, harga khusus, batas kredit, proyek
13. Shift kasir, modal awal, kas masuk/keluar, selisih shift
14. Transaksi, cetak ulang, refund penuh/sebagian, void, approval manager
15. Piutang, hutang, pengeluaran, pembayaran cicilan
16. Laporan penjualan, HPP, laba, metode pembayaran, diskon, pajak, refund, stok, utang/piutang, shift
17. Pesanan WhatsApp, marketplace, delivery, dan proyek
18. Owner, Store Manager, Kasir, permission khusus, multi-cabang
19. Printer profile 58/80 mm, Bluetooth/USB/LAN/browser/PDF, test print
20. Customer display, kampanye, dan feedback
21. Backup/restore JSON, audit log, sync queue, status offline
22. PWA offline shell dan fondasi Android Capacitor

## Menjalankan di Windows

```bash
npm install
npm run dev
```

Buka URL yang tampil, biasanya `http://localhost:5173`.

Alternatif: jalankan `MULAI-WINDOWS.bat`.

## Build web

```bash
npm run build
npm run preview
```

Hasil build berada di folder `dist/`.

## Build Android lokal

```bash
npm install
npm run android:add
npm run android:open
```

Android Studio hanya diperlukan untuk build lokal. Untuk build tanpa Android Studio di PC, gunakan workflow GitHub Actions yang sudah disertakan.

## Build APK lewat GitHub Actions

1. Upload isi folder project ke repository GitHub.
2. Buka tab **Actions**.
3. Jalankan workflow **Build Android APK**.
4. Download artifact `Bumi-Makmur-POS-debug-apk`.

## Penyimpanan dan sinkronisasi

- Semua transaksi disimpan lokal lebih dahulu.
- Perubahan masuk ke `syncQueue` berstatus `PENDING`.
- Tombol sinkronisasi saat ini menandai antrean sebagai tersinkron untuk pengujian.
- Integrasi Firebase asli harus memakai konfigurasi proyek Firebase milik pengguna dan adapter repository, bukan API key contoh.

## Printer dan barcode

- Browser print, PDF, kamera web, dan input barcode manual sudah tersedia.
- Bluetooth/USB/LAN ESC/POS disiapkan melalui profil printer dan permission Android.
- Adapter native final harus disesuaikan dengan model printer karena command set tiap merek/model dapat berbeda.

## Catatan legal

Fitur disusun dari pola umum aplikasi POS profesional dan analisis perilaku statis aplikasi referensi. Source code, logo, nama merek, aset, warna khas, dan implementasi proprietary aplikasi referensi tidak disalin ke project ini.
