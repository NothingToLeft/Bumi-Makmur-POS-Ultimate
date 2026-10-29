# QRIS Source Audit — Bumi Makmur POS v6.4.0

Tanggal audit: 20 Agustus 2026

## Tujuan

Empat source QRIS pihak ketiga dibedah untuk mencari pola yang dapat memperkuat Bumi Makmur POS tanpa mengorbankan arsitektur offline-first, Firebase Spark-only, keamanan merchant, dan kompatibilitas Android/Web/Windows. Implementasi v6.4.0 dibuat ulang di source Bumi Makmur; repo pihak ketiga tidak ditanam sebagai dependency runtime.

## 1. `qris-dinamis-main` — verssache/qris-dinamis

**Nilai yang dipelajari**
- Konversi MPM statis ke dinamis dengan tag `01` dari `11` ke `12`.
- Penyisipan Transaction Amount pada tag `54`.
- Recompute CRC16-CCITT.
- Parser metadata merchant dan UX input gambar/manual.

**Kelemahan yang tidak dibawa**
- Parser dapat berhenti pada TLV rusak tanpa selalu melempar error keras.
- Converter mendukung tag convenience fee `55/56/57`; Bumi Makmur justru menghapus tag tersebut dari hasil dynamic generator.
- Validasi amount tidak cukup ketat untuk kebutuhan POS produksi.

**Keputusan**: konsep inti dipakai, parser/generator ditulis ulang byte-aware dan fail-closed.

## 2. `qris-main` — github.com/saquone/qris

**Nilai terbaik**
- Parser TLV Go mengembalikan error pada data terpotong/malformed.
- CRC16-CCITT-FALSE yang sederhana dan dapat diuji.
- Validasi static payload, IDR `360`, dan required tags.
- Webhook sender memiliki pola SSRF hardening yang kuat: validasi scheme/hostname, blok private/loopback/link-local/CGNAT, resolve IP sebelum dial, mitigasi DNS rebinding, dan redirect blocking.
- Notification dedup dan random unique suffix memberi referensi desain untuk adapter pembayaran masa depan.

**Catatan audit**
- `ToDynamic()` sendiri hanya memanggil `Parse()` dan tidak memanggil `ValidateStatic()` terlebih dulu; endpoint yang memakai fungsi itu harus memastikan validasi dilakukan di depan.
- `catalog/gateways.json` pada archive hanya berisi satu gateway terverifikasi: DANA Bisnis (`id.dana`). Klaim dukungan luas pada README tidak dianggap sebagai bukti dukungan produksi.

**Keputusan**: pola fail-closed, CRC, dedup, dan SSRF hardening dijadikan referensi. Bumi Makmur memvalidasi source QRIS **sebelum** konversi.

## 3. `dynamic-qris-main` — dyqris

**Nilai terbaik**
- Idempotency `(merchant_id, ref_id)`.
- State transaksi pending/paid/expired.
- Event dedup.
- Orphan payment log untuk mutasi yang belum dapat dipasangkan.
- Webhook retry dengan backoff.
- Random unique suffix dan collision check untuk feed pembayaran berbasis exact amount.

**Bagian yang ditolak**
- Dynamic conversion bergantung pada external converter URL (`qris.miraipedia.my.id` secara default), sehingga tidak offline-first dan menambah dependency/availability/privacy risk.
- Callback URL hanya divalidasi sebagai HTTP/HTTPS pada lapisan yang diaudit; tidak setara dengan SSRF hardening repo `qris-main`.
- Unique amount mengubah jumlah yang dibayar pelanggan. Tanpa incoming-payment feed resmi, ini tidak memberi manfaat yang sebanding dengan risiko rekonsiliasi.

**Keputusan**: idempotent checkout dan audit-state diadaptasi secara lokal; converter eksternal dan unique suffix tidak dipakai.

## 4. `qbiz-qrisdinamis-main` — QBiz

**Nilai yang dipelajari**
- Invoice state `PENDING/PAID/EXPIRED`.
- HMAC webhook + timestamp anti-replay sebagai pola untuk adapter PJP resmi di masa depan.
- Customer checkout/status UX.
- Mutation/event audit dan merchant scoping.
- Session-at-rest encryption menunjukkan perhatian terhadap credential lifecycle.

**Risiko kritis / sengaja tidak dibawa**
- README menyatakan integrasi merchant merupakan **Unofficial API**, memakai Puppeteer/browser automation, scraping dan XHR interception, serta memperingatkan risiko account suspension/access restriction.
- Hanya mendukung QRIS Food Merchant pada archive yang diaudit.
- Source memiliki fallback/default credential/mock behavior yang tidak sesuai transaksi dana nyata.
- Dynamic QR utility Map-based lebih permissive daripada parser strict Bumi Makmur.
- Beberapa URL/webhook path tidak mempunyai level SSRF guard yang cukup untuk standar Bumi Makmur.

**Keputusan**: tidak ada Puppeteer, scraping, OTP interception, portal automation, atau mock QRIS di Bumi Makmur POS.

## Arsitektur yang dipilih Bumi Makmur

1. QRIS statis merchant divalidasi lokal: TLV, required tags, currency, country, merchant identity, CRC, dan static initiation method.
2. QRIS dinamis dibuat lokal dari source yang valid; hanya initiation method dan amount yang dikelola.
3. Tag convenience fee/tip tidak diteruskan oleh generator QRIS.
4. Satu QRIS payment line dibatasi Rp1–Rp10.000.000; transaksi lebih besar memakai split payment.
5. Static image/QRIS fisik tetap fallback.
6. Dynamic generation **bukan** bukti dana diterima. Kasir wajib mengonfirmasi notifikasi merchant selama aplikasi belum menerima settlement callback dari PJP/acquirer resmi.
7. Audit menyimpan mode, amount, merchant, session ID, waktu/kasir konfirmasi dan reference opsional; **full QR payload tidak disimpan pada sale history**.
8. Checkout ID dibuat sebelum finalisasi dan dipakai sebagai sale ID agar retry/double-submit yang sama bersifat idempotent.
9. Customer Display hanya menerima dynamic payload untuk rendering lokal; tidak ada base64 QR baru yang disimpan ke transaksi.
10. Automatic confirmation baru boleh ditambahkan melalui adapter PJP/acquirer resmi atau feed yang legal dan tervalidasi. Unofficial portal scraping tidak menjadi roadmap default.

## Future adapter contract

Jika suatu saat PJP resmi menyediakan webhook/API, implementasi harus mencakup:
- HMAC/signature atau mekanisme otentikasi resmi PJP;
- timestamp/nonce anti-replay;
- event-id idempotency;
- exact merchant + amount + invoice matching;
- orphan-event queue, bukan auto-apply ke transaksi yang ambigu;
- HTTPS-only + SSRF/private-network/DNS-rebinding guard untuk callback outbound;
- retry/backoff + dead-letter diagnostic;
- audit mutation lengkap;
- tidak pernah menyimpan secret PJP ke Firestore dokumen publik/backup biasa.
