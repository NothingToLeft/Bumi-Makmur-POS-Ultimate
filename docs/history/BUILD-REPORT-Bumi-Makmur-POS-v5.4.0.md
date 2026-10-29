# Build & QA Report — Bumi Makmur POS v5.4.0

## Ruang lingkup audit

- Natural product sorting dan searchable product picker.
- Kategori dinamis dan penghapusan dengan kategori pengganti.
- Harga khusus per satuan jual dengan satu stok dasar.
- Login Owner tanpa pilihan cabang.
- Hapus permanen cabang kosong, arsip/pemulihan cabang bersejarah.
- Regression seluruh fitur POS v5.3 dan fitur Firebase Spark.

## Hasil

```text
Core/regression tests : 111/111 lulus
Static audit          : lulus
JS/JSX source parser  : 42 file, 0 error sintaks
JSON validation       : 4 file valid
Forbidden paid service: tidak ditemukan
Secret/private key scan: lulus
```

## Batas pemeriksaan lokal

`npm install` pada lingkungan penyusunan tidak selesai karena koneksi registry mengalami timeout. Karena itu build produksi Vite/Electron/Android final wajib diverifikasi melalui GitHub Actions `test-only`, `windows-release`, dan `android-release`. Tidak ada klaim bahwa build produksi final telah berjalan lokal.

## Firebase

- Firebase Authentication + Firestore Spark/free tier.
- Tidak memakai Cloud Functions, Firebase Storage, Blaze, atau billing.
- Firestore Rules tidak berubah pada v5.4.0.
