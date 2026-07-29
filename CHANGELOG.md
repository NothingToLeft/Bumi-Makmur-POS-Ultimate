# Changelog

## v5.6.2 — Desktop Cloud Session Recovery

- Memperbaiki persistensi Firebase Authentication pada installer Windows menggunakan IndexedDB dengan fallback localStorage.
- Menunggu pemulihan sesi Auth selesai sebelum membaca profil dan membuka listener Firestore.
- Sinkronisasi inti tidak lagi dinonaktifkan ketika satu koleksi fitur tambahan belum dapat dibaca.
- Diagnostik realtime dan bootstrap kini mencatat nama koleksi yang gagal.
- Error identik digabung menjadi satu catatan dengan jumlah kejadian.
- Status cloud yang sudah tersinkron tidak lagi ditimpa pesan error lama.
- Tidak menghapus data, tidak mengurangi fitur, dan tidak mengubah Firestore Rules.


## v5.6.1 — Quiet Sync UI & Professional Settings Polish

- Mengurangi peringatan cloud berulang dan mengembalikan halaman Cloud & Backup ke tampilan ringkas.
- Diagnostik teknis tetap lengkap tetapi dipindahkan ke panel buka-tutup.
- Banner global tidak ditampilkan lagi saat pengguna sudah berada di Pengaturan Cloud.
- Tidak mengubah data, Firestore Rules, maupun fitur operasional v5.6.0.

# Changelog Bumi Makmur POS

## v5.6.0 — Stability, Sync, Import & Operational Audit

- Menambahkan Pusat Diagnostik Cloud dan status sinkronisasi yang membedakan offline, antrean, sesi salah, konflik, izin, dan tersinkron.
- Menambahkan impor Excel/CSV produk dan stok dengan preview, validasi, kategori otomatis, varian, SKU otomatis, serta harga per kemasan.
- Menambahkan riwayat perubahan harga dan cetak label barcode massal.
- Memisahkan Purchase Order dari penerimaan/restok.
- Menambahkan approval PIN untuk diskon di atas batas role.
- Menambahkan preview/validasi backup sebelum restore dan cetak closing shift 80 mm.
- Menambahkan koleksi serta Firestore Rules untuk PO, riwayat harga, approval, dan sesi perangkat.
- 125 core/regression tests lulus; audit statis dan parser source lulus.

# Changelog

## v5.5.0 — Store Manager Operational Admin & Safe Product Lifecycle
- Store Manager menjadi kepala operasional cabang dengan hak kelola produk, stok, kategori, pembelian, pemasok, pelanggan, keuangan, QRIS, printer, laporan, dan Kasir pada cabangnya.
- Menambahkan Kosongkan Stok, Arsipkan, Pulihkan, dan Hapus Permanen produk dengan pemeriksaan riwayat menyeluruh.
- Hapus permanen hanya untuk produk stok 0 tanpa riwayat; produk bersejarah wajib diarsipkan.
- Firestore Rules membuka perubahan kategori bagi Manager tanpa membuka pengaturan global.
- Identitas usaha, Owner, Manager lain, cabang, restore/reset cloud, dan keamanan utama tetap Owner-only.

## v5.5.0 — Smart Catalog, Multi-Unit Pricing & Owner Flow

### Katalog dan pencarian barang

- Semua daftar barang kini diurutkan otomatis berdasarkan nama dengan urutan natural: `Philips 6W`, `Philips 10W`, `Philips 12W`, lalu `Philips 15W`.
- Mengganti pemilih barang Android yang panjang dengan pemilih profesional berisi pencarian nama, SKU, barcode, kategori, dan lokasi rak.
- Pemilih baru digunakan pada penyesuaian stok, transfer cabang, pembelian/restok, dan pesanan online.

### Satuan jual dengan harga khusus

- Satu produk tetap memakai satu stok dasar, tetapi setiap satuan jual dapat memiliki harga sendiri.
- Contoh Kabel Ties: `1 pcs = Rp500`, `1 pack = 100 pcs`, dan harga pack dapat ditetapkan `Rp45.000`, bukan wajib `100 × Rp500`.
- Mendukung harga eceran, grosir, dan proyek untuk satuan `pcs`, `pack`, `dus`, `box`, `roll`, dan satuan khusus lain.
- Penjualan kemasan mengurangi stok dasar secara tepat tanpa membuat produk ganda.

### Kategori produk dinamis

