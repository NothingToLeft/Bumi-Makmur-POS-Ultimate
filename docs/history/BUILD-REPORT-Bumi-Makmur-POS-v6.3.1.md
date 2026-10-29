# Build Report — Bumi Makmur POS FreeSync v6.3.1
## AI Quota Resilience Patch

Tanggal: 20 Agustus 2026

## Release targets

- Web/PWA: Cloudflare Pages
- Android: Capacitor APK/AAB via GitHub Actions
- Windows: Electron NSIS + MSI via GitHub Actions
- Cloud: Firebase Authentication + Firestore Spark
- Image helper: Cloudflare Pages Function `/api/product-image-search`

## Version alignment

- `package.json`: **6.3.1**
- `VERSION.txt`: **6.3.1**
- app runtime/default metadata: **6.3.1**
- PWA service-worker cache: **v6.3.1**
- Android workflow/artifact/release naming: **v6.3.1**
- Windows workflow/artifact/release naming: **v6.3.1**
- Release notes path: **v6.3.1**
- Firestore Rules marker: **v6.1.0** (tidak berubah)
- Firestore indexes: **tidak berubah dari v6.3.0**

## Architecture changes

### Shared Gemini runtime

`src/services/geminiRuntime.js` menjadi satu lapisan untuk request `generateContent`, error classification, retry/cooldown, status runtime, dan diagnostics lokal. AI Product Capture dan Product Media memakai runtime yang sama agar error behavior konsisten.

### Quota resilience

HTTP 429/`RESOURCE_EXHAUSTED`, rate-limit, auth, model, network, request, dan service error diterjemahkan menjadi pesan Indonesia. Detail provider tidak ditampilkan mentah di form produk. Quota/rate-limit mendapat minimum cooldown lokal 10 menit atau retry server yang lebih panjang.

### Product-image cache

Kandidat foto berhasil disimpan lokal selama 12 jam dengan maksimum 24 query per perangkat. Cache hanya metadata kandidat; gambar yang dipilih tetap mengikuti thumbnail pipeline v6.3.0.

### No-Gemini fallback

Pengguna dapat membuka pencarian web, memilih halaman produk, lalu menempel URL halaman ke aplikasi. Cloudflare helper mengekstrak kandidat dan tetap melakukan selected-image source re-verification. Jalur ini tidak memakai Gemini.

## Validation result

- Core/regression tests: **253/253 PASS**.
- Static audit: **PASS**.
- Static audit source coverage: **121 JS/JSX/MJS**.
- Independent TypeScript transpile/syntax: **68 file, 0 diagnostics**.
- Electron main/preload syntax: **PASS**.
- Cloudflare Pages Function syntax: **PASS**.
- JSON/YAML parsing: **PASS** (4 JSON, 4 workflow YAML).
- Spark-only/security/secret guard: **PASS**.

## Local dependency/build limitation

`npm install --no-audit --no-fund` timeout pada environment container dan tidak membuat `node_modules`. `npm ping` ke registry juga tidak memperoleh respons pada batas waktu pengecekan. Oleh karena itu `npm run build` tidak dapat dijalankan secara jujur pada container ini dan **tidak diklaim PASS**.

Source tetap memiliki build/test gates di CI. GitHub Actions dan Cloudflare Pages wajib menjadi final production dependency-install + Vite compilation gate.

## Required deployment order

1. Backup JSON dan pastikan queue akun aktif aman.
2. Upload seluruh source v6.3.1 ke GitHub.
3. Jalankan `Actions → Build Bumi Makmur POS v6.3.1 → test-only` sampai hijau.
4. Tunggu Cloudflare Pages deployment hijau dan pastikan `/api/product-image-search` ikut ter-deploy.
5. Jika index exemption foto v6.3.0 belum pernah dipublikasikan, jalankan `Deploy Firebase Spark Rules` satu kali. v6.3.1 sendiri tidak memerlukan deploy rules/index baru.
6. Smoke test Cari Foto Otomatis, error quota, fallback link, Kamera/Galeri, satu scan barcode, satu transaksi, login Owner/Karyawan, dan cloud queue = 0.
7. Jalankan Android release, lalu Windows release.
