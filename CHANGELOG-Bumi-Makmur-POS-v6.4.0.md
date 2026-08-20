# Changelog — Bumi Makmur POS v6.4.0
## QRIS Dynamic & Payment Assurance

## Added

- Generator **QRIS Dinamis lokal** dari payload QRIS statis merchant yang sudah tervalidasi.
- Parser TLV QRIS byte-aware dan fail-closed; struktur terpotong, trailing data, tag duplikat, UTF-8 invalid, dan CRC tidak valid ditolak sebelum konversi.
- Validasi merchant payload untuk Point of Initiation Method, MCC, mata uang IDR `360`, country `ID`, merchant name/city, merchant account information, dan CRC.
- Nominal QRIS per pembayaran dibatasi **Rp1–Rp10.000.000** dan wajib berupa Rupiah bulat; transaksi lebih besar diarahkan memakai split payment.
- **QRIS Payment Assurance** untuk mencatat mode QR, nominal, merchant, fingerprint sumber, CRC sumber, siapa yang mengonfirmasi pembayaran, dan waktu konfirmasi tanpa menyimpan payload QR dinamis pada histori transaksi.
- Idempotent checkout ID pada penyelesaian Kasir untuk membantu mencegah double-submit/retry menghasilkan transaksi ganda.
- QRIS dinamis per baris **split payment**, sehingga nominal QR mengikuti nilai QRIS pada masing-masing bagian pembayaran.
- QRIS dinamis pada **Customer Display / Layar Pelanggan** dengan nominal besar dan status verifikasi merchant.
- Panel audit **Payment Assurance QRIS** pada Detail Transaksi.
- Setup QRIS v6.4 pada Pengaturan: scan/decode QRIS statis, input payload manual, validasi ketat, preview/test QR dinamis, acknowledgement hasil scan, enable/disable dinamis, dan konfirmasi merchant wajib.
- Dokumentasi audit empat source QRIS, implementation notes, API Payment Assurance, folder structure, serta third-party notices.
- Regression tests v6.4.0 untuk parser/CRC, local generator, limit nominal, fallback, assurance audit, customer display, cashier guard, dan larangan dependency scraping/external converter.

## Changed

- QRIS statis per cabang sekarang menjadi **source/fallback** untuk QRIS Dynamic & Payment Assurance; fitur statis lama tetap tersedia.
- Saat metode QRIS dipilih di Kasir, panel pembayaran hanya menampilkan QRIS untuk baris QRIS, bukan untuk metode digital lain.
- QRIS dinamis dibuat dari total baris pembayaran yang sedang dibayar, bukan dari nominal yang dimasukkan pelanggan secara manual.
- Kasir **wajib** mencentang **“Saya sudah melihat notifikasi pembayaran masuk ke merchant”** sebelum transaksi QRIS diselesaikan; pengaturan tidak dapat menonaktifkannya tanpa adapter PJP resmi.
- `completeSale` menambahkan defense-in-depth untuk memastikan metadata assurance, nominal, mode, dan status verifikasi konsisten sebelum transaksi disimpan.
- Customer Display membawa snapshot pembayaran QRIS transient; payload QR dinamis tidak menjadi bagian histori transaksi/cloud sale.
- Label metode pada struk membedakan `QRIS Dinamis` dari `QRIS` tanpa mencetak payload QR.
- Version alignment Web/PWA, Android, Windows, runtime, workflow, dan release metadata dinaikkan ke **v6.4.0**.

## Fixed / Hardened

- Mencegah konversi QRIS dari payload sumber yang CRC-nya rusak, TLV-nya malformed, atau memiliki duplicate root tag ambigu.
- Mencegah nominal QRIS pecahan, nol, negatif, tidak finite, di atas batas per pembayaran, format scientific notation, atau format string ambigu.
- Mencegah convenience-fee tags `55/56/57` terbawa ke QRIS dinamis yang dihasilkan aplikasi.
- Mencegah fallback QRIS gagal diam-diam: bila generator dinamis bermasalah, Kasir turun ke QRIS statis/QR fisik dengan warning operasional yang jelas.
- Mencegah transaksi QRIS baru tersimpan tanpa Payment Assurance metadata ketika guard v6.4 aktif.
- Mencegah payload QR dinamis tersimpan sebagai bagian transaksi historis.
- Menjaga retry/double-click checkout memakai ID transaksi yang sama sehingga duplicate-ID guard lama dapat bekerja.
- Konfirmasi QRIS diikat ke cabang dan kasir yang sedang login; session ID dan timestamp audit wajib valid.
- Mencegah full/dynamic QR payload ikut tersimpan di `payment` maupun `qrisAssurance`.

## Security / Compliance-Oriented Controls

- QRIS dinamis dibuat **100% lokal**; tidak ada request ke converter QRIS pihak ketiga.
- Tidak menambahkan Puppeteer/Playwright, scraping portal merchant, OTP interception, unofficial GoBiz automation, atau mock QRIS.
- Tidak menambahkan callback/webhook palsu yang mengklaim pembayaran otomatis tanpa sumber transaksi resmi.
- Tidak menggunakan random nominal suffix untuk mencocokkan pembayaran karena belum ada feed mutasi PJP resmi yang dapat dipercaya.
- Tidak menambahkan service fee/surcharge QRIS ke pelanggan.
- Firebase tetap **Authentication + Firestore Spark**; tidak ada Firebase Functions, Storage, atau Blaze requirement.
- QRIS Dynamic bersifat opt-in per cabang dan baru dapat diaktifkan setelah payload sumber tervalidasi serta hasil scan diuji/diakui.

## Compatibility

- Seluruh AI Quota Resilience v6.3.1, Product Visual & Multi-Barcode v6.3.0, data hardening v6.2.0, Unified AutoSync, Customer Display, AI Product Capture, Smart Receiving, Smart Restock, PO, quotation, serial/garansi, stock opname, multi-unit, varian, bundle, approval PIN, backup, Web, Android, dan Windows tetap dipertahankan.
- Field konfigurasi QRIS v6.4 bersifat additive pada `branchPaymentProfiles`; tidak ada migrasi destruktif.
- Firestore Rules dinaikkan ke `BUMI_MAKMUR_RULESET_VERSION=6.4.0` untuk mengizinkan dan membatasi field QRIS Dinamis pada `branchPaymentProfiles`.
- Firestore index exemption ditambahkan untuk `branchPaymentProfiles.qrisImage` dan `branchPaymentProfiles.qrisPayload`; deploy Rules + Indexes wajib sekali setelah upgrade v6.4.0.
