# Bumi Makmur POS Ultimate v3.3

POS local-first untuk toko bahan bangunan, listrik, air, perlengkapan proyek, dan retail teknis. Project dibangun dengan React/Vite, disiapkan sebagai Web/PWA, dan dibungkus menjadi APK Android melalui Capacitor serta GitHub Actions.

## Perubahan utama v3.3

- Pembayaran premium untuk QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, tunai, dan tempo.
- Pilihan pembayaran cepat, QR merchant, nominal cepat tunai, nomor referensi, serta split payment.
- Nota digital terperinci yang bisa dikirim melalui WhatsApp, disalin, dibagikan, dicetak, dan dikirim ulang dari riwayat transaksi.
- Kustomisasi nota: logo, judul, footer, pesan khusus, pesan WhatsApp, informasi kasir/pelanggan, dan ukuran kertas 58/80 mm.
- Pengaturan QRIS: unggah gambar QR, nama merchant, serta petunjuk pembayaran.
- Metode e-wallet baru otomatis ditambahkan saat upgrade tanpa menghapus metode pembayaran lama.
- Tampilan sidebar, header, pembayaran, pengaturan, dan nota dibuat lebih premium.
- Perbaikan v3.2 tetap dipertahankan: izin kamera awal, scanner, biometrik Android, release signing, dan validasi transaksi/stok.

## Target perangkat

- Infinix Note 40 Pro+ portrait
- Huawei MatePad SE 11 portrait dan landscape
- Browser PC/laptop untuk administrasi dan pengujian

## PIN demo

- Owner: `1608`
- Store Manager: `2468`
- Kasir: `1234`

PIN aplikasi disimpan sebagai PBKDF2-SHA256, bukan teks biasa.

## Modul

1. Dashboard per cabang
2. Kasir cepat, pencarian, favorit, dan barcode
3. Open bill, split bill, dan split payment
4. Produk, varian, bundle, konversi satuan, SKU, dan barcode
5. Harga modal, markup persen, eceran, grosir, dan proyek
6. Promo, loyalty, diskon, pajak, service charge, dan pembulatan
7. Stok, movement, adjustment, opname, transfer cabang, rak, dan stok minimum
8. Pembelian, penerimaan, hutang pemasok, pembayaran, dan retur
9. Pemasok, pelanggan, member, piutang, reward, dan batas kredit
10. Shift kasir, modal awal, kas masuk/keluar, dan selisih
11. Transaksi, cetak ulang, refund, void, dan approval manager
12. Pengeluaran, laporan omzet/HPP/laba, metode pembayaran, dan stok
13. Pesanan WhatsApp/marketplace/delivery/proyek
14. Owner, Manager, Kasir, permission khusus, dan multi-cabang
15. Profil printer, customer display, kampanye, backup/restore, audit log, dan sync queue
16. Pengaturan keamanan kamera serta login biometrik Android

## Menjalankan versi web

```bash
npm install
npm run dev
```

Buka URL yang tampil, biasanya `http://localhost:5173`.

## Build web

```bash
npm run build
npm run preview
```

Hasil build berada di `dist/`.

## Build Android lokal

```bash
npm install
npm run android:add
npm run android:open
```

Perintah `android:prepare` memasang permission kamera/biometrik, plugin native, nomor versi, dan konfigurasi release signing.

## Build APK bertanda tangan lewat GitHub

Lihat [ANDROID-SIGNING-SETUP.md](ANDROID-SIGNING-SETUP.md). Ringkasnya:

1. Jalankan workflow **Generate Android Signing Key** satu kali.
2. Download dan simpan artifact keystore di dua tempat aman.
3. Masukkan empat nilai dari `SIGNING-SECRETS.txt` ke GitHub Actions Secrets.
4. Jalankan workflow **Build Signed Android Release**.
5. Download artifact `Bumi-Makmur-POS-signed-release`.

Artifact berisi APK, AAB, checksum SHA-256, dan informasi sertifikat.

## Kamera

- Pada APK Android, permission kamera diminta saat aplikasi pertama dibuka.
- Jika izin pernah ditolak permanen, buka **Pengaturan → Keamanan → Pengaturan Android**, lalu aktifkan Kamera.
- Pemindaian otomatis memakai `BarcodeDetector` ketika tersedia. Input manual dan scanner barcode USB tetap menjadi fallback.

## Login biometrik

1. Masuk menggunakan PIN.
2. Buka **Pengaturan → Keamanan**.
3. Pastikan sidik jari atau pengenalan wajah sudah didaftarkan pada Android.
4. Tekan **Aktifkan untuk Akun Ini** dan verifikasi biometrik.
5. Pada login berikutnya, gunakan tombol biometrik atau aktifkan prompt otomatis.

Biometrik diverifikasi oleh dialog sistem Android. Aplikasi tidak membaca atau menyimpan data sidik jari/wajah.

## Penyimpanan dan cloud

- Data operasional disimpan lokal lebih dahulu.
- Perubahan dicatat dalam `syncQueue`.
- Firebase asli belum dikonfigurasi; file `firebase.example.js` hanya fondasi adapter.
- Lakukan Backup JSON sebelum mengganti APK debug lama dengan APK release pertama.

## Catatan update APK

APK hanya dapat memperbarui instalasi lama jika package ID dan sertifikat signing sama serta nomor versinya meningkat. APK debug lama menggunakan sertifikat berbeda dari release key v3.2, jadi mungkin perlu dihapus satu kali setelah Backup JSON. Setelah release v3.2 terpasang, semua update berikutnya harus memakai keystore yang sama.
