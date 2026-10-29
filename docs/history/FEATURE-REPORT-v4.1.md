# Feature Report v4.1 — Hybrid Enterprise

## Fitur yang dipertahankan

Seluruh modul utama v3.3 dan v4.0 tetap tersedia: dashboard, kasir, open/split bill, transaksi/refund/void, produk, promo, stok, pembelian, pemasok, pelanggan, shift, keuangan, laporan, pesanan online, karyawan, cabang, printer/perangkat, layar pelanggan, pengaturan, pembayaran digital, nota WhatsApp, logo/QRIS, biometrik, dan signed Android release.

## Fitur baru v4.1

- Operasional offline dengan cache IndexedDB.
- Antrean mutasi lokal persisten dan mirror cadangan.
- Sinkronisasi otomatis saat koneksi kembali.
- Login PIN offline aman setelah login online pertama.
- Idempotency receipt di server.
- Rebase konflik stok/saldo/poin.
- Merge riwayat pembayaran dan retur berdasarkan ID.
- Pemecahan mutasi besar menjadi beberapa paket.
- Service worker untuk memuat kembali app shell saat offline.
- Panel status pending sync, konflik, cache lokal, dan sinkronisasi manual.

## Bug yang diperbaiki pada audit v4.1

- Snapshot lokal tidak lagi mengaplikasikan antrean yang sama dua kali setelah restart.
- Queue kosong tidak lagi dipulihkan dari mirror lama.
- Queue milik pengguna sebelumnya dapat disinkronkan oleh sesi sah berikutnya, dengan validasi role tetap dilakukan server.
- Pembayaran hutang/piutang concurrent tidak lagi kehilangan riwayat pembayaran.
- Retur pembelian concurrent tidak lagi menimpa retur perangkat lain.
- Item kustom POS tidak lagi gagal karena tidak mempunyai produk stok.
- Total penjualan, promo, loyalty, pajak, service, pembulatan, dan kembalian dihitung ulang oleh domain logic.
- Harga pembayaran tidak dapat mengandalkan angka total UI yang tidak konsisten.
- SKU lama yang kosong tidak menyebabkan halaman kasir/produk crash.
- Stok pecahan untuk meter/liter tetap dipertahankan pada produk, transfer, dan retur.
- Nilai retur pembelian dialokasikan terhadap total faktur, termasuk diskon/biaya.
- Validasi nama cabang, promo, pemasok, pelanggan, printer, kampanye, channel pesanan, dan rating diperketat.
- Mutation receipt ditutup dari akses klien melalui Firestore Rules.
- Kasir tidak lagi dapat mengubah tingkat harga, batas kredit, poin, cabang, atau status pelanggan; operasi loyalty divalidasi terhadap transaksi di Cloud Functions.
- Metadata bootstrap cloud sekarang langsung menandai database sebagai hybrid mode.
