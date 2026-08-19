# Bumi Makmur POS v6.0.3 — Cloud & Customer Display Stability

Release ini berfokus pada integritas sinkronisasi ketika perangkat dipakai bergantian oleh Owner/Karyawan serta kestabilan Layar Pelanggan.

## Perbaikan utama

- Queue offline tidak lagi dicoba menggunakan akun Firebase yang berbeda dari pembuat mutasi.
- Antrean dari akun lain tetap aman dan akan dilanjutkan saat akun tersebut login lagi.
- Status Cloud tidak lagi menampilkan sehat/terhubung bila ada `permission-denied`.
- Full-sync timestamp tidak lagi diperbarui pada partial sync.
- Firestore Rules v6.0.3 memiliki release marker dan workflow deploy melakukan validasi marker sebelum publish.
- Layar Pelanggan memakai localStorage + BroadcastChannel + polling + Electron IPC, termasuk seed snapshot saat jendela kedua dibuka.
- Popup blocker pada Web dilaporkan dengan benar.
- Pergantian Owner/Karyawan kini memicu refresh snapshot display dengan cabang yang benar; identitas brand dan cabang tidak lagi tertukar.
- Customer Display menggunakan tampilan merah-hitam yang lebih cocok dengan identitas Bumi Makmur 2.

## Data safety

Tidak ada queue yang dibuang otomatis. Jangan menekan reset/restore ketika masih ada antrean. Jika Cloud & Backup menunjukkan “pembaruan milik akun lain”, login kembali dengan Karyawan/Owner yang membuat aktivitas tersebut dan biarkan sinkronisasi berjalan.

## Wajib setelah upload source

1. Push seluruh source v6.0.3 ke GitHub.
2. Jalankan `Actions → Deploy Firebase Spark Rules` dan tunggu hijau.
3. Jalankan workflow `Build Bumi Makmur POS v6.0.3 → test-only`.
4. Buka Web dan tekan `Pengaturan → Cloud & Backup → Sinkronkan Sekarang`.
5. Bila ada antrean milik akun lain, login dengan akun pembuat sampai antreannya nol.
6. Login sebagai Karyawan dan uji `Layar Pelanggan → Buka Layar 2`.
7. Uji transaksi kasir, Shift Start/End, sale, stok, quotation, warranty/serial, lalu pastikan diagnostik tidak menambah `permission-denied` baru.

Firebase tetap Spark-only.

### Build Integrity Hotfix R1
- Memperbaiki kegagalan Cloudflare Pages akibat syntax array Changelog yang tidak tertutup.
- Menambahkan parser JSX/esbuild sebagai build gate dan menyeragamkan Node.js 24.
- Tidak ada perubahan data, Firestore Rules, transaksi, stok, atau kompatibilitas v6.0.3.

