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

## R2 — Runtime recovery & white-screen hardening

### Root cause 5 — Cloud & Backup dapat blank putih

Data diagnostik disimpan di localStorage agar tetap tersedia setelah reload. Versi lama mengasumsikan nilai hasil `JSON.parse` selalu array lalu komponen memakai `.filter()`/`.map()` secara langsung. Data legacy, import lama, atau value korup dapat menghasilkan object/string dan menyebabkan render-time exception pada tab Cloud & Backup.

R2 menambahkan `normalizeSyncDiagnostics()` sebagai boundary sanitization. State awal, append, export, dan render Cloud semuanya melalui normalizer. Sebuah mount-healing pass menulis kembali bentuk valid ke localStorage. Ini memperbaiki penyebab data-shape crash tanpa menghapus queue atau database.

Sebagai defense-in-depth, setiap active screen dibungkus `ScreenErrorBoundary`. Jika suatu modul lain di masa depan mengalami runtime exception, pengguna melihat recovery UI yang profesional alih-alih halaman putih penuh.

### Root cause 6 — Karyawan tidak punya jalur recovery cloud

Akses `settings.view` sengaja tidak diberikan ke role Kasir. R1 menempatkan tombol manual sync utama di Settings, sehingga instruksi recovery tidak mungkin dijalankan oleh Karyawan yang justru memiliki mutation pending.

R2 mempertahankan boundary keamanan role dan menambahkan recovery role-safe di banner global:

- `Coba Sinkron Lagi` hanya mem-flush queue milik `currentUser.id`;
- `Unduh Diagnostik` tersedia tanpa membuka Settings dan tidak mengekspor credential/API key;
- background recovery melepaskan persistent issue lama, flush queue akun aktif, lalu force-revalidate Firestore subscription;
- queue akun lain tidak disentuh dan tetap menunggu pemiliknya login.

### Root cause 7 — stale permission issue sesudah Rules sudah benar

Permission error lama sengaja dibuat persistent agar UI tidak memberi status hijau palsu. Kekurangannya: setelah Rules production diperbarui, subscription yang masih dianggap ready dapat membuat persistent issue tidak pernah diuji ulang.

R2 menambahkan forced revalidation pada manual dan background recovery. Persistent error dibersihkan hanya sebagai *candidate stale state* sebelum retry; bila permission masih salah, listener/flush langsung mencatatnya lagi. `markSyncSuccess()` hanya membersihkan history permission/session ketika current-user queue kosong dan tidak ada persistent issue aktif.

### Customer Display popup race

BroadcastChannel tidak menyimpan message untuk listener yang belum terpasang. Web popup sekarang menerima resend snapshot 250/800/1600 ms setelah `window.open()` berhasil. localStorage + storage event + polling tetap fallback, sementara Windows Desktop tetap memakai Electron IPC.
