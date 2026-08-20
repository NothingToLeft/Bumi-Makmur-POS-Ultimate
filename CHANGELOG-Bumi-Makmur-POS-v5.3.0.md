# Bumi Makmur POS v5.3.0 — Product Variants & Shared Barcode

## Produk Induk dan Varian
- Menambahkan model Produk Induk + Varian untuk barang dengan nama/barcode kemasan sama tetapi watt, ukuran, warna, harga, dan stok berbeda.
- Setiap varian disimpan sebagai SKU operasional terpisah agar pembelian, stok, transfer, opname, penjualan, refund, HPP, dan laporan tetap akurat.
- Menambahkan editor varian profesional di Produk & Stok.
- Varian dapat ditambah, dinonaktifkan, atau diarsipkan tanpa menghapus histori transaksi lama.

## Shared Barcode dan Barcode Internal
- Barcode kemasan pabrik boleh dipakai bersama hanya oleh varian dalam satu produk induk.
- Scan barcode bersama menampilkan pemilih varian dengan nama, harga, SKU, dan stok.
- Scan SKU/barcode internal langsung memasukkan varian yang tepat ke keranjang.
- Barcode sama tetap ditolak bila berasal dari produk induk lain atau barang yang tidak berhubungan.

## SKU Otomatis
- SKU varian dibuat otomatis dengan format profesional, misalnya:
  - Philips LED 6W → `BM-PHI-LED-006`
  - Philips LED 10W → `BM-PHI-LED-010`
  - Philips LED 12W → `BM-PHI-LED-012`
  - Philips LED 15W → `BM-PHI-LED-015`
- SKU dapat dibuat ulang sekaligus dan sistem menambahkan suffix bila terjadi duplikasi.
- Barcode internal default mengikuti SKU agar mudah dicetak sebagai label rak/barang.

## Label dan Operasional
- Label varian sekarang memakai barcode CODE39 yang dapat dipindai, bukan hanya tulisan kode.
- Katalog Produk & Stok menampilkan produk induk sebagai satu kartu dengan daftar varian, rentang harga, total stok, dan indikator stok menipis.
- Ekspor stok, lembar opname, pembelian/restok, transfer cabang, laporan, nota, dan refund tetap menggunakan SKU varian sebenarnya.

## Stabilitas
- Menambahkan validasi lintas SKU, barcode internal, barcode kemasan bersama, dan grup varian.
- Mencegah barcode internal sama dengan barcode kemasan bersama agar hasil scan tidak ambigu.
- Menambahkan regression test untuk shared barcode, auto SKU, pengelompokan katalog, checkout, dan label barcode.
