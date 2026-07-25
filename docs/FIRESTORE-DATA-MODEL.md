# Firestore Data Model

Semua data internal berada di bawah `stores/{storeId}`. Collection operasional menggunakan document ID yang sama dengan ID data lokal sehingga retry bersifat idempotent.

```text
stores/{storeId}/system/settings
stores/{storeId}/users/{uid}
stores/{storeId}/branches/{branchId}
stores/{storeId}/products/{id}
stores/{storeId}/sales/{id}
stores/{storeId}/purchases/{id}
stores/{storeId}/stockMovements/{id}
stores/{storeId}/auditLogs/{mutationId}
publicReceipts/{token}
```

Data transaksi lokal disimpan lebih dahulu, lalu operasi per dokumen dimasukkan ke queue. Saat online, transaksi Firestore memeriksa `beforeData`, menulis perubahan, dan membuat audit log. Konflik stok, poin, hutang/piutang, dan retur direbase terhadap data terbaru sebelum retry.
