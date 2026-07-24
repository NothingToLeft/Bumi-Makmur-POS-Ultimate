# QA Checklist v4.1 — Hybrid Offline + Firebase Auto-Sync

## Setup dan keamanan

- [ ] Firebase environment lengkap.
- [ ] Firestore Rules dan Storage Rules berhasil dideploy.
- [ ] `PIN_PEPPER` dan `BOOTSTRAP_SECRET` tersedia pada Functions secrets.
- [ ] Bootstrap toko hanya berhasil satu kali.
- [ ] PIN salah menampilkan error dan login tidak stuck.
- [ ] Login offline hanya tersedia setelah login online pertama pada perangkat.
- [ ] Kasir tidak dapat membuka menu Owner/Manager.
- [ ] Kasir tidak dapat mengubah tingkat harga, batas kredit, poin, atau status pelanggan.
- [ ] Manager hanya mengakses cabang yang ditetapkan.
- [ ] Koleksi `privateCredentials`, `approvals`, dan `mutationReceipts` tidak dapat dibaca klien.

## Hybrid, cache, dan sinkronisasi

- [ ] Produk baru pada HP muncul di tablet setelah sinkronisasi.
- [ ] Penjualan mengurangi stok pada seluruh perangkat.
- [ ] Pembelian menambah stok pada seluruh perangkat.
- [ ] Shift, kas, hutang, piutang, dan laporan konsisten.
- [ ] Putuskan internet; transaksi, pembelian, stok, pelanggan, dan shift tetap dapat disimpan lokal.
- [ ] Jumlah pending sync bertambah saat offline.
- [ ] Sambungkan internet; antrean terkirim otomatis tanpa transaksi ganda.
- [ ] Pending sync kembali nol dan snapshot realtime diterima perangkat lain.
- [ ] Konflik stok memakai delta dan tidak menimpa perubahan perangkat lain.
- [ ] Riwayat pembayaran hutang/piutang dan retur tidak hilang saat konflik.
- [ ] Restart aplikasi saat offline tidak mengaplikasikan antrean dua kali.

## Kasir dan pembayaran

- [ ] Barcode kamera meminta izin awal dan scan dapat digunakan.
- [ ] Scanner manual/USB tetap berfungsi.
- [ ] Rupiah otomatis berformat ribuan dan nol depan dapat dihapus.
- [ ] Markup persen menghitung eceran/grosir/proyek.
- [ ] Tunai menghitung kembalian.
- [ ] QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, dan tempo tercatat benar.
- [ ] Split payment tidak kurang atau melebihi total.
- [ ] Transaksi ganda dicegah.
- [ ] Open bill dan split bill berfungsi.
- [ ] Item kustom tidak menyebabkan error stok.

## Stok, pembelian, retur

- [ ] Stok tidak dapat negatif.
- [ ] Stok pecahan meter/liter tidak dibulatkan paksa.
- [ ] Bundle/varian/konversi satuan benar.
- [ ] Adjustment, opname, dan transfer cabang tercatat.
- [ ] Pembelian tempo wajib jatuh tempo.
- [ ] Retur pembelian tidak melebihi jumlah tersedia.
- [ ] Refund penjualan tidak melebihi jumlah belum direfund.

## Firebase Storage dan nota

- [ ] Logo berhasil diunggah dan tampil pada nota.
- [ ] QRIS berhasil diunggah dan dapat dipindai.
- [ ] Nota online menghasilkan URL absolut saat internet tersedia.
- [ ] Nota teks/cetak lokal tetap tersedia saat offline.
- [ ] URL nota dapat dibuka tanpa login.
- [ ] Nota WhatsApp berisi item, pembayaran, pesan, dan tautan online.
- [ ] Cetak 58 mm dan 80 mm tidak kosong.

## Android

- [ ] APK release signature terverifikasi.
- [ ] APK memperbarui release lama tanpa uninstall.
- [ ] Kamera, pengaturan izin, Bluetooth permission, dan biometrik berfungsi.
- [ ] Biometrik hanya membuka profil yang pernah login pada perangkat yang sama.
- [ ] Layout Infinix Note 40 Pro+ portrait tidak terpotong.
- [ ] Layout Huawei MatePad SE 11 portrait/landscape optimal.

## Backup dan recovery

- [ ] Backup JSON berhasil diunduh.
- [ ] Restore hanya dapat dilakukan Owner dan saat internet tersedia.
- [ ] Restore ditolak bila masih ada antrean offline.
- [ ] Restore mengganti Firestore dan muncul realtime.
- [ ] Akun/PIN karyawan dibuat ulang melalui Cloud Functions bila migrasi dari v3.3.
