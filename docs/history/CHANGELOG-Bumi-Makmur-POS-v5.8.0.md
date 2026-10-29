# Changelog — Bumi Makmur POS FreeSync v5.8.0

Tanggal: 19 Agustus 2026  
Codename: **Business Suite & Smart Inventory**

## Inventory, katalog, dan pembelian

- Mempertahankan multi-unit conversion, fractional quantity, harga khusus per unit, Produk Induk + Varian, shared barcode, SKU, dan bundle.
- Menambahkan merek/spesifikasi yang dapat dipakai sebagai atribut katalog.
- Smart Restock menghitung velocity, minimum stock, lead time, safety stock, ordered incoming, Draft PO planned quantity, dan supplier latest-price.
- Smart Restock dapat membuat Draft PO per supplier tanpa input ulang.
- PO memakai status `DRAFT`, `ORDERED`, `PARTIAL`, `RECEIVED`, `CANCELLED`.
- Draft PO dapat diedit dan ditandai `ORDERED`; PO partial mengunci item/qty/unit/factor/harga agar histori receiving stabil.
- Penerimaan parsial hanya menambah stok/HPP/payable berdasarkan barang yang benar-benar diterima.
- Supplier price history dicatat per receipt.
- Serial produk dapat dicatat saat receiving; optional capture mempertahankan compatibility data lama.
- Supplier return produk berserial mewajibkan serial IN_STOCK yang benar dan menandainya `RETURNED`.
- Stock Opname Scanner mencatat count fisik, variance, reason, dan stock movement.

## Penjualan, quotation, piutang, dan loyalty

- Menambahkan Quotation/Penawaran dengan customer, item, discount, tax, validity, notes, Print/Save PDF, dan conversion ke Open Bill.
- Quotation yang melewati `validUntil` efektif menjadi `EXPIRED` dan tidak dapat dikonversi sampai diperbarui.
- Serial-tracked sale mewajibkan exact serial count dan serial `IN_STOCK`.
- Below-cost sale memerlukan approval PIN sesuai role/policy.
- Refund FULL/PARTIAL sekarang dihitung dari kuantitas kumulatif, bukan sekadar line yang dipilih.
- Refund produk berserial mewajibkan serial dari transaksi asli dan mencegah serial direfund dua kali.
- Refund restock mengembalikan serial ke `IN_STOCK`; refund tanpa restock menandainya `RETURNED`.
- Refund transaksi tempo mengurangi saldo piutang lebih dahulu; hanya sisa nilai refund menjadi payout tunai/non-tunai.
- Earned loyalty points dibalik dan redeemed points dikembalikan secara proporsional/kumulatif pada refund.

## Serial & garansi

- Menambahkan `serialNumbers` dan `warrantyClaims` sebagai koleksi sinkron.
- Lifecycle serial: `IN_STOCK → SOLD → WARRANTY` dan dapat kembali ke `SOLD`, `IN_STOCK`, atau `RETURNED` sesuai kejadian.
- Menyimpan relasi purchase, purchase return, sale, previous sale, refund, customer, soldAt, dan warranty dates.
- Hanya satu active warranty claim (`OPEN/PROCESSING`) per serial.
- Customer warranty claim baru hanya untuk unit yang masih terkait sale aktif; serial supplier/customer-returned tidak dapat membuka klaim pelanggan baru.
- RESOLVED/REJECTED menghitung ulang status serial sehingga tidak tertinggal sebagai WARRANTY.

## Analitik bisnis

- Inventory aging memakai **last valid sale** sebagai referensi utama agar restock baru tidak menyembunyikan dead stock lama.
- Menambahkan `daysSinceSale`, `neverSold`, velocity, sold-window quantity, coverage days, movement class, excess stock, dan clearance suggestion.
- Dashboard/laporan menampilkan fast/normal/slow/dead, dead stock 30/60/90+, excess capital, margin, dan receivable aging.

## UI / UX

- Sidebar desktop dikelompokkan: Ringkasan, Penjualan, Persediaan, Keuangan & Laporan, Operasional, Sistem.
- Bottom navigation mobile memprioritaskan Kasir, Transaksi, Produk; sheet “Lainnya” tidak lagi menduplikasi ketiganya.
- Grid “Lainnya” responsif 3 kolom HP dan 4 kolom layar lebih lebar.
- Penawaran dan Garansi/Serial mengikuti menu aktif tanpa stale shared-tab state.
- Purchase Order, laporan, stock opname, dan Business Tools disusun responsif untuk Android phone/tablet, Windows, dan Web.

## QRIS

- QRIS Adaptive v4 memprioritaskan `BarcodeDetector`, fallback ZXing, lalu safe crop.
- Preview disimpan sebagai simbol QR dengan white quiet-zone agar lebih pas dan mudah dipindai.
- **QRIS Mode Kasir tidak ditambahkan**.

## Security, cloud, dan sync

- Koleksi baru: `supplierPriceHistory`, `quotations`, `serialNumbers`, `warrantyClaims`.
- Backup validator dan default database shape mengenali koleksi baru.
- Firestore Rules tetap branch-scoped dan Spark-compatible.
- Kasir hanya dapat melakukan transisi serial sale/refund yang terkait sale/refund valid miliknya serta approval Manager/Owner untuk refund.
- Restore backup, reset cloud, stock mutation sensitif, modal override, dan below-cost flow dilindungi PIN.
- Tidak menggunakan Cloud Functions, Firebase Storage, atau Blaze.

## Build & CI

- Versi package/app/service worker/workflow menjadi 5.8.0.
- Artifact normal Android/Web/Windows memakai `retention-days: 1`; paket signing key sementara memakai 7 hari agar ada waktu aman untuk menyimpan backup lokal.
- Artifact upload normal `continue-on-error: true`, sehingga stale Actions storage quota tidak sendirian menggagalkan GitHub Release binary.
- Android release memverifikasi signature dan menghasilkan APK/AAB + SHA-256.
- Windows release menghasilkan EXE/MSI + SHA-256.

## Bug fixes hasil full audit

- Menambahkan HoldModal POS yang sebelumnya hilang.
- Memperbaiki JSX invalid Smart Restock Control Center.
- Memperbaiki urutan deklarasi `hasApproval`.
- Memperbaiki draft PO dead-end dan mutation guard PO partial.
- Memperbaiki aging semantics akibat restock baru.
- Memblokir conversion quotation kadaluarsa.
- Memperbaiki warranty REJECTED/RESOLVED serial state.
- Memperbaiki serial lifecycle pada receiving/retur/refund.
- Memperbaiki klasifikasi FULL refund.
- Memperbaiki refund kredit agar tidak meninggalkan piutang untuk barang yang dikembalikan.
- Memperbaiki reversal/restoration loyalty points saat refund.
- Memperbaiki mobile nav duplicate module.

## QA

- **161/161 automated tests PASS**.
- Static audit: **PASS**.
- JS/JSX parser: **PASS**.
- Workflow YAML + JSON: **PASS**.
