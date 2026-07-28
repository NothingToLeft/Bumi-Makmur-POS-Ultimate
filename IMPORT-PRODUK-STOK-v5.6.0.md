# Panduan Impor Produk & Stok v5.6.0

Buka `Produk & Stok → Impor Excel/CSV`, lalu unduh template.

## Kolom penting

- `name`: nama barang.
- `sku`: boleh kosong agar dibuat otomatis.
- `barcode`: barcode pabrik/shared barcode.
- `internalBarcode`: barcode internal unik.
- `category`: kategori; kategori baru dibuat saat impor.
- `baseUnit`: pcs, meter, kg, liter, dan lain-lain.
- `stock`: stok awal cabang.
- `costPrice`, `retailPrice`, `wholesalePrice`, `projectPrice`.
- `conversions`: satuan kemasan dan harga khusus.
- `parentName`, `variantName`: produk induk dan varian.

## Contoh konversi

```text
pack=100@45000|42000|40000
```

Artinya 1 pack = 100 satuan dasar dengan harga eceran Rp45.000, grosir Rp42.000, dan proyek Rp40.000.

```text
roll=50
```

Artinya 1 roll = 50 meter/satuan dasar; bila harga khusus tidak diisi, harga dihitung dari harga dasar dikali isi.

Selalu periksa preview, peringatan, dan baris gagal sebelum menekan Impor.
