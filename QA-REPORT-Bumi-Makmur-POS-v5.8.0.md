# QA Report — Bumi Makmur POS FreeSync v5.8.0

Tanggal: 19 Agustus 2026  
Release: **v5.8.0 Business Suite & Smart Inventory**

## Ringkasan hasil

Source v5.8.0 telah melalui full-pass audit terhadap source v5.7.0 terbaru, regression suite, static audit, parser JS/JSX, konfigurasi workflow, JSON, dan YAML. Tidak ada fitur lama yang sengaja dipangkas. **QRIS Mode Kasir tidak ditambahkan** sesuai scope; peningkatan QRIS hanya berupa preview QR-only.

| Pemeriksaan | Hasil |
|---|---|
| Core + regression automated tests | **161/161 PASS** |
| Static project audit | **PASS** |
| TypeScript parser terhadap seluruh JS/JSX `src` | **PASS** |
| Node syntax Electron main/preload | **PASS** |
| Node syntax Android prepare/audit/business insights | **PASS** |
| Workflow YAML GitHub Actions | **PASS** |
| package/capacitor/firebase JSON | **PASS** |
| Secret/paid-service static scan | **PASS** |

## Area yang diverifikasi

- Owner, Store Manager, Kasir, permission, approval PIN, dan profile Firestore.
- IndexedDB/offline snapshot, durable mutation queue, reconnect sync, conflict rebase, dan idempotent cloud mutation.
- Produk, kategori, varian, shared barcode, SKU, fractional quantity, multi-unit conversion, price per unit, dan bundle.
- Smart Barcode Scanner: kamera depan/belakang, device picker, zoom/torch capability, scan foto, serta reuse scanner lintas modul.
- POS, hold/open bill, pembayaran split, credit/bon, loyalty, diskon, below-cost approval, serial-tracked sale, refund, dan void.
- Purchase Order lifecycle, Draft → Ordered, partial receiving, supplier price history, payable, dan supplier return.
- Stock Opname Scanner, physical count, variance reason, adjustment, dan stock ledger.
- Smart Restock, supplier grouping, Draft PO, incoming ordered PO, safety stock, dan velocity.
- Quotation/penawaran, expiry lifecycle, Print/Save PDF route, dan convert-to-open-bill.
- Serial Number lifecycle saat receiving → sale → refund/return → warranty.
- Warranty active-claim guard dan lifecycle RESOLVED/REJECTED.
- Inventory aging, fast/normal/slow/dead, dead-stock capital, excess stock, clearance suggestion, dan receivable aging.
- Backup/restore, reset cloud, Business Suite collections, dan validation data lama.
- Desktop sidebar grouping, mobile bottom navigation, sheet “Lainnya”, dan de-duplication menu.
- QRIS QR-only detection: BarcodeDetector → ZXing → safe crop fallback.
- Firebase Spark only; tidak memakai Cloud Functions, Firebase Storage, atau layanan Blaze.
- GitHub Actions artifact retention 1 hari dan normal artifact upload dibuat non-blocking terhadap GitHub Release.

## Bug penting yang ditemukan dan diperbaiki

1. `HoldModal` dipanggil POS tetapi tidak ada implementasinya.
2. Smart Restock Control Center memiliki JSX conditional yang tidak tertutup dengan benar.
3. `hasApproval` berpotensi dipakai sebelum deklarasi pada proses checkout.
4. Menu Penawaran/Garansi dapat mempertahankan tab lama karena component state tidak mengikuti menu aktif.
5. Draft PO dapat menjadi alur buntu; sekarang Draft dapat diedit lalu ditandai `ORDERED`.
6. PO `PARTIAL` sebelumnya belum cukup melindungi histori item; item/qty/unit/harga dikunci setelah penerimaan parsial.
7. Inventory aging dapat salah menganggap restock baru sebagai barang aktif; sekarang penjualan terakhir menjadi acuan utama.
8. Penawaran yang lewat `validUntil` masih berisiko dikonversi; sekarang efektif `EXPIRED` dan conversion diblokir.
9. Klaim garansi `REJECTED` dapat meninggalkan serial berstatus `WARRANTY`; lifecycle kini dihitung ulang.
10. Serial belum terhubung lengkap dengan receiving, retur pemasok, refund pelanggan, dan restock refund.
11. Refund bertipe `FULL` dapat ditentukan terlalu dini hanya dari daftar line; sekarang berdasarkan kuantitas refund kumulatif.
12. Refund transaksi tempo sebelumnya dapat mengembalikan dana tanpa lebih dahulu mengurangi piutang; sekarang saldo piutang dikurangi terlebih dahulu dan hanya sisanya menjadi payout.
13. Loyalty point pada refund belum konsisten; earned points dibalik dan redeemed points dipulihkan proporsional/kumulatif.
14. Refund serial oleh Kasir membutuhkan rule yang aman; Firestore sekarang hanya mengizinkan lifecycle yang terkait approved refund Manager/Owner.
15. Mobile “Lainnya” sempat menduplikasi menu utama bottom navigation; duplikasi dihapus.
16. Workflow meminta retention artifact lebih panjang dari batas repo dan quota artifact dapat menggagalkan release; retention dibuat 1 hari dan upload artifact normal `continue-on-error`, sedangkan GitHub Release tetap menjadi jalur distribusi binary.

## Release gate manual yang tetap wajib

Source-level automation tidak dapat menggantikan perangkat fisik. Sebelum dipakai penuh di toko, lakukan smoke test produksi berikut:

- **Infinix Note 40 Pro+**: kamera belakang/depan, flash bila tersedia, zoom, scan cepat, scan dari foto, landscape/portrait.
- **Huawei MatePad SE 11**: scanner, keyboard on-screen, modal besar, navigation sheet, portrait/landscape.
- **Printer toko nyata**: Bluetooth/USB/Wi-Fi, nota 58/80 mm, reprint, dan closing.
- **Windows Desktop**: login cloud restore, Save PDF quotation, printer, kamera bila ada, EXE/MSI update.
- **Web/PWA**: install PWA, reload offline, transaksi offline, reconnect hingga antrean = 0.
- **QRIS produksi**: scan QR-only preview dengan minimal dua aplikasi pembayaran sebelum operasional.
- **Multi-device sync**: transaksi/stok pada satu perangkat saat offline, reconnect, lalu cek perangkat kedua.
- **Serial**: receive serial → jual → refund restock → jual kembali → klaim garansi.
- **PO**: Draft → Ordered → Partial Receive → final Receive → supplier return.
- **Credit refund**: jual tempo → bayar sebagian → refund sebagian/penuh → verifikasi piutang dan payout.

## Batasan environment audit

Container audit tidak dapat mengakses registry npm dan tidak menyediakan Android SDK/ADB. Source awal juga tidak membawa `node_modules`. Karena itu laporan ini **tidak mengklaim** Vite production bundle, APK/AAB, atau EXE/MSI berhasil dibangun secara lokal. GitHub Actions disiapkan sebagai build gate sebenarnya.

## Kesimpulan

**Source-level release candidate: PASS — 161/161 tests.**  
Production release menjadi final setelah GitHub Actions `test-only`, Android release, Windows release, serta smoke test perangkat nyata di atas dinyatakan hijau.
