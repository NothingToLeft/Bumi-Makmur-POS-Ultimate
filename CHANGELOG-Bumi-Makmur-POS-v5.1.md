# Changelog Bumi Makmur POS

## v5.1.0 — Desktop Windows, Identitas Toko Dinamis, dan Scan Barcode Produk

### Desktop Windows
- Menambahkan aplikasi Electron dengan context isolation, sandbox, dan Node integration nonaktif.
- Menambahkan workflow GitHub Actions untuk installer NSIS `.exe` dan MSI `.msi`.
- Menambahkan shortcut F2 cari, F4 bayar, F8 tahan transaksi, F9 scan, dan Esc tutup dialog.
- Menambahkan layar pelanggan kedua pada monitor tambahan.

### Identitas toko
- Owner dapat mengganti nama toko, alamat, dan telepon dari Pengaturan → Bisnis.
- Nama baru diterapkan ke shell aplikasi, login karyawan, nota, QRIS default, judul aplikasi, dan layar pelanggan.
- Perubahan tidak membuat toko baru dan tidak menghapus riwayat.

### Produk dan barcode
- Menambahkan scan kamera pada formulir Produk Baru.
- Mendukung scanner USB/Bluetooth dengan fokus kolom barcode.
- Menambahkan validasi barcode ganda sebelum penyimpanan.

### Stabilitas
- Mempertahankan Firebase Spark, offline queue, konflik rebase, role per cabang, QRIS per cabang, Android, dan Web/PWA.
- Menambahkan regression test khusus Windows, identitas toko, barcode produk, shortcut kasir, dan layar pelanggan.

---

