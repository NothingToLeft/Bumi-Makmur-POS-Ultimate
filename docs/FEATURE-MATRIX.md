# Feature Matrix — Bumi Makmur POS FreeSync v5.2.2

| Area | Implementasi | Status |
|---|---|---|
| Login Karyawan | Pilih cabang, pilih nama dari daftar aman, PIN 4 digit, cache offline, biometrik eksplisit | Baru v5.2 |
| Produk & Stok | Satu menu untuk barang, stok awal, harga, barcode, rak, minimum, pergerakan, opname, transfer | Baru v5.2 |
| Penjualan Pecahan | Meter/kg/liter/potongan, langkah desimal, base quantity, konversi roll/box | Baru v5.2 |
| Restok Multi-Satuan | Pembelian per roll/box atau satuan dasar, konversi stok dan HPP per unit dasar | Baru v5.2 |
| Promo Otomatis | UI dihapus; transaksi baru tidak menerapkan promo; histori lama dipertahankan | Disederhanakan v5.2 |
| Desktop Windows | Electron secure shell, installer EXE/NSIS dan MSI, shortcut kasir, layar pelanggan kedua | Aktif |
| Identitas toko | Brand, cabang, alamat, telepon, dan tampilan login dinamis lintas perangkat | Aktif |
| Input barcode | Kamera Android/Web, BarcodeDetector, scanner USB/Bluetooth, validasi duplikat | Aktif |
| Pusat Kontrol | Health score, stok/restock, margin, duplikat kode, jatuh tempo, shift, omzet, CSV/print | Aktif |
| QRIS | Adaptive PNG/WebP, preview/metadata, profil per cabang, scope Owner/Manager/Kasir | Aktif |
| Kasir | Barcode, varian, modifier, bundle, item kustom, diskon manual, loyalty, pajak/service | Aktif |
| Pembayaran | Tunai, QRIS, e-wallet, transfer, kartu, tempo, split | Aktif |
| Pembelian | Order/receive, hutang, pembayaran, retur, faktur, konversi satuan | Aktif |
| Pelanggan | Member, piutang, kredit, proyek, poin, reward | Aktif |
| Shift | Modal awal, kas masuk/keluar, expected cash, selisih, stale-shift alert | Aktif |
| Laporan | Omzet, HPP neto refund/restock, laba, pembayaran, stok, hutang/piutang | Aktif |
| Multi-cabang | Scope data, pilihan login, QRIS cabang, branch switch Owner | Aktif |
| Role | Owner, Store Manager satu cabang, Kasir dan permission khusus | Aktif |
| Offline | IndexedDB, persistent cache, PIN offline, durable mutation queue | Aktif setelah pairing |
| Auto-sync | Realtime, manual sync, retry bertahap, queue status | Aktif |
| Konflik | Delta/array merge, targeted rebase, idempotency receipt | Aktif |
| Migrasi | Normalisasi cache/backup v4.x/v5.x tanpa data demo baru | Aktif |
| Cloud gratis | Firebase Auth + Firestore Spark, tanpa Functions/Storage/Blaze | Aktif |
| Keamanan | PBKDF2 PIN, AES-GCM credential vault, role/branch rules, approval | Aktif |
| Karyawan | Tambah/edit/nonaktif/hapus di Pengaturan, secondary Auth, roster login per cabang | Aktif |
| Nota | 58/80 mm, logo, pesan, WhatsApp, gambar, nota online | Aktif |
| Android | Kamera, biometrik, permission Bluetooth, signed APK/AAB | Siap build |
| Web/PWA | Cloudflare Pages, SPA, security headers, installable PWA | Siap deploy |
| Windows PC | Installer EXE/MSI dari GitHub Actions, local renderer + Firebase Spark | Siap build |
| Backup | Export JSON dan restore cloud Owner dengan migrasi bentuk v5 | Aktif |