- Menambahkan kategori langsung dari form Tambah Barang.
- Menambahkan Pengelola Kategori untuk membuat, mengganti nama, menggabungkan, dan menghapus kategori secara aman.
- Kategori yang sudah dipakai harus dipindahkan ke kategori pengganti agar produk tidak kehilangan klasifikasi.

### Login Owner dan cabang

- Owner tidak lagi memilih cabang pada halaman login karena hanya ada satu akun Owner utama.
- Setelah masuk, Owner dapat mengganti cabang aktif dari pemilih cabang di bagian atas aplikasi.
- Login karyawan tetap memilih cabang, memilih nama dari daftar, lalu memasukkan PIN.

### Hapus dan arsip cabang

- Owner dapat menghapus permanen cabang baru yang masih kosong.
- Cabang yang sudah memiliki transaksi, stok, pembelian, shift, atau riwayat lain akan diarsipkan, bukan dihapus, agar audit dan laporan tetap aman.
- Cabang yang diarsipkan hilang dari login dan operasional harian, tetapi dapat dipulihkan kembali.
- Sistem mencegah penghapusan cabang aktif terakhir.

### Kompatibilitas

- Produk Induk + Varian, shared barcode, SKU otomatis, barcode internal, penjualan pecahan, QRIS cabang, Windows, Android, Web/PWA, dan Firebase Spark tetap dipertahankan.
- Tidak memakai Cloud Functions, Firebase Storage, Blaze, atau billing.
- Tidak memerlukan perubahan Firestore Rules untuk pembaruan ini.

### QA

- Core/regression tests: **111/111 lulus**.
- Static audit: **lulus**.
- JS/JSX source parser: **42 file, 0 error sintaks**.
- JSON: **4 file valid**.

## v5.3.0 — Product Variants & Shared Barcode

- Menambahkan Produk Induk + Varian dengan SKU, harga, HPP, stok, minimum, rak, dan status terpisah.
- Barcode kemasan yang sama menampilkan pemilih varian; SKU/barcode internal langsung memilih varian.
- Menambahkan SKU otomatis seperti `BM-PHI-LED-006`, `BM-PHI-LED-010`, `BM-PHI-LED-012`, dan `BM-PHI-LED-015`.
- Menambahkan label barcode CODE39 internal yang dapat dipindai.
- Menjaga pembelian, transfer, opname, checkout, refund, HPP, dan laporan tetap terpisah per varian.

## v5.2.3 — Purchase & Restock Responsive Layout Fix

- Memperbaiki tombol **Tambah ke Daftar** yang meluber dan menimpa panel Ringkasan.
- Mengubah layout modal Pembelian menjadi satu kolom pada layar sempit dan dua kolom aman mulai layar lebar.
- Mengganti grid lima kolom berbasis viewport dengan grid 12 kolom yang menyesuaikan ruang kontainer.
- Menambahkan `min-width: 0`, batas lebar, wrapping tombol, dan panel ringkasan responsif.
- Menambahkan regression test agar kerusakan layout tidak kembali.

## v5.2.2 — Responsive Sidebar Identity Fix

- Nama cabang panjang pada sidebar desktop tidak lagi dipotong satu baris.
- Nama tampil hingga dua baris dengan ukuran huruf adaptif.
- Sidebar Web/Windows dibuat sedikit lebih lega dan bagian identitas memiliki tinggi fleksibel.
- Versi aplikasi tetap berada pada baris metadata terpisah.
- Menambahkan regression test khusus nama cabang panjang.
- Tidak ada perubahan data atau Firestore Rules.

---

## v5.2.1 — Cable Half-Meter & Quantity Usability Fix

### Kelipatan kabel diperbaiki

- Mengganti input angka bebas **Langkah jumlah terkecil** dengan pilihan **Kelipatan penjualan** yang jelas.
- Kabel dengan satuan dasar meter sekarang otomatis disarankan **0,5 meter (setengah meter)**.
- Nilai lama yang hampir setengah meter, termasuk `0,499`, otomatis dinormalisasi menjadi `0,5` saat data dimuat.
- Kasir hanya menerima jumlah yang sesuai kelipatan, misalnya `0,5`, `1`, `1,5`, `2`, `2,5`, `3`, dan `3,5` meter.
- Menambahkan tombol jumlah cepat saat checkout untuk barang pecahan.
- Menambahkan penjelasan langsung bahwa jumlah yang tidak sesuai akan dibulatkan ke kelipatan produk.

### Form Produk & Stok

