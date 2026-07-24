# Arsitektur Hybrid Offline + Firebase

## Alur normal

```text
Aksi pengguna
  → diterapkan langsung ke database lokal
  → disimpan ke IndexedDB
  → dicatat sebagai mutation queue persisten
  → bila online: dikirim ke Cloud Function
  → transaksi Firestore memeriksa versi dokumen
  → audit log dan mutation receipt dibuat oleh server
  → snapshot realtime memperbarui perangkat lain
```

## Perlindungan data

- Queue utama berada di localStorage agar pencatatan mutasi berlangsung sinkron sebelum UI dianggap berhasil.
- Queue dicerminkan ke IndexedDB sebagai cadangan.
- Snapshot database mencatat mutation ID yang sudah diterapkan sehingga antrean tidak diaplikasikan dua kali setelah aplikasi dibuka ulang.
- Mutasi besar otomatis dipecah menjadi paket maksimal 200 operasi agar tidak macet pada batas Cloud Function/Firestore.
- Mutation receipt membuat pengiriman ulang aman dan tidak menggandakan penjualan/pembelian.
- Konflik stok dan saldo memakai delta; perubahan harga menggunakan nilai edit terbaru.
- Riwayat pembayaran hutang/piutang dan retur pembelian digabung berdasarkan ID agar catatan dari perangkat lain tidak hilang.

## Login offline

Pengguna harus login online satu kali pada perangkat. PIN offline:

- di-hash PBKDF2-SHA256 dengan salt acak dan 180.000 iterasi;
- tidak disimpan sebagai teks biasa;
- berlaku 30 hari sebelum wajib verifikasi online kembali;
- tetap memerlukan autentikasi biometrik Android bila opsi biometrik digunakan.

## Operasi yang sengaja memerlukan internet

- Setup toko pertama.
- Menambah/mengubah PIN karyawan.
- Approval Manager untuk refund/void oleh Kasir.
- Upload logo/QRIS ke Firebase Storage.
- Restore backup cloud dan reset database.
- Membuat tautan nota online; saat offline nota teks/cetak lokal tetap tersedia.

## Jika sinkronisasi gagal

1. Jangan menghapus aplikasi atau data browser.
2. Buka Pengaturan → Sistem & Sinkronisasi.
3. Pastikan internet aktif lalu tekan Sinkronkan Sekarang.
4. Periksa jumlah antrean dan pesan konflik.
5. Ekspor backup JSON sebelum tindakan perbaikan besar.
