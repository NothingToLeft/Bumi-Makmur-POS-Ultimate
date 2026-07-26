# Changelog Bumi Makmur POS

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
