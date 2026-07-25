# Bumi Makmur POS FreeSync v4.3

Satu source code untuk **Android HP/tablet, web, dan aplikasi PC PWA**. Dirancang untuk toko bahan bangunan, listrik, dan air, dengan target utama Infinix Note 40 Pro+ dan Huawei MatePad SE 11.

## Arsitektur tanpa biaya

- Firebase Authentication Email/Password pada paket Spark.
- Cloud Firestore pada paket Spark untuk data dan realtime.
- Firestore persistent cache + antrean lokal terenkripsi untuk operasi offline.
- Perubahan offline otomatis dikirim ketika internet kembali.
- Cloudflare Pages sebagai hosting web/PWA utama.
- Capacitor untuk APK/AAB Android.
- PWA dapat dipasang di Windows melalui Chrome/Edge.
- Tidak memakai Cloud Functions, Firebase Storage, atau billing Blaze.

## Fitur yang dipertahankan

- Kasir, open bill, split bill, split payment, refund, void, retur, shift, audit log.
- Produk, kategori, varian, modifier, bundle, konversi satuan, barcode, label.
- Harga modal, markup persen, eceran, grosir, proyek, promo, diskon, pajak.
- Stok, opname, adjustment, transfer cabang, pembelian, hutang pemasok.
- Pelanggan, piutang, limit kredit, poin, reward, feedback.
- Tunai, QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, tempo.
- Nota 58/80 mm, logo/pesan toko, WhatsApp, gambar nota, nota online.
- Owner, Store Manager, Kasir, permission khusus, multi-cabang.
- Kamera barcode, input manual, scanner USB/Bluetooth mode keyboard, biometrik Android, printer profiles, customer display.
- Dashboard dan laporan omzet, HPP, laba, pembayaran, stok, shift, hutang/piutang.

## Pengujian

Audit terakhir: **59/59 core tests lulus**, 49 file JS/JSX/MJS lolos pemeriksaan sintaks, relative imports/JSON/secrets/layanan berbayar lolos audit statis.


```bash
npm install
npm run test:core
npm run build
```

Workflow GitHub menyediakan:

- `test-only`: core tests, audit statis, dan kompilasi Vite tanpa Firebase/signing.
- `web-only`: build PWA web/PC.
- `android-release`: build APK + AAB bertanda tangan.
- `web-and-android`: keduanya sekaligus.

## Mulai

1. Ikuti `FIREBASE-SPARK-SETUP.md`.
2. Deploy rules melalui workflow **Deploy Firebase Spark Rules**.
3. Ikuti `CLOUDFLARE-PAGES-SETUP.md` untuk web dan PC.
4. Jalankan workflow Android memakai keystore release yang sama.

PIN demo lokal sebelum cloud dipasangkan:

- Owner `1608`
- Manager `2468`
- Kasir `1234`

> PIN demo hanya untuk pengujian lokal. Pada penggunaan cloud, setiap akun memakai Email/Password Firebase saat pemasangan pertama di perangkat, lalu PIN 4 digit/biometrik untuk penggunaan harian.