- Menambahkan preset **Kabel: 1 roll = 50 meter**.
- Mengganti istilah teknis yang membingungkan dengan bahasa operasional toko.
- Perubahan satuan dasar otomatis menawarkan kelipatan yang masuk akal.
- Stok awal dan stok minimum otomatis diselaraskan dengan kelipatan penjualan.
- Migrasi data lama memperbaiki kelipatan kabel tanpa mengubah jumlah stok, harga, atau riwayat transaksi.

### Pembelian dan restok

- Memperbaiki tata letak form Pembelian/Restok agar tombol **Tambah ke Daftar** tidak menimpa panel ringkasan pada desktop atau layar sempit.
- Kolom barang, satuan, jumlah, harga, dan tombol dibuat responsif hingga monitor lebar.
- Mengganti satuan barang yang sudah ditambahkan sekarang mempertahankan modal efektif per satuan dasar.
- Menambahkan keterangan konversi yang jelas, misalnya `1 roll menambah 50 meter`.
- Retur pembelian otomatis mengikuti kelipatan satuan yang dipakai.

### Audit jumlah pecahan menyeluruh

- Checkout, edit item, split bill, refund, retur pembelian, penyesuaian stok, stok opname, transfer cabang, pembelian, dan pesanan online dinormalisasi dengan aturan kuantitas yang sama.
- Penyesuaian stok mendukung nilai bertanda, misalnya `+10`, `-1,5`, tetapi tetap mengikuti kelipatan barang.
- Stok opname dan transfer dibuat responsif serta menampilkan batas dan kelipatan yang berlaku.
- Nota, layar pelanggan, riwayat transaksi, dan dokumen pembelian menampilkan angka pecahan dengan format Indonesia.

### Identitas Desktop

- Nama aplikasi Desktop, sidebar, header, nota, dan layar pelanggan tetap mengikuti identitas cabang aktif.
- Perubahan ini tidak memisahkan data Web, PC, Android, atau cabang.

### Kompatibilitas

- Firebase Spark/free tier tetap dipertahankan.
- Tidak menggunakan Cloud Functions, Firebase Storage, Blaze, atau billing.
- Tidak ada perubahan skema izin Firestore pada hotfix ini.
- Data v5.2.0 dapat diperbarui langsung tanpa uninstall dan tanpa reset database.

### QA

- Core tests: **100/100 lulus**.
- Static audit: **lulus**.
- JS/JSX/MJS: **66 file diperiksa**.
- JSON: **4 file valid**.
- Parser TypeScript: **62 file source, 0 error sintaks**.
- Vite production build tetap wajib dijalankan melalui GitHub Actions karena pemasangan dependency lokal mengalami timeout.


---

## v5.2.0 — Smart Inventory & Fractional Sales

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
- Retur pembelian mengurangi stok dasar dengan faktor konversi yang sama.
- Riwayat pergerakan menyimpan jumlah kemasan dan jumlah stok yang sebenarnya.

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


---

## v5.1.3 — Login Page Content Studio

- Menambahkan panel khusus Pengaturan → Toko → Tampilan Halaman Login.
- Owner dapat mengatur header, subheader, judul pilihan akun, deskripsi Owner/Karyawan, status online/offline, dan footer.
- Menambahkan placeholder dinamis `{branch}`, `{business}`, dan `{version}`.
- Menambahkan preview langsung sebelum perubahan disimpan.
- Tampilan login dipublikasikan melalui direktori login publik yang aman agar sama di Web, PC, HP, dan tablet.
- Data lama otomatis memakai teks standar tanpa migrasi manual.
- Tidak mengubah Firestore Rules dan tetap kompatibel dengan Firebase Spark.

## v5.1.2 — Branch Identity & UI Fix

- Memperbaiki tombol sinkronisasi kosong, menambahkan editor cabang, dan menyelaraskan identitas aplikasi dengan cabang aktif.

# Changelog Bumi Makmur POS

## v5.2.2 — Responsive Sidebar Identity Fix

- Nama cabang panjang pada sidebar desktop tidak lagi dipotong satu baris.
- Nama tampil hingga dua baris dengan ukuran huruf adaptif.
- Sidebar Web/Windows dibuat sedikit lebih lega dan bagian identitas memiliki tinggi fleksibel.
- Versi aplikasi tetap berada pada baris metadata terpisah.
- Menambahkan regression test khusus nama cabang panjang.
- Tidak ada perubahan data atau Firestore Rules.

---

