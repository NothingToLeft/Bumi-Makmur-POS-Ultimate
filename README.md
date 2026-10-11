# Bumi Makmur POS FreeSync v6.4.2 — Claude reviewed + transaksi aman

Satu source code untuk **Android HP/tablet, Web/PWA, dan Windows Desktop**. v6.4.2 mengintegrasikan fitur produktivitas hasil review Claude, memperbaiki tampilan refund per baris produk, replay QRIS dalam split checkout, tiket approval Manager lokal, keamanan CSV, dan ukuran file impor. Baca `PROJECT_STATUS.md` untuk pembatasan keamanan serta pengujian produksi yang belum selesai. v6.4.1 mempertahankan seluruh fitur v6.4.0 dan memperbaiki pipeline release agar Firebase Web configuration tidak lagi memicu false-positive secret scan. v6.4.0 menambahkan **QRIS Dinamis lokal + Payment Assurance** di atas QRIS statis yang sudah ada: payload merchant divalidasi ketat, nominal transaksi dimasukkan otomatis, CRC dihitung ulang, Customer Display dapat menampilkan QR, split payment tetap didukung, dan transaksi QRIS wajib menunggu konfirmasi notifikasi merchant selama belum ada callback PJP/acquirer resmi. Payload QR dinamis tidak disimpan pada histori transaksi. Seluruh AI Quota Resilience v6.3.1, Product Visual & Multi-Barcode v6.3.0, hardening data v6.2.0, Unified AutoSync, AI Product Capture, Smart Receiving, Smart Restock, PO parsial, quotation, serial & garansi, stock opname scanner, inventory aging, multi-unit/varian/bundle, approval PIN, Customer Display, dan PDF closing profesional tetap dipertahankan.

## Platform dan arsitektur

- **Android:** APK/AAB Capacitor, dioptimalkan untuk Infinix Note 40 Pro+ dan Huawei MatePad SE 11.
- **Windows:** installer `.exe` dan `.msi` melalui GitHub Actions.
- **Web/PWA:** Cloudflare Pages.
- **Cloud:** Firebase Authentication + Firestore pada Spark/free tier.
- **Offline:** IndexedDB, antrean mutasi tahan restart, cache login, dan rebase konflik lintas perangkat.
- **Tanpa layanan berbayar:** tidak memakai Cloud Functions, Firebase Storage, Blaze, atau billing.




## CI Secret Scan Hotfix v6.4.1

- GitHub Actions tidak lagi menulis `.env.production` sebelum build; Firebase Web configuration diinjeksi langsung sebagai process environment hanya pada build step.
- Static audit memakai structured secret scanner. Firebase Web API key runtime hanya diberi exception sangat sempit pada `VITE_FIREBASE_API_KEY`; `AIza...` di source lain tetap dianggap kebocoran.
- `.env.production` lokal tetap fail-closed terhadap unknown/duplicate/malformed key dan Gemini/private credentials.
- Tidak ada perubahan Firestore schema/rules, QRIS Dynamic, Payment Assurance, atau data transaksi. Ruleset produksi tetap `6.4.0`.

## QRIS Dynamic & Payment Assurance v6.4.0

