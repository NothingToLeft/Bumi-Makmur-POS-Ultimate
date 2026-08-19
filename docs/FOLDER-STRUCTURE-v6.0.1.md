# Folder Structure — additions v6.0.1

```text
src/
├─ components/
│  └─ AIProductCaptureModal.jsx      # foto → review → apply product/receiving
├─ services/
│  ├─ aiProductAssistant.js          # image optimize, barcode, native OCR, Gemini
│  ├─ dailyClosingReport.js          # PDF + sharing
│  └─ nativeDevice.js                # Capacitor native OCR/PDF bridge
├─ utils/
│  ├─ aiProductParsing.js            # pure OCR parser + product matching
│  └─ closingSummary.js              # pure daily closing calculations
├─ screens/
│  ├─ ProductsScreen.jsx             # Foto Produk AI
│  ├─ PurchasesScreen.jsx            # Smart Receiving
│  ├─ ShiftFinanceScreens.jsx        # closing PDF / WhatsApp
│  └─ DeviceSettingsScreens.jsx      # AI & Otomasi
└─ store/
   └─ PosContext.jsx                 # HPP snapshot + persisted closing summary

scripts/
└─ prepare-android.mjs               # ML Kit + FileProvider + WhatsApp share intent

tests/
└─ v600-ai-daily-automation.test.mjs
```

## Aset branding v6.0.1
- `public/branding/bumi-makmur-2-master.png`
- `public/logo-bm.png`
- `public/logo-bm.svg`
- `public/icons/*`
- `build/icon.ico`
