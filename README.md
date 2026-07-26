# Bumi Makmur POS FreeSync v5.0.0

Satu source code untuk **Android HP/tablet, Web, dan aplikasi PC PWA**. Rilis v5.0 merupakan pembaruan besar yang menambahkan Pusat Kontrol Operasional, QRIS adaptif per cabang, migrasi aman dari v4.x, serta isolasi konflik cloud agar perubahan QRIS tidak membebani pengaturan global.

## Arsitektur tetap gratis

- Firebase Authentication Email/Password internal pada paket Spark.
- Cloud Firestore pada paket Spark untuk database, realtime, Security Rules, audit, dan direktori login.
- IndexedDB + cache Firestore + antrean mutasi tahan restart untuk mode offline.
- Cloudflare Pages untuk Web/PC PWA.
- Capacitor + GitHub Actions untuk APK/AAB Android.
- **Tanpa Cloud Functions, Firebase Storage, Blaze, billing, atau layanan backend berbayar.**
- Firebase CLI dipisahkan dari dependency build agar instalasi Web/Android lebih ringan; CLI hanya dipakai saat deploy rules.

## Fitur profesional baru v5.0

### Pusat Kontrol Operasional

- Skor kesehatan operasional per cabang.
- Nilai stok berdasarkan modal dan potensi nilai retail.
- Stok menipis/habis serta saran jumlah restock otomatis.
- Risiko harga jual sama atau lebih rendah dari modal.
- Deteksi SKU dan barcode ganda.
- Piutang/utang lewat jatuh tempo.
- Peringatan shift yang terlalu lama terbuka.
- Omzet bersih dan jumlah transaksi hari ini.
- Ekspor CSV dan cetak daftar restock untuk kertas 80 mm.

### QRIS Adaptive v3 per cabang

- Menerima sumber gambar hingga 24 MB.
- Memangkas ruang kosong secara aman, menambahkan kembali quiet zone putih, lalu mencoba PNG lossless dan WebP adaptif.
- Target hasil sekitar 330 KB dengan batas keras 420 KB agar base64 tetap muat di dokumen Firestore.
- Latar transparan diratakan menjadi putih; area bukan QR dapat dipangkas otomatis tanpa menghilangkan quiet zone.
- Menampilkan ukuran asli, hasil, resolusi, mode optimasi, penghematan, preview besar, dan status proses tanpa popup browser.
- QRIS disimpan pada `branchPaymentProfiles/{branchId}`, bukan lagi membebani pengaturan global.
- Owner mengatur QRIS semua cabang; Store Manager hanya cabangnya sendiri; Kasir otomatis memakai QRIS cabang login.

### Stabilitas dan migrasi

- Cache/backup v4.x yang belum memiliki koleksi v5 dinormalisasi tanpa memasukkan data demo baru.
- QRIS lama tetap dapat tampil sebagai fallback dan akan diminta dioptimalkan sebelum disimpan bila melebihi batas aman.
- Aktivasi toko disembunyikan dari login normal dan hanya tersedia melalui mode pemulihan khusus pada instalasi benar-benar baru.
- Login Owner dan Karyawan tetap terpisah; Karyawan memakai cabang + nama login + PIN 4 digit.
- Biometrik hanya berjalan setelah tombol Sidik Jari/Face ID ditekan.
- Konflik web–HP tetap direbase, diantrekan, dan dicoba ulang secara idempotent.
- Hotfix scope Store Manager untuk transfer masuk/keluar tetap dipertahankan.

## Role

- **Owner:** seluruh cabang, seluruh pengaturan, Manager/Kasir, QRIS global per cabang, backup/restore.
- **Store Manager:** operasional luas pada satu cabang, Pusat Kontrol, QRIS cabang, dan pengelolaan Kasir cabangnya; tidak dapat membuat cabang/Manager atau mengubah pengaturan global Owner.
- **Kasir:** kasir, open bill, transaksi, pelanggan terbatas, shift, pesanan, dan layar pelanggan sesuai izin.

## Fitur lama yang tetap dipertahankan

Kasir, barcode kamera/manual/USB/Bluetooth keyboard, open bill, split payment, refund, void, produk, varian, bundle, konversi satuan, markup, promo, stok, opname, transfer cabang, pembelian, retur, hutang/piutang, pelanggan, poin, shift, laporan, nota 58/80 mm, WhatsApp, nota online, printer profiles, customer display, backup, PWA, dan Android signed release.

## Pemeriksaan source

- **77/77 core regression tests lulus.**
- **58 file JS/JSX/MJS** diperiksa untuk import relatif, secret, dan layanan berbayar; file non-JSX lolos `node --check`.
- JSON valid, relative import lengkap, dan struktur ZIP diverifikasi sebelum rilis.
- Kompilasi Vite final dijalankan oleh workflow GitHub `test-only`, karena registry npm tidak tersedia pada lingkungan penyusunan lokal.

```bash
npm install --no-audit --no-fund
npm run test:core
npm run audit:static
npm run build
```

## Urutan update

Panduan rinci pengguna GitHub Desktop tersedia di `UPLOAD-GITHUB-DESKTOP.md`. wajib

1. Di versi lama: **Unduh Backup JSON** dan pastikan **Antrean Offline = 0**.
2. Ekstrak ZIP lalu salin seluruh isinya ke root repository lokal melalui GitHub Desktop; banyak file berubah adalah normal untuk rilis penuh v5.0. Commit dan push ke branch `main`.
3. Jalankan **Build Bumi Makmur POS v5.0.0 → `test-only`**.
4. Jalankan **Deploy Firebase Spark Rules**. Ini wajib karena ada koleksi `branchPaymentProfiles` baru.
5. Tunggu Cloudflare Pages sukses memperbarui Web/PWA.
6. Jalankan **`android-release`** memakai keystore lama.
7. Instal APK v5.0 langsung di atas APK lama. **Jangan uninstall.**
8. Uji QRIS dengan aplikasi pembayaran sebelum transaksi nyata.

> Package ID tetap `app.bumimakmur.pos`, Android version code `50000`, dan database key lokal dipertahankan agar update tidak menghapus data perangkat.
