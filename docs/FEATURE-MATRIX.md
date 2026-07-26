# Feature Matrix — Bumi Makmur POS FreeSync v5.0

| Area | Implementasi | Status |
|---|---|---|
| Pusat Kontrol | Health score, stok/restock, margin, duplikat kode, jatuh tempo, shift, omzet, CSV/print | Baru v5 |
| QRIS | Adaptive PNG/WebP, preview/metadata, profil per cabang, scope Owner/Manager/Kasir | Baru v5 |
| Kasir | Barcode kamera/manual/USB/Bluetooth keyboard, varian, modifier, bundle, item kustom, promo, loyalty | Aktif |
| Pembayaran | Tunai, QRIS, e-wallet, transfer, kartu, tempo, split | Aktif |
| Produk | Modal, markup %, eceran, grosir, proyek, satuan, kategori | Aktif |
| Stok | Movement, adjustment, opname, transfer cabang, retur, stok pecahan | Aktif |
| Pembelian | Order/receive, hutang, pembayaran, retur | Aktif |
| Pelanggan | Member, piutang, kredit, proyek, poin, reward | Aktif |
| Shift | Modal awal, kas masuk/keluar, expected cash, selisih, stale-shift alert | Aktif |
| Laporan | Omzet, HPP neto refund/restock, laba, pembayaran, stok, hutang/piutang | Aktif |
| Multi-cabang | Scope data, pilihan login, QRIS cabang, branch switch Owner | Aktif |
| Role | Owner, Store Manager satu cabang, Kasir dan permission khusus | Aktif |
| Offline | IndexedDB, persistent cache, PIN offline, durable mutation queue | Aktif setelah pairing |
| Auto-sync | Realtime, manual sync, retry bertahap, queue status | Aktif |
| Konflik | Delta/array merge, targeted rebase, idempotency receipt | Aktif |
| Migrasi | Normalisasi cache/backup v4.x tanpa data demo baru | Baru v5 |
| Cloud gratis | Firebase Auth + Firestore Spark | Aktif |
| Keamanan | PBKDF2 PIN, AES-GCM credential vault, role/branch rules, approval | Aktif |
| Login | Owner/Karyawan terpisah, cabang + nama + PIN, biometrik eksplisit | Aktif |
| Karyawan | Tambah/edit/nonaktif/hapus di Pengaturan, secondary Auth | Aktif |
| Nota | 58/80 mm, logo, pesan, WhatsApp, gambar, nota online | Aktif |
| Android | Kamera, biometrik, permission Bluetooth, signed APK/AAB | Siap build |
| Web/PC | Cloudflare Pages, SPA, security headers, installable PWA | Siap deploy |
| Backup | Export JSON dan restore cloud Owner dengan migrasi bentuk v5 | Aktif |
