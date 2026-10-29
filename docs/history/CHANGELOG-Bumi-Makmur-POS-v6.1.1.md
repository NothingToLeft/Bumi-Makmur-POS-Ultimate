# Changelog — Bumi Makmur POS v6.1.1

## Sync Transaction Hardening

- Memperbaiki root cause `permission-denied` pada queue Kasir yang dimulai dari `shifts`.
- Firestore transaction tidak lagi melakukan GET pada target CREATE dengan `beforeData = null`.
- UPDATE dan DELETE tetap melakukan remote precondition read dan conflict detection/rebase.
- Conflict recovery mutation campuran tidak lagi membaca dokumen CREATE yang belum ada.
- Memperkuat entropy ID entity baru dari potongan UUID 32-bit menjadi 64-bit.
- Memperbaiki regression validasi Produk Induk: satu varian kembali sah di layer bisnis, konsisten dengan UI.
- Tidak ada penghapusan fitur, migrasi destruktif, Cloud Functions, Firebase Storage, atau kebutuhan Blaze.
- PDF tetap lokal/on-demand dan tidak memenuhi Firebase.
