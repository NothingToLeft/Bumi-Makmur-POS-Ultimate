# Folder Structure — Bumi Makmur POS v5.8.0

```text
Bumi-Makmur-POS/
├── .github/workflows/
│   ├── build-android.yml            # tests/web/APK/AAB/GitHub Release
│   ├── build-windows.yml            # tests/EXE/MSI/GitHub Release
│   ├── deploy-firebase.yml          # Firestore Spark rules/indexes
│   └── generate-signing-key.yml     # one-time signing helper
├── build/                            # Electron icons/resources
├── docs/
│   ├── IMPLEMENTATION-NOTES-v5.8.0.md
│   ├── DATA-MODEL-v5.8.0.md
│   ├── FOLDER-STRUCTURE-v5.8.0.md
│   └── ...
├── electron/
│   ├── main.cjs
│   └── preload.cjs
├── public/                           # PWA assets, manifest/service-worker/static hosting files
├── scripts/
│   ├── audit-project.mjs
│   └── prepare-android.mjs
├── src/
│   ├── components/                   # shared UI/scanner/product picker/import/etc.
│   ├── data/
│   │   └── defaults.js               # version, roles, modules, normalized DB shape
│   ├── screens/
│   │   ├── POSScreen.jsx
│   │   ├── ProductsScreen.jsx
│   │   ├── PurchasesScreen.jsx
│   │   ├── BusinessToolsScreen.jsx   # quotation + serial/warranty
│   │   ├── ControlCenterScreen.jsx   # Smart Restock/operational insights
│   │   ├── ReportsScreen.jsx
│   │   ├── TransactionsScreen.jsx
│   │   └── ...
│   ├── services/
│   │   ├── firebase.js
│   │   ├── cloudAuth.js
│   │   ├── cloudStore.js
│   │   ├── offlineStore.js
│   │   ├── syncEngine.js
│   │   └── nativeDevice.js
│   ├── store/
│   │   └── PosContext.jsx            # domain command + mutation boundary
│   └── utils/
│       ├── businessInsights.js       # restock/aging/quotation calculations
│       ├── fractionalUnits.js
│       ├── accounting.js
│       ├── assetProcessing.js        # QRIS QR-only processing
│       ├── backupValidation.js
│       └── ...
├── tests/                             # Node core/regression tests (161 in final audit)
├── firestore.rules
├── firestore.indexes.json
├── capacitor.config.json
├── package.json
├── README.md
├── CHANGELOG.md
├── VERSION.txt
└── QA-REPORT-Bumi-Makmur-POS-v5.8.0.md
```

## Organization rules

- Business logic shared by screens belongs in `store`, `services`, or pure `utils`, not duplicated in UI components.
- Screens do not call Firestore directly; they invoke domain commands.
- Shared barcode scanner is reused across POS, Product, Picker, Opname, receiving, and diagnostics where relevant.
- Native behavior is isolated behind Capacitor/Electron boundaries so Web/PWA continues working.
- Every inventory mutation must preserve stock-ledger traceability.
- New cloud entities must be added consistently to defaults, backup validation, sync collection lists, rules, and regression tests.
