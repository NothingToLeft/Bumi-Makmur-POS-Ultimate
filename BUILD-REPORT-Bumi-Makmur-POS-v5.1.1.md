# Build & QA Report — Bumi Makmur POS v5.1.1

## Ruang lingkup
- Otomasi GitHub Releases untuk Windows EXE/MSI.
- Otomasi GitHub Releases untuk Android APK/AAB.
- Tag dan judul rilis mengikuti versi `package.json`.
- Upload ulang aman melalui `--clobber`.
- Actions artifact tetap dipertahankan sebagai fallback.

## Pemeriksaan
- Core tests harus lulus melalui `npm run test:core`.
- Static audit harus lulus melalui `npm run audit:static`.
- Kompilasi Vite diperiksa dalam workflow `test-only`.
- Installer hanya diterbitkan setelah seluruh langkah build berhasil.
- Release membutuhkan izin workflow `contents: write`, tanpa secret tambahan.
