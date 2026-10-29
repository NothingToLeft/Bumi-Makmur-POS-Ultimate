# Bumi Makmur POS FreeSync v5.8.0 — Business Suite & Smart Inventory

v5.8.0 adalah upgrade penuh di atas v5.7.0 untuk operasional toko listrik/material. Fitur lama tetap dipertahankan; arsitektur tetap **offline-first**, sinkron otomatis memakai **Firebase Authentication + Firestore Spark**, dan tidak membutuhkan Blaze Plan.

## Fitur utama baru / disempurnakan

- Multi-unit conversion dan harga per pcs/pack/box/dus/roll/meter tetap satu stok dasar.
- Produk induk/varian, spesifikasi, shared barcode, SKU, dan bundle dipertahankan serta diintegrasikan ke modul bisnis baru.
- **Smart Restock** berbasis velocity, stok minimum, lead time, safety stock, Draft PO, dan outstanding ordered PO.
- **Purchase Order**: Draft → Ordered → Partial → Received, partial receiving, supplier price history, dan retur pemasok.
- **Stock Opname Scanner** dengan physical count dan alasan selisih.
- **Quotation/Penawaran** dengan masa berlaku, Print/Save PDF, dan konversi ke Open Bill.
- **Piutang/bon** tetap terintegrasi dengan pembayaran dan sekarang konsisten terhadap refund transaksi tempo.
- **Serial Number & Garansi**: serial saat receiving, sale, refund, supplier return, serta warranty claim.
- **Inventory analytics**: fast/normal/slow/dead stock, 30/60/90+ aging, excess stock, modal tertahan, margin, dan clearance suggestion.
- Proteksi **PIN Owner/Manager** untuk tindakan sensitif dan penjualan di bawah modal.
- Sidebar, tab, bottom navigation, dan menu “Lainnya” dirapikan untuk Android, tablet, desktop, dan web.
- QRIS Adaptive v4 menghasilkan **QR-only preview**. **QRIS Mode Kasir tidak ditambahkan**.

## Perbaikan reliability penting

- Hold/F8 POS tidak lagi mereferensikan modal yang hilang.
- Guard approval checkout tidak lagi berisiko ReferenceError.
- Draft PO dapat diteruskan secara benar dan PO partial melindungi histori item.
- Inventory aging memakai penjualan terakhir, bukan sekadar inbound/restock terakhir.
- Quotation yang melewati masa berlaku tidak dapat dikonversi.
- Warranty claim mencegah dua klaim aktif dan status serial kembali benar setelah RESOLVED/REJECTED.
- Serial lifecycle konsisten pada receiving, sale, refund/restock, supplier return, dan warranty.
- Refund penuh ditentukan dari kuantitas kumulatif.
- Refund transaksi kredit mengurangi piutang terlebih dahulu; hanya sisa yang menjadi payout.
- Poin loyalty earned/redeemed dikoreksi secara proporsional pada refund.
- Firestore Rules Kasir mendukung sale/refund serial secara aman tanpa membuka edit master serial.
- Artifact Actions dibuat 1 hari dan non-blocking agar quota artifact tidak menghambat GitHub Release.

## QA source

- **161/161 automated tests PASS**
- Static audit: **PASS**
- JS/JSX parser: **PASS**
- Workflow YAML dan JSON: **PASS**

Native binaries tetap harus dibangun melalui GitHub Actions karena environment audit tidak memiliki dependency registry/Android SDK.

## Langkah upgrade

1. Backup JSON dan pastikan antrean offline = 0.
2. Replace seluruh source repo dengan paket v5.8.0 lalu push.
3. Jalankan **Deploy Firebase Spark Rules** satu kali.
4. Jalankan Android workflow `test-only`.
5. Jika hijau, jalankan `android-release`, lalu Windows `test-only` dan `windows-release`.
6. Install APK di atas versi lama dengan signing key yang sama; jangan uninstall bila ingin mempertahankan data lokal.
7. Jalankan smoke test scanner, printer, QRIS, offline-sync, PO, serial, dan refund kredit.
