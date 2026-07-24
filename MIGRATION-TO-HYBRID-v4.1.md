# Migrasi ke Bumi Makmur POS Hybrid v4.1

## Prinsip

v4.1 menggunakan Firebase sebagai pusat sinkronisasi sekaligus menyimpan cache operasional pada perangkat. Aksi harian diterapkan langsung ke cache lokal, dimasukkan ke mutation queue, lalu dikirim otomatis ketika internet tersedia.

## Migrasi aman dari v3.3 atau v4.0

1. Masuk sebagai Owner pada versi lama dan unduh **Backup JSON**.
2. Pastikan keystore release dan Android signing secrets lama tetap tersedia.
3. Deploy backend Firebase v4.1.
4. Bootstrap toko hanya bila database Firebase belum pernah dibuat.
5. Masuk sebagai Owner pada v4.1.
6. Restore backup JSON bila data belum ada di Firebase.
7. Login online satu kali pada setiap perangkat agar cache dan kredensial offline dibuat.
8. Uji satu penjualan online, satu penjualan offline, lalu sambungkan internet dan pastikan tidak ada transaksi ganda.
9. Periksa produk, stok, pelanggan, pemasok, pembelian, transaksi, hutang/piutang, shift, dan laporan.

## Data yang tetap memerlukan setup ulang

- PIN karyawan lokal lama, karena PIN cloud disimpan melalui Cloud Functions.
- Permission kamera/Bluetooth/notifikasi per perangkat.
- Aktivasi biometrik pada setiap perangkat.
- Firebase Secrets dan Android signing secrets pada repository baru.

## Aturan penting

- Jangan mengubah `STORE_ID`, `STORE_CODE`, package ID, atau release keystore setelah operasional dimulai.
- Jangan menghapus aplikasi ketika masih ada pending sync.
- Sinkronkan antrean dan buat backup JSON sebelum uninstall, restore, atau reset besar.
- Jangan membagikan bootstrap secret, service account, PIN pepper, atau keystore.
