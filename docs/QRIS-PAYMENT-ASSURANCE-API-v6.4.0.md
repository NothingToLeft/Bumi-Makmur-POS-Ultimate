# QRIS Payment Assurance API — v6.4.0

## `src/utils/qrisDynamic.js`

### `parseQrisTlvStrict(payload)`
Strict UTF-8 byte-aware TLV parser. Throws on empty, oversized, truncated, malformed length/tag, or trailing data.

### `validateQrisPayload(payload, options)`
Returns `{ valid, errors, warnings, data, elements }`. Supports `requireStatic`, IDR and Indonesia checks. Validates CRC and required merchant fields.

### `createDynamicQrisPayload(staticPayload, amount)`
Validates source first, converts tag 01 to dynamic, injects tag 54, strips managed fee/CRC fields, recalculates CRC, then validates generated output again.

### `normalizeQrisAmount(value)`
Requires safe integer Rp1–Rp10.000.000.

## `src/services/qrisPaymentAssurance.js`

### `isQrisPayment(payment)`
Identifies QRIS through method/brand.

### `resolveQrisPresentation(payment, profile, configs)`
Returns presentation model. Prefers local dynamic generation only when branch profile is enabled + acknowledged; otherwise returns static/physical mode. Generator failure produces static fallback rather than silently changing merchant data.

### `validateQrisPaymentAmount(value)`
Payment-layer range validation with split-payment guidance.

### `buildQrisAssuranceRecord(payment, presentation, context)`
Builds compact audit metadata without QR payload. Manual merchant-notification confirmation is always marked required until an official PJP/acquirer settlement adapter exists.

### `sanitizePaymentForSale(payment, presentation, context)`
Removes UI-only QRIS session/confirmation helper fields and attaches `qrisAssurance` for persistence.

## Customer Display snapshot extension

Optional field:

```text
payment: {
  active,
  methodId,
  methodName,
  mode,
  amount,
  merchantName,
  instruction,
  warning,
  qrisPayload,
  confirmed
}
```

Only dynamic payload text may be placed in this transient display snapshot; sale history does not persist it.
