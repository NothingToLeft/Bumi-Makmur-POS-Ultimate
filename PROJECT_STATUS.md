# Bumi Makmur POS — Project Status (v6.5.0)

## Baseline

- Source: `Bumi-Makmur-POS-Ultimate-v6.4.2-Continued-HARDENED.zip`, dinaikkan menjadi **6.5.0**.
- Metadata versi konsisten: `package.json`, `src/data/defaults.js` (`APP_VERSION`), `public/sw.js` (`CACHE_NAME`), `VERSION.txt`.

## Perubahan v6.5.0 (terverifikasi)

1. **Diagnosa login PIN Owner.** `login()` membedakan `PIN_INVALID`, `PIN_CREDENTIAL_EXPIRED`, dan `PIN_NOT_ENROLLED`. Sebelumnya ketiganya memakai pesan "PIN Owner belum tersimpan pada perangkat ini", sehingga PIN salah ketik disalahartikan sebagai perangkat belum terdaftar.
2. **Perpanjangan masa berlaku kredensial offline.** TTL 30 hari sebelumnya tidak pernah diperpanjang; perangkat yang dipakai harian tetap kehilangan login PIN. Sekarang diperpanjang setiap login PIN berhasil.
3. **Tier pelanggan.** `src/utils/customerTiers.js` (murni) + tampilan badge/progres di Detail Pelanggan. Tidak mengubah perhitungan poin, penukaran, atau pembalikan poin.
4. **Bump versi 6.5.0** agar service worker memperbarui cache PWA di perangkat.

## Hasil verifikasi nyata

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Regression suite | `node --test tests/*.test.mjs` | **299/299 PASS** (290 lama + 9 baru) |
| Syntax modul JS baru | `node --check` | PASS |
| Production Vite build | `npm run build` | Lihat `docs/QA-v6.5.0.md` (hasil sebenarnya, bukan asumsi) |
| Android APK / Windows EXE | — | **BELUM** dibuat atau ditandatangani |
| Firestore Rules emulator | — | **BELUM** dijalankan |
| Uji perangkat nyata | — | **BELUM** |

## Risiko yang masih terbuka (tidak berubah dari baseline)

1. Token persetujuan manager masih dihasilkan klien; bukan otorisasi server. Firestore Rules belum menegakkan alur persetujuan.
2. Konfirmasi QRIS masih manual; penjagaan replay bersifat lokal, bukan atomik lintas perangkat.
3. `xlsx@0.18.5` masih memiliki advisory keamanan yang diketahui; penggantian belum diverifikasi.
4. Belum ada lockfile tervalidasi + build APK/EXE bertanda tangan, sehingga klaim "siap rilis" belum bisa diberikan.
