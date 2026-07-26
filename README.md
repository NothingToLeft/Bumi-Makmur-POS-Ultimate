# Bumi Makmur POS FreeSync v4.5

Satu source code untuk **Android HP/tablet, web, dan aplikasi PC PWA**. Rilis v4.5 memusatkan perbaikan pada login cabang + nama + PIN, manajemen karyawan dari Pengaturan, Store Manager per cabang, biometrik eksplisit, dan sinkronisasi web–HP yang lebih tahan konflik.

## Arsitektur tanpa biaya

- Firebase Authentication Email/Password internal pada paket Spark.
- Cloud Firestore pada paket Spark untuk data, realtime, aturan akses, dan direktori login.
- Firestore persistent cache + antrean lokal terenkripsi untuk operasi offline.
- Cloudflare Pages sebagai hosting web/PWA utama.
- Capacitor untuk APK/AAB Android.
- PWA dapat dipasang di Windows melalui Chrome/Edge.
- **Tidak memakai Cloud Functions, Firebase Storage, Blaze, atau billing.**

## Perubahan utama v4.5

- Login Owner dan Karyawan tetap terpisah.
- Karyawan cukup memilih **toko/cabang**, memasukkan **nama login**, lalu **PIN 4 digit**.
- Sidik jari/Face ID hanya muncul setelah tombol biometrik ditekan.
- Tambah, edit, nonaktifkan, ganti PIN, dan hapus karyawan dilakukan dari `Pengaturan → Karyawan`.
- Owner dapat membuat Store Manager dan Kasir untuk cabang mana pun.
- Store Manager dapat mengelola Kasir pada cabangnya sendiri, tetapi tidak dapat membuat cabang atau mengubah pengaturan global Owner.
- Cabang baru otomatis masuk ke pilihan login setelah sinkronisasi.
- Konflik perubahan dari web dan HP direbase otomatis dan dicoba kembali tanpa memenuhi layar dengan error cloud.
- Firestore Rules membatasi profil, cabang, audit, dan hak pengelolaan karyawan sesuai role.

## Fitur operasional yang dipertahankan

- Kasir, open bill, split payment, refund, void, retur, shift, dan audit log.
- Produk, kategori, varian, bundle, konversi satuan, barcode, dan label.
- Harga modal, markup persen, eceran, grosir, proyek, promo, diskon, dan pajak.
- Stok, opname, adjustment, transfer cabang, pembelian, dan hutang pemasok.
- Pelanggan, piutang, limit kredit, poin, reward, dan feedback.
- Tunai, QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, dan tempo.
- Nota 58/80 mm, logo/pesan toko, WhatsApp, gambar nota, dan nota online.
- Kamera barcode, scanner USB/Bluetooth keyboard, biometrik Android, profil printer, dan layar pelanggan.
- Dashboard serta laporan omzet, HPP, laba, pembayaran, stok, shift, hutang/piutang.

## Pemeriksaan source

- **71/71 core tests lulus.**
- **53 file JS/JSX/MJS** lolos pemeriksaan sintaks.
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

1. Backup JSON dari aplikasi lama dan pastikan antrean offline kosong.
2. Upload isi ZIP v4.5 ke repository GitHub yang sama.
3. Jalankan **Build Bumi Makmur POS v4.5 → test-only**.
4. Jalankan **Deploy Firebase Spark Rules** sebelum menguji login nama + PIN.
5. Setelah hijau, jalankan **android-release** memakai keystore lama.
6. Pasang APK v4.5 di atas APK v4.4; jangan uninstall.
7. Login Owner sekali agar daftar cabang login publik diperbarui.
8. Buka `Pengaturan → Karyawan`, migrasikan akun lama atau buat akun baru, lalu uji login Karyawan.

> PIN demo lokal hanya untuk pemeriksaan source: Owner `1608`, Manager `2468`, Kasir `1234`. Pada penggunaan cloud, buat akun dari Pengaturan dan gunakan nama login + PIN yang ditentukan Owner/Manager.
