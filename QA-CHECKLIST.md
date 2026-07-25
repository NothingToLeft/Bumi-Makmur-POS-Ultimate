# QA Checklist v4.3

## Build dan konfigurasi

- [ ] `test-only` hijau: 59 tests, audit statis, dan Vite compile.
- [ ] `web-only` menghasilkan artifact `dist`.
- [ ] Cloudflare Pages deploy hijau.
- [ ] Firebase Authorized Domain berisi domain Pages.
- [ ] Deploy Firebase Spark Rules hijau.
- [ ] Android release memakai keystore lama dan signature terverifikasi.

## Login dan offline

- [ ] Setup Owner pertama berhasil.
- [ ] Owner membuat Manager/Kasir dengan email.
- [ ] Hubungkan akun cloud dan PIN perangkat berhasil.
- [ ] PIN salah tidak membuat layar stuck.
- [ ] Biometrik berhasil dan fallback PIN bekerja.
- [ ] Mode pesawat tetap dapat transaksi.
- [ ] Setelah internet kembali, antrean menjadi 0 tanpa transaksi ganda.
- [ ] Splash tidak muncul lagi saat background sync.

## Kasir

- [ ] Produk, barcode kamera/manual/USB/Bluetooth keyboard, SKU Enter-to-add, kategori, varian, konversi, bundle, modifier.
- [ ] Input Rupiah dan markup persen benar.
- [ ] Open bill, split bill/payment, diskon, promo, pajak, poin.
- [ ] Tunai/kembalian, QRIS/e-wallet, transfer, kartu, tempo.
- [ ] Stok tidak negatif dan transaksi ganda ditolak.
- [ ] Nota preview, cetak, WhatsApp, share image, nota online.

## Inventori dan keuangan

- [ ] Pembelian, stok masuk, harga modal, hutang dan cicilan.
- [ ] Retur pembelian tidak melebihi stok.
- [ ] Adjustment, opname, transfer cabang.
- [ ] Piutang, limit kredit, pembayaran dan riwayat.
- [ ] Shift, modal awal, kas masuk/keluar, selisih.
- [ ] Refund/void memerlukan approval sesuai role.
- [ ] Omzet, HPP neto setelah refund/restock, pembelian bersih setelah retur, laba, stok, hutang/piutang sesuai data uji.

## Perangkat

- [ ] Infinix Note 40 Pro+ portrait.
- [ ] Huawei MatePad SE 11 portrait/landscape.
- [ ] PC 1366×768 dan 1920×1080.
- [ ] PWA dapat dipasang dan dibuka standalone.
- [ ] Kamera permission hanya meminta sesuai kebutuhan.
- [ ] Logo BM dan font tidak terpotong.
- [ ] Struk 58 mm dan 80 mm terbaca.
