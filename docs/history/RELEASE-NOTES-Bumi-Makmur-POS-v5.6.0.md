# Bumi Makmur POS v5.6.0

Rilis stabilisasi profesional untuk Web, Windows Desktop, Android HP/tablet, dan Firebase Spark FreeSync.

## Sorotan

- Pusat Diagnostik Cloud dan status sinkronisasi yang lebih jelas.
- Konflik Web–PC–Android direbase tanpa menimpa stok mentah.
- Impor produk dan stok dari Excel/CSV dengan preview, validasi, kategori otomatis, varian, serta harga per kemasan.
- Template Excel/CSV siap pakai untuk migrasi barang awal.
- Riwayat perubahan harga per produk.
- Cetak label barcode massal 58 mm, 80 mm, dan A4.
- Purchase Order terpisah dari penerimaan/restok.
- Persetujuan PIN untuk diskon di atas batas role.
- Preview dan validasi backup sebelum restore.
- Cetak closing shift harian 80 mm.
- Firestore Rules baru untuk PO, riwayat harga, approval, dan sesi perangkat.

Seluruh fitur sebelumnya tetap tersedia: Produk Induk + Varian, shared barcode, SKU otomatis, barcode internal, harga pcs/pack/dus/roll, kabel setengah meter, kategori dinamis, login karyawan pilih nama + PIN, Store Manager operasional cabang, QRIS per cabang, nota digital, printer, offline queue, dan lifecycle produk aman.

## Platform

- Web/PWA: Cloudflare Pages
- Windows: EXE dan MSI x64
- Android: APK dan AAB
- Cloud: Firebase Authentication + Firestore pada Spark/free tier

## Catatan Upgrade

Deploy ulang Firestore Rules wajib sebelum memakai PO, riwayat harga, approval, dan sesi perangkat v5.6.0. Instal APK/EXE pembaruan di atas versi lama; jangan menghapus data aplikasi terlebih dahulu.
