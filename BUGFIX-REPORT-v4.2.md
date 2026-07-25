# Bumi Makmur POS Hybrid v4.2 — Stability, Branding & Receipt Audit

## Perbaikan kritis

### Splash berulang setiap beberapa detik
- Layar penuh startup sekarang memakai state `initializingApp`, terpisah dari `cloudLoading` dan `cloudSaving`.
- Cache perangkat dibuka lebih dahulu sebelum menunggu Firebase.
- Retry sinkronisasi tidak lagi memanggil splash startup.
- Satu proses sinkronisasi aktif dijaga dengan `syncRunRef` dan satu proses bootstrap cloud dijaga dengan `cloudStartRef`.
- Permintaan awal Firebase memiliki timeout 10 detik; bila gagal, aplikasi tetap memakai data lokal.
- Retry memakai exponential backoff hingga maksimum 5 menit dan tidak berjalan ketika aplikasi berada di background.

### Instalasi sebelum Firebase selesai
- Akun demo lokal aman tetap dapat digunakan jika Firebase belum dikonfigurasi.
- PIN tetap diverifikasi memakai PBKDF2-SHA256; PIN teks biasa tidak disimpan.
- Setelah Firebase tersedia, login cloud dan sinkronisasi otomatis tetap mengambil alih.

## Branding dan visual
- Logo aplikasi baru berupa monogram **BM** dengan identitas hijau–emas.
- Logo diterapkan pada login, sidebar, header HP, PWA manifest, favicon, launcher Android, splash Android, nota cetak, nota digital, dan WhatsApp image receipt.
- Android preparation menyalin ikon ke seluruh density launcher serta splash portrait/landscape.
- Font memakai system UI stack yang tajam pada Infinix Note 40 Pro+, Huawei MatePad SE 11, dan Windows.
- Angka nominal memakai `tabular-nums` agar kolom Rupiah sejajar.
- Ikon SVG memakai `geometricPrecision`.

## Nota premium
- Renderer cetak ulang disatukan melalui `buildReceiptPrintHtml`.
- Logo BM menjadi fallback bila pengguna belum mengunggah logo toko.
- Preview nota langsung tersedia di Pengaturan > Toko.
- Tampilan nota mencakup pelanggan, kasir, rincian item, diskon, promo, poin, pajak, service, total, metode pembayaran, kembalian, footer, dan pesan toko.
- Preview PNG disertakan di `docs/preview-struk-premium-v4.2.png`.

## Workflow GitHub
- Workflow Android menyediakan pilihan `test-only` dan `full-release`.
- `test-only` dapat dijalankan sebelum Firebase dan signing secrets selesai.
- `full-release` tetap memvalidasi Firebase, keystore tetap, APK/AAB release, signature, dan SHA-256.

## Audit fitur yang dipertahankan
- Kasir, open bill, split bill, split payment, produk, varian, bundle, modifier, konversi satuan.
- Harga modal, markup, eceran, grosir, proyek, promo, loyalty, pajak, service, pembulatan.
- Barcode kamera/manual/USB, printer profiles, customer display.
- Pembelian, retur, hutang pemasok, stok opname, adjustment, transfer cabang.
- Pelanggan, piutang, limit kredit, poin/reward.
- Shift, kas masuk/keluar, refund, void, approval manager.
- QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, tempo.
- Nota online, WhatsApp, backup/restore, multi-cabang, roles, biometric, camera permission, signed APK/AAB.

## Hasil pemeriksaan
- Core/static tests: **42/42 lulus**.
- Node syntax check untuk file `.js`/`.mjs`: **lulus**.
- Asset logo/PWA/Android: **tersedia**.
- Full Vite/Android build belum dijalankan di lingkungan ini karena instalasi npm timeout; jalankan GitHub Actions `test-only`, lalu `full-release` setelah Firebase dan signing secrets tersedia.
