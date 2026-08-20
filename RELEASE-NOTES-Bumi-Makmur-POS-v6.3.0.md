# Bumi Makmur POS FreeSync v6.3.0
## Product Visual & Multi-Barcode

Release v6.3.0 mematangkan katalog barang untuk operasional toko listrik/material yang memiliki banyak watt, ukuran, kemasan, dan barcode berbeda. Fokus utama release ini adalah **identifikasi produk yang cepat dan aman di Kasir**, tanpa mengubah prinsip Firebase Spark-only, offline-first, dan Unified AutoSync.

## Fitur utama

### 1. Barcode per varian tetap independen

Setiap SKU/varian sekarang dapat mempunyai:

- Barcode Pabrik / EAN;
- Barcode Internal / Stiker;
- Barcode Supplier;
- Barcode Kemasan / Satuan Jual;
- Barcode Alternatif.

Contoh Philips LED 6W, 10W, 12W, dan 15W dapat memakai barcode pabrik masing-masing. Barcode bersama tetap tersedia sebagai fallback kelompok, bukan pengganti barcode varian.

Scanner memprioritaskan direct barcode varian. Barcode bersama hanya menampilkan pemilihan varian ketika memang digunakan oleh beberapa SKU.

### 2. Multi-barcode dan faktor kemasan

Barcode tambahan dapat menyimpan satuan dan faktor isi. Contoh:

- satuan `pcs`, faktor `1`;
- pack, faktor `12`;
- dus, faktor `24`.

Ketika barcode kemasan unik dipindai, Kasir menerima SKU serta faktor kuantitas yang benar. Barcode satuan-jual global tidak diperbolehkan pada grup multi-varian untuk mencegah satu kode menunjuk SKU yang salah.

### 3. Cetak Barcode Massal profesional

Mode cetak:

- Internal / Stiker;
- Pabrik / EAN;
- Otomatis — Pabrik lalu fallback Internal.

EAN-13 13 digit yang mempunyai checksum valid dirender dengan pola EAN-13 asli. Barcode internal alfanumerik tetap dirender dengan Code 39 agar kompatibel dengan scanner toko.

### 4. Import produk lebih aman

CSV/XLSX mendukung barcode pabrik, internal, tambahan, serta barcode kemasan. Shared barcode tidak digunakan sebagai identity-match saat menentukan produk yang akan di-update. Collision antara direct barcode dan shared barcode produk lain ditolak agar import tidak menimpa sibling varian yang salah.

### 5. Foto Produk khusus Kasir

Foto bersifat visual aid untuk memilih barang di Kasir, bukan media katalog penuh. Input foto tersedia melalui:

- Ambil Foto;
- Pilih Galeri;
- hasil Foto Produk AI yang sudah diambil;
- Cari Foto Otomatis;
- input manual tanpa foto tetap selalu tersedia.

Varian dapat memiliki foto sendiri. Jika varian tidak mempunyai foto, Kasir memakai foto induk. Jika tidak ada foto sama sekali, placeholder ringan tetap digunakan.

Foto tidak ditambahkan ke struk, laporan, PO, invoice, PDF closing, atau histori transaksi.

### 6. Thumbnail ringan dan FreeSync-safe

Foto diproses lokal menjadi thumbnail maksimal 256 px. Target kompresi sekitar 52 KB dan hard limit 90 KB. Foto induk grup varian hanya disimpan pada satu child product sehingga gambar yang sama tidak terduplikasi di seluruh dokumen varian.

`firestore.indexes.json` mengecualikan:

- `products.posImage.dataUrl`;
- `products.groupPosImage.dataUrl`.

Ini mengurangi pemborosan index Firestore untuk string thumbnail base64 dan tetap tidak menggunakan Firebase Storage.

### 7. Cari Foto Otomatis dengan Gemini + Google Search

Gemini Google Search grounding berjalan langsung dari perangkat menggunakan Gemini API key lokal. API key tidak dikirim ke Firestore, backup cloud, source code, ataupun Cloudflare Pages Function.

Cloudflare Pages Function gratis hanya:

1. menerima daftar halaman hasil grounding;
2. membaca metadata gambar dari halaman sumber;
3. menampilkan kandidat;
4. pada saat pengguna memilih, memverifikasi bahwa gambar masih benar-benar tercantum pada halaman sumber;
5. mengambil gambar terpilih satu kali agar aplikasi dapat mengompresnya menjadi thumbnail lokal.

Proteksi helper mencakup URL protocol validation, blok localhost/private-network/custom-port, validasi redirect, batas HTML, batas file gambar, dan pembatasan MIME JPEG/PNG/WebP.

Pengguna tetap harus memilih kandidat foto yang benar; AI tidak menyimpan foto secara diam-diam.

## Kompatibilitas

- Android / Capacitor;
- Web / PWA / Cloudflare Pages;
- Windows Desktop / Electron;
- Infinix Note 40 Pro+;
- Huawei MatePad SE 11.

## Firebase Spark

- Firebase Authentication + Firestore saja;
- tidak memakai Firebase Functions;
- tidak memakai Firebase Storage;
- tidak membutuhkan Blaze;
- PDF tetap lokal/on-demand;
- Gemini API key tetap lokal.

Firestore Rules tetap marker `BUMI_MAKMUR_RULESET_VERSION=6.1.0`. Namun v6.3.0 mengubah Firestore indexes untuk thumbnail Kasir. Setelah source v6.3.0 diunggah, jalankan sekali:

`GitHub → Actions → Deploy Firebase Spark Rules → Run workflow`

Workflow tetap hanya men-deploy `firestore:rules,firestore:indexes`.

## Data dan fitur lama

Seluruh fitur v6.2.0 tetap dipertahankan, termasuk deterministic transaction sorting, Firestore Timestamp normalization, cash/change reporting, VOID safety, professional closing PDF, Unified AutoSync, Customer Display, AI Product Capture, Smart Receiving, Smart Restock, PO, quotation, serial/garansi, stock opname, multi-unit, varian, bundle, approval PIN, backup, Web, Android, dan Windows.
