# Feature Matrix — Bumi Makmur POS FreeSync v4.5

| Area | Implementasi | Status |
|---|---|---|
| Kasir | Produk, barcode kamera/manual/USB/Bluetooth keyboard, SKU Enter-to-add, varian, modifier, bundle, item kustom, diskon, promo, loyalty | Aktif |
| Pembayaran | Tunai, QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, tempo, split | Aktif |
| Produk | Modal, markup %, eceran, grosir, proyek, satuan, kategori | Aktif |
| Stok | Movement, adjustment, opname, transfer cabang, retur, stok pecahan | Aktif |
| Pembelian | Order/receive, hutang, pembayaran, retur | Aktif |
| Pelanggan | Member, piutang, kredit, proyek, poin, reward | Aktif |
| Shift | Modal awal, kas masuk/keluar, expected cash, selisih | Aktif |
| Laporan | Omzet, HPP neto refund/restock, pembelian bersih setelah retur, laba, pembayaran, stok, hutang/piutang | Aktif |
| Multi-cabang | Data scope dan branch switch Owner per perangkat | Aktif |
| Offline | IndexedDB, Firestore persistent cache, PIN offline, durable mutation queue | Aktif setelah pairing pertama |
| Auto-sync | Otomatis saat online, manual sync, retry bertahap, queue status | Aktif |
| Konflik | Delta/array merge, targeted cloud rebase, retry lintas web–HP tanpa error permanen | Aktif |
| Cloud gratis | Firebase Auth + Firestore Spark | Aktif setelah konfigurasi |
| Transaksi cloud | Firestore transaction, optimistic concurrency, idempotency receipt, audit | Aktif |
| Keamanan | Auth, PIN PBKDF2, AES-GCM credential vault, role/branch rules, approval | Aktif |
| Login | Owner/Karyawan terpisah, pilihan cabang, nama + PIN, biometrik eksplisit | Aktif |
| Karyawan | Tambah/edit/hapus dari Pengaturan, Auth sekunder, PIN, role, cabang, batas Manager | Aktif |
| Error cloud | Pesan Firebase ramah pengguna dan UID guard sebelum listener | Aktif |
| Nota | Cetak 58/80 mm, logo, pesan, WhatsApp, gambar, nota online Firestore | Aktif |
| Android | Kamera, biometrik, Bluetooth permission, signed APK/AAB | Aktif |
| Web | Cloudflare Pages, SPA route, security headers, PWA | Siap deploy |
| PC | Installable PWA Edge/Chrome, sidebar desktop, scanner USB keyboard | Siap deploy |
| Backup | Export JSON lokal dan restore cloud oleh Owner | Aktif |
