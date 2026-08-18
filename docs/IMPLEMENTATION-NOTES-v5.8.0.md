# Implementation Notes — Bumi Makmur POS v5.8.0

## 1. Architectural decision

v5.8.0 **extends** the existing v5.7 architecture; it does not rewrite the application. This protects production data and keeps the offline-first/cloud-sync behavior that already exists.

Core boundaries remain:

- `src/store/PosContext.jsx` — domain command/transaction boundary.
- `src/services/offlineStore.js` — local durable snapshot/queue.
- `src/services/syncEngine.js` — entity diff, mutation queue, conflict rebase.
- `src/services/cloudStore.js` — Firestore transaction/idempotency boundary.
- `src/utils/*` — reusable pure business logic.
- `src/screens/*` — presentation/orchestration only; screens do not directly own Firestore logic.

## 2. Offline-first consistency

All domain mutations continue through `commit()` so local UI is usable while offline. Cloud persistence is asynchronous and the mutation queue survives restart.

New synchronized entities:

- `supplierPriceHistory`
- `quotations`
- `serialNumbers`
- `warrantyClaims`

Old local caches/backups remain readable because normalization supplies empty arrays for fields introduced in v5.8.

## 3. Inventory source of truth

Product `stock` is the current cached quantity, while `stockMovements` remains the traceable stock ledger. New flows create movements with source/reference IDs instead of silently changing stock.

Relevant sources include sale, purchase receipt, refund/void restock, adjustment/opname, transfer, and return flows. Bundles resolve stock against their component products.

## 4. Multi-unit, variants, and bundles

The existing base-unit model is retained:

- one base stock quantity per SKU;
- conversion factor maps pack/box/dus/roll/etc. into base units;
- quantity step supports meter/kg/liter and other fractional goods;
- each selling unit can keep separate retail/wholesale/project prices;
- variants remain operational SKUs with their own stock/price/cost;
- bundles consume component stock, not duplicated bundle stock.

Serial-tracked products are constrained to whole base units.

## 5. Smart Restock & inventory aging

`src/utils/businessInsights.js` centralizes reusable analytics.

### Smart Restock

Inputs include:

- recent valid sales velocity;
- current stock/minimum stock;
- lead time and safety-stock period;
- quantities in `ORDERED/PARTIAL` PO as real incoming;
- quantities in `DRAFT` PO as planned draft;
- latest supplier price per supplier/product.

Draft quantities suppress duplicate suggestions but are displayed separately from actual ordered incoming quantities.

### Inventory aging

The last valid **sale** is the primary inactivity signal. Positive inbound/restock is only a fallback for products that have never sold. This prevents a newly restocked dead item from falsely becoming “active”.

Derived fields include movement class, days since sale, velocity, coverage, dead-stock bucket, excess stock, and clearance suggestion.

## 6. Purchase Order lifecycle

Allowed transitions are intentionally explicit:

- `DRAFT → DRAFT | ORDERED | CANCELLED`
- `ORDERED → ORDERED | CANCELLED`
- `PARTIAL → PARTIAL | CANCELLED`
- `RECEIVED` locked
- `CANCELLED` locked

PO creation does **not** change stock.

`receivePurchaseOrder()` only accepts `ORDERED` or `PARTIAL`. Partial receipts update cumulative received quantities; a partial PO cannot mutate product/qty/unit/factor/price history. Every receipt creates real purchase/stock/payable/supplier-price-history data only for physically received goods.

## 7. Serial lifecycle

Optional serial capture is supported during receiving for backward compatibility. When serial text is supplied for a serial-tracked line:

- separators newline/comma/semicolon are normalized;
- serials are uppercased/trimmed;
- duplicates are rejected;
- exact serial count must equal received base units;
- serial must be unique within active branch data.

Lifecycle:

- Receipt: `IN_STOCK`
- Sale: `SOLD`
- Active warranty: `WARRANTY`
- Refund with restock: `IN_STOCK`
- Refund without restock: `RETURNED`
- Supplier return: `RETURNED`
- Resolved/rejected warranty: recompute to `SOLD`, `RETURNED`, or `IN_STOCK` depending on remaining relations.

Purchase return and customer refund require exact serial selection to prevent physical stock and serial state from diverging.

## 8. Warranty claims

Only one active (`OPEN`/`PROCESSING`) claim may exist per serial. A new customer claim requires a serial still associated with an active sold unit. A supplier/customer-returned serial cannot start a new customer warranty claim.

Closing a claim (`RESOLVED`/`REJECTED`) recalculates serial status rather than unconditionally leaving `WARRANTY`.

## 9. Quotation lifecycle

Quotation statuses:

`DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED`.

The domain recomputes expiry from `validUntil`. Conversion is blocked for rejected/expired/converted quotations. The UI also computes an effective expiry so stale stored status cannot accidentally show a convert action.

Conversion produces an Open Bill for final POS review; quotation itself does not reserve/decrease stock.

Print/Save PDF uses local browser/Electron print flow and therefore requires no paid server.

## 10. Refund, receivable, and loyalty consistency

Refund amount uses the original sale allocation and cumulative quantity validation.

For credit/bon sales:

1. refund reduces open receivable balance first;
2. the receivable total is reduced without dropping below already-paid amount;
3. only the remaining refund becomes `payoutAmount`;
4. cash movement uses `payoutAmount`, not the gross refund amount.

Loyalty correction is cumulative:

- earned points are reversed according to cumulative refund ratio;
- redeemed points are restored according to the same ratio;
- full refund reverses/restores the entire original point effect;
- customer points cannot underflow below zero.

## 11. PIN/security model

Sensitive operations reuse offline Owner/Manager PIN approval rather than introducing another auth system. Coverage includes high discount/refund, below-cost sale, cost override, stock adjustment/opname/reset, destructive product actions, backup restore, and cloud reset.

Firestore Rules remain the final cloud authorization boundary.

For Cashier serial transitions:

- `IN_STOCK → SOLD` must be tied to a valid sale created by that cashier in the same branch.
- `SOLD → IN_STOCK/RETURNED` must be tied to an approved refund created by that cashier, with Manager/Owner approver verification.
- master serial edits are not opened to Cashier.

## 12. QRIS QR-only preview

This is **not** QRIS Mode Kasir.

The uploaded official QRIS image is processed locally:

1. `BarcodeDetector` when available;
2. bundled ZXing QR reader as fallback;
3. safe content crop as final fallback.

Detected QR is normalized to square content and given a white quiet zone so the preview contains only the useful QR area.

## 13. Navigation/UI decision

Desktop navigation is grouped by business task instead of adding an ever-growing flat sidebar. Mobile keeps the three highest-frequency modules in bottom navigation and moves secondary modules into “Lainnya”; modules already in bottom navigation are excluded from that sheet.

This preserves discoverability without removing any feature.

## 14. Build/release resilience

Normal Android/Web/Windows Actions artifacts use one-day retention. Upload-artifact is non-blocking (`continue-on-error`) so a stale Actions storage quota does not, by itself, stop publishing APK/AAB/EXE/MSI to GitHub Releases.

The signing key is intentionally treated separately and must be backed up permanently outside ephemeral Actions artifacts.

## 15. Compatibility/migration

No destructive database reset is required. New fields are optional/default-normalized. Existing product, transaction, supplier, customer, branch, stock, and historical records remain valid. Production upgrade should still follow backup → queue=0 → source push → rules deploy → workflow test-only → release build → hardware smoke test.