- QRIS statis cabang sekarang dapat menjadi **source + fallback** untuk QRIS Dinamis. Engine dibuat lokal di device; tidak ada request ke converter QRIS pihak ketiga.
- Parser QRIS bersifat **byte-aware dan fail-closed**: payload terpotong, trailing data, tag duplikat, UTF-8 invalid, field utama yang tidak sesuai, atau CRC rusak ditolak sebelum dikonversi.
- Generator mengubah initiation method menjadi dynamic, memasukkan **nominal QRIS exact**, menghapus convenience-fee tags yang tidak dipakai, menghitung ulang CRC16, lalu memvalidasi hasil sekali lagi.
- Nominal QRIS per payment line wajib Rupiah bulat **Rp1–Rp10.000.000**. Split payment tetap dapat menggabungkan QRIS dengan Tunai/Transfer/metode lain; QR setiap baris mengikuti nominal QRIS pada baris tersebut.
- Dynamic Mode **opt-in per cabang**. Owner/Manager harus memasukkan/decode source QRIS, menjalankan tes nominal kecil, memeriksa merchant + nominal pada aplikasi pembayaran, lalu acknowledge sebelum enable.
- Kasir **wajib** menandai **“Saya sudah melihat notifikasi pembayaran masuk ke merchant”**. Opsi ini dikunci aktif sampai tersedia callback PJP/acquirer resmi; POS tidak menganggap scan QR sebagai bukti settlement.
- **Payment Assurance** menyimpan mode, nominal, merchant, source fingerprint/CRC, session, status konfirmasi, kasir, dan waktu konfirmasi. Payload QR dinamis tidak masuk histori transaksi/cloud sale.
- Payment modal memakai stable checkout ID selama satu attempt untuk memperkuat proteksi retry/double-click terhadap transaksi ganda.
- Customer Display menampilkan QR dinamis, nominal, status pembayaran, atau fallback guidance secara transient. Detail Transaksi menampilkan audit Payment Assurance QRIS.
- QRIS statis/fisik tetap berfungsi bila dynamic dinonaktifkan atau source gagal divalidasi. Tidak ada service fee/surcharge QRIS pelanggan yang ditambahkan.
- Empat project QRIS dipelajari sebagai research. External converter, Puppeteer/portal scraping, OTP interception, unofficial GoBiz/QFM automation, mock QRIS, dan random amount suffix tanpa official mutation feed sengaja **tidak** dibawa ke production. Detail ada di `docs/QRIS-SOURCE-AUDIT-v6.4.0.md`.
- Firebase tetap **Auth + Firestore Spark**, tanpa Functions/Storage/Blaze. v6.4.0 tidak menambah collection/index baru.

## AI Quota Resilience v6.3.1

- Error Gemini 429/`RESOURCE_EXHAUSTED`, rate-limit, API key, model, network, dan service error sekarang diterjemahkan menjadi pesan Bahasa Indonesia yang aman; pesan mentah provider hanya masuk Diagnostik AI lokal.
- Runtime Gemini menahan request otomatis berulang selama cooldown sehingga tombol Cari Otomatis tidak terus menghabiskan request gagal. Tes Gemini manual tetap tersedia untuk memeriksa pemulihan.
- Kandidat foto berhasil di-cache lokal selama 12 jam (maksimum 24 query per perangkat) agar pencarian produk yang sama tidak memakai quota grounding lagi.
- Jika Gemini tidak tersedia, pengguna dapat **Cari di Web → salin link halaman produk → Ambil dari Link**. Jalur ini tidak memakai Gemini dan tetap melewati Cloudflare SSRF/source-verification guard.
- Pengaturan → AI & Otomasi menampilkan status Gemini, waktu jeda, keberhasilan terakhir, dan Diagnostik AI lokal tanpa menyimpan API key.
- Patch tidak mengubah Firestore schema/rules/indexes. Firebase tetap Auth + Firestore Spark tanpa Functions, Storage, atau Blaze.


## Product Visual & Multi-Barcode v6.3.0

