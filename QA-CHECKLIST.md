# QA Checklist v3.3

## Instalasi, signing, dan update

- [ ] Workflow Generate Android Signing Key selesai hijau.
- [ ] File `.jks` disimpan di dua tempat aman.
- [ ] Empat GitHub Actions Secrets sudah dibuat.
- [ ] Build Signed Android Release selesai hijau.
- [ ] Artifact berisi APK, AAB, checksum, dan sertifikat.
- [ ] APK signature lolos langkah `apksigner verify`.
- [ ] Setelah release signed sebelumnya terpasang, build berikutnya dapat meng-update tanpa uninstall.

## Permission kamera dan barcode

- [ ] Instal APK baru, buka aplikasi, dialog permission kamera muncul sebelum login.
- [ ] Pilih Izinkan, login, tekan Scan, kamera belakang langsung tampil.
- [ ] Tutup scanner, indikator kamera perangkat ikut mati.
- [ ] Tolak permission, tekan Scan, pesan error dan tombol Pengaturan Android muncul.
- [ ] Aktifkan permission melalui Pengaturan Android lalu Coba Lagi berhasil.
- [ ] BarcodeDetector membaca barcode pada perangkat yang mendukung.
- [ ] Input barcode manual dan scanner USB tetap berfungsi sebagai fallback.

## Login dan biometrik

- [ ] PIN salah menampilkan error dan keypad langsung dapat dipakai ulang.
- [ ] Owner 1608, Manager 2468, dan Kasir 1234 dapat login.
- [ ] Masuk dengan PIN, buka Pengaturan → Keamanan.
- [ ] Status biometrik sesuai kondisi perangkat.
- [ ] Aktifkan biometrik meminta dialog Android resmi.
- [ ] Logout, tombol Buka dengan Biometrik berhasil membuka akun yang dihubungkan.
- [ ] Membatalkan dialog biometrik tidak membuat login stuck.
- [ ] Menonaktifkan biometrik menghilangkan tombol pada login.
- [ ] Kasir tidak mendapatkan modul Owner/Manager.

## Produk dan harga

- [ ] Input 5000 tampil sebagai 5.000 tanpa nol di depan.
- [ ] Modal Rp5.000 + markup 30% menghasilkan harga jual Rp6.500.
- [ ] SKU dan barcode ganda ditolak.
- [ ] Nama produk kosong ditolak.
- [ ] Produk dapat diarsipkan tanpa menghapus riwayat.

## Kasir

- [ ] Produk dapat dicari melalui nama, SKU, dan barcode.
- [ ] Harga eceran/grosir/proyek berubah dengan benar.
- [ ] Konversi satuan dan bundle mengurangi stok yang benar.
- [ ] Diskon, promo, reward, pajak, service, dan pembulatan benar.
- [ ] Open bill dapat disimpan dan dibuka ulang.
- [ ] Split bill dan split payment berfungsi.
- [ ] Pembayaran kurang ditolak.
- [ ] Kelebihan non-tunai ditolak; kelebihan tunai menjadi kembalian.
- [ ] Tempo menolak pelanggan umum dan memerlukan jatuh tempo.
- [ ] Menekan Bayar berulang tidak membuat transaksi ganda.
- [ ] Struk menampilkan seluruh item dan total.

## Inventory dan pembelian

- [ ] Penjualan mengurangi stok tepat satu kali.
- [ ] Pembelian RECEIVED menambah stok tepat satu kali.
- [ ] Faktur ganda ditolak.
- [ ] Diskon item/faktur berlebihan ditolak.
- [ ] Pembelian belum lunas wajib memiliki jatuh tempo.
- [ ] Pembelian yang sudah diterima tidak dapat diedit.
- [ ] Retur pembelian dibatasi sisa kuantitas dan stok tersedia.
- [ ] Adjustment tidak membuat stok negatif dan qty 0 ditolak.
- [ ] Opname kosong atau stok fisik negatif ditolak.
- [ ] Transfer cabang menolak qty 0 dan tujuan yang sama.

## Shift, keuangan, refund

- [ ] Tunai meminta shift aktif bila konfigurasi mewajibkan.
- [ ] Kas shift mencatat uang tunai bersih setelah kembalian.
- [ ] Kas masuk/keluar nominal 0 ditolak.
- [ ] Pengeluaran, pembelian, dan refund tunai memengaruhi expected cash.
- [ ] Pembayaran piutang/hutang tidak dapat melebihi saldo.
- [ ] Refund wajib memilih item dan mengisi alasan.
- [ ] Refund sebagian tidak melebihi sisa kuantitas.
- [ ] Restock mengembalikan stok.
- [ ] Approval PIN Manager/Owner berfungsi.

## Responsive dan penyimpanan

- [ ] Infinix Note 40 Pro+ portrait tidak memiliki horizontal scroll.
- [ ] Huawei MatePad SE 11 portrait nyaman digunakan.
- [ ] Tablet landscape menampilkan katalog dan keranjang berdampingan.
- [ ] Bottom navigation tidak menutupi tombol kasir.
- [ ] Data bertahan setelah aplikasi ditutup dan dibuka.
- [ ] Backup JSON dapat diunduh dan Restore memulihkan data.
- [ ] Aplikasi tetap membuka shell saat offline setelah pernah dibuka.

## Pembayaran digital & nota premium v3.3

- [ ] QRIS, ShopeePay, OVO, GoPay, dan DANA tampil di modal pembayaran.
- [ ] Metode digital tersimpan terpisah pada transaksi dan laporan pembayaran.
- [ ] QR merchant yang diunggah tampil pada pembayaran digital.
- [ ] Logo, judul, footer, dan pesan toko tampil pada nota.
- [ ] Nomor WhatsApp pelanggan otomatis terisi dari data pelanggan.
- [ ] Tombol WhatsApp membuka chat dengan isi nota yang lengkap.
- [ ] Tombol Bagikan membuka share sheet Android dan menyertakan gambar nota bila didukung.
- [ ] Nota dapat dikirim ulang dari menu Transaksi.
- [ ] Cetak nota 58 mm dan 80 mm tidak terpotong.
- [ ] Upgrade dari data v3.2 tetap mempertahankan metode pembayaran kustom dan menambahkan e-wallet baru.
