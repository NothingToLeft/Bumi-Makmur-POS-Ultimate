# Audit Fitur dan Integritas v4.1

## Modul UI terdeteksi

1. Dashboard
2. Kasir
3. Open Bill
4. Transaksi, refund, dan void
5. Produk
6. Promo
7. Stok
8. Pembelian dan retur
9. Pemasok
10. Pelanggan
11. Shift dan kas
12. Keuangan, hutang, dan piutang
13. Laporan
14. Pesanan online
15. Karyawan
16. Cabang
17. Printer dan perangkat
18. Layar pelanggan
19. Pengaturan
20. Nota publik online

## Fitur premium terdeteksi

- QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, tunai, tempo, split payment.
- Harga modal + markup persen, eceran, grosir, proyek.
- Barcode kamera/manual/USB, varian, modifier, bundle, item kustom, konversi satuan.
- Nota WhatsApp, salin/bagikan/cetak, logo, footer, pesan toko, kertas 58/80 mm.
- Kamera startup, biometrik Android, signed APK/AAB.
- Firebase Auth, Firestore, Functions, Storage, Hosting, rules, multi-cabang, audit log.
- Cache offline, queue otomatis, conflict rebase, idempotency, service worker.

## Pemeriksaan statis

- 86 relative import diperiksa dan seluruh target ditemukan.
- 39 file JS/JSX/MJS diparsing dengan TypeScript transpile diagnostics.
- Cloud Functions dan service modules lolos `node --check`.
- Test inti dan retensi fitur: 34/34 lulus.
- Seluruh 19 modul UI, nota publik, pembayaran digital, Android native bridge, dan workflow signed release terdeteksi.
- Hak kasir pada pelanggan diperketat: hanya data kontak; tingkat harga, kredit, poin, cabang, dan status dilindungi oleh UI, domain logic, serta Cloud Functions.
- File JSON tervalidasi.
- Workflow signed release tetap menggunakan keystore yang sama dan `apksigner`.
- Tidak ada keystore, private key, atau nilai secret produksi di dalam project.

## Batas pemeriksaan

Pemeriksaan ini membuktikan konsistensi source dan test yang tersedia. Pengujian perangkat nyata tetap diperlukan untuk kamera berbagai merek, printer Bluetooth/USB/LAN, biometrik, serta perilaku jaringan putus-sambung pada HP dan tablet.
