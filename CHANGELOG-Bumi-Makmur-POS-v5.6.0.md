# Bumi Makmur POS v5.6.0

## Stability, Sync, Import & Operational Audit

Rilis v5.6.0 memusatkan pengembangan pada stabilitas Web–PC–Android, kemudahan migrasi barang awal, keamanan tindakan penting, dan konsistensi operasional seluruh cabang. Seluruh fitur katalog, varian, shared barcode, harga per satuan, penjualan pecahan, Store Manager operasional, QRIS cabang, serta lifecycle produk aman dari versi sebelumnya tetap dipertahankan.

## Sinkronisasi dan Diagnostik Cloud

- Status cloud kini membedakan `Tersinkron`, `Tersimpan lokal`, `Menunggu sinkronisasi`, `Offline`, `Sesi perlu dihubungkan ulang`, dan `Akses ditolak`.
- Konflik lintas perangkat direbase terhadap data cloud terbaru; perubahan stok tetap digabung sebagai delta, bukan overwrite angka mentah.
- Antrean offline diringkas berdasarkan operasi dan koleksi agar mudah dilacak.
- Menambahkan Pusat Diagnostik Cloud dengan waktu, koleksi, tindakan, kode masalah, dan saran perbaikan.
- Diagnostik dapat diekspor sebagai JSON atau dibersihkan tanpa menghapus data operasional.
- Banner error tidak lagi muncul untuk kondisi normal seperti offline atau antrean sementara.
- Sinkronisasi tetap bertahap, idempoten, tahan restart, dan memakai Firebase Spark tanpa layanan berbayar.

## Impor Excel/CSV Produk dan Stok

- Menambahkan impor `.xlsx`, `.xls`, dan `.csv` langsung dari menu Produk & Stok.
- Menyediakan template CSV dan Excel siap isi.
- Mendukung nama, SKU, barcode, kategori, satuan dasar, stok awal, stok minimum, lokasi rak, harga modal, harga jual, varian, shared barcode, serta harga khusus pack/dus/box/roll.
- Contoh konversi: `pack=100@45000|42000|40000` untuk isi 100 pcs dengan harga eceran/grosir/proyek khusus.
- Preview sebelum impor menampilkan data baru, pembaruan, kategori baru, peringatan, dan baris gagal.
- Mode impor dapat membuat data baru saja atau memperbarui SKU yang sudah ada.
- Stok dapat ditambahkan ke stok lama atau mengganti stok cabang melalui pergerakan audit resmi.
- SKU otomatis profesional tetap mengikuti pola seperti `BM-PHI-LED-006` dan dibuat unik.

## Katalog, Harga, dan Label

- Menambahkan riwayat perubahan harga modal, eceran, grosir, dan proyek per produk.
- Riwayat harga menyimpan pengguna, waktu, sumber perubahan, nilai lama, dan nilai baru.
- Menambahkan cetak label barcode massal dengan pencarian, pilihan produk, jumlah salinan, dan ukuran 58 mm, 80 mm, atau A4.
- Produk/varian tetap diurutkan natural berdasarkan nama dan angka.
- Harga khusus per satuan jual tetap terintegrasi dengan checkout, pembelian, nota, refund, HPP, dan laporan.

## Purchase Order dan Restok

- Pembelian kini membedakan `Purchase Order` dan `Barang Diterima`.
- PO dapat dibuat lebih dahulu tanpa langsung menambah stok.
- Penerimaan barang tetap memperbarui stok dasar, HPP, utang pemasok, dan pergerakan persediaan.
- Ringkasan status memisahkan PO dipesan dan pembelian yang sudah diterima.
- Restok multi-satuan tetap mendukung pcs, pack, dus, box, roll, meter, kilogram, liter, dan konversi lain.

## Persetujuan Operasional

- Diskon kasir dan Store Manager memiliki batas persentase yang dapat dikonfigurasi.
- Diskon di atas batas meminta PIN Owner/Store Manager dan menghasilkan approval token serta audit request.
- Owner tetap dapat menyelesaikan transaksi tanpa persetujuan tambahan.
- Struktur approval disiapkan untuk tindakan sensitif lain tanpa membuka akses global kepada Store Manager.

## Backup dan Pemulihan Aman

- File backup divalidasi sebelum data lokal/cloud diganti.
- Preview restore menampilkan versi, tanggal, identitas toko, jumlah cabang, produk, transaksi, pembelian, dan pengguna.
- Backup rusak, struktur tidak dikenal, atau ID duplikat ditolak sebelum menyentuh database.
- Export backup memuat metadata versi dan waktu pembuatan.

## Shift dan Closing Harian

- Shift yang sudah ditutup dapat dicetak sebagai laporan closing 80 mm.
- Laporan memuat kas awal, penjualan tunai, kas masuk, kas keluar, kas seharusnya, kas aktual, dan selisih.
- Riwayat closing tetap mengikuti cabang dan kasir yang benar.

## Store Manager dan Keamanan

- Store Manager tetap menjadi kepala operasional cabang: produk, stok, kategori, pembelian, pemasok, pelanggan, laporan, QRIS, printer, dan Kasir cabangnya.
- Store Manager tidak dapat mengubah Owner, brand global, keamanan utama, cabang lain, restore/reset cloud, atau membuat Manager lain.
- Koleksi baru `purchaseOrders`, `productPriceHistory`, `approvalRequests`, dan `deviceSessions` memiliki pembatasan Firestore berbasis role dan cabang.
- Tetap tanpa Cloud Functions, Firebase Storage, Firebase Blaze, atau billing.

## Quality Assurance

- 125 core/regression tests lulus.
- Audit statis lulus untuk 82 file JavaScript/JSX/MJS dan 4 file JSON.
- Parser JavaScript/JSX memeriksa 82 file tanpa error sintaks.
- Workflow GitHub v5.6.0 mendukung test-only, Web/PWA, Android APK/AAB, Windows EXE/MSI, GitHub Releases, dan deploy Firestore Rules.
