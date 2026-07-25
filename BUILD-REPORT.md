# Build Report v4.3

- Core tests: **59/59 lulus**.
- Audit statis: **49 file JS/JSX/MJS**, 4 JSON, relative imports, secret scan, dan larangan layanan berbayar: lulus.
- Parser sintaks TypeScript untuk JS/JSX/MJS: 49 file, 0 kegagalan.
- Firebase deploy target: Firestore rules/indexes saja (Spark).
- Web hosting utama: Cloudflare Pages (`dist`), Netlify sebagai fallback.
- Android target: signed APK + AAB via GitHub Actions.
- PC target: installable PWA via Edge/Chrome.
- `test-only` di GitHub: install dependency → tests → audit → kompilasi Vite.

Instalasi npm lokal pada lingkungan penyusunan mengalami timeout jaringan registry. Karena itu build Vite dan Gradle penuh dijalankan di GitHub Actions; workflow sudah disiapkan untuk memblokir rilis bila tests/audit/compile gagal.
