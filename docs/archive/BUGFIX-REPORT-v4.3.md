# Audit & Bugfix Bumi Makmur POS FreeSync v4.3

## Perubahan arsitektur

- Menghapus ketergantungan Cloud Functions dan Firebase Storage.
- Mengganti autentikasi callable menjadi Firebase Auth Email/Password.
- Mengganti mutasi server menjadi transaksi Firestore client yang idempotent dan conflict-aware.
- Mengaktifkan Firestore persistent multi-tab cache.
- Menjadikan Cloudflare Pages hosting web/PWA utama.

## Bug yang diperbaiki

- Splash/loading tidak dipanggil ulang oleh background sync.
- Retry sinkronisasi ganda dicegah dan memakai exponential backoff.
- PIN harian dapat membuka cache offline; kredensial cloud tersimpan terenkripsi AES-GCM berbasis PIN dan secret perangkat.
- Kasir dapat memperbarui stok dari transaksi tanpa memperoleh hak edit produk komersial.
- Kasir dapat memperbarui poin/piutang yang diperlukan, tetapi tidak dapat mengubah price tier, limit kredit, cabang, atau status pelanggan.
- Rules create/update/delete dipisahkan agar operasi delete tidak mengakses `request.resource` yang tidak tersedia.
- Nota online kini menyertakan identitas toko dari `configs` yang benar, bukan membaca field settings pada level yang salah.
- Nota publik menyimpan `cashierName`, payment ID, logo terkompresi, serta hanya data penjualan yang aman.
- Batas logo dan QRIS diturunkan agar gabungan konfigurasi tidak melewati batas dokumen Firestore.
- Route `/receipt/:token` didukung oleh SPA redirect Cloudflare/Netlify.
- PWA shortcut Kasir/Produk/Laporan kini dibaca oleh aplikasi.
- Service worker v4.3 tidak memaksa reload dan tidak menahan index lama.
- Workflow diperbarui ke Node 24/actions terbaru dan dapat build web, PC PWA, APK, serta AAB.

- Konflik palsu akibat urutan key object berbeda diperbaiki dengan serialisasi kanonis.
- Sinkronisasi menolak sesi Firebase yang UID-nya tidak sama dengan profil PIN aktif.
- Pembuatan karyawan membersihkan akun Auth yatim bila penulisan profil Firestore gagal.
- Daftar karyawan Manager dibatasi ke cabang yang ditugaskan; nota publik tidak dapat di-list/scrape.
- Transfer stok Manager hanya dapat dikirim dari cabang tugasnya; transfer masuk harus berasal dari Owner/Manager cabang sumber.
- HPP dan performa produk sekarang menghitung refund/restock secara neto.
- Pembelian bersih mengurangi retur pemasok; retur juga memperbarui hutang dan menghitung ulang harga modal terbaru.
- Pembayaran hutang/piutang memperbarui timestamp dan riwayat tanpa menimpa pembayaran perangkat lain.
- Scanner USB/Bluetooth mode keyboard dapat menambah produk langsung dari halaman kasir; Enter pada pencarian juga mengenali SKU/barcode persis.
- Barcode varian dan barcode konversi satuan membawa varian/satuan yang sesuai ke keranjang.

## Audit fitur

Seluruh modul utama v4.2 dipertahankan. Lihat `docs/FEATURE-MATRIX.md` dan `../history/QA-CHECKLIST.md`.

## Verifikasi

- Core/static tests: 59/59 lulus pada source audit.
- Pemeriksaan sintaks 49 file `.js/.jsx/.mjs`: lulus.
- Relative import audit: lulus.
- JSON validation: lulus.

Build Vite dan Android release tetap diverifikasi oleh GitHub Actions. Mode `test-only` kini juga menjalankan kompilasi Vite sehingga kesalahan import/JSX terdeteksi sebelum build APK.
