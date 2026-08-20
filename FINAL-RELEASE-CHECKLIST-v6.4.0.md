# Final Release Checklist — Bumi Makmur POS v6.4.0
## QRIS Dynamic & Payment Assurance

## QRIS Core

- [x] Strict UTF-8 byte-aware TLV parser
- [x] Malformed/truncated/trailing payload rejection
- [x] Duplicate root-tag rejection
- [x] CRC16 validation before conversion
- [x] Static source validation
- [x] Local static → dynamic generation
- [x] Exact amount tag injection
- [x] Strict integer amount parser; scientific notation rejected
- [x] CRC recalculation + post-generation validation
- [x] Merchant/account fields retained
- [x] Convenience-fee tags removed
- [x] No external QRIS converter API
- [x] QRIS amount Rp1–Rp10.000.000 per payment line

## Kasir / Payment Assurance

- [x] QRIS statis lama tetap tersedia
- [x] Dynamic mode opt-in per branch
- [x] Source payload test + acknowledgement before enable
- [x] Static/physical fallback
- [x] Split QRIS exact line amount
- [x] Merchant-notification confirmation **always required**
- [x] Confirmation cannot be disabled without official PJP adapter
- [x] Audit user + timestamp + branch + session
- [x] Current cashier binding on completeSale
- [x] Payment Assurance metadata stored
- [x] Dynamic/full QR payload not stored in sale history
- [x] Stable checkout ID / duplicate guard
- [x] Customer Display dynamic QR + payment state
- [x] Transaction Detail QRIS audit card
- [x] Receipt differentiates QRIS Dynamic without payload

## Firestore Spark

- [x] Rules marker **v6.4.0**
- [x] branchPaymentProfiles allows QRIS v6.4 fields
- [x] QRIS payload size/type guards
- [x] Dynamic enable requires payload + acknowledgement + confirmation
- [x] Confirmation flag cannot be false when supplied
- [x] Owner/Manager branch scoping retained
- [x] Index exemption `branchPaymentProfiles.qrisImage`
- [x] Index exemption `branchPaymentProfiles.qrisPayload`
- [x] No Firebase Functions runtime
- [x] No Firebase Storage
- [x] No Blaze requirement
- [x] No destructive Firestore migration

## Deliberate exclusions

- [x] No Puppeteer/Playwright merchant scraping
- [x] No OTP/session interception
- [x] No unofficial GoBiz/QFM automation
- [x] No external converter dependency
- [x] No mock QRIS
- [x] No random amount suffix without official mutation feed
- [x] No fake automatic settlement claim
- [x] No QRIS customer surcharge

## Local release gates

- [x] Automated regression **263/263 PASS**
- [x] Static audit PASS
- [x] Independent JS/JSX transpile **78 files / 0 errors**
- [x] Electron syntax PASS
- [x] Cloudflare Function syntax PASS
- [x] JSON **4/4 PASS**
- [x] Workflow YAML **4/4 PASS**
- [x] Spark-only/security/secret guard PASS
- [x] FILE-MANIFEST SHA-256 final — 323 source files
- [x] ZIP integrity final
- [x] Local Vite limitation recorded: npm registry timeout; CI is final compile gate

## Production gates after upload

- [ ] Deploy Firebase Spark Rules/Indexes **v6.4.0 green — mandatory**
- [ ] GitHub Actions `test-only` v6.4.0 green
- [ ] Cloudflare Pages v6.4.0 green
- [ ] Android physical QRIS smoke test
- [ ] Windows QRIS/Customer Display smoke test
- [ ] Real merchant notification test
- [ ] Cloud queue returns to zero

## Production activation per branch

1. Backup JSON dan pastikan pending queue aman.
2. Deploy Firestore Rules/Indexes v6.4.0.
3. Buka Pengaturan QRIS cabang.
4. Decode/masukkan payload QRIS statis merchant.
5. Pastikan merchant, CRC, IDR, country, dan source validation PASS.
6. Generate QR dinamis nominal uji kecil.
7. Scan menggunakan aplikasi pembayaran resmi; cocokkan merchant + nominal sebelum membayar.
8. Lakukan transaksi uji nyata dan pastikan notifikasi merchant masuk.
9. Centang acknowledgement lalu enable QRIS Dinamis.
10. Uji fallback statis, split payment, Customer Display, receipt, audit transaksi, refund/void, offline→reconnect.
