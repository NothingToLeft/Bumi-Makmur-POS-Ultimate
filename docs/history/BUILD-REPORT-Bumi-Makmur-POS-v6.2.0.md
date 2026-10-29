# Build Report — Bumi Makmur POS v6.2.0

**Release:** Data Integrity & Professional Operations  
**Validated:** 20 Agustus 2026

## Source validation

Berhasil dijalankan pada source release:

```text
npm run audit:static  -> PASS
npm run test:core     -> 235 / 235 PASS
node --check electron/main.cjs    -> PASS
node --check electron/preload.cjs -> PASS
GitHub workflow YAML parse        -> 4 / 4 PASS
TypeScript source parser           -> PASS (0 diagnostics)
```

## Dependency / production compilation

`npm install --no-audit --no-fund` dicoba tetapi environment audit tidak dapat resolve `registry.npmjs.org`. Karena dependency tidak tersedia, `vite build`, Android Gradle packaging, dan Electron installer packaging tidak dapat dijalankan secara jujur di container lokal ini.

Release workflow sudah disiapkan untuk Node 24 dan menjalankan:

- dependency install;
- 235 regression tests;
- static audit + esbuild JSX parsing setelah dependency tersedia;
- Vite production compilation pada mode `test-only`;
- Android signed APK/AAB bila dipilih;
- Windows EXE/MSI bila dipilih.

## Firebase

Tidak ada perubahan Firestore Rules pada v6.2.0. Ruleset yang tetap digunakan:

```text
BUMI_MAKMUR_RULESET_VERSION=6.1.0
```

Jika ruleset v6.1.0 sudah sukses dipublikasikan sebelumnya, **tidak perlu deploy ulang hanya karena upgrade ke v6.2.0**.

## Storage policy

- Data bisnis: Firebase Auth + Firestore Spark + cache lokal.
- PDF: lokal/on-demand, **tidak masuk Firebase Storage**.
- Gemini API key: lokal per perangkat, **tidak masuk Firestore/source**.
- Firebase Storage / Cloud Functions / Blaze: tidak diperlukan.

## Production release gate

Release boleh dipromosikan setelah:
1. Cloudflare Pages build hijau;
2. GitHub Actions `Build Bumi Makmur POS v6.2.0` → `test-only` hijau;
3. smoke test operasional utama lulus pada perangkat nyata.
