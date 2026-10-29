# QA Report — Bumi Makmur POS FreeSync v6.3.0
## Product Visual & Multi-Barcode

Tanggal validasi: 20 Agustus 2026

## Scope

QA mencakup regression seluruh fitur historis, barcode per varian, multi-barcode/satuan, scanner, label massal, import collision safety, cashier thumbnail, Gemini image search architecture, Cloudflare Pages helper, Firestore index exemption, Unified AutoSync, role/security, closing/reporting, Android/Web/Windows build configuration, dan Spark-only guard.

## Automated tests

- Total: **249**
- Passed: **249**
- Failed: **0**
- Skipped: **0**

## v6.3-specific coverage

- EAN-13 checksum validation dan renderer EAN-13 asli.
- Code 39 fallback untuk barcode internal alfanumerik.
- Factory/internal/supplier/package/shared barcode distinction.
- Direct variant scan priority.
- Package barcode conversion factor.
- Mass barcode print mode Internal/Pabrik/Otomatis.
- Import shared barcode tidak dipakai sebagai update identity.
- Direct-vs-shared collision rejection.
- Group photo stored once semantics.
- Variant → group image fallback pada Kasir.
- Gemini key direct-to-Gemini; tidak pernah diteruskan ke Cloudflare helper.
- Selected-image source re-verification.
- Thumbnail size guard 90 KB.
- Firestore index exemptions untuk data URL thumbnail.

## Static / security gates

Status final akan dianggap release-ready hanya bila:

- `npm run audit:static` PASS;
- source transpile/syntax validation PASS;
- Electron main/preload syntax PASS;
- JSON/YAML validation PASS;
- relative import audit PASS;
- forbidden paid Firebase service audit PASS;
- secret scan PASS;
- ZIP integrity PASS.

## Build environment limitation

Container release tidak mempunyai `node_modules` secara default. Production Vite build lokal hanya dapat dinyatakan PASS jika dependency install berhasil pada environment ini. Bila registry tidak dapat dijangkau, GitHub Actions/Cloudflare Pages menjadi production compilation gate dan laporan build harus menyatakan kondisi tersebut secara eksplisit.

## Final validation result

- Automated regression: **249/249 PASS**, 0 fail, 0 skip.
- Static project audit: **PASS**.
- Audit coverage: **119 JS/JSX/MJS/CJS source files**, 4 JSON files, required files, relative imports, Spark-only configuration, Cloudflare helper architecture, image field index exemptions, and secret patterns.
- Independent TypeScript transpile/syntax validation: **113 JS/JSX/MJS files, 0 diagnostics**.
- `electron/main.cjs`: **PASS**.
- `electron/preload.cjs`: **PASS**.
- `functions/api/product-image-search.js`: **PASS**.
- GitHub Actions YAML: **4/4 PASS**.
- JSON parsing: **4/4 PASS**.
- Secret scan: **PASS**; tidak ada Gemini API key/private key tertanam pada source release.
- Final ZIP compressed-data integrity: **PASS**.
- Paid Firebase service guard: **PASS**; tidak ada Firebase Storage/Functions runtime configuration.

## Production compilation gate

`npm install --no-audit --no-fund` dicoba selama 120 detik tetapi registry dependency tidak merespons sampai timeout dan `node_modules` tidak terbentuk. `npm ping https://registry.npmjs.org` juga timeout pada environment container. Karena itu production Vite bundle lokal **tidak diklaim PASS**. GitHub Actions/Cloudflare Pages wajib menjadi final dependency-install + Vite compilation gate setelah source di-push.
