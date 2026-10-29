# Bumi Makmur POS v6.2.0 — Data Integrity & Professional Operations

v6.2.0 adalah maintenance release besar yang berfokus pada **ketepatan urutan data, konsistensi lintas perangkat, akurasi kas, dan kualitas laporan** tanpa mengurangi fitur sebelumnya.

## Yang paling terlihat
1. Riwayat transaksi sekarang benar-benar urut **terbaru di atas** meskipun data datang dari Firebase dalam urutan acak.
2. Kasir selalu memulai dengan pelanggan **Umum**, bukan pelanggan acak dari snapshot cloud.
3. Laporan pembayaran Tunai tidak lagi menghitung uang yang dikembalikan kepada pelanggan sebagai penerimaan toko.
4. PDF Tutup Harian mendapat desain A4 profesional Bumi Makmur 2, siap dibagikan ke WhatsApp Business.
5. Timestamp Firestore dan data legacy lebih aman di seluruh Web, Android, dan Windows.

## Kompatibilitas
- Data v6.1.1 tetap kompatibel; tidak ada migrasi destruktif.
- Firebase Spark tetap digunakan tanpa Functions/Storage/Blaze.
- Firestore Rules tetap ruleset v6.1.0; tidak perlu deploy ulang jika workflow rules v6.1.0 sudah hijau.
- PDF dan Gemini API key tetap lokal.

## Setelah update
- Push source ke `main` dan pastikan Cloudflare Pages build hijau.
- Jalankan workflow `Build Bumi Makmur POS v6.2.0` mode `test-only` sebagai release gate.
- Smoke test: Transaksi terbaru, pembayaran tunai dengan kembalian, closing shift/PDF, Customer Display, AI Foto Produk, dan sinkronisasi lintas akun.

## Hardening tambahan sebelum packaging final
- Filter Void kompatibel dengan transaksi legacy `VOID` maupun `VOIDED`.
- Timestamp Firestore diperkeras pada struk, audit cloud, customer history, open bill, control center, layar pelanggan, kalkulasi HPP pembelian, dan garansi serial.
- Final local regression suite: **235 / 235 PASS** dan TypeScript parser source: **PASS**.
