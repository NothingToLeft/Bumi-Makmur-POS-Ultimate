# Build Report — Bumi Makmur POS FreeSync v6.3.0
## Product Visual & Multi-Barcode

Tanggal: 20 Agustus 2026

## Release targets

- Web/PWA: Cloudflare Pages
- Android: Capacitor APK/AAB via GitHub Actions
- Windows: Electron NSIS + MSI via GitHub Actions
- Cloud: Firebase Authentication + Firestore Spark
- Server helper: Cloudflare Pages Function untuk verifikasi/fetch kandidat foto produk

## Version alignment

- `package.json`: 6.3.0
- `VERSION.txt`: 6.3.0
- Service worker cache: v6.3.0
- Android workflow artifact naming: v6.3.0
- Windows workflow artifact naming: v6.3.0
- Release notes path: v6.3.0
- Firestore Rules marker: v6.1.0 (tidak berubah)
- Firestore indexes: berubah pada v6.3.0 untuk photo-field index exemptions

## Architecture decisions

### Product images

Thumbnail Kasir disimpan pada product documents agar tetap sinkron menggunakan Firestore Spark tanpa Firebase Storage. Ukuran dibatasi keras dan parent image dideduplikasi pada satu child variant. Field image data URL dikecualikan dari single-field indexes.

### Gemini key

Gemini API key tetap local-device secret. Browser/device melakukan Gemini Search grounding langsung. Cloudflare Pages Function tidak menerima key dan tidak memanggil Gemini.

### Image helper

Function hanya membaca grounded source pages, mengekstrak metadata/JSON-LD image candidates, dan mengambil gambar setelah source verification. Tidak ada server-side paid AI call.

## Build validation

Production Vite compilation lokal hanya dicatat PASS bila dependency tersedia. GitHub Actions dan Cloudflare Pages tetap final production build gate.

## Validation result

- Core/regression tests: **249/249 PASS**.
- Static audit: **PASS**.
- TypeScript syntax/transpile: **113 files, 0 diagnostics**.
- Electron syntax: **PASS**.
- Cloudflare Pages Function syntax: **PASS**.
- JSON/YAML validation: **PASS**.
- Spark-only/security/secret guard: **PASS**.
- ZIP archive integrity: **PASS**.

## Local dependency/build limitation

Percobaan `npm install --no-audit --no-fund` mencapai timeout 120 detik tanpa membentuk `node_modules`. `npm ping` ke registry npm juga timeout. Oleh karena itu Vite production build tidak dapat dijalankan secara jujur pada container ini. Source tetap memiliki `prebuild -> audit:static`, sehingga Cloudflare/GitHub akan mengulang audit setelah dependency install dan menjadi final production compile gate.

## Required production deployment order

1. Push seluruh source v6.3.0 ke GitHub.
2. Jalankan workflow build `test-only` sampai hijau.
3. Tunggu Cloudflare Pages deployment hijau dan pastikan `/api/product-image-search` ikut aktif sebagai Pages Function.
4. Jalankan `Deploy Firebase Spark Rules` sekali untuk menerapkan Firestore index exemptions. Rules marker tetap v6.1.0.
5. Smoke test barcode varian, barcode pack, foto manual, foto AI/web, transaksi Kasir, dan cloud queue = 0.
6. Baru jalankan Android/Windows release workflow.
