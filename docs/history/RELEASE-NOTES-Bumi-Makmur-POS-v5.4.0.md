# Bumi Makmur POS v5.4.0

## Ringkasan

v5.4.0 mempermudah pekerjaan Owner dan kasir: daftar barang tersusun otomatis, pencarian produk lebih cepat, harga pcs/pack/dus/box/roll dapat berbeda tanpa menggandakan stok, kategori dapat dikelola dari aplikasi, Owner login sekali untuk seluruh cabang, dan cabang dapat dihapus atau diarsipkan secara aman.

## Contoh harga kemasan

```text
Kabel Ties
1 pcs       = Rp500
1 pack      = 100 pcs
Harga pack  = Rp45.000
```

Kasir memilih PCS atau PACK. Penjualan satu pack mengurangi stok 100 pcs dan menagih Rp45.000.

## Pembaruan penting

- Urutan produk natural berdasarkan nama dan angka.
- Pemilih barang profesional dengan pencarian dan filter kategori.
- Tambah/edit/gabung/hapus kategori.
- Harga khusus eceran, grosir, dan proyek per satuan jual.
- Login Owner tanpa pilihan cabang.
- Hapus cabang kosong; arsip dan pulihkan cabang bersejarah.
- Produk Induk + Varian, shared barcode, SKU otomatis, dan penjualan pecahan tetap lengkap.

## Cara update

- Android: instal APK v5.4.0 langsung di atas versi lama; jangan uninstall.
- Windows: jalankan installer EXE/MSI v5.4.0.
- Web/PWA: Cloudflare Pages memperbarui otomatis setelah source masuk ke branch `main`.

## Catatan Firebase

Tidak perlu deploy ulang Firestore Rules untuk v5.4.0. Aplikasi tetap kompatibel dengan Firebase Spark/free tier dan tidak memerlukan billing.
