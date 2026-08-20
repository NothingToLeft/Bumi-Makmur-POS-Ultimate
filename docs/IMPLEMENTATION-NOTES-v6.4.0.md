# Implementation Notes — v6.4.0 QRIS Dynamic & Payment Assurance

## Major architecture decision

v6.4.0 tidak menjadikan server/payment gateway pihak ketiga sebagai syarat untuk membentuk QR. `src/utils/qrisDynamic.js` melakukan parsing, validation, conversion, dan CRC secara lokal. `src/services/qrisPaymentAssurance.js` memisahkan presentasi QR dari audit transaksi agar full payload tidak bocor ke histori sale.

## Data flow

`BranchPaymentProfile` → validate source static QRIS → Cashier payment line → dynamic payload per line amount → Customer Display/local QR renderer → merchant notification confirmation → sanitized `payments[]` + `qrisAssurance` → `completeSale` defense-in-depth → Firestore/offline queue.

## Payment assurance record

Field compact yang disimpan pada payment QRIS:
- `schemaVersion`
- `sessionId`
- `branchId`
- `mode`: `dynamic`, `static`, `static-fallback`, `physical-static`, `physical-static-fallback`
- `amount`
- merchant name/city + source fingerprint/CRC metadata
- `generatedLocally`
- `payloadStored: false`
- verification status, confirmer, timestamp, dan reference opsional

Full source/dynamic QR payload **tidak** disimpan dalam sale.

## Idempotency

Payment modal membuat `checkoutId` satu kali. ID ini diteruskan selama approval flow, lalu dipakai sebagai `sale.id`. Existing `completeSale` duplicate-ID guard sekarang melindungi retry/double submit untuk checkout yang sama.

## Split payment

Dynamic QR dibuat per `payment.amount`, bukan selalu `sale.total`. Ini membuat QRIS + tunai / QRIS + transfer / beberapa payment line tetap akurat. Satu line QRIS di atas Rp10.000.000 ditolak dan pengguna diminta memecah payment.

## Customer Display

Ketika ada QRIS payment aktif, snapshot display mempunyai optional `payment` object. Dynamic payload dikirim sebagai text payload kecil dan dirender oleh `QrisCode` pada jendela customer display. Static fallback tidak mengirim base64 baru; pelanggan diarahkan ke QRIS statis/fisik kasir.

## Defense in depth

UI melakukan confirmation guard, tetapi `PosContext.completeSale` mengulang validasi:
- amount range;
- assurance schema presence;
- assurance amount match;
- allowed assurance mode;
- `payloadStored === false`;
- merchant-notification confirmation + timestamp + confirmer ketika policy mewajibkan.

## Firestore deployment

v6.4.0 memperbarui `branchPaymentProfiles` schema pada Firestore Rules dan menambah index exemption untuk `qrisImage`/`qrisPayload`. Deploy `firestore:rules,firestore:indexes` wajib sekali sebelum aktivasi produksi QRIS Dinamis.

## Deliberate exclusions

- no service-fee QRIS tags;
- no external converter;
- no Puppeteer/GoBiz scraping;
- no mock merchant QR;
- no unique amount/suffix until a trusted mutation feed exists;
- no claim of automatic payment confirmation;
- no Firebase Functions/Storage/Blaze.
