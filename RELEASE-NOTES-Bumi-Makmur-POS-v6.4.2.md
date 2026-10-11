# Bumi Makmur POS v6.4.2 — Continuation of Claude reviewed source

Tanggal: 11 Oktober 2026. Baseline: `Bumi-Makmur-POS-Ultimate-v6.4.2-reviewed.zip` (source internal masih menandai 6.4.1). Seluruh modul dan data lama dipertahankan.

## Fitur Claude yang dipertahankan

- `Ctrl/Cmd+K`: command palette, filter permission per user dan pencarian istilah umum.
- Dashboard: wawasan penjualan 7 hari (neto refund, produk terlaris, jam sibuk, bauran pembayaran).
- Tutup shift: perhitungan pecahan rupiah dan pemindahan total ke uang fisik.
- Transaksi: ekspor CSV baris yang sedang difilter, hanya bagi `reports.view`.
- Bugfix Claude: lineId refund di mesin refund, revalidasi refund saat commit, validasi void penuh, sesi QRIS historis, loyalitas, PIN lockout lokal, tanggal garansi, dan CSS cetak.

## Perbaikan lanjutan

1. **Refund UI** memakai `remainingSaleLineQty()` berdasarkan `isSameSaleLine` yang sama dengan backend. Dua baris dengan produk sama tidak memengaruhi kuantitas satu sama lain; item lama tanpa `lineId` tetap didukung.
2. **QRIS checkout** memvalidasi `sessionId` unik dalam satu checkout dan di histori lokal (`assertUniqueQrisSessions()`). Konfirmasi notifikasi merchant tetap diwajibkan; tidak ada klaim bahwa bank telah memverifikasi pembayaran otomatis.
3. **Persetujuan Manager** memakai tiket sementara di memori per sesi provider, dengan tujuan aksi (`SALE_DISCOUNT`, `SALE_BELOW_COST`, `SALE_REFUND`, `SALE_VOID`), identitas pemberi persetujuan, batas tiga menit, dan discard setelah berhasil digunakan. Ini hanya lapis validasi lokal, **bukan otorisasi server tepercaya**.
4. **CSV** netralisasi prefix formula Excel/Sheets dengan karakter kosong/Unicode pengantar.
5. **Impor CSV/XLS/XLSX** menolak file lebih dari 10 MB sebelum parsing untuk mengurangi risiko kehabisan memori; semua format tetap tersedia.
6. Nomor versi aplikasi `6.4.2` dan versi cache service worker disamakan. Skema Firestore, rules, index, identitas DB lokal, Firebase Spark/free tier, dan pipeline Cloudflare tetap tidak diubah.

## Batasan & risiko terbuka

- Perlindungan tiket approval tetap dapat dilewati oleh modifikasi kode client/DevTools, dan tidak cukup untuk audit keuangan berisiko tinggi. Validasi otoritatif membutuhkan desain identitas/otorisasi dan rules backend yang diuji dengan emulator, tanpa mengorbankan offline-first.
- Cek replay QRIS lintas perangkat **tidak atomik**; dua perangkat yang offline/dalam perlombaan masih dapat memakai ID sama. Pembayaran harus dilihat pada notifikasi merchant resmi. Tidak ada rekonsiliasi otomatis dari bank/PJP.
- `xlsx@0.18.5` tetap dipakai karena pengganti belum divalidasi kompatibilitasnya (risiko keamanan pada berkas tidak tepercaya). Impor berkas eksternal tidak boleh dianggap aman tanpa tinjauan lebih lanjut. Batas 10 MB hanyalah mitigasi sumber daya.
- Tidak ada lockfile, dependency tidak terpasang di lingkungan ini, sehingga `vite build`, build Android, Windows, uji responsif perangkat, dan deployment live belum dapat dinyatakan berhasil.

Lihat `QA-REPORT-Bumi-Makmur-POS-v6.4.2.md` dan `PROJECT_STATUS.md` untuk daftar cek.
