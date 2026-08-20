# QA Report — Bumi Makmur POS v5.6.0

## Hasil Otomatis

- Core/regression tests: **125 lulus, 0 gagal**.
- Static audit: **lulus**.
- Parser source: **82 file, 0 error sintaks**.
- JSON: **4 valid**.
- Pemeriksaan secret dan layanan berbayar: **lulus**.

## Matriks Uji Operasional Setelah Build

### Sinkronisasi
- Buat produk di Web, pastikan muncul di Android dan Windows.
- Ubah stok dari dua perangkat, pastikan delta digabung dan antrean kembali 0.
- Jalankan transaksi offline lalu sambungkan internet.
- Periksa Pusat Diagnostik dan ekspor laporan bila ada kegagalan.

### Impor
- Unduh template Excel.
- Impor produk pcs, kabel roll/meter, kabel ties pcs/pack, serta Philips varian watt.
- Periksa preview, kategori baru, SKU otomatis, harga kemasan, stok awal, dan baris gagal.
- Ulangi impor dengan mode update dan pastikan tidak membuat SKU duplikat.

### Penjualan dan Persetujuan
- Jual pcs, pack, dus, roll, serta kabel 3,5 meter.
- Scan shared barcode dan pilih varian.
- Scan barcode internal dan pastikan varian langsung dipilih.
- Berikan diskon melebihi batas Kasir dan verifikasi PIN persetujuan.
- Cetak nota, refund sebagian, dan cek HPP/laporan.

### Pembelian dan PO
- Buat PO tanpa menambah stok.
- Catat barang diterima dalam pack/roll dan cek stok dasar serta HPP.
- Catat utang/pembayaran pemasok dan retur.

### Role
- Owner: seluruh cabang dan pengaturan global.
- Store Manager: seluruh operasional cabangnya, tanpa akses global.
- Kasir: transaksi dan fungsi terbatas, tanpa ubah harga/cabang/status pelanggan.

### Backup dan Closing
- Ekspor backup JSON.
- Preview restore backup valid dan tolak file rusak.
- Tutup shift, cocokkan kas aktual, lalu cetak closing 80 mm.

### Perangkat Target
- Infinix Note 40 Pro+ portrait.
- Huawei MatePad SE 11 portrait/landscape.
- Windows 1366×768 dan Full HD.
- Chrome/Edge PWA.
- Scanner USB/Bluetooth dan kamera.
- Printer thermal/browser sesuai profil.

## Keputusan Rilis

Source layak dilanjutkan ke gerbang build GitHub. Status produksi final baru dinyatakan hijau setelah workflow `test-only`, deploy Firestore Rules, build Android, build Windows, dan smoke test perangkat nyata berhasil.
