# Folder Structure — Bumi Makmur POS v6.4.0

```text
src/
  utils/
    qrisDynamic.js                  # strict TLV/CRC/source validation + local dynamic generator
  services/
    qrisPaymentAssurance.js         # presentation, confirmation audit, payment sanitization
    qrisImageDecoder.js             # read/validate static payload from uploaded QR image
    receiptShare.js                 # QRIS dynamic receipt label without storing/printing payload
  components/
    QrisCode.jsx                    # local QR rendering
  screens/
    POSScreen.jsx                   # split-aware QRIS payment UX + confirmation + checkout idempotency
    DesktopCustomerDisplayScreen.jsx # dynamic QR/payment state on second monitor
    DeviceSettingsScreens.jsx       # per-branch source validation/test/opt-in policy
    TransactionsScreen.jsx          # QRIS assurance audit view
  store/
    PosContext.jsx                  # profile persistence + completeSale defense-in-depth

tests/
  v640-qris-dynamic-payment-assurance.test.mjs

docs/
  QRIS-SOURCE-AUDIT-v6.4.0.md
  IMPLEMENTATION-NOTES-v6.4.0.md
  QRIS-PAYMENT-ASSURANCE-API-v6.4.0.md
  FOLDER-STRUCTURE-v6.4.0.md

THIRD-PARTY-NOTICES.md
CHANGELOG-Bumi-Makmur-POS-v6.4.0.md
RELEASE-NOTES-Bumi-Makmur-POS-v6.4.0.md
QA-REPORT-Bumi-Makmur-POS-v6.4.0.md
BUILD-REPORT-Bumi-Makmur-POS-v6.4.0.md
FINAL-RELEASE-CHECKLIST-v6.4.0.md
```
