# Data Model & Domain API — Bumi Makmur POS v5.8.0

Bumi Makmur POS does not use a custom REST backend. Application-domain commands live in `PosContext`; Firestore stores synchronized entity documents while IndexedDB/local queue provides offline-first behavior.

## Business Suite collections

### `purchaseOrders`

Important fields:

- `id`, `branchId`, `orderNo`
- `supplierId`, `supplierName`
- `status`: `DRAFT | ORDERED | PARTIAL | RECEIVED | CANCELLED`
- `items[]`: `productId`, `qty`, `unit`, `factor`, `baseQty`, `price`, `discount`, `receivedQty`, `receivedBaseQty`
- `expectedDate`, `notes`
- `subtotal`, `additional`, `discount`, `total`
- `receipts[]`: receipt/purchase references and timestamps
- created/updated/user metadata

### `supplierPriceHistory`

Append-style supplier price observation:

- branch/supplier/product identity
- purchase/receipt reference
- unit and conversion factor
- purchase unit price
- normalized base-unit cost
- timestamp/user

### `quotations`

- `id`, `branchId`, quotation number
- customer identity
- item snapshots with unit conversion/prices
- subtotal/discount/tax/total
- `validUntil`
- `status`: `DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED | CONVERTED`
- notes
- converted bill reference and audit metadata where applicable

### `serialNumbers`

Core fields:

- `id`, `branchId`, `serial`
- product identity
- `status`: `IN_STOCK | SOLD | WARRANTY | RETURNED`
- `purchaseId`
- `saleId`, `previousSaleId`
- `customerId`, `customerName`
- `soldAt`
- `warrantyMonths`, `warrantyStartAt`, `warrantyEndsAt`
- `lastRefundId`, `lastRefundAt`
- `lastPurchaseReturnId`, `returnedAt`
- created/updated metadata

### `warrantyClaims`

- `id`, `branchId`
- serial/product/customer identity
- issue/notes
- `status`: `OPEN | PROCESSING | RESOLVED | REJECTED`
- resolution
- created/updated/user metadata

## Existing entities extended by v5.8

### `products`

Relevant fields include:

- base stock and HPP/modal
- retail/wholesale/project price structures
- base unit, conversions, quantity step/fractional rules
- variant/shared-barcode/specification metadata
- bundle/component definition
- `serialTracking`
- `warrantyMonths`

### `purchases`

Receipt line may include:

- base-unit conversion snapshot
- cost snapshot
- `serialIds[]` for serials captured during receiving

`returns[]` line data may also include `serialIds[]` for supplier-returned serial units.

### `sales`

Sale snapshot additionally participates in:

- `refundedTotal`
- `pointsEarned`, `pointsRedeemed`
- `pointsEarnedReversed`, `pointsRedeemedRestored`
- line-level `serialIds[]`

### `refunds`

Important v5.8 fields:

- `items[]` including optional `serialIds[]`
- gross `amount`
- `receivableReduction`
- actual `payoutAmount`
- `pointsEarnedReversed`
- `pointsRedeemedRestored`
- restock flag, method, reason, approval/user metadata
- `type`: `PARTIAL | FULL | VOID`

### `receivables`

- original/current total
- paid/balance/status
- payment history
- `refundAdjustments[]`: `refundId`, amount, timestamp

Refund adjustment decreases the outstanding obligation before any payout is issued.

### `stockMovements`

Inventory ledger carrying product, quantity delta, movement type, reference ID, reason/note, time, and actor.

### `stockOpnames`

Physical count snapshot, system quantity, variance, reason, and audit metadata.

## Domain commands — v5.8

### Purchasing

- `savePurchaseOrder(payload)`
- `receivePurchaseOrder(payload)`
- `savePurchase(payload)`
- `returnPurchase(payload)`

### Sales / open bill / refund

- `completeSale(payload)`
- `holdSale(payload)` / existing Open Bill flow
- `refundSale(payload)`

### Quotation

- `saveQuotation(payload)`
- `convertQuotationToBill(quotationId)`

### Serial & warranty

- `saveSerialNumber(payload)`
- `saveWarrantyClaim(payload)`

Internal receiving/refund/return helpers enforce serial counts and lifecycle consistency.

### Inventory

- product create/update/archive/delete existing commands
- stock adjustment
- stock opname
- branch transfer
- bundle stock resolution

### Finance

- receivable payment
- payable payment
- expense/cash/shift flows
- refund/receivable integration

### Backup & sync

- backup export/inspection/import
- durable local queue
- explicit sync/reconnect retry

All mutations continue through the shared domain commit boundary so permission, local snapshot, audit context, idempotency metadata, and cloud synchronization stay consistent.

## Cloud compatibility

The data model is Firestore Spark-compatible and requires no Cloud Functions or Firebase Storage. New arrays/fields are optional/default-normalized so old backups and caches can be migrated without destructive reset.
