# Build Report — Bumi Makmur POS FreeSync v6.4.1
## QRIS Dynamic & Payment Assurance — CI Secret Scan Hotfix

Tanggal: 20 Agustus 2026

## Version alignment

- `package.json`: **6.4.1**
- `VERSION.txt`: **6.4.1**
- Runtime `APP_VERSION`: **6.4.1**
- PWA service-worker cache: **v6.4.1**
- Android/Web workflow naming: **v6.4.1**
- Windows workflow naming: **v6.4.1**
- Product-image helper user agent: **6.4.1**
- Firestore Rules marker: **6.4.0** (sengaja tidak berubah; tidak ada rules migration pada patch ini)

## Build pipeline change

v6.4.0 menulis `.env.production` ke GitHub Actions workspace. `npm run build` kemudian menjalankan `prebuild -> audit:static` dan scanner membaca Firebase Web API key `AIza...` sebagai secret.

v6.4.1 menggunakan arsitektur release yang lebih aman:

1. step validasi hanya memastikan GitHub Secrets yang wajib tersedia;
2. tidak ada file `.env.production` yang dibuat oleh Android/Web atau Windows workflow;
3. `VITE_FIREBASE_*` dan `VITE_PUBLIC_APP_URL` diinjeksi langsung ke environment build step;
4. Vite memperoleh konfigurasi Firebase dari process environment;
5. secret scanner tetap aktif pada source/workspace.

## Validation result

- Core/regression tests: **266/266 PASS**.
- Static audit: **PASS**.
- Structured Firebase-runtime secret scan positive case: **PASS**.
- Intentional Gemini-key leak negative case: **PASS** (audit sengaja menolak).
- JSON validation: **4/4 PASS**.
- GitHub workflow YAML validation: **4/4 PASS**.
- Electron main/preload syntax: **PASS**.
- Cloudflare Pages Function syntax: **PASS**.
- Spark-only/security guards: **PASS**.

## Local production build limitation

`npm install --no-audit --no-fund` mencapai timeout 120 detik. `npm ping` ke registry npm juga timeout dan `node_modules` tidak terbentuk. Karena itu production Vite compilation lokal tidak diklaim PASS.

Final compile gate:

1. upload v6.4.1 ke GitHub;
2. jalankan Android workflow `test-only`;
3. pastikan `npm run build` melewati `prebuild -> audit:static` dan Vite compilation;
4. setelah hijau, jalankan release Android/Windows/Web sesuai kebutuhan.

## Expected difference from failed v6.4.0 job

Log berikut tidak boleh muncul lagi:

`.env.production: kemungkinan secret/private key terdeteksi`

Release workflow v6.4.1 tidak membuat file tersebut.
