# Build & QA Report v5.0.0

## Pemeriksaan yang selesai

- Core regression tests: **77/77 lulus**.
- Static audit: **lulus**.
- Source JS/JSX/MJS: **58 file**, seluruh relative import ditemukan.
- File non-JSX lolos pemeriksaan sintaks `node --check`; kompilasi JSX/Vite diwajibkan di GitHub Actions.
- JSON: **4 file valid**.
- Secret scan: tidak menemukan private key/API key nyata.
- Free-tier scan: tidak menemukan Firebase Functions, Storage Rules, Blaze, atau backend berbayar.
- Regression baru mencakup QRIS Adaptive v3, migrasi database v4.x, profil pembayaran per cabang, Pusat Kontrol, role Manager, login setup conditional, dan retensi fitur.

## Keterbatasan lingkungan penyusunan

`npm install` tidak selesai karena registry npm tidak dapat dijangkau dari lingkungan penyusunan. Karena dependency Vite/React tidak tersedia lokal, kompilasi bundle final belum dijalankan di sini. Workflow GitHub mode `test-only` sudah dikonfigurasi untuk menjalankan `npm install`, seluruh test, audit, dan `npm run build`; workflow wajib hijau sebelum APK dibuat.

## Deploy wajib

Firestore Rules **berubah** pada v5.0 karena koleksi `branchPaymentProfiles`. Setelah `test-only` hijau, jalankan workflow **Deploy Firebase Spark Rules** sebelum menguji QRIS per cabang.
