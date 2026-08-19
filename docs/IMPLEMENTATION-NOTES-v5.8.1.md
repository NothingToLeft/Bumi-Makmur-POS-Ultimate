# Implementation Notes — Bumi Makmur POS v5.8.1

## Root cause
Field markup varian sebelumnya memakai nilai terhitung `calculateMarkupPercent(row.modalPrice, row.prices.retail)` sebagai `value` input. Ketika modal masih 0, setiap pengetikan markup menghasilkan harga jual 0; render berikutnya menghitung markup kembali menjadi 0 sehingga karakter yang baru diketik hilang.

## Solution
1. `variantRows` sekarang memiliki `markups` sendiri untuk retail/wholesale/project.
2. Markup tidak lagi bergantung pada hasil perhitungan harga pada saat render.
3. Perubahan modal menghitung ulang harga dari markup yang tersimpan.
4. Perubahan harga manual menghitung ulang markup terkait.
5. `buildVariantGroupDraft()` membawa markup produk anak kembali ke editor.
6. `submitVariantGroup()` mengirim markup bersama harga sehingga `PosContext.saveProduct()` dapat menyimpannya.

## Numeric input architecture
`NumberInput` menggunakan draft lokal selama field fokus. Parent state tetap dapat memperoleh nilai terbaru, tetapi render parent tidak mengganti teks yang sedang diketik. Ini menyelesaikan pola umum controlled-number-input yang berubah menjadi 0 saat field dikosongkan sementara.

Komponen mendukung:
- input decimal titik/koma;
- transient empty value;
- minimum/maximum;
- integer mode;
- zero-as-empty untuk field seperti markup dan persentase;
- keyboard numerik mobile melalui `inputMode`.

## Compatibility
- Tidak ada migrasi koleksi Firestore.
- Produk lama tanpa markup varian tetap dapat dibuka; markup diturunkan dari harga bila tersedia.
- Produk baru memakai default markup 30% eceran, 20% grosir, 15% proyek seperti barang biasa.
- Firebase Spark, offline store, sync engine, barcode scanner, quotation, PO, warranty, dan laporan tidak diubah kontrak datanya.


## Satu varian juga valid

Produk Induk + Varian tidak lagi mengharuskan dua SKU. Toko dapat mulai dari satu varian nyata (misalnya Cable Ties 3.6 × 250 mm Hitam), lalu menambahkan warna/ukuran lain saat barang benar-benar tersedia. Preset LED 6W–15W tetap tersedia sebagai tombol eksplisit dan tidak dipaksakan saat mode varian diaktifkan.
