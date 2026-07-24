# Changelog

## 3.0.0 — Ultimate All Features

- Fondasi data local-first tunggal dengan migrasi data lama, audit log, dan sync queue.
- Kasir cepat: pencarian, favorit, barcode kamera/manual/USB keyboard, item kustom, varian, modifier, bundle, dan konversi satuan.
- Harga eceran, grosir, proyek, promo otomatis, loyalty, diskon item/transaksi, pajak, service charge, dan pembulatan.
- Open bill, pending bill, split bill, split payment, pembayaran tunai/QRIS/transfer/kartu/tempo/metode khusus.
- Shift kasir, modal awal, kas masuk/keluar, expected cash, selisih, dan riwayat.
- Produk, label harga/barcode, kategori, SKU, rak, arsip produk, stok minimum, adjustment, opname, transfer cabang, dan stock movement.
- Pembelian, penerimaan barang, hutang pemasok, cicilan, pembatalan aman, serta retur pembelian.
- Pelanggan/member, harga khusus, proyek, batas kredit, poin, reward, dan feedback.
- Transaksi, detail, cetak ulang, refund sebagian/penuh, void, restock, dan approval PIN Manager/Owner.
- Pengeluaran, piutang, hutang, laporan omzet/HPP/laba/metode pembayaran/diskon/pajak/refund/stok/shift.
- Pesanan WhatsApp, marketplace, delivery, dan proyek.
- Role Owner/Manager/Kasir, permission khusus, multi-cabang, profil printer, customer display, kampanye, backup/restore.
- PWA offline shell, Capacitor Android, permission perangkat, dan workflow GitHub Actions untuk APK debug.

Catatan: implementasi ini menggunakan pola fitur POS umum. Source, aset, identitas merek, dan implementasi proprietary aplikasi referensi tidak disalin.

## 3.1.0
- Memperbaiki login yang berhenti pada layar “Memeriksa PIN” setelah PIN salah.
- Menambahkan input Rupiah dengan pemisah ribuan otomatis dan tanpa angka nol yang menempel di depan.
- Menambahkan markup persen untuk harga eceran, grosir, dan proyek; harga jual dihitung otomatis dari harga modal.
- Menambahkan preset markup 10%, 20%, 30%, 40%, dan 50% serta informasi laba per satuan.
- Memvalidasi SKU dan barcode ganda pada cabang yang sama.
- Memperketat pembayaran split/tempo, mencegah transaksi ganda, pembayaran kurang, dan kelebihan non-tunai.
- Menggabungkan kebutuhan stok produk/bundle sebelum transaksi agar stok tidak dapat menjadi negatif dari baris ganda.
- Membatasi refund dan retur pembelian berdasarkan sisa kuantitas yang benar-benar masih dapat dikembalikan.
- Memperbaiki penentuan status refund penuh berdasarkan kuantitas, bukan hanya nominal.
- Memperbaiki kalkulasi pembelian: diskon item tidak boleh melampaui subtotal dan jatuh tempo wajib untuk pembelian tempo yang diterima.
