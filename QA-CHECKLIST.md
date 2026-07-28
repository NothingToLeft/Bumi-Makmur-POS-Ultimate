# QA Checklist Bumi Makmur POS v5.2.2

## Build, versi, dan keamanan
- [ ] `npm run test:core` lulus seluruh test.
- [ ] `npm run audit:static` menampilkan `AUDIT LULUS`.
- [ ] Workflow `test-only` berhasil menjalankan Vite build.
- [ ] Workflow Firebase Rules hijau setelah perubahan `publicEmployees`.
- [ ] Cloudflare Pages menampilkan v5.2.2.
- [ ] EXE/MSI dan APK/AAB muncul pada GitHub Releases v5.2.2.
- [ ] Tidak ada Cloud Functions, Firebase Storage, Blaze, atau secret di repository.

## Login karyawan berbasis daftar nama
- [ ] Pilih cabang menampilkan hanya karyawan aktif pada cabang tersebut.
- [ ] Daftar menampilkan nama dan role, tanpa email atau UID.
- [ ] Memilih nama lalu PIN 4 digit berhasil login.
- [ ] Nama tidak perlu diketik manual.
- [ ] Tombol muat ulang memperbarui daftar.
- [ ] Akun yang dinonaktifkan atau dihapus hilang dari daftar.
- [ ] Store Manager hanya muncul pada cabang tugasnya.
- [ ] Daftar cache tetap tersedia pada perangkat yang pernah tersambung.
- [ ] Biometrik hanya berjalan setelah tombol ditekan.

## Produk & Stok terpadu
- [ ] Menu hanya menampilkan **Produk & Stok**, bukan Produk dan Stok terpisah.
- [ ] Tambah Barang & Stok menerima nama, SKU, barcode, satuan, harga, dan stok awal.
- [ ] Stok awal membuat pergerakan `INITIAL_STOCK`.
- [ ] Scan kamera dan scanner USB/Bluetooth mengisi barcode.
- [ ] SKU/barcode ganda ditolak per cabang.
- [ ] Filter stok rendah, kosong, dan pecahan bekerja.
- [ ] Penyesuaian stok mencatat alasan.
- [ ] Stok opname mencatat selisih.
- [ ] Transfer cabang memakai cabang aktif yang benar.
- [ ] Ekspor CSV dan lembar hitung stok dapat dibuat.

## Penjualan pecahan dan konversi
- [ ] Produk kabel dapat memakai satuan dasar `meter`.
- [ ] Konversi `1 roll = 50 meter` tersimpan.
- [ ] Langkah pecahan `0,1` menerima `2` dan `3,5` meter.
- [ ] Checkout `3,5 meter × harga per meter` menghasilkan total yang benar.
- [ ] Stok berkurang tepat `3,5 meter`.
- [ ] Checkout `1 roll` mengurangi `50 meter`.
- [ ] Refund mengembalikan jumlah dasar yang benar.
- [ ] Hold, split bill, nota, dan layar pelanggan menampilkan jumlah desimal.
- [ ] Pesanan WhatsApp/online `3,5 meter` masuk ke tagihan Kasir dengan base quantity yang sama.
- [ ] Produk nonpecahan tetap hanya menerima jumlah utuh.

## Pembelian dan restok multi-satuan
- [ ] Restok dapat memilih satuan dasar atau konversi.
- [ ] Pembelian `1 roll` menambah stok `50 meter`.
- [ ] Harga beli per roll menghasilkan HPP per meter yang benar.
- [ ] Retur pembelian mengurangi stok dalam satuan dasar dan menolak jumlah yang tidak sesuai langkah satuan.
- [ ] Utang pemasok dan pembayaran tetap tercatat.
- [ ] Riwayat pergerakan mencantumkan jumlah kemasan dan stok dasar.

## Promo dan histori
- [ ] Menu Promo tidak tampil.
- [ ] Transaksi baru memiliki `promoDiscount = 0`.
- [ ] Diskon item, diskon transaksi manual, loyalti, pajak, dan service tetap berjalan.
- [ ] Transaksi lama yang pernah memiliki promo tetap dapat dibuka dan dicetak.
- [ ] Pesan layar pelanggan tidak disebut promo diskon.

## Multi-cabang, role, dan cloud
- [ ] Owner dapat mengelola seluruh cabang dan karyawan.
- [ ] Store Manager hanya mengelola Kasir cabangnya.
- [ ] Kasir hanya melihat data sesuai hak akses.
- [ ] Perubahan PC muncul di Web/Android dan sebaliknya.
- [ ] Antrean offline kembali ke `0` setelah internet pulih.
- [ ] Konflik stok digabung sebagai delta, bukan overwrite.
- [ ] Transfer Manager memuat sumber dan tujuan tanpa error izin.
- [ ] QRIS setiap cabang tetap dapat dipindai.

## Perangkat target
- [ ] Infinix Note 40 Pro+ portrait.
- [ ] Huawei MatePad SE 11 portrait dan landscape.
- [ ] Windows Desktop pada resolusi 1366×768 dan Full HD.
- [ ] Scanner barcode USB/Bluetooth.
- [ ] Printer browser/thermal sesuai profil yang dipakai.
