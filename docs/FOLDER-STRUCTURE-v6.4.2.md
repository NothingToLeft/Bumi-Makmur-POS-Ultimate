# Struktur utama Bumi Makmur POS v6.4.2

- `src/screens/`: POS, transaksi, produk, pengaturan, dashboard, laporan, dll.
- `src/components/`: CommandPalette, SalesInsightsPanel, CashCounter, UI reusable.
- `src/store/PosContext.jsx`: state, mutasi data, business guards, offline-first orchestration.
- `src/services/`: Firebase/cloud/offline, Gemini image handling, QRIS assurance.
- `src/utils/`: business logic murni, inventaris, refunds, qrisSessionGuard, approvalTickets, csvExport.
- `tests/`: regresi dan unit behavior tests.
- `.github/workflows/`: web/Android/Windows/Firebase jobs.
- `firestore.rules` & `firestore.indexes.json`: unchanged v6.4.0 ruleset.
- `electron/`, `public/`: desktop and PWA.
