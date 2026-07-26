# Bumi Makmur POS v5.0.0 — Changelog Utama

## Professional Control Center

- Menambahkan **Pusat Kontrol Operasional** untuk Owner dan Store Manager.
- Menampilkan skor kesehatan cabang, stok habis/menipis, saran restock, nilai stok modal, potensi retail, omzet bersih hari ini, risiko margin, SKU/barcode ganda, jatuh tempo hutang/piutang, dan shift terlalu lama.
- Menambahkan ekspor CSV serta cetak daftar restock 80 mm.

## QRIS Adaptive v3

- Menghapus kegagalan kompresi tunggal dan popup browser `Gambar masih terlalu besar setelah dikompresi`.
- Menerima PNG, JPG, dan WebP hingga 24 MB.
- Memangkas ruang kosong otomatis, memulihkan quiet zone putih, mencoba PNG/WebP adaptif, lalu memakai fallback monokrom kontras tinggi bila perlu.
- Target hasil sekitar 330 KB dengan batas keras 420 KB agar aman untuk penyimpanan Firestore.
- Menampilkan preview, ukuran, resolusi, penghematan, dan mode proses langsung di halaman tanpa alert browser.
- Menyimpan QRIS per cabang melalui `branchPaymentProfiles`, sehingga perubahan QRIS tidak lagi bertabrakan dengan dokumen pengaturan global.

## Login, cabang, dan role

- Menghapus tombol setup toko dari login normal. Mode pemulihan hanya dapat dibuka secara khusus dan tetap memeriksa bahwa toko benar-benar belum ada.
- Mempertahankan Login Owner dan Login Karyawan terpisah.
- Karyawan masuk dengan pilihan cabang, nama login, dan PIN 4 digit.
- Biometrik hanya muncul setelah tombol sidik jari/Face ID ditekan.
- Owner dapat mengelola Manager dan Kasir dari Pengaturan.
- Store Manager mengelola Kasir dan operasional cabangnya sendiri tanpa akses pengaturan global Owner.
- Mempertahankan perbaikan query transfer Manager untuk transfer masuk dan keluar.

## Sinkronisasi dan migrasi

- Mengisolasi profil pembayaran per cabang untuk mengurangi konflik Web–HP.
- Mempertahankan targeted rebase, retry bertahap, antrean offline, idempotency receipt, serta merge stok berbasis delta.
- Menormalisasi data dan backup v4.x ke struktur v5 tanpa memasukkan data demo.
- Mempertahankan package ID, database lokal, dan signing path agar APK dapat dipasang sebagai update.

## Firebase Spark gratis

- Tetap memakai Firebase Authentication dan Cloud Firestore pada Spark/free tier.
- Tidak memakai Firebase Functions, Firebase Storage, Blaze, billing, atau backend berbayar.
- Firestore Rules diperbarui untuk profil QRIS per cabang dan pembatasan role/cabang.

## QA yang telah dijalankan

- Core regression tests: **77/77 lulus**.
- Static audit: **lulus**.
- Relative import dan file konfigurasi diperiksa.
- Kompilasi Vite final wajib diverifikasi melalui workflow GitHub `test-only` sebelum build APK.
