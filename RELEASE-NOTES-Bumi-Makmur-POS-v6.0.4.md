# Bumi Makmur POS v6.0.4 — Cloud Compatibility & Runtime Stability

## Fokus rilis
v6.0.4 adalah stability release yang memperbaiki dua defect produksi yang ditemukan setelah v6.0.3 R2 tanpa menghapus fitur atau data sebelumnya.

## Perbaikan utama
- Memperbaiki crash `CloudUpload is not defined` pada Pengaturan → Cloud & Backup dengan import icon yang hilang.
- Menyamakan semantik profil karyawan legacy antara aplikasi dan Firestore Rules. Profil lama yang belum memiliki field `active` tetap dianggap aktif, sementara `active: false` tetap diblokir.
- Rules shift kasir tetap branch-scoped dan identity-scoped (`userId == request.auth.uid`); tidak ada pelonggaran write global.
- Marker Firestore Rules dinaikkan ke `BUMI_MAKMUR_RULESET_VERSION=6.0.4` dan workflow deploy memverifikasinya sebelum publish.
- Cache PWA dinaikkan ke v6.0.4 agar browser tidak mempertahankan bundle lama.
- Regression test ditambahkan untuk Cloud & Backup runtime dan kompatibilitas profil legacy.

## Kompatibilitas
- Data v6.0.3 dan antrean offline lama tetap dipertahankan.
- Firebase Spark only: Auth + Firestore Rules/Indexes; tidak membutuhkan Functions, Storage, atau Blaze.
- Web, Android, Windows Desktop tetap dipertahankan.
