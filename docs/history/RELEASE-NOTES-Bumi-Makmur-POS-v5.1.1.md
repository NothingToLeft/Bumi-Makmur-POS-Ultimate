# Bumi Makmur POS v5.1.1

Rilis distribusi profesional untuk Windows, Android, Web/PWA, dan Firebase Spark.

## Aset rilis

- **Windows EXE** — installer utama Windows dengan pilihan folder instalasi.
- **Windows MSI** — installer alternatif untuk deployment administratif.
- **Android APK** — instalasi langsung pada HP dan tablet Android.
- **Android AAB** — paket distribusi Android untuk kebutuhan rilis lanjutan.
- **SHA256SUMS** — pemeriksaan integritas setiap installer.

## Perubahan v5.1.1

- Menambahkan publikasi otomatis hasil build ke menu **GitHub Releases**.
- Release memakai tag yang mengikuti versi `package.json`, misalnya `v5.1.1`.
- Build ulang versi yang sama memperbarui aset dengan aman memakai `--clobber`.
- Actions Artifacts tetap dipertahankan sebagai cadangan selama 30 hari.
- Installer Windows dan Android dapat berada pada satu halaman Release yang sama.
- Seluruh fitur v5.1 tetap dipertahankan: Desktop Windows, nama toko dinamis, scan barcode produk baru, Firebase Spark, Web/PWA, dan Android.

> Instal pembaruan di atas versi lama. Jangan uninstall lebih dahulu agar data lokal tetap tersimpan.

### Windows Release Build Hotfix
- Memperbaiki kegagalan build setelah installer selesai dibuat karena electron-builder mencoba publish otomatis tanpa `GH_TOKEN`.
- Installer tetap dipublikasikan ke GitHub Releases oleh workflow resmi setelah checksum dibuat.
