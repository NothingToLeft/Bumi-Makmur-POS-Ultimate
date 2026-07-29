# Changelog — Bumi Makmur POS v5.1.1

## GitHub Releases otomatis
- Installer Windows `.exe` dan `.msi` sekarang otomatis muncul di menu **Releases** setelah workflow `windows-release` berhasil.
- APK dan AAB Android otomatis ditambahkan ke Release versi yang sama setelah workflow `android-release` berhasil.
- Tag release mengikuti versi aplikasi, misalnya `v5.1.1`.
- Menjalankan ulang build versi yang sama akan mengganti aset lama secara aman, bukan membuat file duplikat.
- Checksum SHA-256 ikut disertakan untuk verifikasi integritas.
- Actions Artifacts tetap tersedia selama 30 hari sebagai cadangan.

## Fitur v5.1 yang dipertahankan
- Desktop Windows EXE/MSI.
- Nama toko dapat diganti Owner.
- Scan barcode saat input produk baru.
- Login Owner/Karyawan terpisah dan role cabang.
- Firebase Spark FreeSync tanpa Blaze, Functions, atau Storage.
- Web/PWA, Android, dan sinkronisasi lintas perangkat.

## Windows Release Hotfix

- Menonaktifkan implicit publishing milik electron-builder pada build CI.
- Build EXE/MSI kini selesai tanpa meminta Personal Access Token.
- Publikasi tetap dilakukan oleh langkah GitHub CLI menggunakan `github.token` bawaan workflow.
- Menambahkan regression test agar `--publish never` tidak terhapus pada pembaruan berikutnya.
- Tidak mengubah data, Firebase, Android, Web, atau fitur operasional POS.

