# QA Report — Bumi Makmur POS v6.0.3

## Release focus

Release-blocking stabilization untuk dua laporan produksi pada 19 Agustus 2026:

1. `Layar Pelanggan` tidak dapat dibuka/di-update secara konsisten setelah login Karyawan.
2. Cloud menampilkan `permission-denied` dan antrean offline tidak selesai tersinkron.

## Root cause yang diverifikasi

### Firestore Rules produksi tertinggal

Diagnostik produksi menunjukkan penolakan pada `shifts`, `warrantyClaims`, `quotations`, `serialNumbers`, dan `supplierPriceHistory`. Source v6.0.2 sebenarnya sudah memiliki rule untuk koleksi tersebut, sehingga deployment Rules produksi harus diperlakukan sebagai bagian wajib release.

### Antrean offline lintas akun

Queue offline disimpan per toko. Mutation sudah mempunyai `userId`, tetapi versi sebelumnya mencoba seluruh queue menggunakan sesi Firebase Auth yang sedang aktif. Setelah Karyawan membuat shift/transaksi lalu Owner login, mutation Karyawan dapat dicoba menggunakan Auth Owner dan ditolak oleh Rules yang benar.

v6.0.3 memfilter flush berdasarkan pemilik mutation. Queue akun lain tidak dibuang dan tidak dikirim menggunakan identitas yang salah.

### Customer Display transport + session/branch refresh

Customer Display sebelumnya bergantung terutama pada storage/BroadcastChannel dan tidak memeriksa hasil `window.open`. v6.0.3 menambahkan transport berlapis, Electron IPC, polling fallback, popup-blocker detection, initial snapshot, resend setelah window load, serta dependency akun/cabang aktif agar snapshot segera mengikuti pergantian Owner/Karyawan.

## Automated regression

Perintah:

```bash
npm run test:core
```

Hasil final:

- **196 tests**
- **196 PASS**
- **0 FAIL**
- **0 SKIP**

Coverage regresi yang relevan mencakup:

- izin role Owner / Manager / Kasir;
- login Owner dan Karyawan;
- shift start/end dan cash movement;
- sale, refund, void, stock movement;
- quotation;
- serial number dan warranty;
- supplier price history;
- offline queue ownership;
- queue legacy compatibility;
- false-green cloud status;
- full-sync timestamp;
- Firestore collection rule coverage;
- customer display Web transport;
- popup blocker;
- customer display Electron IPC;
- customer display runtime subscription/cleanup;
- refresh identitas customer display setelah pergantian user/cabang;
- Web/PWA/Cloudflare routing;
- Professional Receipt & cash change;
- AI Product Capture / Smart Receiving;
- Firebase Spark guard.

## Static audit

Perintah:

```bash
npm run audit:static
```

Hasil:

- **AUDIT LULUS**
- 104 JS/JSX/MJS diperiksa
- 4 JSON valid
- relative imports diperiksa
- required files diperiksa
- forbidden paid Firebase services diperiksa
- secret scan diperiksa

## Additional validation

- `node --check electron/main.cjs` — PASS
- `node --check electron/preload.cjs` — PASS
- seluruh YAML di `.github/workflows` dapat diparse — PASS
- `package.json`, `firebase.json`, `firestore.indexes.json`, `capacitor.config.json` dapat diparse — PASS
- exposed Gemini key literal tidak ditemukan di source — PASS
- workflow Firebase hanya deploy `firestore:rules,firestore:indexes` — PASS
- marker `BUMI_MAKMUR_RULESET_VERSION=6.0.3` tersedia — PASS

## Data-safety checks

- Queue akun lain **tidak dihapus**.
- Queue akun lain **tidak dikirim menggunakan Auth akun aktif**.
- Queue aktif tetap dioverlay ke local view agar transaksi offline tidak menghilang.
- Restore/reset tetap tidak boleh dilakukan saat queue belum kosong.
- Error permission tidak membuat timestamp “sinkron terakhir berhasil” palsu.
- Foreign-user queue tidak lagi menghalangi full-sync timestamp akun aktif yang sudah bersih.
- Tidak ada migrasi Firestore destruktif.

## Production acceptance — WAJIB setelah deploy

Automated tests tidak dapat menggantikan smoke test dengan Firebase production dan hardware/browser sebenarnya. Setelah source di-upload:

1. Jalankan `Deploy Firebase Spark Rules` sampai hijau.
2. Jalankan workflow `test-only` sampai hijau.
3. Deploy Web v6.0.3.
4. Login menggunakan akun Karyawan yang membuat queue lama.
5. Buka `Cloud & Backup` → `Sinkronkan Sekarang` sampai antrean akun tersebut 0.
6. Tutup sesi Karyawan dan login Owner; pastikan queue Karyawan tidak dicoba memakai Auth Owner.
7. Login Karyawan lagi dan buka `Layar Pelanggan` → `Buka Layar 2`.
8. Web: izinkan popup bila browser meminta.
9. Windows: pastikan jendela kedua menerima perubahan cart/total tanpa reload.
10. Jalankan Shift Start → transaksi tunai → Shift End.
11. Buka diagnostik dan pastikan tidak ada `permission-denied` baru.
12. Uji quotation, serial/warranty, PO/receiving, stok, dan transaksi utama.

## Build limitation lingkungan QA ini

`node_modules` tidak disertakan dalam source ZIP. Percobaan install dependency dari registry pada environment ini timeout, sehingga full `vite build`, APK Gradle, dan Electron packaging tidak dapat divalidasi secara lokal pada container ini.

Karena itu **GitHub Actions adalah production build gate**. Release tidak boleh dianggap selesai di perangkat produksi sebelum workflow test/build hijau dan smoke test di atas selesai.

## Kesimpulan

Seluruh automated regression dan static checks yang tersedia lulus. Tidak ada engineer yang dapat menjamin software literal “tanpa cacat sama sekali”; v6.0.3 diperlakukan sebagai release-blocking stabilization dan production smoke test tetap wajib sebelum dianggap siap operasional penuh.
