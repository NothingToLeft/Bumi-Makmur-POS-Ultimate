# Bumi Makmur POS v5.5.0

## Store Manager Operational Admin

- Store Manager kini menjadi kepala operasional penuh untuk cabang yang ditugaskan.
- Dapat mengelola produk, stok, kategori, pembelian, pemasok, pelanggan, shift, kas, keuangan, laporan, pesanan, QRIS, printer, layar pelanggan, dan akun Kasir pada cabangnya.
- Dapat mengarsipkan, memulihkan, mengosongkan stok, serta menghapus permanen produk yang benar-benar belum memiliki riwayat.
- Dapat menambah, mengubah, menggabungkan, dan menghapus kategori produk tanpa memperoleh akses ke pengaturan global lainnya.
- Tetap tidak dapat mengubah identitas usaha global, akun Owner, Store Manager lain, cabang, restore/reset cloud, login appearance global, atau keamanan utama.

## Safe Product & Stock Lifecycle

- Tombol merah pada kartu produk sekarang membuka panel `Kelola Produk & Stok`.
- `Kosongkan Stok` mengubah stok menjadi 0 melalui penyesuaian resmi dan menulis pergerakan `STOCK_RESET`.
- `Arsipkan Produk` menyembunyikan produk dari Kasir tanpa merusak transaksi, pembelian, HPP, refund, transfer, dan laporan lama.
- `Pulihkan Produk` mengaktifkan kembali produk yang diarsipkan.
- `Hapus Permanen` hanya aktif bila stok 0 dan tidak ada satu pun referensi operasional.
- Produk varian diperiksa dan dikelola sebagai satu kelompok agar tidak menyisakan varian yatim.
- Produk yang dipakai sebagai komponen paket juga tidak dapat dihapus permanen.

## Keamanan dan Cloud

- Firestore Rules mengizinkan Store Manager memperbarui hanya field `categories` pada dokumen settings.
- Firestore Rules tetap menolak Manager mengubah identitas usaha, cabang, konfigurasi global, dan data cabang lain.
- Semua tindakan tetap masuk antrean offline, audit log, dan sinkronisasi Firebase Spark.
- Tidak menggunakan Cloud Functions, Firebase Storage, Blaze, atau billing.
