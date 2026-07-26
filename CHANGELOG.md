# Changelog

## 4.4.0 — Professional Login, Employee Access & Mobile UI Audit

### Login

- Memisahkan halaman **Login Owner** dan **Login Karyawan**.
- Menambahkan validasi role pada PIN, biometrik, dan pemasangan akun cloud.
- Akun Owner tidak dapat masuk dari halaman Karyawan, dan sebaliknya.
- Mengubah alur pemasangan perangkat menjadi jelas: Owner memakai akun Owner; karyawan memakai akun yang dibuat Owner.
- Setup toko pertama hanya tersedia dari halaman Owner.
- Menyimpan jenis akun biometrik pada perangkat agar dialog biometrik tidak muncul pada halaman yang salah.

### Karyawan & hak akses

- Memindahkan pengelolaan karyawan ke `Pengaturan → Karyawan`.
- Menghapus Karyawan sebagai modul navigasi terpisah agar alurnya tidak membingungkan.
- Menambahkan pembuatan akun Firebase Manager/Kasir langsung dari aplikasi.
- Pembuatan akun memakai Firebase Auth sekunder sehingga sesi Owner tetap aktif.
- Menambahkan pilihan cabang, role, status aktif, permission khusus, dan reset password.
- Mencegah pembuatan atau pengubahan akun Owner dari formulir karyawan.
- Memperbarui daftar karyawan lokal segera setelah penyimpanan cloud berhasil.
- Menampilkan status internet, cloud, jumlah karyawan, proses simpan, berhasil, dan gagal secara jelas.

### Firebase Spark & keamanan

- Memperbaiki Firestore Rules agar pengguna terautentikasi dapat membaca dokumen bootstrap tanpa membuka listing.
- Memperbaiki pembacaan profil sendiri agar tidak terjadi ketergantungan melingkar pada `activeMember()`.
- Memperbaiki transaksi bootstrap Owner pertama agar dokumen bootstrap dan profil Owner dapat dibuat atomik.
- Membatasi profil karyawan ke role `manager` atau `kasir`.
- Mencegah profil Owner dihapus atau diubah menjadi karyawan.
- Menahan listener Firestore saat UID Firebase tidak cocok dengan profil PIN aktif.
- Menerjemahkan error permission, autentikasi, jaringan, quota, dan konfigurasi menjadi pesan Indonesia yang mudah dipahami.
- Tetap memakai Firebase Auth + Firestore Spark tanpa Functions, Storage, Blaze, atau billing.

### UI/UX profesional

- Membangun ulang komponen pencarian global dan menerapkannya juga pada layar Kasir.
- Memperbaiki ikon pencarian yang menimpa placeholder pada Transaksi, Produk, Stok, Pemasok, Pelanggan, Pembelian, dan Kasir.
- Menambahkan padding kiri/kanan konsisten, tombol hapus, dan native search decoration cleanup.
- Menyamakan tinggi, ukuran font, border, focus ring, dan touch target input Android.
- Memperbaiki kolom markup agar ikon persen tidak menutupi angka.
- Menambahkan label aksesibilitas pada tombol scanner barcode dan item manual.
- Menambahkan safe-area login dan bottom navigation.
- Menambahkan chooser login dengan kartu Owner/Karyawan yang berbeda secara visual.
- Mengubah error cloud dari banner merah teknis menjadi notifikasi oranye nonblokir yang dapat ditutup.
- Menambahkan tindakan yang sesuai role pada notifikasi cloud.
- Menyembunyikan restore dan reset database dari akun non-Owner.
- Menambahkan Changelog di dalam Pengaturan.

### Stabilitas dan rilis

- Memperbarui versi project, service worker cache, workflow, artifact, dan Android version code ke `4.4.0` / `40400`.
- Mempertahankan key database lokal v4.3 agar update tidak menghapus data perangkat.
- Menambahkan regression tests khusus login terpisah, karyawan di Pengaturan, komponen pencarian, friendly Firebase errors, dan bootstrap rules.
- Core tests: **65/65 lulus**.
- Audit statis: **51 file lulus**; parser sintaks source: **32 file, 0 error**.

## 4.3.0 — Spark FreeSync, Web & PC

- Firebase Spark-only: Auth + Firestore; tanpa Functions/Storage/Blaze.
- Cloudflare Pages untuk web dan PC PWA.
- Direct Firestore atomic mutation, idempotency receipt, conflict rebase, dan audit log.
- Persistent multi-tab cache serta offline queue terenkripsi.
- Scanner barcode keyboard, nota digital, workflow Android release, dan audit akuntansi diperluas.

## 4.2.0

- Stability, branding BM, receipt preview, typography precision, dan background sync fix.
