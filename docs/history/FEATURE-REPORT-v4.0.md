# Feature Report v4.0 — Cloud Enterprise

## Fitur besar yang diaktifkan

- Firebase Auth custom-token dengan login PIN server-side.
- Firestore realtime multi-perangkat dan multi-cabang.
- Commit operasional atomik melalui `commitStoreMutation` dengan optimistic concurrency dan rollback/reload saat konflik.
- Approval refund/void menggunakan token server satu kali yang kedaluwarsa dalam lima menit.
- Restore/seed database Owner melalui batch Cloud Function, bukan write langsung dari klien.
- Cloud Functions untuk bootstrap, login, akun karyawan, approval Manager, serta nota online.
- Firebase Storage untuk logo dan QRIS.
- Firebase Hosting untuk aplikasi web dan nota publik.
- Firestore Security Rules berbasis store, role, dan cabang.
- Online-only transaction lock.
- Audit log cloud terpusat.
- Backup/restore database cloud.
- Signed Android Cloud release melalui GitHub Actions.

## Data cloud

- branches
- users
- products
- promotions
- suppliers
- customers
- sales
- heldSales
- purchases
- stockMovements
- stockAdjustments
- stockOpnames
- stockTransfers
- expenses
- receivables
- payables
- refunds
- shifts
- cashMovements
- onlineOrders
- printerProfiles
- campaigns
- feedback
- auditLogs

## Koleksi privat/sistem

- `storeCodes`: pemetaan kode toko ke store ID.
- `privateCredentials`: HMAC lookup dan scrypt PIN hash; klien tidak dapat membaca.
- `devices`: riwayat perangkat/login.
- `publicReceipts`: nota online tokenized yang dapat dibuka pelanggan.
- `system/settings`: konfigurasi toko, kategori, unit, versi, dan metadata.

## Status integrasi

- Firebase project tetap harus dibuat dan dikonfigurasi oleh pemilik repository.
- Secrets tidak disertakan dalam ZIP.
- Gateway pembayaran otomatis/settlement bank belum diaktifkan; QRIS/e-wallet tetap memakai verifikasi kasir dan nomor referensi sampai merchant API resmi tersedia.
