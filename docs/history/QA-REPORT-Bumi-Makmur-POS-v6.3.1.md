# QA Report — Bumi Makmur POS FreeSync v6.3.1
## AI Quota Resilience Patch

Tanggal validasi: 20 Agustus 2026

## Scope

QA patch mencakup regression seluruh fitur v6.3.0 serta perubahan v6.3.1 pada runtime Gemini bersama, error quota/rate-limit, cooldown anti-request-loop, cache kandidat foto, fallback link halaman produk tanpa Gemini, status/diagnostik AI lokal, Cloudflare Pages image helper, version alignment, Firebase Spark-only guard, Android/Web/Windows workflow, dan kompatibilitas fitur lama.

## Automated regression

- Total: **253**
- Passed: **253**
- Failed: **0**
- Skipped: **0**

Tambahan coverage v6.3.1:

- `RESOURCE_EXHAUSTED`/HTTP 429 dipetakan menjadi pesan pengguna yang aman.
- Minimum local anti-hammer guard diterapkan pada quota/rate-limit.
- Error API key tetap user-friendly sementara detail teknis tersimpan lokal.
- API key tidak masuk diagnostics.
- Kandidat foto berhasil di-cache lokal dan dapat dipakai ulang tanpa request Gemini baru.
- Fallback source-link dapat mengambil kandidat melalui helper tanpa Gemini.
- Pengaturan menampilkan runtime status dan diagnostics lokal.
- Gemini key tetap langsung device → Gemini dan tidak melewati Cloudflare helper.

## Static / syntax / configuration gates

- `npm run audit:static`: **PASS**.
- Static audit coverage: **121 file JS/JSX/MJS**, 4 JSON, required files, relative imports, Firebase Spark-only, Cloudflare helper architecture, secret scan, dan release-version guard.
- Independent TypeScript transpile/syntax validation: **68 file, 0 diagnostics**.
- `electron/main.cjs`: **PASS** (`node --check`).
- `electron/preload.cjs`: **PASS** (`node --check`).
- `functions/api/product-image-search.js`: **PASS** (`node --check`).
- JSON parsing: **4/4 PASS**.
- GitHub Actions YAML parsing: **4/4 PASS**.
- Firebase Spark-only / forbidden paid-service guard: **PASS**.
- Secret scan: **PASS**; Gemini API key/private key tidak tertanam pada source.

## Security regression

- Tidak menambahkan Firebase Functions runtime.
- Tidak menambahkan Firebase Storage.
- Tidak memerlukan Blaze.
- Gemini API key tetap local-device secret.
- Diagnostics hanya menyimpan kategori/status/retry/detail error dan tidak menyimpan API key.
- Cloudflare helper tidak menerima `x-goog-api-key` dan tidak memanggil Gemini.
- Fallback link tetap melewati URL/protocol/private-network/custom-port/redirect/MIME/size validation serta selected-image source re-verification.
- Tidak ada perubahan Firestore schema/rules/indexes pada v6.3.1.

## Production compilation gate

`npm install --no-audit --no-fund` dicoba kembali pada container release dan timeout setelah sekitar 125 detik. `node_modules` tidak terbentuk. `npm ping` ke registry juga tidak memperoleh respons sebelum batas waktu singkat. Karena dependency tidak tersedia, **Vite production bundle tidak diklaim PASS secara lokal**.

Final production dependency-install + Vite compilation gate wajib dilakukan oleh:

1. GitHub Actions `Build Bumi Makmur POS v6.3.1 → test-only`;
2. Cloudflare Pages deployment setelah push.

Android APK/AAB dan Windows EXE/MSI tetap menjadi binary build gate di GitHub Actions.

## Final QA status

**SOURCE QA: PASS** — 253/253 regression tests, static/security/configuration/syntax gates lulus.

**PRODUCTION BINARY/WEB COMPILE: PENDING CI** — bukan kegagalan source; dependency registry pada container lokal tidak merespons sehingga compile final harus dikonfirmasi di GitHub Actions/Cloudflare Pages.
