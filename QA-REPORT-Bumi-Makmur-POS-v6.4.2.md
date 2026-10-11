# QA Report Bumi Makmur POS v6.4.2

Sumber: arsip hasil review Claude. Pengujian dijalankan setelah patch lanjutan pada 11 Oktober 2026.

## Pengujian terverifikasi

- `npm run test:core`: **290 pass / 0 fail** (Node.js v22.16.0). Termasuk tes perilaku spesifik refund per baris, QRIS session duplication, tiket approval, CSV, dan limit berkas.
- `npm run audit:static`: **lulus**, 145 file JS/JSX/MJS diperiksa; audit ini melakukan banyak pemeriksaan string/static source dan tidak menggantikan build serta e2e.
- Parser TypeScript (mode JavaScript/JSX) memeriksa **145 file**, **0 parse error**; bukan verifikasi bundler/full typecheck.
- Tidak ada modifikasi sumber asli; penyuntingan dilakukan di salinan source v6.4.2.

## Belum diverifikasi

- `npm run build`, parsing JSX oleh bundler esbuild/Vite setelah install dependency, dan reproduksibilitas dari `npm ci` (belum ada `package-lock.json`).
- Android signing, APK/AAB, native camera/scanner/printing, tablet Huawei, Windows EXE/MSI, browser PWA reload nyata, maupun Cloudflare Pages deploy.
- Emulator Firestore/Auth dan live sync lebih dari satu perangkat; aturan Firestore tidak diubah.
- Otorisasi Manager sisi server dan pencegahan replay QRIS lintas device secara atomik.
- Berkas Excel berbahaya pada `xlsx@0.18.5` belum diuji keamanan paket.

## Langkah sebelum produksi

1. Selesaikan dependency install di environment online dan buat lockfile; gunakan `npm ci` untuk build selanjutnya.
2. Jalankan `npm run audit:static && npm run test:core && npm run build`, lalu smoke-test web dan PWA.
3. Jalankan Android/Windows builds dan uji kamera depan/belakang, barcode varian, invoice, printer, refund, closing, serta pemulihan sync offline.
4. Backup Firestore/data operasional dahulu; verifikasi aturan Firestore produksi dan hak akses via emulator, sebelum mendorong rilis.
5. Perbaiki model otorisasi approval backend dan evaluasi library impor Excel sebelum digunakan untuk file tidak tepercaya.

## Build attempt

`npm run build` berhenti dengan `vite: not found` (dependency belum diinstal). Node pengujian lokal 22.16.0, sedangkan CI menargetkan Node 24; lakukan tes ulang di Node 24.