## v5.1.1 — GitHub Releases Otomatis

### Distribusi profesional
- Menambahkan publikasi otomatis installer Windows EXE/MSI ke menu GitHub Releases.
- Menambahkan publikasi otomatis APK/AAB Android ke Release yang sama.
- Release memakai tag versi dari `package.json` dan nama rilis yang konsisten.
- Build ulang versi yang sama memperbarui aset melalui `--clobber`, bukan membuat duplikat.
- Menyertakan checksum SHA-256 dan release notes pada hasil build.
- Actions Artifacts tetap tersedia sebagai cadangan selama 30 hari.

---

## v5.1.0 — Desktop Windows, Identitas Toko Dinamis, dan Scan Barcode Produk

### Desktop Windows
- Menambahkan aplikasi Electron dengan context isolation, sandbox, dan Node integration nonaktif.
- Menambahkan workflow GitHub Actions untuk installer NSIS `.exe` dan MSI `.msi`.
- Menambahkan shortcut F2 cari, F4 bayar, F8 tahan transaksi, F9 scan, dan Esc tutup dialog.
- Menambahkan layar pelanggan kedua pada monitor tambahan.

### Identitas toko
- Owner dapat mengganti nama toko, alamat, dan telepon dari Pengaturan → Bisnis.
- Nama baru diterapkan ke shell aplikasi, login karyawan, nota, QRIS default, judul aplikasi, dan layar pelanggan.
- Perubahan tidak membuat toko baru dan tidak menghapus riwayat.

### Produk dan barcode
- Menambahkan scan kamera pada formulir Produk Baru.
- Mendukung scanner USB/Bluetooth dengan fokus kolom barcode.
- Menambahkan validasi barcode ganda sebelum penyimpanan.

### Stabilitas
- Mempertahankan Firebase Spark, offline queue, konflik rebase, role per cabang, QRIS per cabang, Android, dan Web/PWA.
- Menambahkan regression test khusus Windows, identitas toko, barcode produk, shortcut kasir, dan layar pelanggan.

---

## 5.0.0 — Professional Control Center & QRIS Adaptive

### QRIS Adaptive v3
- Mengganti batas kompresi tunggal yang memunculkan alert `Gambar masih terlalu besar` dengan pipeline adaptif bertahap.
- Menerima sumber PNG/JPG/WebP hingga 24 MB.
- Memangkas ruang kosong di sekitar gambar secara aman, menambahkan kembali quiet zone putih, lalu mencoba PNG lossless dan WebP adaptif.
- Menargetkan hasil sekitar 330 KB dengan batas keras 420 KB agar data URL tetap aman di bawah batas Firestore Rules.
- Menambahkan fallback kontras tinggi untuk gambar yang sangat rumit, latar putih, validasi resolusi minimal, preview besar, metadata mode/ukuran/resolusi, dan status proses tanpa popup browser.
- Menggunakan Object URL dan melepas canvas setiap tahap untuk mengurangi lonjakan memori pada Android ketika memproses gambar besar.
- QRIS lama yang terlalu besar diarahkan ke proses optimasi ulang; hasil mendekati batas tetap dapat disimpan bila masih aman untuk Firestore.

### QRIS per cabang dan isolasi konflik
- Menambahkan koleksi `branchPaymentProfiles` dengan satu dokumen per cabang.
- Owner dapat memilih dan mengatur QRIS setiap cabang.
- Store Manager hanya dapat mengatur QRIS cabangnya sendiri.
- Kasir otomatis memakai QRIS cabang yang dipilih saat login.
- Memisahkan gambar QRIS dari dokumen settings global untuk mengurangi konflik perubahan Web dan HP.
- Cabang baru otomatis memperoleh profil pembayaran dasar.

### Pusat Kontrol Operasional
- Menambahkan modul baru **Pusat Kontrol** untuk Owner dan Store Manager.
- Menambahkan Operational Health Score per cabang.
- Menampilkan stok habis/menipis dan saran jumlah restock berdasarkan kelipatan stok minimum.
- Menampilkan nilai stok modal, potensi nilai retail, omzet bersih hari ini, risiko margin, SKU/barcode ganda, piutang/utang jatuh tempo, dan shift terbuka terlalu lama.
- Menambahkan ekspor CSV serta cetak daftar restock 80 mm.
- Menambahkan pengaturan target restock dan batas peringatan durasi shift.

