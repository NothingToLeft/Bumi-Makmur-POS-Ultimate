# Bumi Makmur POS v6.5.1

POS toko listrik/material untuk Web/PWA, Android HP/tablet, dan Windows. React + Vite, Firebase Authentication/Firestore Spark, Capacitor, dan Electron.

[Website](https://bumi-makmur.my.id) · [Unduh aplikasi](https://github.com/NothingToLeft/Bumi-Makmur-POS-Ultimate/releases) · [Status verifikasi](PROJECT_STATUS.md) · [Dokumentasi](docs/README.md)

## Mulai lokal

Gunakan Node.js 24. Jalankan dari root repo:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Isi konfigurasi Firebase pada `.env.local`; jangan commit kredensial. Pemasangan Electron mengunduh binary. Untuk build web tanpa binary Electron, gunakan `npm ci --ignore-scripts`.

```powershell
npm run test:core
npm run build
```

## Fitur

- Kasir, multi-unit/varian/bundle, harga eceran/grosir/proyek, diskon, refund/void, open bill dan pesanan online.
- Produk/stok, barcode, impor Excel/CSV, pembelian/PO, supplier, opname, transfer, serial dan garansi.
- Pelanggan, poin/tier, quotation, piutang/utang, shift/kas, pengeluaran dan laporan.
- AI foto produk, OCR Android, beberapa provider API, Smart Receiving/Restock dan PDF closing.
- Multi-cabang, akun/hak akses, approval PIN, customer display, struk dan backup.
- Cache lokal, antrean offline dan sinkronisasi Firebase Spark. Tidak membutuhkan Blaze, Storage atau Cloud Functions.

Implementasi tidak sama dengan verifikasi perangkat nyata. Batas QRIS, approval Manager dan dependency yang masih terbuka tercatat pada [QA v6.5.1](docs/QA-v6.5.1.md).

## Struktur

| Folder | Isi |
|---|---|
| `src/` | UI, store, layanan dan logika POS |
| `public/` | PWA, ikon dan service worker |
| `electron/` | Aplikasi Windows |
| `functions/` | Helper Cloudflare Pages |
| `scripts/`, `tests/` | Tool build, audit dan regresi |
| `.github/workflows/` | Build Android/Windows dan pipeline |
| `docs/guides/` | Panduan operasional aktif |
| `docs/releases/` | Catatan rilis saat ini |
| `docs/history/` | Dokumen lama; bukan bukti pengujian saat ini |

[Arsitektur](ARCHITECTURE.md) · [Changelog](CHANGELOG.md) · [Lisensi pihak ketiga](THIRD-PARTY-NOTICES.md)
