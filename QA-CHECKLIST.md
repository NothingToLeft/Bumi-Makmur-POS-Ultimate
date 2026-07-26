# QA Checklist v4.5

## A. Build dan deploy

- [ ] Workflow `test-only` hijau: 71 tests, audit statis, dan Vite compile.
- [ ] Workflow `Deploy Firebase Spark Rules` hijau.
- [ ] Firestore Rules di Firebase Console menunjukkan versi terbaru.
- [ ] `android-release` menghasilkan APK/AAB signed v4.5.
- [ ] APK v4.5 dapat dipasang di atas v4.4 tanpa uninstall.

## B. Login Owner

- [ ] Halaman awal menampilkan pilihan Login Owner dan Login Karyawan.
- [ ] Login Owner hanya menerima PIN/akun Owner.
- [ ] PIN karyawan di halaman Owner menghasilkan pesan yang benar.
- [ ] Masuk Owner dengan email berhasil pada perangkat baru.
- [ ] Setup Toko Pertama Kali hanya terlihat di halaman Owner.
- [ ] Biometrik Owner tidak muncul otomatis dan hanya berjalan setelah tombol ditekan.

## C. Login Karyawan

- [ ] Login Karyawan tidak menampilkan setup toko.
- [ ] Owner membuat akun dari Pengaturan → Karyawan.
- [ ] Pilihan toko/cabang menampilkan seluruh cabang aktif.
- [ ] Karyawan login memakai nama login dan PIN 4 digit tanpa email/password.
- [ ] Login Manager/Kasir membuka cabang yang ditugaskan.
- [ ] Biometrik karyawan hanya muncul setelah tombol Sidik Jari / Face ID ditekan.
- [ ] Akun nonaktif tidak dapat login/sinkronisasi.

## D. Karyawan & Firestore

- [ ] Karyawan baru langsung muncul setelah tombol Simpan Akun berhasil.
- [ ] Edit nama, role, cabang, status, dan permission tersimpan.
- [ ] Ganti PIN memerlukan PIN saat ini dan menyimpan PIN baru.
- [ ] Hapus akun mencabut profil POS/direktori login; dengan PIN, identitas Auth ikut dihapus.
- [ ] Manager hanya dapat menambah/mengelola Kasir pada cabangnya.
- [ ] Owner tetap login setelah membuat akun karyawan.
- [ ] Tidak ada banner mentah `Missing or insufficient permissions`.
- [ ] Transaksi, produk, stok, pelanggan, dan karyawan dapat dibaca sesuai role.
- [ ] Manager hanya melihat data cabang yang ditugaskan.
- [ ] Kasir tidak dapat mengubah harga, cabang, limit kredit, atau pengaturan Owner.

## E. UI HP/tablet/PC

- [ ] Search icon tidak menutupi placeholder di Transaksi, Produk, Stok, Pemasok, Pelanggan, Pembelian, dan Kasir.
- [ ] Ikon persen tidak menutupi angka markup produk.
- [ ] Tombol hapus pencarian muncul saat ada teks.
- [ ] Input tidak terpotong pada keyboard Android dan font size perangkat.
- [ ] Header tidak tertutup status bar.
- [ ] Bottom navigation tidak tertutup gesture/navigation bar.
- [ ] Modal login dan karyawan dapat di-scroll pada layar kecil.
- [ ] Infinix Note 40 Pro+ portrait.
- [ ] Huawei MatePad SE 11 portrait dan landscape.
- [ ] PC 1366×768 dan 1920×1080.

## F. Operasional utama

- [ ] Kasir, barcode kamera/manual/USB/Bluetooth keyboard.
- [ ] Produk, varian, konversi, bundle, markup, dan stok.
- [ ] Open bill, pembayaran, refund, void, approval.
- [ ] Pembelian, retur, hutang, piutang, shift, dan laporan.
- [ ] Nota 58/80 mm, WhatsApp, QRIS, dan nota online.
- [ ] Mode pesawat tetap dapat transaksi; setelah online antrean kembali 0 tanpa duplikasi.
- [ ] Ubah data yang sama dari web dan HP; conflict rebase selesai tanpa banner error berulang.
