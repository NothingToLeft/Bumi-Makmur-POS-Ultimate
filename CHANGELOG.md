# Changelog

## 4.2.0
- Memperbaiki splash/loading yang muncul berulang saat sinkronisasi Firebase gagal atau belum dikonfigurasi.
- Memisahkan startup loading, background sync, dan saving indicator.
- Menambahkan timeout, single-flight guard, dan exponential backoff untuk sinkronisasi.
- Menambahkan login local-seed aman sebelum Firebase siap.
- Menambahkan logo BM premium ke web, PWA, Android, dan nota.
- Menambahkan launcher icon dan splash Android kustom.
- Menyempurnakan font, angka Rupiah, presisi ikon, dan konsistensi visual.
- Menyatukan renderer nota cetak dan menambahkan preview nota langsung di Pengaturan.
- Menambahkan mode GitHub Actions `test-only` dan `full-release`.
- Menambahkan 5 tes baru; total 42/42 lulus.

## 4.1.0
- Hybrid offline + Firebase auto-sync.
