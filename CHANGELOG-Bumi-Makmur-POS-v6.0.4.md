# Changelog v6.0.4

- Fixed: Cloud & Backup runtime crash karena `CloudUpload` tidak di-import.
- Fixed: Firestore menolak akun karyawan legacy yang tidak mempunyai field `active` walaupun client menganggap akun tersebut aktif.
- Security: akun dengan `active: false` tetap tidak mempunyai akses.
- Security: shift/cash write kasir tetap wajib UID Auth dan branch yang cocok.
- Build: Firestore rules marker dan deploy workflow diperbarui ke v6.0.4.
- PWA: cache key diperbarui agar hotfix segera terambil.
- QA: regression test khusus v6.0.4 ditambahkan.
