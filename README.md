# Bumi Makmur POS FreeSync v5.4.0

Satu source code untuk **Android HP/tablet, Web/PWA, dan Windows Desktop**. Rilis v5.4.0 mematangkan katalog profesional: daftar barang otomatis rapi berdasarkan nama, pemilih barang dapat dicari, kategori dapat dikelola dari aplikasi, satu produk dapat dijual sebagai pcs/pack/dus/box/roll dengan harga khusus, login Owner tidak lagi meminta cabang, dan cabang kosong dapat dihapus sementara cabang bersejarah diarsipkan secara aman. Produk Induk + Varian, shared barcode, SKU otomatis, barcode internal, penjualan pecahan, dan seluruh fitur v5.3 tetap dipertahankan.

## Platform dan arsitektur

- **Android:** APK/AAB Capacitor, dioptimalkan untuk Infinix Note 40 Pro+ dan Huawei MatePad SE 11.
- **Windows:** installer `.exe` dan `.msi` melalui GitHub Actions.
- **Web/PWA:** Cloudflare Pages.
- **Cloud:** Firebase Authentication + Firestore pada Spark/free tier.
- **Offline:** IndexedDB, antrean mutasi tahan restart, cache login, dan rebase konflik lintas perangkat.
- **Tanpa layanan berbayar:** tidak memakai Cloud Functions, Firebase Storage, Blaze, atau billing.

## Fitur utama v5.4.0

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
2. Ekstrak ZIP v5.4.0.
3. Salin **seluruh isi** hasil ekstrak ke root repository lokal `Bumi-Makmur-POS-Ultimate` dan pilih **Replace files**.
4. Pastikan `package.json`, `src`, `.github`, `firestore.rules`, dan `electron` berada langsung di root, bukan di subfolder baru.
5. Commit yang disarankan:

```text
Bumi Makmur POS v5.2 Smart Inventory, Fractional Sales, and Employee Picker
```

6. Klik **Push origin**.

## Urutan workflow setelah push

### 1. Pemeriksaan source

```text
Actions
→ Build Bumi Makmur POS v5.4.0
→ test-only
```

Pastikan core tests, audit statis, dan Vite build hijau.

### 2. Deploy Firestore Rules — wajib

v5.4.0 menambahkan dokumen `publicEmployees` untuk dropdown nama karyawan. Jalankan:

```text
Actions
→ Deploy Firebase Spark Rules
→ Run workflow
```

Tetap memakai Firebase Spark gratis.

### 3. Android

```text
Actions
→ Build Bumi Makmur POS v5.4.0
→ android-release
```

Instal APK langsung di atas versi lama. **Jangan uninstall**, agar data lokal dan sesi perangkat tetap tersimpan.

### 4. Windows

```text
Actions
→ Build Bumi Makmur POS Desktop v5.4.0
→ windows-release
```

EXE, MSI, checksum, APK, dan AAB akan dipublikasikan ke **GitHub Releases v5.4.0**. Cloudflare Pages memperbarui Web otomatis setelah push ke `main`.

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
