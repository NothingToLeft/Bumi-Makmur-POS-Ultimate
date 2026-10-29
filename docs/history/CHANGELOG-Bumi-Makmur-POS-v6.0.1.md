# Changelog — Bumi Makmur POS v6.0.1

## Brand Identity Refresh

- Mengganti identitas visual global dengan logo resmi **Bumi Makmur 2** yang diberikan pemilik: globe, peta Indonesia, dan bingkai merah berbentuk M.
- Menetapkan `public/branding/bumi-makmur-2-master.png` sebagai aset master branding.
- Memperbarui logo aplikasi yang dipakai pada sidebar desktop, header mobile, login, loading screen, layar pelanggan, nota, preview nota, dan area UI lain yang memakai `/logo-bm.svg`.
- Memperbarui favicon Web, PWA icon 192/512, maskable icon 512, launcher Android, splash Android, dan Windows multi-resolution `.ico`.
- Menambahkan wordmark merah–hitam turunan untuk kebutuhan dokumen/promosi tanpa mengubah bentuk logo utama.
- Aset launcher/maskable memakai safe-zone dan `object-contain` agar elemen logo tidak terpotong atau terdistorsi pada Android, tablet, Windows, maupun Web.
- Cache Service Worker dinaikkan ke `bumi-makmur-pos-freesync-v6.0.1` agar perangkat tidak terus menampilkan logo lama dari cache v6.0.0.
- Tidak mengubah schema data, Firestore Rules, transaksi, stok, sinkronisasi, AI Product Capture, Smart Receiving, Daily Closing, atau fitur bisnis lain.

## Kompatibilitas

- Data v6.0.0/v5.8.x tetap kompatibel tanpa migrasi destruktif.
- Firebase tetap Spark-only: Authentication + Firestore, tanpa Functions/Storage/Blaze.
