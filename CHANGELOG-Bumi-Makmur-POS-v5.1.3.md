# Changelog — Bumi Makmur POS v5.1.3

## Login Page Content Studio

- Menambahkan bagan **Tampilan Halaman Login** di `Pengaturan → Toko`.
- Owner dapat mengubah judul besar login. Jika dikosongkan, judul otomatis mengikuti Nama Brand / Grup Usaha.
- Owner dapat mengubah teks di bawah header dengan placeholder dinamis:
  - `{branch}` untuk cabang yang dipilih;
  - `{business}` untuk nama brand/grup usaha;
  - `{version}` untuk versi aplikasi.
- Owner dapat mengubah judul dan keterangan bagian pemilihan akun.
- Owner dapat mengubah judul dan keterangan kartu Login Owner serta Login Karyawan.
- Owner dapat mengubah teks status saat online dan offline.
- Owner dapat mengubah tulisan tebal dan keterangan footer login.
- Menambahkan preview langsung yang mengikuti logo, brand, cabang aktif, dan versi aplikasi.
- Menambahkan tombol **Kembalikan Teks Standar**.
- Konfigurasi login disimpan dalam pengaturan toko dan dipublikasikan ke direktori login publik yang hanya berisi data aman.
- Web, Desktop Windows, Android, HP, dan tablet membaca konfigurasi login yang sama.
- Database v5.1.2 dan versi sebelumnya otomatis mendapat nilai standar untuk field baru.

## Stabilitas

- Mempertahankan login Owner/Karyawan terpisah, pilihan cabang, PIN, dan biometrik manual.
- Tidak mengubah transaksi, stok, data karyawan, QRIS, atau identitas cabang.
- Tidak membutuhkan Firebase Functions, Storage, Blaze, atau billing.
- Firestore Rules v5.1.2 tetap kompatibel; deploy ulang rules tidak wajib.
