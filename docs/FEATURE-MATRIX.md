# Feature Matrix — Bumi Makmur POS FreeSync v6.0.0

| Area | Implementasi | Status |
|---|---|---|
| AI Product Capture | Foto produk → barcode/OCR lokal → parser → Gemini opsional → preview wajib → isi form | v6.0 |
| Duplicate Guard | Barcode exact + text similarity memberi warning sebelum produk baru dibuat | v6.0 |
| Smart Receiving | Foto/scan mencocokkan barang existing dan conversion pack untuk pembelian | v6.0 |
| HPP Snapshot Historis | `costTotal`/`costPerUnit` disimpan pada sale line termasuk bundle component cost | v6.0 |
| Closing Snapshot | Ringkasan shift persisted pada shift saat ditutup | v6.0 |
| Daily Closing PDF | PDF client-side berisi omzet, refund/void, pembayaran, HPP, laba, kas, selisih, expense, piutang | v6.0 |
| WhatsApp Share | Android target WhatsApp/Business + share-sheet fallback; Web/Windows share/download fallback | v6.0 |
| OCR Android | ML Kit Text Recognition melalui custom Capacitor plugin | v6.0 |
| Smart Restock | Velocity 30 hari, min stock, lead time, safety stock, outstanding PO, supplier price | v5.8 |
| Draft PO Otomatis | Restock suggestion dikelompokkan per pemasok | v5.8 |
| Purchase Order | DRAFT/ORDERED/PARTIAL/RECEIVED/CANCELLED + partial receiving | v5.8 |
| Harga Pemasok | Riwayat harga per supplier/product + normalized base cost | v5.8 |
| Penawaran | Quotation, masa berlaku, diskon/pajak, print/Save PDF, convert Open Bill | v5.8 |
| Serial & Garansi | Serial per unit, warranty period, sale linkage, claim history | v5.8 |
| Stock Opname Scanner | Scan barcode, physical count, variance, alasan per item | v5.8 |
| Inventory Aging | 30/60/90+, dead stock, modal tertahan, margin/restock priority | v5.8 |
| Piutang Aging | Current, 1-30, 31-60, 61-90, 90+ | v5.8 |
| PIN Sensitif | Below-cost sale, cost override, stock actions, restore/reset | v5.8 |
| QRIS | QR-only auto detection/crop + per-branch profile; tanpa QRIS Mode Kasir | v5.8 |
| Produk Varian | Produk induk, SKU per varian, shared barcode, stok/harga/HPP terpisah | Aktif |
| Unit Bertingkat | pcs/pack/dus/roll/meter/kg/liter + harga per unit | Aktif |
| Bundle | Paket mengurangi stok komponen | Aktif |
| Login Karyawan | Cabang + nama + PIN, cache offline | Aktif |
| Produk & Stok | Stok awal, barcode, rak, minimum, movement, opname, transfer | Aktif |
| Penjualan Pecahan | Fractional base unit dan conversion packaging | Aktif |
| Barcode Scanner | ZXing multi-format, kamera depan/belakang, foto, USB/Bluetooth | Aktif |
| Kasir | Open Bill, split payment, diskon, loyalty, tax/service, serial selection | Aktif |
| Pembayaran | Tunai, QRIS, e-wallet, transfer, kartu, tempo, split | Aktif |
| Piutang/Hutang | Cicilan, jatuh tempo, payment history, laporan | Aktif |
| Shift | Modal awal, cash movement, expected cash, closing | Aktif |
| Multi-cabang | Scope branch, Owner switch, Manager satu cabang | Aktif |
| Offline | IndexedDB, local snapshot, PIN offline, durable mutation queue | Aktif |
| Auto-sync | Realtime listener, retry, conflict rebase, idempotent receipt | Aktif |
| Cloud gratis | Firebase Auth + Firestore Spark; tanpa Functions/Storage/Blaze | Aktif |
| Backup | Export JSON, preview/validation, Owner PIN restore | Aktif |
| Android | Capacitor APK/AAB | Workflow siap |
| Windows | Electron EXE/MSI | Workflow siap |
| Web/PWA | Cloudflare Pages `bumi-makmur.my.id`, service worker, installable PWA | Aktif |