- Setiap varian/SKU memiliki **Barcode Pabrik / EAN** dan **Barcode Internal / Stiker** sendiri. Contoh Philips LED 6W, 10W, 12W, dan 15W tidak lagi bergantung pada satu barcode bersama.
- Satu SKU dapat mempunyai beberapa barcode tambahan bertipe **Supplier, Kemasan/Satuan Jual, atau Alternatif**, lengkap dengan satuan dan faktor isi. Scan barcode `dus × 12` membawa kuantitas dasar yang benar ke Kasir.
- **Barcode Kemasan Bersama** tetap tersedia sebagai fallback kelompok varian. Scanner selalu memprioritaskan barcode langsung milik varian; barcode bersama hanya meminta pemilihan varian bila memang ambigu.
- Barcode satuan jual global tidak diizinkan pada grup multi-varian karena dapat membuat scanner salah SKU. Gunakan Barcode Tambahan pada masing-masing varian untuk pack/dus yang unik.
- Cetak Barcode Massal menyediakan mode **Internal**, **Pabrik/EAN**, dan **Otomatis (Pabrik → Internal)**. Barcode pabrik 13 digit dengan checksum valid dicetak menggunakan pola **EAN-13 asli**; kode internal tetap kompatibel melalui Code 39.
- Import CSV/XLSX mengenali barcode pabrik, internal, tambahan, dan kemasan. Shared barcode tidak pernah dipakai sebagai identity-match ketika update import sehingga satu varian tidak dapat diam-diam menimpa sibling. Collision direct-vs-shared juga ditolak.
- Form Produk menyediakan **Foto Produk untuk Kasir** pada produk induk dan setiap varian: Ambil Foto, Pilih Galeri, Cari Foto Otomatis, atau Hapus. Input manual tetap selalu tersedia.
- Foto hanya berfungsi sebagai **visual aid pada kartu Kasir**. Foto tidak dimasukkan ke struk, invoice, laporan, PO, PDF, transaksi historis, atau dokumen closing. Varian dapat override foto induk; bila tidak ada gambar, Kasir menampilkan placeholder ringan.
- Foto diproses lokal menjadi thumbnail WebP/JPEG/PNG maksimum 256 px, ditargetkan sekitar 52 KB dan dibatasi maksimal 90 KB per thumbnail. Foto induk grup varian hanya disimpan pada satu child document agar Firestore tidak menduplikasi gambar yang sama pada setiap varian.
- Pencarian foto otomatis memakai **Gemini Google Search grounding langsung dari perangkat**. Gemini API key tetap lokal, tidak masuk Firestore, backup, source, atau Cloudflare Function. Cloudflare Pages Function gratis hanya memverifikasi halaman sumber dan mengambil gambar terpilih sekali untuk dikompres lokal.
- Helper gambar memblokir localhost/private-network/custom-port, memvalidasi redirect, ukuran HTML/gambar, MIME JPEG/PNG/WebP, dan hanya mengambil gambar yang dapat diverifikasi kembali pada halaman sumber.
- `firestore.indexes.json` mengecualikan `products.posImage.dataUrl` dan `products.groupPosImage.dataUrl` dari single-field index untuk mengurangi pemborosan index. **Setelah upload v6.3.0, jalankan Actions → Deploy Firebase Spark Rules satu kali untuk menerapkan index exemption.** Firestore Rules tetap ruleset `6.1.0`; yang berubah pada v6.3.0 adalah indexes.

## Data Integrity & Professional Operations v6.2.0

- Menormalkan timeline transaksi dan riwayat operasional agar **terbaru → terlama** secara deterministik setelah cache lokal, bootstrap Firestore, realtime snapshot, maupun commit lokal.
- Menambahkan parser timestamp terpadu untuk ISO string, epoch detik/milidetik, JavaScript `Date`, Firebase `Timestamp`, dan serialized Firestore timestamp agar data legacy/cloud tidak menghasilkan urutan acak atau `Invalid Date`.
- Halaman **Transaksi, Refund & Void** mendapat sorting Terbaru/Terlama/Nominal dan pencarian lebih luas; transaksi pada tanggal yang sama mengikuti jam sebenarnya.
- Kasir sekarang memilih **Pelanggan Umum** secara eksplisit, bukan bergantung pada urutan `customers[0]` dari snapshot Firestore.
- Akurasi kas diperbaiki: total Rp39.000 dibayar Rp50.000 tetap menampilkan kembalian Rp11.000, tetapi laporan kas mencatat penerimaan bersih Rp39.000. Refund mengurangi breakdown pembayaran dan `VOID`/`VOIDED` tidak ikut omzet.
- PDF Tutup Harian dirombak menjadi A4 profesional merah-hitam dengan logo resmi Bumi Makmur 2, ringkasan omzet/laba/transaksi, pembayaran, kas, operasional, dan status selisih. PDF tetap lokal/on-demand dan tidak memenuhi Firebase.
- Unified AutoSync, queue offline, Customer Display, AI Product Assistant, Smart Receiving, barcode, PO, varian, bundle, serial/garansi, backup, Android, Windows, dan Web tetap dipertahankan.
- **Firestore Rules tidak berubah pada v6.2.0.** Ruleset produksi tetap `BUMI_MAKMUR_RULESET_VERSION=6.1.0`; jika ruleset v6.1.0 sudah dipublikasikan hijau, tidak perlu deploy ulang hanya karena upgrade v6.2.0.

