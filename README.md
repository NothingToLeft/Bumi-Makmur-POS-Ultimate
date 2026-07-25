# Bumi Makmur POS Spark Free Hybrid v4.2

Aplikasi POS profesional untuk toko bahan bangunan, listrik, dan perlengkapan air. Project ini berjalan sebagai React/Vite, PWA, serta APK/AAB Android melalui Capacitor.

## Arsitektur aktif

- **Firebase Spark gratis**: Authentication Email/Password, Cloud Firestore, Security Rules, Indexes, dan Hosting.
- **Tanpa Cloud Functions dan tanpa Cloud Storage** sehingga tidak memerlukan paket Blaze.
- Login pertama memakai Email/Password Firebase, lalu PIN 4 digit atau biometrik untuk membuka perangkat.
- Cache lokal IndexedDB dan antrean mutasi membuat transaksi tetap berjalan saat internet putus.
- Saat internet kembali, mutasi otomatis dikirim ke Firestore dengan transaksi atomik, idempotency, audit log, dan penanganan konflik.
- Logo serta QRIS dikompresi dan disimpan sebagai data aplikasi agar tetap dapat digunakan pada paket Spark.

## Struktur Firebase yang digunakan

```text
stores/bumi-makmur
├── users/{firebaseUid}
├── branches/BM001
├── system/settings
├── products/{id}
├── sales/{id}
└── collection operasional lainnya

publicReceipts/{token}
```

Profil Owner awal harus berada di:

```text
stores/bumi-makmur/users/{UID_OWNER}
```

## Menjalankan di PC

```bash
npm install
npm run test:core
npm run dev
```

Build web:

```bash
npm run build
```

## Build APK/AAB di GitHub

Gunakan workflow:

```text
Actions → Build Signed Android Spark Free Hybrid Release
```

Workflow memakai signing key release yang sama dengan versi sebelumnya dan menghasilkan APK serta AAB bertanda tangan.

## Deploy Firebase gratis

Security Rules wajib diperbarui dari file `firestore.rules`. Cara termudah adalah menyalinnya ke Firebase Console → Firestore → Rules → Publish.

Hosting, rules, dan indexes juga dapat dideploy dengan:

```bash
npm run firebase:deploy:free
```

atau workflow **Deploy Firebase Spark Free Rules and Hosting** setelah secret `FIREBASE_TOKEN` tersedia.

## Fitur utama

Kasir, open bill, split payment, pembayaran digital, nota WhatsApp/online, produk, multi-harga dan markup, barcode, stok, pembelian, pemasok, pelanggan, loyalty, hutang/piutang, shift, kas, refund/void, laporan, pesanan online, multi-cabang, karyawan, printer, customer display, backup/restore, kamera, biometrik, offline queue, dan sinkronisasi Firebase.

## Catatan keamanan Spark

Validasi bisnis utama tetap dijalankan di domain logic aplikasi dan Firestore Rules. Karena paket Spark tidak memakai backend tepercaya Cloud Functions, jangan membagikan akun Owner dan jangan menonaktifkan Security Rules. Owner sebaiknya melakukan audit berkala melalui menu Audit Log dan laporan stok.

Baca `FIREBASE-SPARK-FREE-SETUP.md`, `UPDATE-TO-v4.2.md`, dan `QA-REPORT-v4.2.md` sebelum dipakai untuk transaksi nyata.
