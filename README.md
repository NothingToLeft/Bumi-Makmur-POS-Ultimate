# Bumi Makmur POS Hybrid Enterprise v4.1

POS profesional untuk toko bahan bangunan, listrik, dan air. Project ini berjalan sebagai web/PWA dan dapat dibungkus menjadi APK/AAB Android melalui Capacitor.

## Mode data hybrid

- Saat internet tersedia, data tersambung realtime ke Firebase.
- Saat internet terputus, aplikasi tetap dapat dipakai menggunakan cache IndexedDB perangkat.
- Setiap perubahan offline masuk ke antrean lokal yang persisten.
- Begitu koneksi kembali, antrean otomatis dikirim ke Cloud Functions dan Firestore.
- Mutasi memakai ID idempoten agar pengiriman ulang tidak menggandakan transaksi.
- Konflik stok, poin, pembayaran hutang/piutang, dan retur digabungkan secara aman.
- Login offline tersedia setelah pengguna berhasil login online minimal sekali pada perangkat tersebut. Kredensial offline berlaku 30 hari dan disimpan sebagai PBKDF2-SHA256, bukan PIN mentah.

## Fitur utama

- Kasir: barcode kamera/manual/USB, produk favorit, varian, modifier, bundle, item kustom, satuan dan konversi.
- Harga: modal, markup persen, harga eceran, grosir, dan proyek.
- Pembayaran: tunai, QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, tempo, split payment.
- Open bill, split bill, promo, diskon item/transaksi, loyalty, pajak, service, dan pembulatan.
- Produk, stok minimum, rak, movement, adjustment, opname, transfer cabang, pembelian dan retur.
- Pelanggan, pemasok, hutang, piutang, cicilan, limit kredit, poin dan reward.
- Shift, modal awal, kas masuk/keluar, expected cash, selisih, refund dan void.
- Nota 58/80 mm, logo, pesan toko, nota WhatsApp, bagikan gambar, dan nota online.
- Laporan omzet, HPP, laba, pembayaran, stok, refund, hutang/piutang, dan shift.
- Multi-cabang, Owner/Manager/Kasir, Firebase Auth custom token, Firestore Rules, audit log server.
- Kamera saat startup, biometrik Android, printer profile, layar pelanggan, backup/restore JSON.

## Menjalankan web

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run test:core
npm run build
```

## Firebase

Salin `.env.example` menjadi `.env.local`, isi konfigurasi Firebase, kemudian ikuti `FIREBASE-CLOUD-SETUP.md` dan `HYBRID-OFFLINE-SYNC.md`.

Cloud backend:

```bash
cd functions
npm install
cd ..
npm run firebase:deploy
```

## Android signed release

Gunakan workflow GitHub Actions **Build Signed Android Hybrid Release**. Jangan membuat signing key baru bila aplikasi release sebelumnya sudah terpasang. Panduan ada di `ANDROID-SIGNING-SETUP.md`.

Artifact yang dihasilkan:

```text
Bumi-Makmur-POS-Hybrid-v4.1.0-signed.apk
Bumi-Makmur-POS-Hybrid-v4.1.0-signed.aab
```

## Catatan operasional

- Refund/void oleh Kasir tetap membutuhkan internet untuk approval Manager/Owner yang aman.
- Pembuatan atau perubahan PIN karyawan, restore cloud, reset database, dan upload aset Firebase membutuhkan internet.
- Transaksi kasir, pembelian, stok, pelanggan, pengeluaran, shift, hutang/piutang, dan sebagian besar operasi harian tetap dapat dilakukan offline.
- Lakukan backup JSON berkala walaupun data tersimpan di cloud.
