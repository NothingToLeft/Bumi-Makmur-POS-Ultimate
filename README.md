# Bumi Makmur POS FreeSync v5.8.0

Satu source code untuk **Android HP/tablet, Web/PWA, dan Windows Desktop**. Rilis v5.8.0 adalah Business Suite untuk operasional toko listrik/material: Smart Restock, PO dengan penerimaan parsial, riwayat harga pemasok, quotation, serial & garansi, stock opname scanner, inventory aging, proteksi harga modal, serta perapihan navigasi; Smart Barcode Scanner dan seluruh fitur v5.7 tetap dipertahankan. Seluruh fitur Produk Induk + Varian, shared barcode, SKU otomatis, harga pcs/pack/dus/roll, penjualan kabel pecahan, kategori dinamis, Store Manager operasional, dan lifecycle produk aman tetap dipertahankan.

## Platform dan arsitektur

- **Android:** APK/AAB Capacitor, dioptimalkan untuk Infinix Note 40 Pro+ dan Huawei MatePad SE 11.
- **Windows:** installer `.exe` dan `.msi` melalui GitHub Actions.
- **Web/PWA:** Cloudflare Pages.
- **Cloud:** Firebase Authentication + Firestore pada Spark/free tier.
- **Offline:** IndexedDB, antrean mutasi tahan restart, cache login, dan rebase konflik lintas perangkat.
- **Tanpa layanan berbayar:** tidak memakai Cloud Functions, Firebase Storage, Blaze, atau billing.

## Fitur utama v5.8.0

### Business Suite & Smart Inventory

- Smart Restock menghitung kebutuhan pembelian berdasarkan kecepatan penjualan, stok minimum, lead time, safety stock, dan PO yang belum diterima.
- Smart Restock dapat membuat Draft PO per pemasok.
- PO mendukung penerimaan parsial; stok/HPP/hutang hanya berubah sesuai barang yang diterima.
- Riwayat harga pemasok membantu melihat harga beli terakhir per barang dan supplier.
- Penawaran proyek dapat dicetak/Save PDF dan dikonversi menjadi Open Bill.
- Produk tertentu dapat memakai Serial Number, masa garansi, dan riwayat klaim.
- Stock Opname Scanner mencatat physical count serta alasan selisih per item.
- Laporan baru mencakup inventory aging, dead stock, modal tertahan, margin, Smart Restock, dan aging piutang.
- Tindakan sensitif dan penjualan di bawah modal meminta PIN approval sesuai role.
- QRIS preview berusaha memotong hanya simbol QR dari poster QRIS resmi; **QRIS Mode Kasir tidak ditambahkan**.

### Smart Barcode Scanner & Camera Control

- Kamera depan dan belakang dapat dipilih dari scanner.
- Pada perangkat multi-kamera, pengguna dapat memilih lensa/device yang tersedia.
- Flash/torch, zoom, dan fokus kontinu dipakai bila perangkat mendukung.
- Barcode dapat dibaca dari foto yang tersimpan.
- Kasir memiliki Mode Scan Cepat untuk scan banyak barang tanpa menutup kamera.
- Bunyi dan getar scan dapat diatur.
- Scanner yang sama dipakai pada Kasir, Tambah Barang, Product Picker, pembelian/restok, penyesuaian stok, dan transfer.
- Scanner USB/Bluetooth tetap didukung.

### Pemulihan cloud Desktop Windows

- Firebase Auth Desktop memakai IndexedDB dengan fallback localStorage.
- Sesi Owner/Karyawan dipulihkan sebelum listener Firestore dibuka.
- Kegagalan koleksi tambahan seperti PO atau riwayat harga tidak lagi mematikan sinkronisasi inti Produk, Stok, Transaksi, Cabang, dan Karyawan.
- Diagnostik menampilkan nama koleksi yang gagal dan menggabungkan error berulang.

### Stability Center dan Diagnostik Cloud

- Status sinkronisasi membedakan tersinkron, lokal, antrean, offline, sesi salah, dan izin ditolak.
- Konflik lintas perangkat direbase; perubahan stok tetap digabung sebagai delta.
- Diagnostik mencatat koleksi, operasi, kode masalah, waktu, dan saran perbaikan.
- Antrean offline dapat dilihat per jenis operasi dan tetap tahan restart.

### Impor Excel/CSV dan migrasi stok awal

- Template Excel/CSV dapat diunduh dari aplikasi.
- Preview menampilkan data baru, update, kategori baru, peringatan, dan baris gagal.
- Mendukung produk standar, varian, shared barcode, SKU otomatis, stok awal, harga, dan konversi kemasan.
- Harga pack/dus/roll khusus dapat ditulis, misalnya `pack=100@45000|42000|40000`.

### Riwayat harga dan label barcode massal

- Setiap perubahan harga modal/eceran/grosir/proyek dicatat dengan pengguna dan waktu.
- Label barcode internal dapat dicetak massal untuk kertas 58 mm, 80 mm, atau A4.

