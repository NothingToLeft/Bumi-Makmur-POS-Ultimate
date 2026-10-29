# Changelog — Bumi Makmur POS v6.3.0

## Added

- Barcode Pabrik/EAN per varian.
- Barcode Internal/Stiker per varian.
- Multi-barcode per SKU: supplier, package/satuan jual, alternatif.
- Unit dan factor pada barcode tambahan untuk pack/dus/pcs.
- Mode cetak barcode massal Internal, Pabrik, dan Otomatis.
- Renderer EAN-13 asli untuk kode 13 digit dengan checksum valid.
- Foto Produk untuk Kasir pada produk induk dan varian.
- Input foto dari kamera dan galeri.
- Reuse hasil Foto Produk AI menjadi thumbnail Kasir.
- Pencarian foto otomatis Gemini Google Search grounding.
- Cloudflare Pages Function `/api/product-image-search` sebagai helper source verification/image fetch tanpa Gemini API key.
- Firestore single-field index exemption untuk `posImage.dataUrl` dan `groupPosImage.dataUrl`.
- Regression suite v6.3.0 dan barcode symbology tests.

## Changed

- Barcode bersama menjadi fallback kelompok; direct barcode varian tetap prioritas.
- Barcode konversi global dengan nilai barcode ditolak pada grup multi-varian; barcode kemasan unik harus diletakkan pada varian terkait.
- Import identity matching hanya memakai direct identifiers dan tidak memakai shared barcode.
- Parent/group cashier image disimpan satu kali pada satu child product agar tidak terduplikasi pada seluruh varian.
- Kasir melakukan fallback foto varian → foto induk → placeholder.
- Thumbnail dikompres maksimum 256 px, target sekitar 52 KB, hard limit 90 KB.
- Gemini API key untuk image search dikirim langsung dari device ke Gemini dan tidak melewati helper Cloudflare.
- Cloudflare image helper memverifikasi ulang bahwa selected image tercantum di source page sebelum fetch.

## Fixed

- Mencegah shared barcode menyebabkan import meng-update sibling variant yang salah.
- Mencegah direct barcode baru bertabrakan dengan shared barcode produk/grup lain.
- Mencegah barcode satuan jual ambigu lintas varian.
- Mencegah duplikasi parent photo pada setiap Firestore child variant.
- Mencegah Cloudflare Pages Function berubah menjadi arbitrary public image proxy.
- Memastikan label factory EAN-13 valid tidak dicetak sebagai Code 39.

## Security / Cost Controls

- Tidak menambahkan Firebase Storage atau Firebase Functions.
- Tidak menambahkan dependency/layanan Firebase di luar Spark-only Auth + Firestore.
- Gemini API key tidak disimpan pada Firestore, backup, source, atau Cloudflare helper.
- Helper gambar membatasi protocol, hostname, port, redirect, MIME, source HTML size, dan image size.
- PDF tetap lokal.

## Compatibility

- Data lama tetap additive/backward compatible.
- Seluruh hardening v6.2.0 dan sync transaction fix v6.1.1 dipertahankan.
- Firestore Rules tetap v6.1.0; v6.3.0 memerlukan deploy indexes satu kali untuk photo field exemptions.
