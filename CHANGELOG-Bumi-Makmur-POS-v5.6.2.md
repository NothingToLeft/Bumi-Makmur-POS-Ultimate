# Bumi Makmur POS v5.6.2 — Desktop Cloud Session Recovery

## Perbaikan utama

- Firebase Auth Desktop Windows sekarang memakai `initializeAuth` dengan IndexedDB sebagai penyimpanan utama dan localStorage sebagai fallback.
- - Aplikasi menunggu pemulihan sesi Auth sebelum menganggap cloud belum terhubung.
- Sinkronisasi inti Produk, Stok, Transaksi, Cabang, Karyawan, Pembelian, dan laporan tetap aktif bila satu koleksi tambahan mengalami masalah.
- Koleksi tambahan yang diisolasi: `purchaseOrders`, `productPriceHistory`, `approvalRequests`, dan `deviceSessions`.
- Error bootstrap dan listener sekarang menyertakan nama koleksi.
- Error identik digabung menjadi satu catatan dengan penghitung kejadian.
- Status `Tersinkron` tidak lagi dikalahkan oleh pesan error lama setelah sinkronisasi berhasil.

## Data dan kompatibilitas

- Tidak menghapus data lokal maupun cloud.
- Tidak mengubah struktur Firestore atau Firestore Rules.
- Tidak memerlukan Firebase Blaze, Storage, Functions, atau billing.
- Tetap kompatibel dengan Web Cloudflare, APK Android, dan installer Windows.
