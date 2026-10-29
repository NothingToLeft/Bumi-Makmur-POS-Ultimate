# Build Report — Bumi Makmur POS v5.6.2

## Pemeriksaan yang berhasil

- Core/regression tests: 130/130 lulus.
- Static audit: lulus.
- File JS/JSX/MJS diperiksa: 84.
- File JSON valid: 4.
- Secret scan dan pemeriksaan layanan berbayar: lulus.
- Firestore Rules tidak berubah.

## Kompilasi lokal

`npm install` tidak dapat diselesaikan pada lingkungan penyusunan karena registry internal tidak menyediakan `@capacitor/android@7.4.3` (HTTP 404). Karena itu, kompilasi produksi Vite/Electron/Android wajib diverifikasi melalui GitHub Actions `test-only`, `windows-release`, dan `android-release`.