## Cloud & Customer Display Stability v6.0.3

- Memperbaiki **false healthy state**: `permission-denied` sekarang tidak lagi tertutup oleh status antrean/sinkronisasi. Jika rules cloud belum cocok, status tampil `PERLU CEK` sampai benar-benar pulih.
- Diagnostik `permission-denied` memberi arahan spesifik untuk menjalankan **Actions → Deploy Firebase Spark Rules**. Antrean lokal tidak dibuang dan akan dikirim setelah rules aktif.
- Firestore ruleset diberi marker `BUMI_MAKMUR_RULESET_VERSION=6.1.0` dan mencakup `shifts`, `supplierPriceHistory`, `quotations`, `serialNumbers`, `warrantyClaims`, serta koleksi Business Suite lainnya.
- Layar Pelanggan memakai bridge berlapis: **localStorage + BroadcastChannel + polling fallback + Electron IPC**, sehingga Web/Windows tidak bergantung pada satu mekanisme komunikasi saja.
- Antrean offline sekarang **user-scoped**: mutasi Karyawan tidak pernah dikirim ulang memakai sesi Auth Owner (atau sebaliknya). Antrean akun lain tetap aman dan otomatis dilanjutkan saat akun pembuat login kembali.
- Timestamp “sinkron terakhir berhasil” hanya diperbarui jika queue akun aktif kosong dan tidak ada permission/rules issue aktif.
- Browser popup yang diblokir sekarang terdeteksi dan menampilkan instruksi, bukan pesan sukses palsu.
- Customer Display Desktop diperbarui dengan identitas merah-hitam Bumi Makmur 2, status koneksi/stale, total besar, item yang wrap aman, dan layout responsif.
- Seluruh fitur v6.0.2 Professional Receipt, AI Product Capture, Smart Receiving, Daily Closing PDF/WhatsApp, serta Business Suite tetap dipertahankan.

## Professional Receipt & Cash Change Safety v6.0.2

- Memperbaiki kembalian tunai pada seluruh struk. Total Rp39.000 dibayar Rp50.000 sekarang selalu menampilkan **KEMBALIAN Rp11.000**.
- Nota Kasir, Nota Online, dan preview Pengaturan memakai renderer `ReceiptDocument` yang sama agar desain tidak berbeda-beda.
- Layout struk diperbarui menjadi lebih profesional dan padat dengan brand Bumi Makmur 2 merah–hitam, wrapping nama produk, angka tabular, dan modal viewport-safe untuk HP/tablet.
- Print/Save PDF 58 mm dan 80 mm, teks WhatsApp/Salin, serta share image menggunakan payment summary konsisten.
- Logo resmi **Bumi Makmur 2** dari v6.0.1 tetap menjadi identitas global Web/PWA/Android/Windows dan seluruh dokumen.

## Pembaruan besar v6.0.0

### AI Product Capture

