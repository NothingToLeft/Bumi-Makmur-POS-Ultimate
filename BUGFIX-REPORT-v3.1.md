# Bumi Makmur POS Ultimate v3.1 — Bugfix Report

## Masalah yang dilaporkan dan sudah diperbaiki

1. **Angka 0 tidak bisa dihapus pada harga**
   - Input harga kini memakai komponen Rupiah khusus.
   - Nilai nol tampil kosong dengan placeholder `0`.
   - Angka non-digit dibersihkan otomatis.

2. **Pemisah ribuan tidak muncul saat mengetik**
   - `5000` langsung tampil sebagai `5.000`.
   - Berlaku pada harga produk, pembayaran, diskon, biaya, modal shift, hutang/piutang, dan nominal penting lainnya.

3. **Harga jual berdasarkan persentase keuntungan**
   - Harga modal + markup persen menghitung harga jual otomatis.
   - Tersedia markup berbeda untuk Eceran, Grosir, dan Proyek.
   - Preset cepat: 10%, 20%, 30%, 40%, dan 50%.
   - Contoh: modal Rp5.000 + markup 30% = harga jual Rp6.500.

4. **Login berhenti setelah PIN salah**
   - Siklus verifikasi PIN diperbaiki.
   - Pesan kesalahan tampil, PIN dibersihkan, dan keypad dapat digunakan kembali.
   - Error kriptografi/login juga ditangani agar tidak membuat layar terkunci.

## Bug kritis tambahan yang diperbaiki

- Kebutuhan stok dari baris produk dan komponen bundle digabung sebelum pengurangan stok.
- Transaksi ditolak bila total pembayaran kurang.
- Pembayaran tempo wajib memiliki jatuh tempo.
- Kelebihan pembayaran non-tunai ditolak.
- Tombol penyelesaian pembayaran dikunci saat transaksi sedang diproses untuk mencegah transaksi ganda.
- SKU dan barcode ganda pada cabang yang sama ditolak.
- Refund tidak dapat melebihi sisa kuantitas yang belum direfund.
- Retur pembelian tidak dapat melebihi sisa kuantitas yang belum diretur.
- Status refund penuh dihitung berdasarkan kuantitas barang, bukan hanya nominal.
- Diskon item pembelian tidak dapat melebihi subtotal item.
- Produk yang sama pada form pembelian digabung agar tidak membuat baris ganda tanpa sengaja.
- Pembelian tempo yang langsung diterima wajib memiliki tanggal jatuh tempo.
- Tanggal promo menggunakan tanggal lokal perangkat, bukan tanggal UTC.

## Pemeriksaan otomatis

- TypeScript/JSX syntax check: **lulus**
- Unit tests: **9/9 lulus**
- Tidak ada perubahan pada `DB_KEY`, sehingga data lokal versi sebelumnya tetap dipertahankan.

## Pengujian manual yang disarankan

1. Masukkan PIN salah lalu PIN benar.
2. Tambah produk baru: modal 5.000, markup eceran 30%, pastikan harga 6.500.
3. Hapus seluruh nominal lalu ketik ulang; pastikan tidak ada nol di depan.
4. Buat transaksi split payment dan coba nominal kurang.
5. Buat transaksi tempo tanpa tanggal jatuh tempo; harus ditolak.
6. Tambahkan produk sama dua kali atau bundle dengan komponen sama; stok tidak boleh negatif.
7. Refund sebagian lalu coba refund melebihi sisa.
8. Retur pembelian sebagian lalu coba retur melebihi sisa.
