# Final Release Checklist — Bumi Makmur POS v6.3.0

## Functional

- [x] Barcode pabrik per varian
- [x] Barcode internal per varian
- [x] Multi-barcode supplier/package/alternate
- [x] Package factor / unit support
- [x] Shared barcode remains optional fallback
- [x] Direct variant barcode priority
- [x] Mass barcode print Internal / Factory / Auto
- [x] Valid EAN-13 rendered as native EAN-13
- [x] Import shared-barcode identity bug prevented
- [x] Direct-vs-shared collision prevented
- [x] Parent/variant Cashier photo input
- [x] Camera / gallery photo input
- [x] AI capture photo reuse
- [x] Gemini + Google Search candidate search
- [x] Manual input remains available
- [x] Cashier photo fallback variant → group → placeholder
- [x] Photo excluded from receipt/report/PDF/history
- [x] Thumbnail compression and hard size cap
- [x] Group image Firestore deduplication

## Security / Firebase Spark

- [x] No Firebase Functions
- [x] No Firebase Storage
- [x] No Blaze requirement
- [x] Gemini API key remains local
- [x] Cloudflare helper does not receive Gemini key
- [x] Cloudflare helper SSRF/private-network guard
- [x] Redirect validation
- [x] MIME and image size validation
- [x] Selected image re-verified against source page
- [x] Firestore photo index exemptions
- [x] PDF stays local

## Release gates

- [x] Automated regression tests: 249/249
- [x] Static audit final
- [x] JS/JSX transpile validation final
- [x] JSON/YAML validation final
- [x] Electron syntax final
- [x] Secret scan final
- [x] ZIP integrity final
- [x] Production build gate documented as CI-only because npm registry timed out locally

## Deployment after upload

1. Upload v6.3.0 source to GitHub.
2. Cloudflare Pages build must finish green.
3. Run `Actions → Deploy Firebase Spark Rules` once. Rules marker remains v6.1.0, but this deploy applies v6.3.0 Firestore index exemptions.
4. Validate Owner and employee login, one sale, one barcode scan, and one product photo on production.
5. Confirm cloud queue returns to zero.
