# Folder Structure v6.0.2 — Delta

```text
src/
├── components/
│   └── ReceiptDocument.jsx      # renderer nota profesional bersama
├── screens/
│   ├── POSScreen.jsx            # modal receipt + cash change guard
│   ├── PublicReceiptScreen.jsx  # nota online menggunakan ReceiptDocument
│   ├── TransactionsScreen.jsx   # detail transaksi/payment summary
│   └── DeviceSettingsScreens.jsx# preview nota menggunakan ReceiptDocument
└── services/
    └── receiptShare.js          # payment summary, WA/copy/share, image & print renderer

tests/
└── v602-receipt-cash-change.test.mjs
```
