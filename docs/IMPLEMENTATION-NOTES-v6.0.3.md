# Implementation Notes v6.0.3

## Root cause 1 — Firestore Rules produksi tertinggal

Diagnostik pengguna menunjukkan `permission-denied` pada `shifts`, `warrantyClaims`, `quotations`, `serialNumbers`, dan `supplierPriceHistory`. Source v6.0.2 sudah mempunyai match untuk koleksi tersebut, sehingga rules yang aktif di project Firebase dapat tertinggal dari source.

v6.0.3 menambahkan marker `BUMI_MAKMUR_RULESET_VERSION=6.0.3`, validasi marker di workflow `Deploy Firebase Spark Rules`, dan recovery UI yang eksplisit. Workflow tetap Spark-only: Firestore Rules + Indexes.

## Root cause 2 — queue offline lintas akun

Queue sebelumnya menggunakan satu key per toko. Setiap mutation sebenarnya sudah menyimpan `userId`, tetapi `flushPendingMutations(profile)` mencoba seluruh queue memakai sesi Auth yang sedang aktif. Bila Karyawan membuat `SHIFT_START`/`SALE_COMPLETE`, kemudian pengguna berpindah ke Owner sebelum queue selesai, Firestore menerima data beridentitas Karyawan melalui Auth Owner. Rules yang benar sengaja menolak kondisi tersebut.

Perbaikan v6.0.3:

1. queue tetap satu datastore agar data upgrade lama tidak hilang;
2. setiap flush memilih hanya mutation milik `profile.id`;
3. mutation akun lain dilewati tanpa dihapus dan tanpa dianggap error;
4. UI menampilkan `currentUserCount` dan `otherUserCount`;
5. saat pemilik mutation login kembali, background sync melanjutkan queue tersebut;
6. queue legacy tanpa ownership metadata tetap dapat dicoba untuk kompatibilitas;
7. overlay lokal tetap memakai seluruh queue sehingga transaksi offline tidak menghilang dari tampilan saat akun berganti.

Ini mempertahankan audit identity, tidak melonggarkan Firestore Rules, dan tidak membutuhkan Cloud Functions.

## Root cause 3 — status cloud hijau palsu

`buildSyncStatus()` sebelumnya dapat memprioritaskan queue/cloudReady sebelum `cloudError`. Selain itu timestamp sukses dapat diperbarui meskipun hanya sebagian collection berhasil.

v6.0.3 memberi prioritas pada cloud error dan hanya mencatat full sync success bila queue akun aktif kosong serta tidak ada persistent permission issue.

## Root cause 4 — Customer Display

Customer Display sebelumnya sangat bergantung pada localStorage/BroadcastChannel. Dukungan antar-window dapat berbeda pada popup browser, WebView, atau Electron secure custom protocol. Hasil `window.open()` juga tidak diperiksa sehingga popup yang diblokir dapat terlihat seolah berhasil.

v6.0.3 memperkenalkan `src/services/customerDisplayBridge.js`:

1. localStorage snapshot;
2. BroadcastChannel;
3. storage event + polling ringan fallback;
4. Electron IPC native;
5. snapshot awal dikirim langsung saat IPC membuka jendela, lalu dikirim ulang setelah `did-finish-load`.
6. dependency snapshot memasukkan identitas user/role/branch aktif sehingga login Owner ↔ Karyawan langsung memperbarui target cabang; `companyName` dan `branchName` juga dipisahkan secara semantik.

## Security

- IPC hanya diekspos melalui contextBridge/preload.
- `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true` tetap dipertahankan.
- Queue tidak pernah dipaksa menggunakan identitas Auth yang berbeda.
- Firestore Rules tidak dilonggarkan untuk membolehkan Owner menyamar sebagai Karyawan.
- Tidak ada Firebase secret atau credential baru.
- Customer Display hanya menerima data tampilan transaksi, bukan PIN/password.

## Data migration

Tidak ada migrasi schema destruktif. Queue v6.0.2 dapat dibuka langsung oleh v6.0.3; record queue lama tetap dipertahankan.
