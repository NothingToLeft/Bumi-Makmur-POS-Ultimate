# QA Report — Bumi Makmur POS FreeSync v6.4.0
## QRIS Dynamic & Payment Assurance

Tanggal validasi: 20 Agustus 2026

## Scope

QA mencakup seluruh regression v6.3.1 serta major feature v6.4.0: strict QRIS TLV/CRC parser, static-source validation, local dynamic generation, amount bounds, duplicate-tag rejection, convenience-fee stripping, branch setup, static/physical fallback, split QRIS, Payment Assurance, mandatory merchant confirmation, cashier/branch audit binding, idempotent checkout, Customer Display QR, transaction audit, receipt labels, Firestore schema/rules/index compatibility, Firebase Spark-only guard, Android/Web/Windows alignment, dan deliberate exclusion unofficial scraping/external converter.

## Automated regression

- Total: **263**
- Passed: **263**
- Failed: **0**
- Skipped: **0**

Coverage QRIS v6.4.0 meliputi:

- malformed/trailing QRIS ditolak;
- CRC tampering ditolak sebelum konversi;
- duplicate root EMV tags ditolak;
- merchant identity/account fields dipertahankan;
- exact amount masuk ke payload dinamis;
- fee tags tidak ikut pada output;
- integer Rp1–Rp10.000.000 per payment line;
- scientific notation ditolak;
- dynamic → static fallback bila generator gagal;
- assurance tidak menyimpan QR payload;
- confirmation audit berisi user/time/session/branch;
- `completeSale` mengikat confirmer ke kasir yang sedang login;
- Firestore Rules v6.4.0 mengizinkan field QRIS baru dan mengunci confirmation flag;
- Firestore indexes mengecualikan `branchPaymentProfiles.qrisImage` dan `qrisPayload`;
- core QRIS bebas fetch/Axios/external converter/Puppeteer/Playwright/Payhook/Miraipedia.

## Release-blocker found and fixed

Audit menemukan bahwa implementasi awal v6.4.0 menulis field QRIS baru pada `branchPaymentProfiles`, tetapi Firestore Rules masih memakai allow-list schema lama v6.1.0. Pada produksi hal ini dapat menghasilkan `permission-denied` saat profil QRIS Dinamis disinkronkan.

Perbaikan:

- rules marker dinaikkan ke **6.4.0**;
- allow-list dan validation untuk field QRIS Dinamis ditambahkan;
- deploy workflow memverifikasi marker v6.4.0;
- sync diagnostics mengarahkan ke ruleset v6.4.0;
- regression khusus rules/index ditambahkan;
- deploy Rules + Indexes sekarang wajib untuk v6.4.0.

## Additional hardening found and fixed

1. Konfirmasi merchant sebelumnya masih bisa dinonaktifkan per cabang. Sekarang dikunci wajib sampai ada callback PJP resmi.
2. Validator duplicate-tag diperluas ke seluruh root tag, bukan subset tertentu.
3. Amount parser menolak scientific notation/format string ambigu.
4. `completeSale` memvalidasi branch ID, assurance session ID, generated-local semantics, source identity untuk mode dynamic, current-cashier confirmer, dan timestamp.
5. QR payload ditolak bila muncul di payment atau assurance history.
6. QRIS reference disanitasi dan dibatasi panjangnya.

## Static / syntax / configuration gates

- Automated regression: **263/263 PASS**.
- `npm run audit:static`: **PASS**.
- Independent TypeScript transpile: **78 JS/JSX/MJS/CJS files, 0 errors**.
- `electron/main.cjs`: **PASS**.
- `electron/preload.cjs`: **PASS**.
- `functions/api/product-image-search.js`: **PASS**.
- JSON parsing: **4/4 PASS**.
- GitHub workflow YAML parsing: **4/4 PASS**.
- Version alignment source/workflow: **PASS**.
- Spark-only / forbidden service guard: **PASS**.
- Secret/static architecture scan: **PASS** via project audit.
- FILE-MANIFEST SHA-256: **323 files, PASS**.
- Final ZIP compressed-data integrity: **PASS**.

## Production compilation gate

`npm ping https://registry.npmjs.org` kembali timeout pada environment release. Karena `node_modules` tidak tersedia, production Vite bundle tidak diklaim PASS secara lokal. GitHub Actions/Cloudflare Pages wajib menjadi final dependency-install + Vite compilation gate.

## Physical/production gates still required after upload

- GitHub Actions `test-only` hijau;
- Firestore Rules/Indexes v6.4.0 deployment hijau;
- Cloudflare Pages v6.4.0 hijau;
- physical Android QRIS scan + sale test;
- Windows QRIS + Customer Display test;
- real merchant notification confirmation;
- offline→online queue kembali 0.

## Final source QA status

**SOURCE RELEASE READY — 263/263 PASS**, dengan production dependency/Vite compile dan physical payment smoke test tetap menjadi gate eksternal yang tidak dapat dibuktikan dari container ini.
