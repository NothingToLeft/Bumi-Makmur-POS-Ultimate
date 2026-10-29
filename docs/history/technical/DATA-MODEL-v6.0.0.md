# Data Model Additions — v6.0.0

v6 tidak menambah koleksi Firestore wajib. Semua penambahan bersifat additive pada koleksi existing.

## `sales[].items[]`
Field baru untuk transaksi v6:

```text
costTotal: number       // total HPP snapshot untuk baris transaksi
costPerUnit: number     // HPP per satuan jual pada saat transaksi
modalPrice: number?     // modal dasar snapshot bila baris map ke satu produk stok
baseModalPrice: number? // alias kompatibilitas laporan
```

Transaksi lama tanpa field ini tetap menggunakan fallback `product.modalPrice` ketika summary lama dibuat ulang.

## `shifts[]`
Field baru saat shift ditutup:

```text
closingSummary: {
  shiftId, branchId, branchName, cashierName,
  startAt, endAt,
  transactionCount, voidCount, refundCount,
  soldItemQty, refundItemQty, itemQty,
  grossSales, refundTotal, refundPayout, netSales,
  soldCost, returnedCost, estimatedCost, grossProfit,
  discounts, taxes, expenses, newReceivable,
  payments,
  startingCash, expectedCash, actualCash, difference,
  notes, generatedAt
}
```

## AI settings
AI settings **bukan bagian database**. Key lokal:

```text
localStorage: bmpos-ai-product-assistant-v1
```

Isi: enabled/provider/model/apiKey/useNativeOcr/sendImageToAi. Data tidak ikut FreeSync atau backup JSON operasional.
