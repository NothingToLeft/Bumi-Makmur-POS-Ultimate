# Bumi Makmur POS v5.2.3 — Purchase & Restock Responsive Layout Fix

## Perbaikan utama

- Tombol **Tambah ke Daftar** tidak lagi menimpa panel Ringkasan.
- Modal Pembelian memakai satu kolom hingga layar cukup lebar, lalu berubah menjadi dua kolom dengan panel Ringkasan minimal 300 px.
- Area input barang memakai grid 12 kolom yang stabil: barang, satuan, jumlah, harga, dan tombol tersusun dalam dua baris.
- Semua anak grid diberi `min-width: 0` dan batas lebar agar input tidak memaksa kontainer melebar.
- Teks tombol dapat membungkus secara rapi dan tetap memiliki area sentuh penuh.
- Panel Ringkasan dibuat sticky hanya pada layar lebar; pada laptop/tablet kembali ke alur normal.

## Dampak data

Tidak ada perubahan database, Firestore Rules, transaksi, stok, HPP, akun, atau konfigurasi toko. Pembaruan ini aman dipasang di atas v5.2.2.
