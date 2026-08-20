# Build Report — Bumi Makmur POS FreeSync v6.4.0
## QRIS Dynamic & Payment Assurance

Tanggal: 20 Agustus 2026

## Release targets

- Web/PWA: Cloudflare Pages
- Android: Capacitor APK/AAB via GitHub Actions
- Windows: Electron NSIS + MSI via GitHub Actions
- Cloud: Firebase Authentication + Firestore Spark
- Image helper: Cloudflare Pages Function `/api/product-image-search`
- QRIS Dynamic engine: local/device only

## Version alignment

- `package.json`: **6.4.0**
- `VERSION.txt`: **6.4.0**
- runtime/default metadata: **6.4.0**
- PWA service-worker cache: **v6.4.0**
- Android workflow/artifact naming: **v6.4.0**
- Windows workflow/artifact naming: **v6.4.0**
- Release notes path: **v6.4.0**
- Firestore Rules marker: **v6.4.0**
- Firestore indexes: **changed** for branch QRIS index exemptions

## Architecture changes

### QRIS core

`src/utils/qrisDynamic.js` menyediakan strict byte-aware TLV parsing, full root-tag duplicate rejection, QRIS validation, CRC16, local static→dynamic conversion, strict Rupiah amount parsing, fee stripping, dan post-generation validation.

### Payment Assurance

`src/services/qrisPaymentAssurance.js` memisahkan transient QR presentation dari persisted sale. Manual merchant-notification confirmation selalu required sampai adapter PJP/acquirer resmi tersedia.

### POS defense-in-depth

Checkout memakai stable ID. `completeSale` memvalidasi amount, assurance schema/mode, branch, session, source identity, generated-local semantics, absence of QR payload, confirmer=current user, dan timestamp.

### Firestore Spark

Ruleset v6.4.0 memperluas `validBranchPaymentProfile` dengan field QRIS Dinamis dan tetap membatasi write Owner/Manager per cabang. Index exemption baru mencegah `qrisImage` dan `qrisPayload` di-index tanpa kebutuhan query.

## Validation result

- Core/regression tests: **263/263 PASS**.
- Static audit: **PASS**.
- Independent JS/JSX transpile: **78 files, 0 errors**.
- Electron main/preload syntax: **PASS**.
- Cloudflare Pages Function syntax: **PASS**.
- JSON: **4/4 PASS**.
- GitHub Actions YAML: **4/4 PASS**.
- Spark-only/security/secret guard: **PASS**.
- Firestore rules/index source compatibility regression: **PASS**.
- FILE-MANIFEST source integrity: **323 files, PASS**.
- ZIP compressed-data integrity: **PASS**.

## Local dependency/build limitation

`npm ping https://registry.npmjs.org` timeout pada environment container. `node_modules` tidak tersedia, sehingga `npm run build` tidak dapat dijalankan secara jujur di sini. Production Vite build **tidak diklaim PASS**. GitHub Actions/Cloudflare Pages adalah final dependency-install + compile gate.

## Required deployment order

1. Backup JSON dan jangan hapus pending offline queue.
2. Upload source v6.4.0 ke GitHub.
3. Jalankan **Deploy Firebase Spark Rules** sampai hijau; ini wajib untuk ruleset/index v6.4.0.
4. Jalankan workflow `test-only` sampai dependency install, tests, static audit, dan Vite build hijau.
5. Tunggu Cloudflare Pages deployment hijau.
6. Validasi QRIS static source dan dynamic test per cabang.
7. Lakukan real small-value QRIS transaction dan cocokkan notifikasi merchant.
8. Smoke test QRIS dynamic/static/fallback/split, Customer Display, cloud queue, barcode, foto produk, Owner/Karyawan.
9. Baru jalankan Android release dan Windows release.
