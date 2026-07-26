# Bugfix Bumi Makmur POS v4.5.1

## Gejala
Store Manager berhasil dibuat dan dapat login, tetapi aplikasi menampilkan status **Cloud bermasalah**. Kasir tidak mengalami masalah yang sama.

## Akar masalah
`cloudStore.js` menerapkan filter generik `branchId` untuk koleksi bercabang. Dokumen `stockTransfers` tidak memakai `branchId`; koleksi tersebut memakai `sourceBranchId` dan `destinationBranchId`. Firestore Rules Store Manager memang mengizinkan transfer yang berasal dari atau menuju cabangnya, sehingga query generik tidak dapat dibuktikan aman dan ditolak.

## Perbaikan
- Query transfer keluar: `sourceBranchId == manager.branchId`.
- Query transfer masuk: `destinationBranchId == manager.branchId`.
- Kedua hasil digabung berdasarkan ID.
- Logika yang sama diterapkan pada load awal dan listener realtime.
- Error listener mencatat nama koleksi untuk diagnostik.

## Dampak data
Tidak ada migrasi database dan tidak ada penghapusan data. Firestore Rules v4.5 yang sudah terpasang tetap kompatibel; rules tidak perlu dideploy ulang untuk hotfix ini.
