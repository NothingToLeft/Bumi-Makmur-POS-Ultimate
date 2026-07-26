# Build Report v4.5.1

- Core tests: 72/72 lulus.
- Static audit: lulus.
- `src/services/cloudStore.js`: lolos `node --check`.
- Regression test baru memverifikasi query transfer stok Store Manager memakai `sourceBranchId` dan `destinationBranchId`.
- Kompilasi Vite final wajib dijalankan melalui workflow GitHub `test-only` karena instalasi dependency lokal pada lingkungan penyusunan tidak selesai sebelum batas waktu.
- Firestore Rules tidak berubah dan tidak perlu dideploy ulang.
