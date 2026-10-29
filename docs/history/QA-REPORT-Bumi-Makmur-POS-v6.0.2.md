# QA Report — Bumi Makmur POS v6.0.2

## Scope
Professional Receipt & Cash Change Safety, seluruh regression suite v4.x–v6.x, Firebase Spark architecture, Web/PWA, Android preparation, Windows release configuration, AI Product Capture, Smart Receiving, Daily Closing, business suite, offline sync, product/stock/payment flows.

## Automated tests
- Total: **185**
- Passed: **185**
- Failed: **0**

Coverage khusus v6.0.2:
- Rp39.000 + Tunai Rp50.000 = Kembalian Rp11.000.
- Fallback transaksi lama tanpa `sale.change`.
- Non-cash overpayment bukan kembalian.
- Split payment dengan cash menghitung kembalian konsisten.
- Teks WhatsApp/Salin, print HTML, modal Kasir, Nota Online, Riwayat Transaksi memakai payment summary yang sama.
- Kembalian tetap dicetak walau setting rincian pembayaran disembunyikan.
- Renderer nota responsif dan preview Pengaturan memakai komponen receipt yang sama.

## Static audit
Dijalankan dengan `npm run audit:static`: relative imports, JSON, required files, paid-service guard, dan secret scan.

## Build gate
`npm run build` memerlukan dependencies (`node_modules`). Jika environment source-only tidak memiliki dependency, production bundle tidak diklaim lulus lokal. GitHub Actions tetap menjadi production build gate untuk Web, Android, dan Windows.
