# Build Report — Bumi Makmur POS v5.8.1

- Source baseline: v5.8.0 Business Suite.
- Target release: **v5.8.1 Numeric Input & Variant Pricing Stability**.
- Core tests: **167/167 PASS**.
- Static audit: **PASS** (91 JS/JSX/MJS + 4 JSON; imports, required files, paid-service guard, secret scan).
- Source syntax/transpile audit: **PASS** (52 source files, 0 error).
- Local Vite production bundle: **tidak diklaim** pada environment audit karena dependency package/SDK lengkap tidak tersedia.
- Web production gate: GitHub Actions / Cloudflare Pages build.
- Android production gate: GitHub Actions signed release dengan keystore produksi yang sama.
- Windows production gate: GitHub Actions Electron NSIS/MSI.
- Artifact retention: 1 hari untuk artifact build biasa; release binary sebaiknya dipublikasikan ke GitHub Releases.
- Cloud schema: tidak berubah dari v5.8.0; redeploy Firestore Rules tidak wajib bila rules v5.8.0 sudah aktif.
- Canonical public URL: `https://bumi-makmur.my.id`.