### Migrasi aman v4.x → v5
- Menambahkan normalisasi struktur database lama sebelum dipakai oleh mutasi v5.
- Koleksi baru dibuat sebagai wadah kosong tanpa menyisipkan produk/transaksi demo ke database nyata.
- Backup JSON lama dinormalisasi saat restore.
- Mempertahankan database key lokal, package ID, dan signing path agar update tidak menghapus data.
- Mempertahankan fallback QRIS lama sampai profil per cabang disimpan.

### Login, role, dan cloud
- Menghapus aktivasi toko dari login normal; fungsi bootstrap hanya dapat dibuka melalui mode pemulihan khusus pada database benar-benar baru.
- Mempertahankan login Owner/Karyawan terpisah, cabang + nama + PIN, dan biometrik eksplisit.
- Mempertahankan pembatasan Store Manager satu cabang dan pengelolaan Kasir cabangnya.
- Mempertahankan hotfix query transfer Manager berdasarkan `sourceBranchId` dan `destinationBranchId`.
- Menambahkan Firestore Rules khusus `branchPaymentProfiles` dengan batas ukuran dan scope per cabang.
- Tetap memakai Firebase Auth + Firestore Spark tanpa Functions, Storage, Blaze, atau billing.

### Build dan dependency
- Mengisolasi Firebase CLI dari dependency build aplikasi; `firebase-tools` hanya diunduh pada workflow deploy rules.
- Mengurangi paket dan peringatan deprecated yang tidak diperlukan saat build Web/Android.

### QA
- Core tests: **77/77 lulus**.
- Audit statis: **lulus**.
- Audit source: **58 file JS/JSX/MJS**, relative import lengkap; file non-JSX lolos `node --check`.
- Kompilasi Vite final diwajibkan melalui workflow GitHub `test-only`.

## 4.5.1 — Store Manager Cloud Sync Hotfix

### Sinkronisasi Store Manager
- Memperbaiki Store Manager yang mendapat pesan `Cloud bermasalah` setelah login.
- Akar masalah: koleksi transfer stok sebelumnya difilter memakai `branchId`, padahal dokumennya memakai `sourceBranchId` dan `destinationBranchId`.
- Store Manager sekarang memuat transfer keluar dan transfer masuk cabangnya melalui dua query Firestore yang sesuai Security Rules.
- Hasil dua query digabung berdasarkan ID sehingga tidak muncul data ganda.
- Listener realtime Store Manager memakai cakupan cabang yang sama dengan proses pemuatan awal.

### Diagnostik
- Error listener realtime sekarang mencatat nama koleksi yang gagal di console agar gangguan cloud berikutnya lebih cepat ditemukan.
- Tidak mengubah Firestore Rules, struktur database, PIN, cabang, maupun data lokal.
- Owner dan Kasir tetap memakai perilaku sinkronisasi yang sama.

## 4.5.0 — Branch Login, Name + PIN, Store Manager & Multi-Device Sync

### Login Owner dan Karyawan

- Mempertahankan halaman **Login Owner** dan **Login Karyawan** yang benar-benar terpisah.
- Mengubah login harian karyawan menjadi **pilih toko/cabang + nama login + PIN 4 digit**.
- Menghapus kebutuhan email dan password dari layar login karyawan.
- Menampilkan daftar cabang aktif pada layar login, termasuk cabang baru yang dibuat Owner.
- Menyimpan daftar cabang aman secara lokal agar pilihan cabang tetap tersedia ketika perangkat offline.
- Owner dapat memilih cabang yang ingin dibuka, sedangkan Manager/Kasir selalu diarahkan ke cabang tugasnya.

### Biometrik

- Menghapus pemanggilan biometrik otomatis saat halaman login dibuka.
- Menambahkan tombol eksplisit **Masuk dengan Sidik Jari / Face ID**.
- Dialog biometrik hanya tampil setelah tombol tersebut ditekan.
- Memvalidasi role dan cabang akun biometrik sebelum sesi dibuka.

### Karyawan dari Pengaturan

- Menempatkan seluruh pengelolaan karyawan di `Pengaturan → Karyawan`.
- Menambahkan pembuatan, pengeditan, aktivasi/nonaktif, pergantian PIN, dan penghapusan akun dari aplikasi.
- Menambahkan nama login unik per cabang.
- Menambahkan migrasi akun karyawan lama ke sistem nama + PIN.
- Memperbaiki migrasi agar direktori login baru tidak terhapus ketika nama dan cabang tetap sama.
- Menambahkan penghapusan permanen profil POS dan direktori login.
- Bila PIN saat ini dimasukkan ketika menghapus, identitas Firebase Authentication juga dihapus.
- Riwayat transaksi tetap mempertahankan nama kasir meskipun akun sudah dihapus.

