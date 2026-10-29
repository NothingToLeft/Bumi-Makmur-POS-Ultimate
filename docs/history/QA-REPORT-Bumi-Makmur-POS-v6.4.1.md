# QA Report — Bumi Makmur POS FreeSync v6.4.1
## CI Secret Scan Hotfix

Tanggal validasi: 20 Agustus 2026

## Root cause yang diperbaiki

Release workflow v6.4.0 membuat `.env.production` dari GitHub Secrets sebelum `npm run build`. Karena `prebuild` menjalankan `audit:static`, regex generik `AIza...` membaca `VITE_FIREBASE_API_KEY` sebagai kemungkinan private Google API key dan menghentikan build.

Firebase Web API key adalah konfigurasi client yang memang dikonsumsi Vite/Firebase Web SDK. Authorization tetap dikendalikan Firebase Authentication dan Firestore Rules. Masalahnya adalah klasifikasi secret scanner, bukan Firestore/QRIS.

## Fix validation

- Android/Web workflow tidak lagi membuat `.env.production`.
- Windows workflow tidak lagi membuat `.env.production`.
- Firebase Web config diinjeksi hanya ke process environment pada build step yang membutuhkannya.
- Structured scanner baru hanya mengizinkan `VITE_FIREBASE_API_KEY=AIza...` pada `.env.production` lokal.
- `AIza...` pada source biasa tetap gagal.
- `GEMINI_API_KEY=AIza...` pada `.env.production` tetap gagal.
- Unknown/duplicate/malformed runtime env key tetap gagal.
- Private key dan Android keystore base64 tetap gagal.

## Automated regression

- Total: **266**
- Passed: **266**
- Failed: **0**
- Skipped: **0**

Regression mencakup seluruh test historis v4–v6.4.0 ditambah 3 test khusus v6.4.1 untuk secret handling dan workflow release.

## Static / syntax / config gates

- `npm run audit:static`: **PASS**.
- Audit coverage: **128 JS/JSX/MJS/CJS source files**.
- JSON parsing: **4/4 PASS**.
- GitHub Actions YAML parsing: **4/4 PASS**.
- `scripts/audit-project.mjs`: Node syntax **PASS**.
- `scripts/secret-scan-utils.mjs`: Node syntax **PASS**.
- `electron/main.cjs`: **PASS**.
- `electron/preload.cjs`: **PASS**.
- `functions/api/product-image-search.js`: **PASS**.
- Spark-only guard: **PASS**.
- QRIS local-only / Payment Assurance guard: **PASS**.

## Reproduction test

### Positive case

`.env.production` sintetis dengan `VITE_FIREBASE_API_KEY=AIza...` dan hanya key runtime yang diizinkan menghasilkan **AUDIT LULUS**.

### Negative case

File yang sama kemudian ditambahkan `GEMINI_API_KEY=AIza...`. Audit menghasilkan **AUDIT GAGAL** karena key tidak diizinkan dan Google API key ditemukan di luar Firebase runtime exception.

Dengan demikian patch tidak menyelesaikan masalah dengan mematikan secret scan.

## Production compilation gate

Percobaan `npm install --no-audit --no-fund` lokal kembali timeout setelah 120 detik dan `npm ping https://registry.npmjs.org` juga timeout. `node_modules` tidak terbentuk, sehingga Vite production bundle lokal **tidak diklaim PASS**.

GitHub Actions/Cloudflare Pages tetap menjadi final dependency-install + Vite compilation gate. Perbedaan penting dari v6.4.0: failure `.env.production: kemungkinan secret/private key terdeteksi` sudah direproduksi dan diperbaiki pada source v6.4.1.

## Firebase / data safety

- Firestore Rules tetap `BUMI_MAKMUR_RULESET_VERSION=6.4.0`.
- Tidak ada perubahan schema transaksi atau QRIS.
- Tidak ada Firebase Storage/Functions/Blaze.
- Gemini API key tetap local-device only.
- v6.4.1 tidak membutuhkan deploy rules baru bila rules v6.4.0 sudah hijau.
