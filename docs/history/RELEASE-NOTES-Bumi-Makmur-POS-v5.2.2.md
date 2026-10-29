# Bumi Makmur POS v5.2.2

## Responsive Sidebar Identity Fix

Rilis ini memperbaiki identitas cabang pada sidebar Web dan Desktop Windows. Nama cabang panjang sekarang tampil utuh hingga dua baris dengan ukuran huruf adaptif, area identitas lebih lega, dan versi aplikasi tetap tersusun rapi di bawah nama cabang.

### Contoh hasil

Sebelumnya:

```text
Bumi Makmur 02 Suraba...
POS Hybrid v5.2.1
```

Sekarang:

```text
Bumi Makmur 02
Surabaya
POS Hybrid v5.2.2
```

### Tidak ada perubahan data

- Tidak ada migrasi Firestore.
- Tidak perlu deploy ulang Firebase Rules.
- Data Web, PC, Android, produk, stok, transaksi, dan akun tetap dipertahankan.
- Installer dapat dipasang langsung di atas versi sebelumnya.

### Rekomendasi build

1. Jalankan workflow `Build Bumi Makmur POS v5.2.2` dengan mode `test-only`.
2. Setelah hijau, jalankan `windows-release` dan/atau `android-release`.
3. Cloudflare Pages memperbarui Web otomatis setelah push ke branch `main`.
