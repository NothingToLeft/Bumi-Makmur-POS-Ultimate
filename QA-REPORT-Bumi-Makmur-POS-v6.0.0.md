# QA Report — Bumi Makmur POS v6.0.0

## Automated regression

**174 / 174 PASS** (`npm run test:core`).

Static project audit: **PASS**.

- 97 file JS/JSX/MJS diperiksa oleh project audit.
- 4 file JSON valid.
- Relative imports, required files, forbidden paid services, dan secret scan diperiksa.
- Parser TypeScript memeriksa 61 file JS/JSX/MJS/CJS: **0 syntax parse diagnostics**.

## v6 dedicated cases

- Cable Ties VISALUX parser: brand/model/size/QTY 100 pcs/barcode.
- Smart Receiving barcode match termasuk conversion barcode dan `packQty` hasil analisis terbaru.
- Smart Receiving membersihkan product/price match lama jika foto berikutnya tidak cocok.
- AI capture tidak mengasumsikan stok awal; default stok AI = 0 sampai pengguna mengisi.
- Image optimizer punya fallback untuk browser tanpa `createImageBitmap` dan membersihkan object URL preview.
- Race guard mencegah hasil analisis foto lama menimpa foto yang dipilih lebih baru.
- Closing: partial refund + restock HPP recovery + void exclusion + payment netting.
- Gemini key local-only / no Firestore AI key collection.
- Android generator includes ML Kit OCR, FileProvider, PDF share, WhatsApp target/fallback.
- UI exposes Foto Produk AI, Smart Receiving, closing PDF/share.
- Sale line HPP snapshot dan persisted closing summary.
- Seluruh test/regression v5.8.1 tetap lulus.

## Build gate

`npm run build` dicoba pada environment audit, tetapi source ZIP tidak membawa `node_modules`, sehingga shell berhenti pada `vite: not found`. Ini **bukan** bukti production build berhasil/gagal secara source; production compilation tetap harus melewati GitHub Actions yang memasang dependency terlebih dahulu.

## Manual/hardware acceptance masih diperlukan

- Camera focus/OCR pada Infinix Note 40 Pro+.
- Portrait/landscape OCR dan share pada Huawei MatePad SE 11.
- WhatsApp dan WhatsApp Business attachment intent pada Android fisik.
- Windows share/download fallback.
- Web camera/file upload dan Gemini request menggunakan API key milik pengguna.
- Printer/QRIS/scanner regression smoke test.

Tidak ada klaim binary/hardware pass sampai GitHub Actions dan smoke test perangkat fisik selesai.
