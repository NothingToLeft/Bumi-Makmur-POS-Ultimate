# Bumi Makmur POS v5.2.1 — Cable Half-Meter & Quantity Usability Fix

## Kelipatan kabel diperbaiki

- Mengganti input angka bebas **Langkah jumlah terkecil** dengan pilihan **Kelipatan penjualan** yang jelas.
- Kabel dengan satuan dasar meter sekarang otomatis disarankan **0,5 meter (setengah meter)**.
- Nilai lama yang hampir setengah meter, termasuk `0,499`, otomatis dinormalisasi menjadi `0,5` saat data dimuat.
- Kasir hanya menerima jumlah yang sesuai kelipatan, misalnya `0,5`, `1`, `1,5`, `2`, `2,5`, `3`, dan `3,5` meter.
- Menambahkan tombol jumlah cepat saat checkout untuk barang pecahan.
- Menambahkan penjelasan langsung bahwa jumlah yang tidak sesuai akan dibulatkan ke kelipatan produk.

## Form Produk & Stok

- Menambahkan preset **Kabel: 1 roll = 50 meter**.
- Mengganti istilah teknis yang membingungkan dengan bahasa operasional toko.
- Perubahan satuan dasar otomatis menawarkan kelipatan yang masuk akal.
- Stok awal dan stok minimum otomatis diselaraskan dengan kelipatan penjualan.
- Migrasi data lama memperbaiki kelipatan kabel tanpa mengubah jumlah stok, harga, atau riwayat transaksi.

## Pembelian dan restok

- Memperbaiki tata letak form Pembelian/Restok agar tombol **Tambah ke Daftar** tidak menimpa panel ringkasan pada desktop atau layar sempit.
- Kolom barang, satuan, jumlah, harga, dan tombol dibuat responsif hingga monitor lebar.
- Mengganti satuan barang yang sudah ditambahkan sekarang mempertahankan modal efektif per satuan dasar.
- Menambahkan keterangan konversi yang jelas, misalnya `1 roll menambah 50 meter`.
- Retur pembelian otomatis mengikuti kelipatan satuan yang dipakai.

## Audit jumlah pecahan menyeluruh

- Checkout, edit item, split bill, refund, retur pembelian, penyesuaian stok, stok opname, transfer cabang, pembelian, dan pesanan online dinormalisasi dengan aturan kuantitas yang sama.
- Penyesuaian stok mendukung nilai bertanda, misalnya `+10`, `-1,5`, tetapi tetap mengikuti kelipatan barang.
- Stok opname dan transfer dibuat responsif serta menampilkan batas dan kelipatan yang berlaku.
- Nota, layar pelanggan, riwayat transaksi, dan dokumen pembelian menampilkan angka pecahan dengan format Indonesia.

## Identitas Desktop

- Nama aplikasi Desktop, sidebar, header, nota, dan layar pelanggan tetap mengikuti identitas cabang aktif.
- Perubahan ini tidak memisahkan data Web, PC, Android, atau cabang.

## Kompatibilitas

- Firebase Spark/free tier tetap dipertahankan.
- Tidak menggunakan Cloud Functions, Firebase Storage, Blaze, atau billing.
- Tidak ada perubahan skema izin Firestore pada hotfix ini.
- Data v5.2.0 dapat diperbarui langsung tanpa uninstall dan tanpa reset database.

## QA

- Core tests: **100/100 lulus**.
- Static audit: **lulus**.
- JS/JSX/MJS: **66 file diperiksa**.
- JSON: **4 file valid**.
- Parser TypeScript: **62 file source, 0 error sintaks**.
- Vite production build tetap wajib dijalankan melalui GitHub Actions karena pemasangan dependency lokal mengalami timeout.
