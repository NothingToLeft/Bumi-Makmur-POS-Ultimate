# Build & QA Report — Bumi Makmur POS v5.2.1

## Lingkup audit

- Kelipatan penjualan kabel setengah meter.
- Migrasi nilai lama `0,499` menjadi `0,5`.
- Normalisasi kuantitas pada checkout, edit item, split bill, refund, retur pembelian, penyesuaian, opname, transfer, pembelian, dan pesanan online.
- Konversi satuan pembelian roll/box ke satuan dasar.
- Perhitungan harga beli ketika satuan item pembelian diubah.
- Responsivitas form Pembelian/Restok dan form kuantitas pada HP, tablet, Web, dan Desktop.
- Regresi Firebase Spark, offline queue, QRIS, scanner, printer, Android, PWA, dan Windows.

## Hasil pemeriksaan lokal

```text
npm run test:core
Tests : 100
Pass  : 100
Fail  : 0
```

```text
npm run audit:static
AUDIT LULUS
JS/JSX/MJS : 66 file
JSON       : 4 file valid
```

```text
TypeScript parser (JS/JSX/MJS/CJS)
Source : 62 file
Error  : 0
```

## Build production

Perintah `npm install` pada lingkungan penyusunan mengalami timeout, sehingga Vite production build lokal belum dapat dijadikan bukti final. Workflow GitHub Actions `test-only` tetap menjadi gerbang wajib dan akan menjalankan instalasi dependency, core tests, static audit, serta `vite build`.

## Status kompatibilitas

- Firebase Spark/free tier: dipertahankan.
- Cloud Functions: tidak digunakan.
- Firebase Storage: tidak digunakan.
- Firestore Rules: tidak berubah dari v5.2.0.
- Package ID Android: tetap `app.bumimakmur.pos`.
- Desktop app ID: tetap `app.bumimakmur.pos.desktop`.
- Data dan akun lama: dipertahankan saat update langsung.
