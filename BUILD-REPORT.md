# Build Report v4.4

Tanggal audit source: 2026-07-26

- Core tests: **65/65 lulus**.
- Audit statis: **51 file JS/JSX/MJS**, 4 JSON, relative imports, secret scan, dan larangan layanan berbayar: lulus.
- Parser sintaks TypeScript untuk source JS/JSX/MJS: **32 file, 0 error**.
- Firebase target: Firestore Rules/Indexes saja pada Spark.
- Web target: Cloudflare Pages PWA.
- Android target: signed APK + AAB via GitHub Actions.
- PC target: installable PWA via Edge/Chrome.

## Catatan build lokal

Dependency registry pada lingkungan penyusunan mengembalikan HTTP 503/EAI_AGAIN, sehingga `npm install` dan kompilasi Vite lokal tidak dapat diselesaikan di lingkungan ini. Source tetap melalui tests, audit, dan parser JSX. Workflow `test-only` sengaja menjalankan `npm run build` agar GitHub memblokir rilis bila ada error bundling/import.

## Kriteria rilis

Rilis APK hanya dilanjutkan setelah:

1. `test-only` hijau;
2. `Deploy Firebase Spark Rules` hijau;
3. `android-release` hijau dan signature APK terverifikasi.
