# Build Report — Bumi Makmur POS v6.0.0

## Source validation

- Major release source disiapkan dari baseline v5.8.1 tanpa menghapus fitur Business Suite.
- Version metadata: `6.0.0`.
- `npm run test:core`: **174/174 PASS**.
- `npm run audit:static`: **PASS** (97 JS/JSX/MJS, 4 JSON, imports/required files/paid-service guard/secret scan).
- Syntax parse JS/JSX/MJS/CJS: **PASS**, 61 file, 0 parse diagnostics.
- Android/Windows workflow artifact retention tetap 1 hari untuk mengurangi tekanan GitHub Actions storage.
- Release assets memakai nama/tag v6.0.0.

## Production build status pada environment audit

Full Vite/Electron/Gradle binary build **belum dapat diklaim** dari environment ini. Source archive tidak menyertakan `node_modules`; percobaan `npm run build` berhenti pada `vite: not found`.

Production binary build tetap menjadi release gate melalui GitHub Actions:

1. `npm install --no-audit --no-fund`
2. `npm run test:core`
3. `npm run audit:static`
4. `npm run build`
5. Android: Capacitor sync + generated native plugin + Gradle signed APK/AAB
6. Windows: Electron Builder EXE/MSI

Lihat `QA-REPORT-Bumi-Makmur-POS-v6.0.0.md` untuk coverage dan hardware acceptance yang masih diperlukan.
