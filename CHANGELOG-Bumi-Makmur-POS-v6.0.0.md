# Changelog — Bumi Makmur POS v6.0.0

## Major: AI Product Capture & Daily Automation

### AI Foto Produk
- Menambahkan `AIProductCaptureModal` pada Produk & Stok.
- Foto label/kemasan dapat mengisi draft nama produk, merek, model, kategori, varian/ukuran, spesifikasi, isi kemasan, satuan dasar, dan barcode.
- Harga modal, harga jual, stok, supplier, lokasi, dan garansi tidak pernah diisi otomatis tanpa input/konfirmasi pengguna.
- Barcode decoder lokal menjadi sumber barcode utama; hasil vision AI tidak boleh menimpa barcode lokal yang sudah terbaca.
- Deteksi kemungkinan produk duplikat menampilkan peringatan sebelum draft diterapkan.

### OCR lokal + Gemini opsional
- Android generator memasang ML Kit Text Recognition `16.0.1` untuk OCR label di perangkat.
- Gemini `generateContent` bersifat opsional dan memakai structured JSON response.
- Bila API key tidak ada, offline, atau Gemini gagal, alur turun ke OCR/barcode lokal tanpa memblokir penambahan produk.
- Gemini API key disimpan pada pengaturan lokal perangkat dan tidak masuk Firestore, FreeSync, atau backup cloud.

### Smart Receiving
- Pembelian → Terima Langsung memiliki tombol `Foto Barang Masuk`.
- Pencocokan mengutamakan barcode exact, termasuk barcode pada konversi kemasan, lalu fallback ke nama/merek/model/varian.
- Hasil foto dapat langsung menjadi baris penerimaan dengan unit, jumlah, dan harga beli yang dikonfirmasi pengguna.

### Tutup Harian PDF → WhatsApp
- Shift yang ditutup menyimpan `closingSummary` pada dokumen shift yang sudah ada.
- Laporan menghitung transaksi, void, refund, item bersih, omzet, HPP bersih, estimasi laba kotor, pembayaran bersih, pengeluaran, piutang, kas, dan selisih.
- Refund yang direstock mengembalikan HPP secara proporsional; VOID tidak dihitung dua kali.
- PDF dapat diunduh/dibagikan ulang dari Riwayat Shift.
- Android mencoba membuka WhatsApp atau WhatsApp Business dengan PDF terlampir dan fallback ke Android share chooser.
- Web/Windows memakai Web Share bila tersedia atau download PDF sebagai fallback.

### Akurasi HPP historis
- Setiap baris transaksi menyimpan snapshot `costTotal` dan `costPerUnit` saat checkout.
- Perubahan harga modal di masa depan tidak mengubah estimasi laba transaksi lama/closing lama.
- Bundle dihitung dari HPP komponen pada saat transaksi, bukan HPP produk induk semata.

### Bug fix tambahan
- Cetak closing lama memakai `expectedEndingCash` yang benar dan catatan akhir shift (`endNotes`).
- Smart Receiving sekarang menerima kategori katalog aktif untuk membantu klasifikasi AI.
- Merge hasil Gemini mempertahankan OCR lokal jika field AI kosong dan memvalidasi kategori terhadap daftar aplikasi.
- Smart Receiving memakai `packQty` dari hasil analisis terbaru sehingga foto baru tidak memakai conversion factor state lama.
- Product match dan harga penerimaan lama dibersihkan ketika foto berikutnya tidak cocok dengan katalog.
- Stok awal AI default `0`; tidak ada stok fiktif hanya karena produk difoto.
- Image optimizer memiliki fallback browser saat `createImageBitmap` tidak tersedia, membersihkan object URL, dan race guard mencegah hasil analisis foto lama menimpa foto baru.
- Native PDF share mengembalikan error yang terlihat bila Android gagal membuka aplikasi share, bukan gagal diam-diam.

## QA final
- **174/174 automated core/regression tests PASS.**
- Static audit PASS: 97 source JS/JSX/MJS, 4 JSON, imports/required files/paid-service guard/secret scan.
- Syntax parser PASS: 61 JS/JSX/MJS/CJS, 0 parse diagnostics.

## Compatibility
- Data v5.8.x tetap dapat dibaca; perubahan v6 bersifat additive.
- Tidak ada koleksi Firestore baru yang wajib untuk AI atau PDF.
- Firebase tetap Authentication + Firestore Spark; tidak memakai Functions, Storage, atau Blaze.
- Android, Huawei MatePad SE 11, Infinix Note 40 Pro+, Web/PWA, dan Windows Desktop tetap menjadi target utama.