- Tombol **Foto Produk AI** tersedia pada Produk & Stok. Foto label/kemasan dapat mengisi nama keluarga produk, merek, model, ukuran/varian, spesifikasi, kategori, isi pack, satuan dasar, dan barcode untuk ditinjau sebelum masuk ke form produk.
- Android memakai OCR lokal ML Kit dan barcode scanner; Gemini bersifat opsional untuk menyempurnakan struktur data saat online.
- Harga modal, harga jual, stok, supplier, dan garansi **tidak pernah ditebak AI**. Pengguna tetap mengisi data bisnis tersebut dan harus mengonfirmasi sebelum simpan.
- Barcode hasil decoder lokal diprioritaskan dibanding angka yang dibaca model vision.
- Produk yang kemungkinan sudah ada diberi peringatan agar stok baru tidak membuat katalog duplikat.
- Gemini API key disimpan hanya pada perangkat dan tidak masuk Firestore, FreeSync, atau backup cloud. Tanpa API key, fitur inti POS tetap berjalan; APK Android masih dapat memakai OCR/barcode lokal.

### Smart Receiving

- Menu Pembelian → Terima Langsung memiliki **Foto Barang Masuk**.
- Barcode exact diprioritaskan; jika tidak ada, sistem mencocokkan nama, merek, model, dan varian ke katalog.
- Setelah produk cocok, jumlah kemasan dan harga beli dapat langsung dimasukkan ke baris penerimaan. Konversi pack/box/roll tetap memakai satu stok dasar yang sama.

### Tutup Harian PDF → WhatsApp

- Menutup shift membuat snapshot laporan harian yang dapat dibuat ulang dari Riwayat Shift.
- Ringkasan mencakup transaksi, void, refund, item bersih, omzet kotor/bersih, HPP bersih, estimasi laba kotor, metode pembayaran bersih, pengeluaran, piutang baru, kas seharusnya, kas fisik, dan selisih.
- HPP disnapshot pada setiap baris penjualan agar laporan historis tidak berubah ketika modal produk diperbarui di masa depan.
- Android mencoba membuka WhatsApp/WhatsApp Business langsung dengan PDF terlampir, lalu fallback ke share sheet. Web/Windows memakai Web Share bila tersedia atau download PDF sebagai fallback.
- Tidak ada WhatsApp Business token di APK dan tidak ada layanan server berbayar yang diwajibkan.

### Stabilitas major release

- Perbaikan Numeric Input & Variant Pricing v5.8.1 tetap dipertahankan.
- Arsitektur data lama tetap kompatibel; field v6 bersifat additive sehingga database v5.8.x dapat dibuka tanpa migrasi destruktif.
- Firebase tetap **Authentication + Firestore Spark**, tanpa Cloud Functions, Firebase Storage, atau kewajiban Blaze.

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
2. Ekstrak ZIP v6.4.1.
3. Salin **seluruh isi** hasil ekstrak ke root repository lokal `Bumi-Makmur-POS-Ultimate` dan pilih **Replace files**.
4. Pastikan `package.json`, `src`, `.github`, `firestore.rules`, dan `electron` berada langsung di root, bukan di subfolder baru.
5. Commit yang disarankan:

```text
Bumi Makmur POS v6.4.1 QRIS Dynamic & Payment Assurance
```

6. Klik **Push origin**.

## Urutan workflow setelah push

### 1. Pemeriksaan source

```text
Actions
→ Build Bumi Makmur POS v6.4.1
→ test-only
```

Pastikan core tests, audit statis, dan Vite build hijau.

### 2. Firestore Rules + Indexes

**Ruleset QRIS tetap `BUMI_MAKMUR_RULESET_VERSION=6.4.0`.** v6.4.1 tidak mengubah Firestore Rules/Indexes. Jika rules v6.4.0 belum pernah berhasil dideploy, setelah upload v6.4.1 jalankan sekali:

```text
Actions
→ Deploy Firebase Spark Rules
→ Run workflow
```

