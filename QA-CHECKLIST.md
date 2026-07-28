# QA Checklist Bumi Makmur POS v5.6.1

## Build, versi, dan keamanan
- [ ] `npm run test:core` menghasilkan 125 lulus, 0 gagal.
- [ ] `npm run audit:static` menampilkan `AUDIT LULUS`.
- [ ] Workflow `test-only` berhasil menjalankan Vite build.
- [ ] Firestore Rules v5.6.1 berhasil dideploy.
- [ ] Cloudflare Pages menampilkan v5.6.1.
- [ ] EXE/MSI dan APK/AAB muncul pada GitHub Release v5.6.1.
- [ ] Tidak ada Cloud Functions, Firebase Storage, Blaze, secret, atau private key di repository.

## Sinkronisasi Web–PC–Android
- [ ] Perubahan produk dari Web muncul di Windows dan Android.
- [ ] Perubahan stok simultan digabung sebagai delta.
- [ ] Transaksi offline tersimpan dan terkirim setelah internet kembali.
- [ ] Antrean offline kembali menjadi 0.
- [ ] Status sinkronisasi membedakan offline, antrean, tersinkron, dan sesi salah.
- [ ] Diagnostik menampilkan koleksi/operasi yang gagal dan dapat diekspor.
- [ ] Konflik sementara tidak memunculkan banner error permanen.

## Impor Excel/CSV
- [ ] Template CSV dapat diunduh dan dibuka.
- [ ] Template Excel dapat diunduh dan dibuka.
- [ ] Preview membedakan create, update, kategori baru, warning, dan error.
- [ ] Produk pcs, meter/roll, pcs/pack, serta produk varian dapat diimpor.
- [ ] Harga khusus kemasan tetap benar saat checkout.
- [ ] SKU otomatis unik dan barcode duplikat lintas produk ditolak.
- [ ] Mode tambah stok dan ganti stok menghasilkan audit movement.
- [ ] Baris gagal tidak ikut mengubah database.

## Produk, varian, satuan, dan harga
- [ ] Shared barcode memunculkan pemilih varian.
- [ ] Barcode internal langsung memilih varian.
- [ ] Harga pcs/pack/dus/roll sesuai pengaturan.
- [ ] Kabel 3,5 meter mengurangi stok 3,5 meter.
- [ ] Riwayat perubahan harga tampil pada lifecycle produk.
- [ ] Label barcode massal 58 mm, 80 mm, dan A4 dapat dicetak.
- [ ] Produk bersejarah hanya dapat diarsipkan, bukan dihapus permanen.

## Kasir, diskon, refund, dan nota
- [ ] Scanner kamera/USB/Bluetooth bekerja.
- [ ] Hold bill, split payment, pembulatan, dan metode digital bekerja.
- [ ] Diskon di atas batas Kasir meminta PIN approval.
- [ ] Approval mencatat approver, waktu, dan transaksi.
- [ ] Refund penuh/sebagian menjaga stok dan HPP.
- [ ] Nota cetak, digital, WhatsApp, dan layar pelanggan konsisten.

## PO, pembelian, dan pemasok
- [ ] PO dapat dibuat tanpa menambah stok.
- [ ] Barang diterima menambah stok dan memperbarui HPP.
- [ ] Pembelian pack/roll dikonversi ke satuan dasar.
- [ ] Utang, pembayaran, retur, dan laporan pembelian benar.

## Role dan cabang
- [ ] Owner dapat mengakses semua cabang tanpa memilih cabang saat login.
- [ ] Store Manager hanya mengakses operasional cabangnya.
- [ ] Store Manager tidak dapat mengubah Owner, brand global, restore/reset, atau Manager lain.
- [ ] Kasir hanya mengakses fungsi yang diizinkan.
- [ ] Direktori login hanya menampilkan karyawan aktif cabang terpilih.

## Backup, shift, dan audit
- [ ] Backup JSON memuat metadata versi dan tanggal.
- [ ] Preview restore menampilkan jumlah data.
- [ ] File backup rusak ditolak sebelum mengganti data.
- [ ] Closing shift menampilkan expected cash, actual cash, dan selisih.
- [ ] Laporan closing 80 mm dapat dicetak.
- [ ] Audit log mencatat perubahan penting.

## Perangkat target
- [ ] Infinix Note 40 Pro+ portrait.
- [ ] Huawei MatePad SE 11 portrait dan landscape.
- [ ] Windows 1366×768 dan Full HD.
- [ ] Chrome/Edge PWA.
- [ ] Scanner barcode USB/Bluetooth/kamera.
- [ ] Printer thermal/browser sesuai profil.
