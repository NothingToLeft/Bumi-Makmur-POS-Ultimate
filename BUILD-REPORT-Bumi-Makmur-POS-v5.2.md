# Build & QA Report — Bumi Makmur POS v5.2.0

## Lingkup perubahan

- Dropdown login karyawan per cabang.
- Direktori nama karyawan publik yang disanitasi.
- Produk & Stok terpadu.
- Penjualan pecahan dan konversi satuan.
- Pembelian/restok multi-satuan serta retur pecahan.
- Pesanan online multi-satuan yang konsisten saat dikonversi ke tagihan Kasir.
- Penghapusan UI Promo otomatis dengan kompatibilitas histori.
- Audit regresi Android, Web/PWA, Windows, Firebase Spark, dan offline sync.

## Hasil pemeriksaan lokal

```text
npm run test:core
Tests : 95
Pass  : 95
Fail  : 0
```

```text
npm run audit:static
AUDIT LULUS
JS/JSX/MJS : 65 file
JSON       : 4 file valid
```

Pemeriksaan sintaks/transpilasi source menghasilkan **0 error**.

## Batas pemeriksaan

Instalasi dependency/Vite build penuh tidak dapat dipastikan dari lingkungan penyusunan ketika registry npm tidak merespons stabil. Karena itu workflow GitHub Actions `test-only` tetap menjadi gerbang wajib sebelum Android/Windows release.

## Pemeriksaan yang wajib di GitHub

1. Core tests.
2. Static audit.
3. Vite production build.
4. Firestore Rules compile/deploy.
5. Android Gradle signed APK/AAB.
6. Electron Builder EXE/MSI dengan `--publish never`.
7. Publikasi checksum dan aset ke GitHub Releases.

## Status kompatibilitas

- Firebase Spark/free tier: dipertahankan.
- Cloud Functions: tidak digunakan.
- Firebase Storage: tidak digunakan.
- Package ID Android: tetap `app.bumimakmur.pos`.
- Data lokal v5.1.x: dipertahankan saat update langsung.
- Data promo lama: dipertahankan untuk laporan historis.