### Store Manager per Cabang

- Owner dapat membuat akun **Store Manager** atau **Kasir** untuk cabang mana pun.
- Store Manager dapat menambah, mengubah, menonaktifkan, mengganti PIN, dan menghapus Kasir pada cabangnya sendiri.
- Store Manager tidak dapat membuat atau mengelola Manager lain.
- Store Manager tidak dapat membuat cabang, mengubah pengaturan toko global, restore backup, atau reset cloud.
- Akses Manager ke profil karyawan, data cabang, dan audit log dibatasi ke cabang yang ditugaskan.
- Hak akses khusus Kasir yang diberikan Manager dibatasi ke daftar izin Kasir yang aman.

### Cabang pada Layar Login

- Menambahkan dokumen Firestore publik yang hanya berisi nama toko dan daftar cabang aktif yang sudah disanitasi.
- Listing dokumen publik tetap diblokir; aplikasi hanya membaca satu dokumen login yang telah ditentukan.
- Setiap penambahan cabang oleh Owner otomatis memperbarui pilihan cabang pada web dan Android.
- Pengguna non-Owner hanya memuat dokumen cabang yang ditugaskan setelah login.

### Sinkronisasi Web dan HP

- Mengubah penanganan konflik optimistic concurrency menjadi rebase terarah terhadap dokumen cloud terbaru.
- Menambahkan retry bertahap hingga enam kali dengan jeda acak untuk mengurangi tabrakan web–HP.
- Konflik sementara tidak lagi disimpan sebagai error cloud permanen atau memunculkan peringatan berulang.
- Mutasi yang belum selesai tetap berada di antrean lokal dan dicoba lagi oleh background sync.
- Tampilan realtime tetap menggabungkan data cloud terbaru dengan perubahan lokal yang belum terkirim.
- Idempotency receipt dan audit log tetap dipertahankan agar mutasi tidak terduplikasi.

### Firebase Spark dan Keamanan

- Menambahkan `employeeLoginDirectory` berbasis hash `store + branch + login name`.
- Identitas Firebase karyawan dibuat melalui secondary Auth agar sesi Owner/Manager tidak terputus.
- Memperketat Firestore Rules untuk Owner, Store Manager, Kasir, profil pengguna, cabang, audit, dan direktori login.
- Pengaturan toko global hanya dapat ditulis Owner.
- Store Manager hanya dapat membuat profil Kasir di cabang sendiri.
- Tetap menggunakan Firebase Authentication dan Cloud Firestore pada paket Spark.
- Tidak menggunakan Firebase Functions, Firebase Storage, Blaze, atau layanan berbayar.

### UI/UX dan Stabilitas

- Memperjelas label **Toko / Cabang**, **Nama Login Karyawan**, dan status koneksi pada halaman login.
- Menambahkan notifikasi hasil simpan dan hapus karyawan yang lebih informatif.
- Memperbarui halaman Changelog di dalam aplikasi.
- Memperbarui versi aplikasi, cache PWA, workflow, artifact Android/Web, dan Android version code ke `4.5.0` / `40500`.
- Mempertahankan database key lokal agar update dari v4.4 tidak menghapus data perangkat.
- Menambahkan regression tests untuk login nama + PIN, direktori cabang, batas Manager, penghapusan akun, dan conflict rebase.

### Hasil pemeriksaan source

- Core tests: **71/71 lulus**.
- Audit statis: **lulus**.
- Parser sintaks JS/JSX/MJS: **53 file, 0 error**.

## 4.4.0 — Professional Login, Employee Access & Mobile UI Audit

- Memisahkan Login Owner dan Login Karyawan.
- Memindahkan pengelolaan karyawan ke Pengaturan.
- Memperbaiki Firestore bootstrap/profile permission dan mobile search UI.
- Menambahkan friendly Firebase errors dan Changelog di aplikasi.

## 4.3.0 — Spark FreeSync, Web & PC

- Firebase Spark-only: Auth + Firestore; tanpa Functions/Storage/Blaze.
- Cloudflare Pages untuk web dan PC PWA.
- Direct Firestore atomic mutation, idempotency receipt, conflict rebase, dan audit log.
- Persistent multi-tab cache serta offline queue terenkripsi.
