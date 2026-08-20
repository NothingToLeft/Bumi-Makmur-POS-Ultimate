# Build Hotfix — Bumi Makmur POS v6.0.3 R2

## Fokus

Full Stability Recovery setelah temuan produksi:

1. Karyawan melihat `Cloud perlu diperiksa` tetapi memang tidak memiliki akses Pengaturan.
2. Owner membuka `Pengaturan → Cloud & Backup` dan halaman dapat blank putih.
3. Layar Pelanggan perlu tetap stabil sesudah pergantian Owner/Karyawan.

## Perubahan build/source

- Tidak mengubah `APP_VERSION` bisnis: tetap `6.0.3`.
- Tidak mengubah Firestore schema/rules marker: tetap `6.0.3`.
- Tidak membutuhkan Firebase Blaze, Functions, atau Storage.
- Web source perlu redeploy karena perubahan React runtime/recovery.
- Android/Windows dapat dibuild ulang dari source yang sama untuk memperoleh hardening identik.

## Quality gates lokal

- `npm run test:core`
- `npm run audit:static`
- parser TypeScript global untuk seluruh JS/JSX source
- `node --check electron/main.cjs`
- `node --check electron/preload.cjs`
- YAML/JSON validation

Full Vite production build tetap dilakukan oleh GitHub Actions / Cloudflare Pages karena environment source-only lokal tidak memiliki dependency registry yang dapat diakses stabil.
