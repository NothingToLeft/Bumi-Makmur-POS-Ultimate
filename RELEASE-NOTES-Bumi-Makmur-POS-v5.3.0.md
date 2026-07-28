# Bumi Makmur POS v5.3.0

Rilis ini menambahkan **Produk Induk + Varian, Shared Barcode, SKU otomatis, dan label barcode internal**.

Contoh penggunaan:

- Produk induk: Philips LED
- Varian: 6W, 10W, 12W, 15W
- Barcode kemasan: boleh sama
- SKU/barcode internal: unik per varian
- Harga, stok, HPP, minimum stok, dan rak: terpisah per varian

Saat barcode kemasan dipindai, kasir memilih varian. Saat barcode internal dipindai, varian langsung masuk ke keranjang.

Tetap menggunakan Firebase Spark tanpa Functions, Storage, Blaze, atau billing.
