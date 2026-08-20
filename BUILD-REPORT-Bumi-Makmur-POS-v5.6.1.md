# Build & QA Report — Bumi Makmur POS v5.6.1

## Ruang lingkup hotfix

v5.6.1 memperbaiki presentasi status cloud tanpa mengurangi fitur diagnostik dan stabilisasi v5.6.0.

## Perubahan yang diverifikasi

- Banner cloud global tidak berulang ketika halaman Pengaturan sedang terbuka.
- Panel status oranye duplikat dihapus dari Cloud & Backup.
- Kartu sinkronisasi menampilkan ringkasan singkat dan satu tombol tindakan.
- Detail teknis dan langkah pemulihan berada dalam panel buka-tutup.
- Status desktop menggunakan kalimat ringkas dan tidak mengulang error panjang.
- Impor, PO, approval, riwayat harga, label massal, backup preview, offline queue, dan role tetap dipertahankan.

## Hasil pemeriksaan

- Core/regression tests: **127/127 lulus**.
- Static audit: **lulus**.
- JS/JSX/MJS yang diperiksa audit: **83 file**.
- JSON valid: **4 file**.
- Secret/private-key scan: **lulus**.
- Layanan berbayar terlarang: **tidak ditemukan**.
- Firestore Rules: tidak berubah pada hotfix ini.

## Batas pemeriksaan lokal

`npm install` tidak selesai dalam batas waktu lingkungan penyusunan, sehingga kompilasi Vite produksi belum diklaim berhasil secara lokal. Jalankan workflow GitHub Actions `test-only`; workflow tersebut memasang dependency, menjalankan seluruh tes dan audit, lalu mengompilasi Vite sebelum build rilis diizinkan.