### Purchase Order, approval, backup, dan closing

- PO dapat dibuat tanpa langsung menambah stok; penerimaan barang tetap memperbarui HPP dan utang.
- Diskon di atas batas role meminta PIN Owner/Manager dan tercatat sebagai approval.
- Restore backup menampilkan preview dan memvalidasi struktur sebelum mengganti data.
- Closing shift dapat dicetak dalam format nota 80 mm.

### Katalog otomatis dan pemilih barang profesional

- Produk selalu diurutkan berdasarkan nama dengan urutan angka natural.
- Pencarian mendukung nama, SKU, barcode, kategori, dan lokasi rak.
- Pemilih barang yang sama dipakai pada stok, transfer, pembelian, dan pesanan online.

### Harga khusus per satuan jual

Satu stok dasar dapat dijual dalam beberapa kemasan dengan harga berbeda. Contoh:

```text
Kabel Ties
Satuan dasar : pcs
Harga 1 pcs  : Rp500
1 pack       : 100 pcs
Harga 1 pack : Rp45.000
```

Menjual satu pack mengurangi stok 100 pcs, tetapi harga checkout memakai Rp45.000. Harga eceran, grosir, dan proyek dapat diatur untuk setiap satuan jual.

### Kategori dinamis

- Kategori baru dapat dibuat saat menambah barang.
- Owner dapat mengganti nama, menggabungkan, dan menghapus kategori secara aman.
- Produk yang memakai kategori lama dipindahkan ke kategori pengganti.

### Owner lintas cabang dan penghapusan aman

- Owner login tanpa memilih cabang; cabang aktif dipilih setelah masuk.
- Cabang kosong dapat dihapus permanen.
- Cabang dengan riwayat diarsipkan dan dapat dipulihkan agar audit tidak hilang.

### Produk Induk + Varian dan Shared Barcode

- Satu produk induk dapat memiliki banyak watt, ukuran, warna, atau tipe.
- Setiap varian adalah SKU operasional terpisah dengan stok dan harga sendiri.
- Barcode kemasan bersama menampilkan pilihan varian saat scan.
- Barcode internal atau SKU langsung memilih varian tanpa dialog.
- SKU otomatis mengikuti pola seperti `BM-PHI-LED-006`.
- Label internal dicetak sebagai barcode CODE39 yang dapat dipindai.


### Login karyawan: pilih nama lalu PIN

Alur karyawan menjadi:

```text
Pilih Toko/Cabang
→ Pilih Nama Karyawan
→ Masukkan PIN 4 digit
```

Daftar hanya menampilkan Store Manager dan Kasir aktif pada cabang yang dipilih. Nama dikirim melalui dokumen publik yang sudah disanitasi; UID, email, PIN, hash PIN, dan data transaksi tidak ikut dipublikasikan. Daftar terakhir disimpan lokal agar tetap tersedia pada perangkat yang sudah pernah tersambung.

### Produk & Stok terpadu

Menu **Produk** dan **Stok** digabung menjadi **Produk & Stok**. Pengguna baru dapat langsung:

- membuat barang;
- scan barcode;
- mengisi harga modal dan harga jual;
- memasukkan stok awal;
- mengatur stok minimum dan lokasi rak;
- melakukan penyesuaian, stok opname, dan transfer cabang;
- melihat stok rendah/habis, nilai modal, dan potensi retail;
- mengekspor CSV dan mencetak lembar hitung stok.

Restok rutin tetap disarankan melalui **Pembelian**, karena pemasok, harga beli, HPP, utang, dan riwayat barang masuk ikut tercatat.

### Penjualan eceran dan pecahan

Produk dapat memakai satuan dasar terkecil dan konversi kemasan. Contoh kabel:

```text
Satuan dasar : meter
Konversi     : 1 roll = 50 meter
Kelipatan jual: 0,5 meter
```

Kasir dapat menjual `2 meter`, `3,5 meter`, atau `1 roll`. Stok selalu dikurangi dalam meter, sedangkan harga checkout mengikuti satuan yang dipilih. Pembelian `1 roll` otomatis menambah stok `50 meter` dan menghitung biaya modal per meter. Pesanan WhatsApp/online juga dapat memilih meter, roll, box, atau konversi lain sebelum diteruskan ke Kasir.

Fitur ini juga cocok untuk barang yang dijual per kilogram, liter, meter, atau potongan.

### Promo diskon otomatis dihapus dari menu

Menu Promo tidak lagi ditampilkan dan transaksi baru tidak menerapkan promo otomatis. Nilai promo pada transaksi lama tetap dipertahankan agar laporan dan nota historis tidak berubah. Pesan pada layar pelanggan tetap tersedia sebagai **Pesan Layar**, bukan diskon promo.

### Fitur profesional tambahan

