# QA & Build Report — Bumi Makmur POS v6.5.0

Tanggal: 2026-10-29 · Lingkungan: Windows, Node.js **v24.22.1**, npm **11.19.1** (sesuai `.node-version` = 24).

## 1. Yang benar-benar dijalankan

| # | Perintah | Hasil nyata |
| --- | --- | --- |
| 1 | `node --check src/services/offlineStore.js` | PASS (exit 0) |
| 2 | `node --check src/utils/customerTiers.js` | PASS (exit 0) |
| 3 | `node --test tests/*.test.mjs` | **309/309 PASS**, 0 fail (termasuk 12 tes baru) |
| 4 | `npm run audit:static` (via prebuild) | PASS — secret scan, Firebase Spark-only, Cloudflare Pages, guard QRIS |
| 5 | `npm run build` (`vite build`) | **exit 0**, 1968 modul ditransformasi, `dist/` terisi |
| 6 | `npm install --package-lock-only` | PASS — `package-lock.json` lockfileVersion 3, 991 paket, termasuk electron & Capacitor |
| 7 | GitHub Actions `build-android.yml` (`android-release`) | **SUKSES** — APK 53,7 MB + AAB 30,1 MB terunggah ke Release `v6.5.0` |
| 8 | GitHub Actions `build-windows.yml` (`windows-release`) | **SUKSES** — EXE 123,6 MB + MSI 132,6 MB terunggah ke Release `v6.5.0` |

Artefak build (ukuran gzip):
```
dist/index.html                 0.76 kB │ gzip:   0.42 kB
dist/assets/index-*.css        72.23 kB │ gzip:  14.20 kB
dist/assets/index-*.js      1,841.50 kB │ gzip: 499.59 kB
dist/assets/xlsx-*.js         428.98 kB │ gzip: 143.08 kB
```

## 2. Catatan penting tentang instalasi dependency

`npm install` penuh **macet** pada postinstall Electron (unduhan binary besar) di lingkungan ini. Build diverifikasi dengan memasang dependency runtime + toolchain Vite secara eksplisit dan `--ignore-scripts`. Artinya:

- **Build web/Vite: terverifikasi.**
- **`npm ci` penuh dari lockfile baru: BELUM dijalankan** (butuh unduhan Electron). Lockfile dibuat dengan `--package-lock-only` sehingga isinya cocok dengan `package.json`, tetapi belum diuji end-to-end.

## 3. Yang BELUM diuji (jangan dianggap selesai)

1. **APK Android** — tidak dibangun, tidak ditandatangani, tidak diuji di Infinix Note 40 Pro+ / Huawei MatePad SE 11.
2. **Installer Windows (NSIS/MSI)** — tidak dibangun/ditandatangani.
3. **Firestore Rules + emulator** — tidak dijalankan; aturan persetujuan manager belum diuji.
4. **Uji perangkat nyata** untuk scanner kamera, printer Bluetooth, dan QRIS.
5. **Deploy Cloudflare Pages** — tidak dilakukan dari sesi ini.

## 4. Regresi yang dijaga

- Perhitungan poin, penukaran poin, pembalikan poin saat refund: **tidak diubah**.
- Skema Firestore, `DB_KEY`, index, rules: **tidak diubah**.
- Alur refund/void, QRIS, dan offline queue: tidak disentuh pada rilis ini.
- Tes regresi lama (290) tetap lulus seluruhnya.

## 5. Provider AI (v6.5.0)

- Unit test perilaku: payload request benar, `401`, `429`, Base URL/API key kosong ditolak sebelum jaringan.
- **BELUM diuji dengan API key asli** provider mana pun (Gemini maupun OpenAI-compatible) dari sesi ini; tombol **Tes Koneksi AI** tersedia di aplikasi untuk verifikasi oleh pemilik.
