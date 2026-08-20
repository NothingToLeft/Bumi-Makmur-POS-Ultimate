# Bumi Makmur POS FreeSync v6.4.0
## QRIS Dynamic & Payment Assurance

Tanggal: 20 Agustus 2026

v6.4.0 adalah major release pembayaran QRIS. QRIS statis tetap dipertahankan, kemudian ditambah generator QRIS dinamis lokal, strict source validation, Payment Assurance, idempotent checkout, split QRIS, Customer Display QR, audit transaksi, dan hardening Firestore khusus schema QRIS.

## 1. QRIS Dinamis dibuat lokal

Cabang dapat menyimpan payload QRIS statis merchant yang sah sebagai source. Engine lokal:

1. parsing TLV berdasarkan UTF-8 byte length;
2. menolak payload kosong, oversized, malformed, truncated, trailing, duplicate root tag, atau CRC rusak;
3. memvalidasi Point of Initiation Method, MCC, IDR `360`, country `ID`, merchant name/city, dan Merchant Account Information;
4. mengubah Point of Initiation Method dari statis `11` menjadi dinamis `12`;
5. menyisipkan Transaction Amount tag `54` sesuai nominal payment line;
6. menghapus convenience-fee tags `55/56/57`;
7. menghitung ulang CRC16;
8. memvalidasi output sekali lagi sebelum QR ditampilkan.

Tidak ada API converter eksternal dan tidak ada backend berbayar untuk membentuk QR.

## 2. Nominal dan split payment

Nominal QRIS hanya menerima Rupiah bulat Rp1–Rp10.000.000 per payment line. Input pecahan, scientific notation, nilai non-finite, nol, negatif, dan nilai di atas batas ditolak. Transaksi yang lebih besar dapat menggunakan split payment.

## 3. Setup aman dan opt-in per cabang

Pengaturan QRIS menyediakan:

- upload/scan QRIS statis;
- decode payload QR;
- input payload manual;
- strict validation + merchant metadata;
- QR dinamis uji;
- acknowledgement hasil scan merchant;
- enable/disable mode dinamis.

Dynamic mode tidak aktif hanya karena payload berhasil dibaca. Merchant harus menguji nama merchant dan nominal pada aplikasi pembayaran/PJP yang digunakan.

## 4. Payment Assurance wajib

Generator lokal hanya membuktikan bahwa QR dapat dibentuk; ia tidak membuktikan dana sudah settled. Karena v6.4.0 belum memakai callback resmi PJP/acquirer, setiap pembayaran QRIS **wajib** dikonfirmasi kasir setelah notifikasi pembayaran benar-benar masuk ke merchant.

Konfirmasi ini tidak dapat dinonaktifkan dari profil cabang. Audit menyimpan:

- mode QRIS;
- nominal;
- merchant name/city;
- fingerprint + source CRC;
- assurance session ID;
- cabang;
- kasir yang mengonfirmasi;
- waktu konfirmasi;
- reference manual opsional.

Defense-in-depth pada `completeSale` memastikan konfirmasi berasal dari kasir yang sedang login dan cabang assurance cocok dengan cabang transaksi.

## 5. Payload QR tidak masuk histori transaksi

Dynamic payload hanya hidup sementara untuk rendering QR pada Kasir/Customer Display. `qrisAssurance.payloadStored` harus `false`; field payload pada payment/audit ditolak sebelum transaksi disimpan.

## 6. Idempotent checkout

Payment modal membuat checkout ID stabil untuk satu attempt. Retry/double-submit menggunakan ID yang sama sehingga duplicate-sale guard dapat mencegah transaksi ganda.

## 7. Customer Display

Customer Display dapat menampilkan QR dinamis, nominal, merchant, instruksi, dan state konfirmasi. Pada static/physical fallback, layar mengarahkan pelanggan ke QRIS statis/fisik di meja kasir tanpa mengirim base64 QR besar melalui snapshot.

## 8. Firestore Spark hardening

v6.4.0 **mengubah Firestore Rules**. Ruleset menjadi:

`BUMI_MAKMUR_RULESET_VERSION=6.4.0`

Schema `branchPaymentProfiles` sekarang mengizinkan dan membatasi field QRIS Dinamis secara eksplisit, termasuk payload max 4096 karakter, boolean enable/acknowledgement, dan confirmation flag yang hanya boleh `true` bila ada.

Index exemption baru:

- `branchPaymentProfiles.qrisImage`;
- `branchPaymentProfiles.qrisPayload`.

Keduanya tidak digunakan untuk query. Deploy Rules + Indexes **wajib sekali** setelah upload v6.4.0.

## 9. Source research

Empat project QRIS dipelajari sebagai referensi teknik. Konsep yang diadopsi: strict TLV/CRC, local conversion, idempotency, payment-state/audit, dan security-oriented validation.

Yang sengaja tidak dibawa:

- external QRIS converter;
- Puppeteer/portal merchant scraping;
- OTP/session interception;
- unofficial GoBiz/QFM automation;
- mock QRIS;
- default production credentials;
- random amount suffix tanpa mutation feed resmi;
- customer QRIS surcharge.

Lihat `docs/QRIS-SOURCE-AUDIT-v6.4.0.md` dan `THIRD-PARTY-NOTICES.md`.

## 10. Firebase Spark dan compatibility

- Firebase Authentication + Firestore Spark saja;
- tidak ada Firebase Functions;
- tidak ada Firebase Storage;
- tidak membutuhkan Blaze;
- QRIS generator bekerja offline;
- Android/Capacitor, Web/PWA/Cloudflare Pages, dan Windows/Electron tetap didukung.

## Deployment wajib

1. Backup JSON dan jangan menghapus pending offline queue.
2. Upload seluruh source v6.4.0 ke GitHub.
3. Jalankan `Actions → Deploy Firebase Spark Rules` dan tunggu hijau untuk menerapkan ruleset v6.4.0 + index exemptions.
4. Jalankan workflow `test-only` sampai test, static audit, dependency install, dan Vite build hijau.
5. Tunggu Cloudflare Pages hijau.
6. Pada setiap cabang, validasi QRIS statis merchant, buat QR uji nominal kecil, scan, cocokkan merchant + nominal, lalu acknowledge/enable dynamic.
7. Lakukan transaksi uji nyata dan pastikan notifikasi merchant masuk sebelum kasir mengonfirmasi.
8. Smoke test QRIS statis/dinamis/fallback/split, Customer Display, transaksi, refund/void, offline→online sync, barcode, foto produk, Owner/Karyawan, dan cloud queue = 0.
9. Setelah Web stabil, jalankan Android dan Windows release workflow.

## Important operational note

v6.4.0 belum melakukan automatic settlement confirmation. Integrasi otomatis di masa depan hanya boleh menggunakan API/webhook resmi PJP/acquirer dengan signature verification, anti-replay, idempotency, exact matching, orphan-event handling, retry/backoff, dan audit lengkap.
