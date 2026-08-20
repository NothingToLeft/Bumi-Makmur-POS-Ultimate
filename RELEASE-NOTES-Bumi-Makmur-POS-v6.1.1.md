# Bumi Makmur POS v6.1.1 — Sync Transaction Hardening

Release ini memusatkan perbaikan pada sinkronisasi Firestore Kasir yang masih tertahan pada v6.1.0.

Root cause utama berada pada transaction preflight: mutation baru seperti Shift, Sale, Cash Movement, dan Stock Movement mempunyai `beforeData = null`, tetapi client tetap melakukan GET terhadap target yang belum ada. Untuk koleksi branch-scoped, GET tersebut dapat ditolak security rule sebelum valid rule CREATE dievaluasi.

v6.1.1 tidak lagi pre-read target CREATE. Conflict detection tetap dipertahankan untuk UPDATE/DELETE. Idempotensi tetap dijaga melalui `mutationReceipts`, dan seluruh write tetap divalidasi oleh Firestore Security Rules.

Tidak ada perubahan Firestore Rules dari ruleset v6.1.0. Jika workflow Deploy Firebase Spark Rules v6.1.0 sebelumnya sudah hijau, tidak perlu deploy rules ulang untuk v6.1.1.

Validation release: **219/219 automated tests PASS** plus static audit, Electron syntax, and workflow YAML validation.
