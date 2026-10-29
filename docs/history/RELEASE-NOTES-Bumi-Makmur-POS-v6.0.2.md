# Bumi Makmur POS v6.0.2 — Professional Receipt & Cash Change Safety

v6.0.2 fokus pada keamanan transaksi tunai dan konsistensi struk di seluruh platform.

## Perubahan utama

- Kembalian tunai sekarang selalu dihitung dari payment summary yang sama dan ditampilkan jelas setelah transaksi.
- Contoh: total Rp39.000 dibayar Tunai Rp50.000 menghasilkan **KEMBALIAN Rp11.000**.
- Transaksi lama yang belum memiliki field `change` tetap mendapat fallback perhitungan aman dari pembayaran tunai.
- Kelebihan pembayaran non-tunai tidak pernah dianggap sebagai kembalian.
- Kas shift hanya menerima nilai tunai bersih setelah kembalian agar saldo kas tidak terhitung terlalu besar.
- Nota Kasir, Nota Online, Riwayat Transaksi, teks WhatsApp/Salin, share-image, dan thermal/PDF memakai logika pembayaran yang konsisten.
- Struk didesain ulang menjadi lebih profesional, padat, responsif, dan mengikuti identitas Bumi Makmur 2 merah–hitam.
- Komponen `ReceiptDocument` menjadi single source of truth untuk preview nota utama, nota online, dan preview Pengaturan.
- Modal nota memakai layout viewport-safe pada HP/tablet sehingga isi panjang tidak membuat tombol aksi hilang atau layout melebar.
- Print 58 mm / 80 mm tetap didukung dan isi panjang tidak dipotong oleh scroll modal.

## Kompatibilitas

Tidak ada migrasi Firestore. Semua data dan fitur v6.0.1 tetap kompatibel. Web dapat di-redeploy langsung; Android/Windows perlu rebuild untuk binary versi 6.0.2.
