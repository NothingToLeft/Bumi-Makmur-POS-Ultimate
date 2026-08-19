# Bumi Makmur POS v5.8.1 — Numeric Input & Variant Pricing Stability

Rilis pemeliharaan untuk meningkatkan keandalan form produk dan input angka di seluruh aplikasi.

### Sorotan
- Markup Eceran varian kini dapat diketik, dihapus, dan diisi sebelum harga modal.
- Harga varian dan markup tetap sinkron dua arah.
- Produk varian boleh dimulai dari satu SKU; preset LED tidak lagi otomatis diterapkan pada barang non-lampu.
- Input angka sensitif kini lebih stabil pada Android, tablet, Web, dan Windows, termasuk saat pengguna menghapus seluruh isi field sebelum mengetik angka baru.
- Tidak ada fitur v5.8.0 yang dihapus.
- Tetap offline-first dan Firebase Spark only.

### Upgrade
Gunakan source v5.8.1 sebagai pengganti v5.8.0 lalu jalankan workflow `test-only`. Firestore Rules tidak mendapat perubahan skema pada hotfix ini, sehingga deploy rules ulang tidak wajib bila rules v5.8.0 sudah aktif.
