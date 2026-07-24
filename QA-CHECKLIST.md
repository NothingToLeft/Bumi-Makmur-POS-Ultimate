# QA Checklist v3.0

## Login dan role

- [ ] Owner 1608 dapat membuka seluruh modul.
- [ ] Manager 2468 tidak dapat mengelola cabang/karyawan Owner.
- [ ] Kasir 1234 hanya melihat modul operasional yang diizinkan.
- [ ] Refund Kasir meminta PIN Manager/Owner.

## Kasir

- [ ] Produk dapat dicari melalui nama, SKU, dan barcode.
- [ ] Harga eceran/grosir/proyek berubah dengan benar.
- [ ] Konversi satuan mengubah base quantity.
- [ ] Bundle mengurangi komponen stok.
- [ ] Diskon, promo, reward, pajak, service, dan pembulatan benar.
- [ ] Open bill dapat disimpan dan dibuka ulang.
- [ ] Split bill memindahkan kuantitas yang dipilih.
- [ ] Split payment menyimpan beberapa metode.
- [ ] Tempo menolak pelanggan umum dan memeriksa credit limit.
- [ ] Struk menampilkan seluruh item dan total.

## Inventory dan pembelian

- [ ] Penjualan mengurangi stok.
- [ ] Pembelian berstatus RECEIVED menambah stok satu kali.
- [ ] Retur pembelian menolak stok yang tidak cukup.
- [ ] Adjustment tidak membuat stok negatif.
- [ ] Opname menghasilkan movement koreksi.
- [ ] Transfer mengurangi cabang sumber dan menambah cabang tujuan.

## Shift dan keuangan

- [ ] Tunai meminta shift aktif bila opsi wajib shift aktif.
- [ ] Penjualan tunai menambah kas shift.
- [ ] Pengeluaran, pembelian, dan refund tunai mengurangi kas.
- [ ] Akhir shift menghitung expected cash dan selisih.
- [ ] Pembayaran piutang/hutang tidak boleh melebihi saldo.

## Refund dan void

- [ ] Refund sebagian hanya mengembalikan qty terpilih.
- [ ] Opsi restock mengembalikan stok.
- [ ] Void penuh mengubah status transaksi.
- [ ] Audit log menyimpan pengguna dan approver.

## Responsive

- [ ] HP 412×915 tidak memiliki horizontal scroll.
- [ ] Tablet portrait memakai navigation rail/sidebar ringkas.
- [ ] Tablet landscape menampilkan katalog dan keranjang berdampingan.
- [ ] Bottom navigation tidak menutupi tombol kasir.

## Backup dan offline

- [ ] Data bertahan setelah refresh.
- [ ] Backup JSON dapat diunduh.
- [ ] Restore JSON memulihkan data.
- [ ] Aplikasi tetap membuka shell ketika offline setelah pernah dibuka.
- [ ] Sync queue mencatat perubahan.
