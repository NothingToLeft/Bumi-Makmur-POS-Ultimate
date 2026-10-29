# QA Report — Bumi Makmur POS v5.6.2

## Skenario yang diuji secara regresi

- Firebase Auth menggunakan persistence eksplisit.
- Penyimpanan perangkat lama tetap digunakan; tidak ada pemindahan partisi atau penghapusan cache.
- Status tersinkron mengalahkan error lama.
- Diagnostik identik digabung.
- Nama koleksi diteruskan ke diagnostik.
- Koleksi tambahan tidak mematikan sinkronisasi inti.
- Seluruh 130 pengujian lama dan baru lulus.

## Pengujian perangkat yang masih diperlukan

- Tutup dan buka kembali installer Windows setelah login Owner.
- Uji Pengaturan → Karyawan pada Desktop.
- Uji tambah Kasir dan Store Manager.
- Uji transaksi di Desktop lalu verifikasi muncul di Web dan Android.
- Uji restart Windows dengan antrean offline nol.
