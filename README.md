# Bumi Makmur POS FreeSync v4.4

Satu source code untuk **Android HP/tablet, web, dan aplikasi PC PWA**. Rilis v4.4 memusatkan perbaikan pada login yang jelas, akun karyawan dari Pengaturan, izin Firestore, dan audit UI mobile untuk Infinix Note 40 Pro+ serta Huawei MatePad SE 11.

## Arsitektur tanpa biaya

- Firebase Authentication Email/Password pada paket Spark.
- Cloud Firestore pada paket Spark untuk data dan realtime.
- Firestore persistent cache + antrean lokal terenkripsi untuk operasi offline.
- Cloudflare Pages sebagai hosting web/PWA utama.
- Capacitor untuk APK/AAB Android.
- PWA dapat dipasang di Windows melalui Chrome/Edge.
- **Tidak memakai Cloud Functions, Firebase Storage, Blaze, atau billing.**

## Perubahan utama v4.4

- Halaman awal memisahkan **Login Owner** dan **Login Karyawan**.
- PIN/biometrik divalidasi sesuai role agar akun tidak masuk melalui halaman yang salah.
- Pengelolaan akun karyawan berada di `Pengaturan → Karyawan` dan khusus Owner.
- Owner dapat membuat akun Manager/Kasir, memilih cabang, role, status, permission khusus, dan mengirim reset password langsung dari aplikasi.
- Proses pembuatan karyawan memakai Firebase Auth sekunder sehingga sesi Owner tidak keluar.
- Firestore Rules diperbaiki untuk bootstrap Owner pertama, pembacaan profil sendiri, dan profil karyawan.
- Listener Firestore tidak dijalankan ketika UID Firebase tidak cocok dengan profil PIN aktif.
- Pesan teknis Firebase diterjemahkan menjadi penjelasan berbahasa Indonesia.
- Komponen pencarian dibuat ulang agar ikon tidak menimpa placeholder, termasuk tombol hapus dan ukuran sentuh Android.
- Changelog v4.4 tersedia langsung di dalam aplikasi.

## Fitur operasional yang dipertahankan

- Kasir, open bill, split payment, refund, void, retur, shift, dan audit log.
- Produk, kategori, varian, bundle, konversi satuan, barcode, dan label.
- Harga modal, markup persen, eceran, grosir, proyek, promo, diskon, dan pajak.
- Stok, opname, adjustment, transfer cabang, pembelian, dan hutang pemasok.
- Pelanggan, piutang, limit kredit, poin, reward, dan feedback.
- Tunai, QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, dan tempo.
- Nota 58/80 mm, logo/pesan toko, WhatsApp, gambar nota, dan nota online.
- Owner, Store Manager, Kasir, permission khusus, dan multi-cabang.
- Kamera barcode, scanner USB/Bluetooth keyboard, biometrik Android, profil printer, serta layar pelanggan.
- Dashboard dan laporan omzet, HPP, laba, pembayaran, stok, shift, hutang/piutang.

## Pengujian source

- **65/65 core tests lulus.**
- **51 file JS/JSX/MJS** lolos parser sintaks.
- Relative import, JSON, secret scan, dan larangan layanan berbayar lolos audit statis.

```bash
npm install
npm run test:core
npm run audit:static
npm run build
```

Workflow GitHub:

- `test-only`: tests, audit statis, dan kompilasi Vite.
- `web-only`: build PWA web/PC.
- `android-release`: build APK + AAB bertanda tangan.
- `web-and-android`: build web dan Android sekaligus.

## Urutan update wajib

1. Upload isi ZIP v4.4 ke repository GitHub yang sama.
2. Jalankan **Build Bumi Makmur POS v4.4 → test-only**.
3. Jalankan **Deploy Firebase Spark Rules** sebelum menguji login/karyawan pada APK.
4. Setelah dua workflow hijau, jalankan **android-release** memakai keystore lama.
5. Pasang APK v4.4 di atas APK lama; jangan uninstall agar data lokal tetap tersedia.

> PIN demo lokal hanya untuk pengujian source: Owner `1608`, Manager `2468`, Kasir `1234`. Pada penggunaan cloud, perangkat dihubungkan satu kali dengan Email/Password Firebase lalu login harian memakai PIN 4 digit atau biometrik.
