# Panduan Produk Varian — Bumi Makmur POS v5.3.0

## Contoh Philips LED

Buka:

```text
Produk & Stok
→ Tambah Barang & Stok
→ Aktifkan Varian
```

Isi:

```text
Nama Produk Induk : Philips LED
Satuan Dasar      : pcs
Barcode Kemasan   : barcode pabrik yang sama
```

Tekan **Preset LED 6W–15W** untuk membuat:

| Varian | SKU otomatis | Barcode internal |
|---|---|---|
| 6W | BM-PHI-LED-006 | BM-PHI-LED-006 |
| 10W | BM-PHI-LED-010 | BM-PHI-LED-010 |
| 12W | BM-PHI-LED-012 | BM-PHI-LED-012 |
| 15W | BM-PHI-LED-015 | BM-PHI-LED-015 |

Setiap varian memiliki harga modal, harga eceran/grosir/proyek, stok awal, stok minimum, rak, dan status aktif sendiri.

## Perilaku pemindaian

- Scan **barcode kemasan bersama** → aplikasi menampilkan daftar 6W, 10W, 12W, dan 15W.
- Scan **SKU/barcode internal** → varian langsung masuk ke keranjang.
- Barcode bersama hanya boleh digunakan oleh varian dalam produk induk yang sama.
- SKU dan barcode internal wajib unik.

## Restok dan stok

Pada Pembelian/Restok, setiap varian tampil sebagai barang terpisah:

```text
Philips LED 6W
Philips LED 10W
Philips LED 12W
Philips LED 15W
```

Pilih varian yang benar agar HPP dan stok bertambah pada watt yang benar. Penyesuaian, opname, transfer cabang, refund, dan laporan juga memakai SKU varian yang sama.

## Label internal

Pada kartu Produk Induk, tekan ikon printer di samping varian. Aplikasi mencetak label Code 39 yang dapat ditempel pada barang atau rak. Label memuat nama varian, harga, SKU, barcode internal, satuan, rak, dan barcode kemasan bersama bila tersedia.
