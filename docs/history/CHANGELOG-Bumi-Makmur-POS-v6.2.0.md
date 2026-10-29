# Changelog — Bumi Makmur POS v6.2.0

## Data Integrity & Timeline
- Seluruh koleksi riwayat operasional dinormalisasi ke urutan deterministik **terbaru → terlama** setelah load cache, bootstrap Firebase, realtime listener, dan commit lokal.
- Menambahkan parser waktu terpadu untuk ISO string, epoch detik/milidetik, `Date`, Firestore `Timestamp`, dan timestamp hasil serialisasi.
- Halaman **Transaksi, Refund & Void** mendapat sorting Terbaru/Terlama/Nominal dan pencarian invoice, pelanggan, barang, SKU, barcode, serta pembayaran.
- Dashboard transaksi terbaru, pembelian, PO, quotation, serial, garansi, pergerakan stok, shift, dan audit mengikuti urutan data yang konsisten.
- Default Kasir tidak lagi mengambil `customers[0]` dari snapshot Firestore; pelanggan **Umum** dipilih secara eksplisit.

## Cash & Reporting Correctness
- Metode pembayaran tunai pada laporan sekarang memakai **penerimaan bersih setelah kembalian**. Contoh: total Rp39.000, pelanggan memberi Rp50.000, maka laporan Tunai mencatat Rp39.000, bukan Rp50.000.
- Refund mengurangi breakdown metode pembayaran sesuai dana yang benar-benar dikembalikan; VOID tidak dikurangi dua kali.
- Operational Health dan Dashboard tidak memasukkan transaksi `VOID`/`VOIDED` sebagai omzet.
- Closing Summary menerima timestamp Firestore/legacy dan menghitung VOID secara kompatibel.

## Professional Daily Closing PDF
- PDF Tutup Harian dirombak menjadi layout A4 profesional merah–hitam sesuai identitas Bumi Makmur 2.
- Memakai logo resmi `/logo-bm.svg`, informasi shift, kartu omzet/laba/transaksi/selisih, ringkasan penjualan, pembayaran, kas, operasional, dan footer versi aplikasi.
- Renderer profesional memakai Canvas → JPEG → PDF lokal; fallback PDF kompatibilitas tetap tersedia jika Canvas tidak tersedia.
- Nama file memakai tanggal lokal perangkat, bukan UTC, sehingga closing setelah tengah malam tidak salah tanggal.
- PDF tetap **lokal/on-demand** dan tidak disimpan ke Firebase Storage.

## Additional Production Hardening
- Filter **Void / Dibatalkan** sekarang juga mengenali status legacy `VOID`, bukan hanya `VOIDED`.
- Fallback timestamp transaksi diperluas ke `completedAt → createdAt → updatedAt → date → timestamp`.
- Receipt, Audit Cloud, Cloud & Backup, Customer History, Open Bill, Control Center, dan Customer Display memakai formatter timestamp terpadu sehingga Firebase Timestamp tidak berubah menjadi `Invalid Date`.
- Perhitungan modal terakhir dari riwayat pembelian memakai parser timestamp terpadu, bukan coercion `new Date(object)`.
- Perhitungan akhir garansi serial menerima `soldAt` legacy/Firestore Timestamp dengan aman.

## Stability
- Rendering tanggal pada receipt, produk, pembelian, quotation, warranty, shift, dan laporan diperkuat agar aman terhadap Firestore Timestamp.
- Unified AutoSync v6.1.x, role/permission, offline queue, Firebase Spark, Customer Display, AI Product Assistant, Smart Receiving, barcode, PO, varian, bundle, serial/garansi, backup, Android, Windows, dan Web tetap dipertahankan.
- Firestore Rules **tidak berubah** dari ruleset v6.1.0.
