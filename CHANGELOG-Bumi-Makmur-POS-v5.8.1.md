# Changelog — Bumi Makmur POS v5.8.1

## Fixed
- Memperbaiki field **Markup Eceran (%)** pada Produk Induk + Varian yang sebelumnya tidak dapat diketik/dihapus ketika harga modal masih `0`.
- Markup varian sekarang disimpan sebagai state/data mandiri, tidak lagi diturunkan ulang dari harga jual pada setiap render.
- Saat harga modal varian berubah, harga eceran/grosir/proyek dihitung ulang dari markup masing-masing secara konsisten.
- Saat harga jual varian diedit manual, persentase markup terkait diperbarui agar data harga dan markup tetap sinkron.
- Markup varian sekarang ikut dipertahankan ketika grup varian dibuka ulang dan ikut tersimpan pada produk anak.
- Produk Induk + Varian sekarang boleh dimulai dari **1 varian/SKU**; varian kedua dan seterusnya dapat ditambahkan saat stok benar-benar tersedia.
- Mode varian baru tidak lagi memaksakan contoh 6W/10W pada semua kategori; preset LED tetap tersedia sebagai aksi khusus.

## Numeric input stability
- Menambahkan komponen `NumberInput` yang menjaga draft input saat fokus sehingga angka dapat dikosongkan sementara lalu diketik ulang tanpa nilai lama “melawan” pengguna.
- Mendukung desimal titik maupun koma untuk input numerik yang menggunakan komponen baru.
- Menstandarkan seluruh field numerik operasional ke `NumberInput`: stok, stok minimum, konversi satuan, penyesuaian/opname/transfer, jumlah kasir dan Open Bill, Split Bill, retur, pembelian/PO, pajak, service charge, loyalty, masa garansi, bundle, dan jumlah label barcode.
- Batas minimum/maksimum diterapkan saat nilai dikomit, tanpa memblokir proses mengetik di Android/Web/Windows.

## Quality
- Menambahkan regression test khusus v5.8.1 untuk state markup varian dan arsitektur input angka.
- Mempertahankan seluruh fitur Business Suite v5.8.0, Smart Scanner v5.7, Firebase Spark FreeSync, Web/PWA, Android, dan Windows Desktop.
- Tidak ada perubahan data model cloud yang memerlukan Blaze Plan atau layanan berbayar.
