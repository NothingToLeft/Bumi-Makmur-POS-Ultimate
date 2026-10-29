# Changelog Bumi Makmur POS v5.4.0

## Smart Catalog & Natural Sorting

- Seluruh daftar dan pemilih produk otomatis disusun alfabetis menggunakan urutan natural.
- Nama dengan angka kini rapi: Philips 6W, 10W, 12W, 15W, bukan 10W, 12W, 15W, 6W.
- Pemilih barang profesional menyediakan pencarian nama, SKU, barcode, kategori, dan rak.
- Dipakai konsisten pada Produk & Stok, penyesuaian, transfer, Pembelian/Restok, dan Pesanan Online.

## Harga Khusus PCS, Pack, Dus, Box, dan Roll

- Satu produk tetap menggunakan satu stok dasar.
- Setiap satuan jual dapat memiliki faktor isi dan harga eceran/grosir/proyek sendiri.
- Contoh Kabel Ties: 1 pcs Rp500; 1 pack berisi 100 pcs dapat dijual Rp45.000.
- Checkout menampilkan pilihan satuan dan mengurangi stok dasar sesuai faktor konversi.
- Tidak perlu membuat produk “Kabel Ties Eceran” dan “Kabel Ties Pack” secara terpisah.
- Harga lama tetap menjadi fallback ketika harga khusus kemasan belum diisi.

## Pengelola Kategori Produk

- Tombol Kategori tersedia di Produk & Stok.
- Kategori baru dapat dibuat langsung saat menambah produk standar maupun produk induk/varian.
- Mendukung tambah, ganti nama, gabung, dan hapus aman.
- Bila kategori masih dipakai, Owner wajib memilih kategori pengganti.

## Login Owner Disederhanakan

- Halaman Login Owner tidak lagi menampilkan pilihan cabang.
- Satu akun Owner memiliki akses seluruh cabang.
- Cabang aktif dipilih atau diganti setelah Owner berhasil masuk.
- Login Karyawan tetap: pilih cabang, pilih nama, masukkan PIN.

## Hapus / Arsip Cabang

- Cabang baru yang kosong dapat dihapus permanen.
- Cabang dengan riwayat transaksi, stok, pembelian, shift, atau data operasional diarsipkan agar histori tetap utuh.
- Cabang arsip dikeluarkan dari pilihan login dan operasional aktif.
- Owner dapat memulihkan cabang arsip.
- Cabang aktif terakhir tidak dapat dihapus.
- Konfirmasi penghapusan meminta pengetikan nama cabang untuk mencegah salah tekan.

## Fitur yang Dipertahankan

- Produk Induk + Varian dan shared barcode.
- SKU otomatis dan barcode internal.
- Penjualan meter/kilogram/liter pecahan.
- Scanner kamera, USB, dan Bluetooth.
- QRIS adaptif per cabang.
- Sinkronisasi Firebase Spark, offline queue, conflict rebase.
- Android APK/AAB, Windows EXE/MSI, Web/PWA, dan GitHub Releases.

## Kompatibilitas Cloud

- Tetap menggunakan Firebase Authentication dan Firestore pada Spark/free tier.
- Tidak memakai Cloud Functions, Firebase Storage, Blaze, atau billing.
- Tidak ada perubahan Firestore Rules pada v5.4.0.

## QA

- Core/regression tests: 111/111 lulus.
- Static audit: lulus.
- Source parser: 42 file JS/JSX, 0 error sintaks.
- JSON: 4 file valid.
