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