Langkah deploy ini **wajib bila produksi masih memakai rules sebelum v6.4.0**. Jika rules v6.4.0 sudah hijau sebelumnya, v6.4.1 tidak membutuhkan deploy ulang. Workflow tetap Spark-only dan hanya men-deploy `firestore:rules,firestore:indexes`.

### 3. Android

```text
Actions
→ Build Bumi Makmur POS v6.4.1
→ android-release
```

Instal APK langsung di atas versi lama. **Jangan uninstall**, agar data lokal dan sesi perangkat tetap tersimpan.

### 4. Windows

```text
Actions
→ Build Bumi Makmur POS Desktop v6.4.2
→ windows-release
```

Target distribusi adalah GitHub Releases v6.4.2 (EXE/MSI/APK/AAB setelah build dan signing terverifikasi). Cloudflare Pages memperbarui Web setelah push terhubung ke `main` dan build sukses; source ZIP ini belum dideploy.

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

## Release acceptance v6.4.2 (belum disetujui produksi)

v6.4.2 mempertahankan QRIS Dynamic & Payment Assurance v6.4.0, hotfix secret handling 6.4.1 dan seluruh fitur produktivitas hasil review Claude, tanpa mengubah prinsip Spark-only. Gate release mencakup regression QRIS, structured secret audit, syntax/configuration validation, serta production build melalui CI bila dependency registry lokal tidak tersedia.

Acceptance flow produksi setelah push:

1. Backup JSON. **Jangan hapus antrean offline yang masih ada.**
2. Jalankan workflow Android `test-only` v6.4.2 sampai core test, audit, dan Vite build hijau.
3. Tunggu Cloudflare Pages hijau dan smoke test fungsi Web/PWA utama.
4. Pastikan **Deploy Firebase Spark Rules** ruleset v6.4.0 sudah pernah hijau; jalankan sekali bila belum. v6.4.1 tidak menambah perubahan rules/index baru.
5. Pada setiap cabang, validasi source QRIS merchant, generate QR dinamis dengan nominal kecil, scan menggunakan aplikasi pembayaran, cocokkan **nama merchant + nominal**, lakukan pembayaran uji, dan pastikan notifikasi merchant benar-benar masuk sebelum enable dynamic.
6. Uji QRIS statis, dinamis, fallback, split payment, Customer Display, audit Detail Transaksi, struk, refund/void, dan retry/double-click checkout.
7. Uji Owner ↔ Karyawan, offline→reconnect sampai queue 0, barcode, Kamera/Galeri, AI quota fallback, PO partial, serial/warranty, dan printer.
8. Jalankan `android-release`; smoke test fisik Infinix Note 40 Pro+ dan Huawei MatePad SE 11.
9. Jalankan Windows `test-only`, lalu `windows-release`; uji installer, Kasir, QRIS, dan Layar Pelanggan kedua.

QRIS v6.4.0 belum melakukan settlement otomatis dari PJP. Kasir tetap memverifikasi notifikasi merchant. Integrasi otomatis di masa depan hanya boleh memakai API/webhook resmi PJP/acquirer dengan signature verification, anti-replay, idempotency, dan reconciliation.

Lihat `QA-REPORT-Bumi-Makmur-POS-v6.4.1.md`, `BUILD-REPORT-Bumi-Makmur-POS-v6.4.1.md`, `RELEASE-NOTES-Bumi-Makmur-POS-v6.4.1.md`, `docs/IMPLEMENTATION-NOTES-v6.4.1.md`, serta dokumentasi QRIS v6.4.0 untuk gate lengkap.


## Pembaruan setelah review

Lihat `docs/CODE-REVIEW-v6.4.1.md` (bug yang diperbaiki) dan `docs/FITUR-TAMBAHAN-v6.4.2.md` (Ctrl+K, Wawasan Penjualan, hitung pecahan kas, ekspor transaksi CSV).
