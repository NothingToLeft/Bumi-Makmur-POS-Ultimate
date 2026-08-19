# Changelog — Bumi Makmur POS v6.0.2

## Fixed
- Memperbaiki struk tunai yang tidak menampilkan kembalian setelah nominal uang diterima lebih besar dari total.
- Memperbaiki fallback untuk transaksi lama tanpa field `change`.
- Memastikan overpayment non-tunai tidak dianggap kembalian.
- Memastikan uang masuk shift = tunai diterima dikurangi kembalian.
- Memperbaiki modal nota agar tidak terpotong/overflow pada layar sempit dan daftar item panjang.

## Improved
- Redesign struk dengan hierarchy: identitas → rincian belanja → total → pembayaran → kembalian → footer.
- Brand Bumi Makmur 2 merah–hitam diterapkan lebih konsisten pada struk.
- Kembalian diberi kotak high-contrast dan angka besar untuk mencegah kesalahan kasir.
- Preview Nota Pengaturan memakai renderer yang sama dengan nota aktual.
- Nota Online memakai renderer yang sama dengan nota Kasir.
- Teks WhatsApp/Salin dan print thermal menulis `Tunai diterima` secara eksplisit.

## Technical
- Menambahkan `src/components/ReceiptDocument.jsx`.
- Menambahkan `getReceiptPaymentSummary()` dan `receiptPaymentLabel()` sebagai kalkulasi pembayaran terpusat.
- Menambahkan regression suite `tests/v602-receipt-cash-change.test.mjs`.
- Tetap Firebase Spark-only; tidak ada Cloud Functions atau Storage.
