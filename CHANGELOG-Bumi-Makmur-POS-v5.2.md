# Changelog Bumi Makmur POS v5.2.2

## Responsive Sidebar Identity Fix
- Nama cabang panjang tampil utuh hingga dua baris.
- Ukuran huruf identitas menyesuaikan panjang nama.
- Sidebar desktop diperlebar secara terukur dan versi aplikasi dipisahkan pada baris metadata.
- Tidak ada perubahan data atau Firestore Rules.


## Smart Inventory & Fractional Sales

### Login karyawan lebih cepat
- Mengganti kolom nama login manual dengan dropdown **Nama Karyawan**.
- Urutan login menjadi cabang → nama karyawan → PIN 4 digit.
- Daftar hanya berisi akun aktif pada cabang yang dipilih.
- Menambahkan tombol muat ulang dan cache daftar untuk perangkat yang pernah tersambung.
- Menambahkan publikasi otomatis daftar aman oleh Owner/Store Manager setelah login.
- Dokumen publik tidak memuat UID, email, PIN, hash PIN, telepon, atau data transaksi.

### Produk & Stok disatukan
- Menggabungkan menu Produk dan Stok menjadi **Produk & Stok**.
- Pengguna baru dapat membuat barang sekaligus memasukkan stok awal.
- Menambahkan tab Barang & Stok, Pergerakan, Penyesuaian, Stok Opname, dan Transfer Cabang.
- Menambahkan ringkasan SKU aktif, stok rendah, nilai modal, dan potensi retail.
- Menambahkan filter stok rendah, stok kosong, dan barang pecahan.
- Menambahkan ekspor CSV dan cetak lembar hitung stok.
- Menghapus screen Produk/Stok lama yang terpisah tanpa menghapus data operasional.

### Penjualan pecahan
- Menambahkan satuan dasar, konversi kemasan, dan langkah jumlah terkecil.
- Mendukung penjualan angka desimal seperti 2 meter atau 3,5 meter.
- Mendukung contoh kabel `1 roll = 50 meter`.
- Checkout menampilkan jumlah, satuan, konversi ke satuan dasar, harga per satuan, dan total.
- Stok, refund, split bill, hold, nota, dan layar pelanggan memakai base quantity yang konsisten.
- Produk nonpecahan tetap dibatasi pada jumlah utuh.

### Pembelian/restok multi-satuan
- Pembelian dapat memakai satuan dasar atau kemasan seperti roll/box.
- Kuantitas kemasan dikonversi otomatis ke stok dasar.
- Harga beli kemasan dihitung menjadi HPP per satuan dasar.
- Retur pembelian mengurangi stok dasar dengan faktor konversi yang sama dan memvalidasi langkah jumlahnya.
- Riwayat pergerakan menyimpan jumlah kemasan dan jumlah stok yang sebenarnya.
- Pesanan online/WhatsApp juga mendukung meter pecahan, roll/box, dan meneruskan base quantity yang benar ke Kasir.

### Penyederhanaan promo
- Menghapus menu Promo dan formulir promo otomatis dari aplikasi.
- Transaksi baru tidak lagi menerapkan promo otomatis.
- Data promo dan nilai promo transaksi lama tetap dipertahankan untuk kompatibilitas histori.
- Mengganti istilah kampanye pada layar pelanggan menjadi **Pesan Layar** agar tidak rancu dengan diskon.

### Profesionalisasi dan stabilitas
- Memperbaiki transfer stok agar memakai cabang aktif yang benar.
- Menambahkan validasi langkah pecahan pada stok awal, stok minimum, penyesuaian, opname, transfer, pembelian, dan checkout.
- Menambahkan pergerakan `INITIAL_STOCK` saat barang baru dibuat dengan stok awal.
- Mempertahankan scan barcode kamera serta scanner USB/Bluetooth.
- Mempertahankan QRIS adaptif per cabang, Pusat Kontrol, identitas cabang, studio login, Windows Desktop, Android, PWA, dan offline queue.
- Tetap kompatibel dengan Firebase Spark tanpa Functions, Storage, Blaze, atau billing.

## Perubahan Firestore Rules
- Menambahkan `/stores/{storeId}/publicEmployees/{branchId}`.
- Dokumen dapat dibaca melalui `get` untuk layar login, tetapi tidak dapat dilisting.
- Owner dapat memperbarui semua cabang; Store Manager hanya cabangnya sendiri.
- Payload dibatasi pada daftar nama tampilan, nama login internal, role, status aktif, dan metadata cabang.

## QA source
- Core tests: **95/95 lulus**.
- Static audit: **lulus**.
- Source JS/JSX/MJS: **65 file diperiksa**.
- JSON: **4 file valid**.
- Pemeriksaan sintaks/transpilasi: **0 error**.
- Vite build final diwajibkan melalui GitHub Actions `test-only`.
