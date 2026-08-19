# Changelog — Bumi Makmur POS v6.0.3

## Cloud integrity & pergantian akun

- Memperbaiki status cloud yang sebelumnya dapat terlihat sehat ketika `permission-denied` masih aktif dan antrean belum berhasil dikirim.
- Menemukan dan memperbaiki bug lintas sesi: antrean offline sebelumnya disimpan per toko, sehingga setelah Karyawan membuat transaksi/shift lalu Owner login, queue Karyawan dapat dicoba memakai Auth Owner dan ditolak Firestore.
- Queue sekarang difilter berdasarkan `mutation.userId`; hanya pemilik mutasi yang boleh mengirimnya. Mutasi milik akun lain tetap tersimpan lokal dan dilanjutkan otomatis saat akun pembuat login kembali.
- Queue legacy tanpa `userId` tetap kompatibel agar upgrade tidak membuang data lama.
- UI Cloud & Backup menampilkan jumlah antrean akun aktif vs akun lain secara terpisah.
- `cloudError` sekarang memiliki prioritas di atas status `syncing`, `queued`, dan `cloudReady` sehingga UI tidak memberikan indikator hijau palsu.
- Timestamp “sinkron terakhir berhasil” tidak lagi diperbarui pada partial sync, queue aktif yang belum kosong, atau permission/rules issue.
- Error izin Firestore dipertahankan sebagai issue aktif sampai retry/subscription baru benar-benar sehat.
- Pesan diagnostik permission diarahkan langsung ke workflow gratis `Deploy Firebase Spark Rules`.
- Firestore rules diberi marker `BUMI_MAKMUR_RULESET_VERSION=6.0.3`.
- Workflow Firebase memverifikasi marker ruleset sebelum deploy dan tetap hanya mengirim Firestore Rules + Indexes.

## Customer Display

- Menambahkan `customerDisplayBridge` sebagai single transport layer untuk layar pelanggan.
- Web menggunakan localStorage, BroadcastChannel, storage event, dan polling fallback.
- Windows Desktop menambahkan IPC Electron khusus untuk mengirim snapshot kasir ke jendela customer display.
- Open-window IPC membawa snapshot awal secara langsung untuk menghilangkan race condition saat jendela kedua baru dibuat.
- Snapshot terbaru dikirim ulang setelah jendela layar pelanggan selesai load.
- Tombol `Buka Layar 2` mendeteksi popup blocker dan tidak lagi mengklaim jendela berhasil terbuka bila `window.open()` gagal.
- Tampilan layar kedua diperbarui dengan branding Bumi Makmur 2 merah-hitam, status koneksi/stale, wrapping nama barang, dan total yang lebih terbaca.
- Snapshot layar pelanggan sekarang mengikuti pergantian akun/cabang aktif secara eksplisit; nama brand dan nama cabang tidak lagi tertukar.
- Preview Layar Pelanggan di Pengaturan diselaraskan ke identitas merah-hitam agar konsisten dengan jendela layar kedua.

## Diagnostics & recovery

- Ekspor diagnostik sekarang menyertakan ringkasan ownership queue tanpa membocorkan credential.
- `Pengaturan → Cloud & Backup` menampilkan kartu pemulihan khusus bila Firestore Rules produksi belum kompatibel.
- Antrean akun lain tidak lagi dianggap kegagalan cloud akun aktif; pengguna diberi arahan login kembali sebagai pembuat mutasi.
- Data lokal tidak dihapus oleh error permission, pergantian akun, atau retry cloud.

## Compatibility

- Tidak ada migrasi destruktif database.
- Seluruh antrean offline v6.0.2 tetap kompatibel.
- Firebase tetap Authentication + Firestore Spark; tanpa Functions, Storage, atau Blaze.
- Seluruh fitur Professional Receipt, AI Product Capture, Smart Receiving, Daily Closing, PO, quotation, serial/garansi, inventory suite, dan branding resmi tetap dipertahankan.
