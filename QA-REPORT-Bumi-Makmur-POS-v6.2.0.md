# QA Report — Bumi Makmur POS v6.2.0

**Release:** Data Integrity & Professional Operations  
**Validated:** 20 Agustus 2026  
**Baseline:** v6.1.1 Sync Transaction Hardening

## Hasil akhir

- Core regression suite: **235 / 235 PASS**
- Fail: **0**
- Skip: **0**
- Static project audit: **PASS**
- TypeScript parser seluruh source JS/JSX/MJS: **PASS (0 diagnostics)**
- JavaScript/MJS/CJS syntax checks yang dapat dijalankan tanpa dependency: **PASS**
- GitHub Actions YAML parse: **4 / 4 PASS**
- Electron `main.cjs`: **PASS**
- Electron `preload.cjs`: **PASS**
- JSON project files: **PASS**
- Relative import audit: **PASS**
- Required-file audit: **PASS**
- Firebase Spark-only guard: **PASS**
- Secret scan: **PASS**
- Gemini API key yang pernah dipakai pengguna: **tidak ditemukan di source**
- Firebase Storage / Cloud Functions runtime dependency: **tidak ditemukan**

## Area yang diuji

### Data integrity & chronological ordering
- transaksi pada tanggal yang sama diurutkan berdasarkan timestamp nyata;
- fallback timestamp menangani ISO string, epoch seconds, epoch milliseconds, JavaScript `Date`, Firebase `Timestamp`, dan serialized Firestore timestamp;
- urutan deterministik diterapkan setelah cache lokal, bootstrap cloud, realtime snapshot, dan local commit;
- dashboard terbaru, transaksi, shift, stok, pembelian, PO, quotation, warranty, serial, kas, supplier history, dan audit tetap konsisten setelah sync.

### Kasir & transaksi
- pelanggan default selalu `Pelanggan Umum`, bukan `customers[0]` dari snapshot cloud;
- Tunai Rp50.000 untuk total Rp39.000 menyimpan/menampilkan kembalian Rp11.000 tetapi laporan kas mencatat penerimaan bersih Rp39.000;
- QRIS/transfer tidak dianggap menghasilkan kembalian tunai;
- refund mengurangi breakdown pembayaran secara benar;
- `VOID` dan `VOIDED` tidak masuk omzet operasional;
- receipt, reprint, share, transaksi lama, dan status pembayaran tetap kompatibel.

### Cloud & offline-first
- Unified AutoSync v6.1.x tetap dipertahankan;
- create operation tidak melakukan pre-read target yang belum ada;
- update/delete tetap conflict-aware;
- queue offline dan idempotency receipt tetap aktif;
- data bisnis cloud tetap Firebase Auth + Firestore Spark;
- PDF dan secret Gemini API key tetap lokal.

### Produk, stok & pembelian
- produk induk dapat dimulai dari satu varian;
- barcode/SKU, multi-unit, stock movement, opname, transfer, PO/partial receiving, supplier history, bundle, serial/warranty tetap dipertahankan;
- timestamp dan sorting history aman terhadap data Firestore/legacy.

### AI & perangkat
- AI Product Assistant/Gemini setting non-secret tetap kompatibel;
- secret key tidak masuk Firestore/source;
- Customer Display Web/Electron bridge tetap tersedia;
- PWA/Cloudflare Pages headers/redirects tetap tersedia;
- Android Capacitor/ML Kit preparation dan Windows Electron workflow tidak dihapus.

### Daily Closing
- HPP snapshot/refund tetap dihitung;
- payment breakdown menggunakan uang bersih yang ditahan toko;
- PDF A4 menggunakan branding resmi Bumi Makmur 2;
- nama file menggunakan tanggal lokal;
- PDF dibuat lokal/on-demand dan tidak diunggah ke Firebase Storage.

## Production build gate

`npm install` sudah dicoba pada container audit, tetapi DNS/akses ke `registry.npmjs.org` tidak tersedia sehingga dependency tidak dapat diunduh. Karena itu environment lokal ini **tidak mengklaim Vite/Android/Electron production binary berhasil dibangun**.

Final compilation gate tetap:
1. Cloudflare Pages `npm run build`;
2. GitHub Actions `Build Bumi Makmur POS v6.2.0` mode `test-only`;
3. Android/Windows release workflow bila binary baru diperlukan.

Tidak ada alasan untuk menjalankan `npm audit fix --force` secara otomatis karena dapat mengubah dependency secara destruktif tanpa regression review.

## Smoke test produksi yang wajib

Setelah CI hijau:
1. login Owner dan Karyawan;
2. transaksi Tunai dengan kembalian;
3. QRIS;
4. transaksi → histori harus terbaru di atas;
5. refund/void;
6. tambah/edit produk, satu varian, pack/pcs;
7. stok masuk/opname/transfer;
8. Customer Display;
9. AI Foto Produk;
10. Tutup Shift → PDF → share WhatsApp;
11. offline sale → online reconnect → queue kembali 0;
12. buka ulang Web/PWA/Windows untuk memastikan urutan tetap sama setelah reload.