- Filter stok rendah, stok kosong, dan barang pecahan.
- Pergerakan stok dalam satu halaman.
- Penyesuaian stok dengan alasan dan audit trail.
- Stok opname dengan dukungan jumlah desimal.
- Transfer stok pecahan antarcabang.
- Scan barcode kamera dan scanner USB/Bluetooth.
- Validasi SKU/barcode ganda per cabang.
- QRIS adaptif per cabang.
- Pusat Kontrol Operasional dan rekomendasi restok.
- Identitas brand dan cabang dinamis.
- Studio tulisan halaman login.
- Shortcut kasir Windows dan layar pelanggan kedua.

## Role

- **Owner:** seluruh cabang, identitas usaha, Manager, Kasir, pengaturan global, backup, dan laporan.
- **Store Manager:** operasional luas dan pengelolaan Kasir pada cabangnya; tidak dapat mengelola Owner/Manager lain atau pengaturan global Owner.
- **Kasir:** kasir dan fungsi yang diizinkan pada cabang login.

## Upload source melalui GitHub Desktop

1. Backup JSON dan pastikan **Antrean Offline = 0**.
2. Ekstrak ZIP v5.8.0.
3. Salin **seluruh isi** hasil ekstrak ke root repository lokal `Bumi-Makmur-POS-Ultimate` dan pilih **Replace files**.
4. Pastikan `package.json`, `src`, `.github`, `firestore.rules`, dan `electron` berada langsung di root, bukan di subfolder baru.
5. Commit yang disarankan:

```text
Bumi Makmur POS v5.8.0 Business Suite and Smart Inventory
```

6. Klik **Push origin**.

## Urutan workflow setelah push

### 1. Pemeriksaan source

```text
Actions
→ Build Bumi Makmur POS v5.8.0
→ test-only
```

Pastikan core tests, audit statis, dan Vite build hijau.

### 2. Firestore Rules

v5.8.0 **menambah koleksi dan izin Firestore** untuk quotation, riwayat harga pemasok, serial, dan garansi. Jalankan workflow **Deploy Firebase Spark Rules** sekali setelah source v5.8.0 di-push. Tetap Firebase Spark, tanpa Blaze.

### 3. Android

```text
Actions
→ Build Bumi Makmur POS v5.8.0
→ android-release
```

Instal APK langsung di atas versi lama. **Jangan uninstall**, agar data lokal dan sesi perangkat tetap tersimpan.

### 4. Windows

```text
Actions
→ Build Bumi Makmur POS Desktop v5.8.0
→ windows-release
```

EXE, MSI, checksum, APK, dan AAB akan dipublikasikan ke **GitHub Releases v5.8.0**. Cloudflare Pages memperbarui Web otomatis setelah push ke `main`.

## Uji penerimaan minimum

- Cabang dipilih, daftar karyawan aktif muncul, lalu login hanya dengan PIN.
- Karyawan nonaktif/hapus tidak lagi muncul setelah daftar dimuat ulang.
- Tambah kabel dengan satuan dasar meter, `1 roll = 50 meter`, langkah `0,1`, dan stok awal.
- Jual `3,5 meter`; total dan stok berkurang tepat `3,5 meter`.
- Restok `1 roll`; stok bertambah `50 meter` dan HPP per meter benar.
- Penyesuaian, opname, dan transfer menerima angka desimal sesuai langkah produk.
- Menu Promo tidak muncul dan transaksi baru tidak mendapat promo otomatis.
- Sinkronisasi PC–Web–Android kembali ke antrean `0`.

## Catatan installer Windows

Installer belum memakai sertifikat code-signing komersial. Windows SmartScreen dapat menampilkan peringatan publisher tidak dikenal pada pemasangan pertama. Unduh hanya dari GitHub Releases repository sendiri dan cocokkan SHA-256.

## Release acceptance v5.8.0

Full-pass source audit final pada 19 Agustus 2026 menghasilkan:

- **161/161 automated core/regression tests PASS**.
- Static project audit **PASS**.
- Parser JS/JSX seluruh `src` **PASS**.
- Electron/Android helper Node syntax **PASS**.
- GitHub Actions YAML dan JSON konfigurasi **PASS**.
- Firebase Spark-only guard **PASS**.

Acceptance flow produksi yang disarankan setelah push:

1. Backup JSON dan pastikan Antrean Offline = 0.
2. Deploy Firestore Rules v5.8 sekali.
3. Jalankan Android workflow `test-only` sampai hijau.
4. Jalankan `android-release`; APK/AAB dipublikasikan ke GitHub Releases.
5. Jalankan Windows `test-only`, lalu `windows-release`; EXE/MSI dipublikasikan ke GitHub Releases.
6. Smoke test fisik: Infinix Note 40 Pro+, Huawei MatePad SE 11, printer toko, Windows, QRIS, offline→reconnect, PO partial, serial/warranty, dan refund transaksi tempo.

Lihat `QA-REPORT-Bumi-Makmur-POS-v5.8.0.md` untuk daftar coverage dan batasan environment audit. Container audit tidak memiliki registry dependency/Android SDK, sehingga binary native tidak diklaim lulus secara lokal; GitHub Actions adalah production build gate.
