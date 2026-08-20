# Bumi Makmur POS v6.1.0 — Unified AutoSync

## Ringkasan
v6.1.0 menyederhanakan FreeSync: data bisnis dan konfigurasi non-rahasia disinkronkan otomatis ke Firebase Spark, sementara database lokal berfungsi sebagai cache/offline mirror. Kasir tidak perlu memahami queue atau diagnostik untuk bekerja.

## Perubahan utama
- Memperbaiki `mutationReceipts` preflight yang menyebabkan transaksi Kasir dapat mendapat `permission-denied` ketika receipt idempotensi belum ada.
- Semua koleksi bisnis utama tetap termasuk dalam `CLOUD_ENTITY_COLLECTIONS`; meta, configs, categories, dan units tersinkron melalui system settings.
- Model/toggle AI Product Assistant disinkronkan; Gemini API key tetap lokal.
- PDF tidak diunggah ke Firebase Storage. PDF dibuat lokal/on-demand dari data transaksi/shift yang sudah tersinkron.
- UI cloud Kasir disederhanakan dan background auto-retry tetap aktif.
- Tidak membutuhkan Firebase Blaze, Cloud Functions, atau Firebase Storage.
