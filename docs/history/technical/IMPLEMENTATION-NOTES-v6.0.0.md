# Implementation Notes — Bumi Makmur POS v6.0.0

## Architectural decisions

### 1. AI is an accelerator, not a dependency
Alur produk dipisah menjadi signal collection → interpretation → human confirmation. Barcode/OCR lokal dikumpulkan terlebih dahulu. Gemini hanya memperkaya struktur data saat tersedia. Kegagalan AI tidak memblokir POS.

### 2. No AI secret in cloud data
`src/services/aiProductAssistant.js` menyimpan AI device settings pada local storage khusus perangkat. Data ini tidak menjadi bagian `db.configs`, mutation queue, Firestore, atau JSON backup operasional.

Keterbatasan keamanan: aplikasi client-side tidak dapat menjadikan API key sebagai secret server-side. Karena itu key hanya cocok untuk perangkat tepercaya dan tidak pernah ditanam ke source/repository.

### 3. Pure parsing and reporting logic
Business logic dipisah menjadi:
- `src/utils/aiProductParsing.js`: parser OCR dan matcher katalog yang bisa diuji tanpa browser.
- `src/utils/closingSummary.js`: kalkulasi closing yang bisa diuji tanpa UI/native runtime.
- services menangani I/O kamera, Gemini, PDF, share, dan native bridge.

### 4. Historical COGS/HPP snapshot
Saat checkout, setiap sale line menyimpan `costTotal` dan `costPerUnit` berdasarkan stock rows aktual. Laporan closing mengutamakan snapshot ini dan hanya memakai modal produk sebagai fallback untuk transaksi lama.

### 5. Refund and void accounting
- Sale berstatus `VOIDED` dikeluarkan dari penjualan shift.
- Refund bertipe `VOID` juga dikeluarkan agar tidak mengurangi omzet dua kali.
- Refund biasa mengurangi omzet.
- Bila `restock=true`, HPP barang yang kembali dikurangkan secara proporsional dari HPP shift.
- Payment breakdown mengurangi `payoutAmount`; pengurangan piutang tidak dianggap cash payout.

### 6. PDF without paid backend
PDF dibuat langsung dari summary di client, tidak diunggah ke Firebase Storage. Summary disimpan sebagai field additive pada dokumen shift sehingga PDF dapat diregenerasi kapan saja.

### 7. Android native enhancements
`prepare-android.mjs` menghasilkan plugin Capacitor yang menambahkan:
- native camera permission/biometric yang sudah ada;
- ML Kit text recognition;
- FileProvider cache-only untuk PDF share;
- direct intent ke WhatsApp/WhatsApp Business lalu fallback chooser.

## Compatibility
Tidak ada migrasi destruktif. Field baru di sale/shift bersifat optional sehingga data lama tetap dapat dibaca.
