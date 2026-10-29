# Bumi Makmur POS v5.2.1 — Cable Half-Meter & Quantity Usability Fix

Rilis ini memperbaiki penggunaan satuan pecahan agar sesuai praktik toko bangunan, khususnya kabel yang dijual per setengah meter.

## Sorotan

- Kabel otomatis disarankan dijual dalam kelipatan **0,5 meter**.
- Nilai kelipatan lama seperti `0,499` otomatis diperbaiki menjadi `0,5`.
- Form barang memakai pilihan kelipatan, bukan angka bebas yang membingungkan.
- Kasir mendapat tombol cepat `0,5`, `1`, `1,5`, `2`, `2,5`, dan `3,5` meter.
- Form Pembelian/Restok tidak lagi meluber atau menimpa ringkasan.
- Mengganti satuan beli tetap menjaga HPP/modal per meter dengan benar.
- Refund, retur, opname, penyesuaian, transfer, pesanan, nota, dan layar pelanggan mengikuti aturan pecahan yang sama.

## Contoh kabel

```text
Satuan dasar      : meter
Konversi pembelian: 1 roll = 50 meter
Kelipatan jual    : 0,5 meter
Harga jual        : per meter
```

Contoh checkout:

```text
2 meter   × Rp3.900 = Rp7.800
3,5 meter × Rp3.900 = Rp13.650
```

Pembelian `1 roll` menambah stok `50 meter`. Penjualan `3,5 meter` mengurangi stok `3,5 meter`.

## Upgrade

1. Backup JSON dan pastikan antrean offline `0`.
2. Upload seluruh source v5.2.1 ke repository yang sama.
3. Jalankan workflow `test-only`.
4. Build Android dan Windows setelah workflow hijau.
5. Instal pembaruan di atas versi lama; jangan uninstall aplikasi.

**Deploy Firestore Rules tidak wajib** untuk hotfix ini karena struktur izin cloud tidak berubah.
