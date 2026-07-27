# Bumi Makmur POS v5.2.0 — Smart Inventory & Fractional Sales

Rilis ini menyederhanakan penggunaan toko sehari-hari: karyawan tinggal memilih namanya lalu memasukkan PIN, menu Produk dan Stok menjadi satu, dan barang dapat dijual dalam ukuran pecahan seperti kabel 3,5 meter.

## Sorotan

- Login karyawan: pilih cabang → pilih nama → PIN.
- Produk & Stok terpadu dengan stok awal langsung.
- Penjualan eceran/desimal dan konversi roll, box, kg, liter, atau meter.
- Restok multi-satuan dengan HPP per satuan dasar.
- Penyesuaian, opname, dan transfer mendukung jumlah pecahan.
- Menu Promo otomatis dihapus; histori lama tetap aman.
- Ekspor inventori CSV dan lembar stok cetak.
- Tetap mendukung Android, Web/PWA, Windows EXE/MSI, QRIS per cabang, scanner, printer, offline queue, dan Firebase Spark gratis.

## Contoh kabel

```text
Satuan dasar : meter
Konversi     : 1 roll = 50 meter
Harga eceran : per meter
Langkah jual : 0,1 meter
```

Penjualan 3,5 meter akan mengurangi stok 3,5 meter. Pembelian 1 roll akan menambah stok 50 meter dan mengubah harga beli menjadi biaya per meter.

## Catatan upgrade

1. Backup JSON dan pastikan antrean offline `0`.
2. Upload seluruh source v5.2.0 ke repository yang sama.
3. Jalankan workflow `test-only`.
4. **Deploy Firebase Spark Rules wajib** karena ada direktori nama karyawan per cabang.
5. Build Android dan Windows.
6. Instal APK/EXE di atas versi lama; jangan menghapus data aplikasi.

Tidak ada kebutuhan Firebase Blaze, Cloud Functions, Firebase Storage, atau billing.
