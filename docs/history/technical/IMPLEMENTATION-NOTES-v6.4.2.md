# Implementation Notes v6.4.2

- `src/utils/saleLines.js`: shared per-line refund remaining quantity, digunakan `TransactionsScreen`.
- `src/utils/qrisSessionGuard.js`: pure QRIS checkout session validation; `completeSale` memeriksa terhadap transaksi lokal sebelum stok diubah.
- `src/utils/approvalTickets.js`: Map dalam memori yang membuat tiket 3 menit, purpose/user-bound dan once-per-action; `PosContext` menolak tiket asing lalu membuang tiket sesudah sukses. Tidak disimpan ke Firestore sebagai sumber kebenaran.
- `src/utils/csvExport.js`: deteksi formula dengan whitespace/zero-width prefix.
- `src/utils/inventoryImport.js`: max 10MB guard sebelum parsing CSV/XLS/XLSX.
- Versi: `package.json`, `src/data/defaults.js`, `VERSION.txt`, `public/sw.js`, dan audit/test guards.

Tidak ada migrasi schema. Identitas kunci database lama (`DB_KEY`) tetap sama agar data dapat dibuka tanpa reset.
