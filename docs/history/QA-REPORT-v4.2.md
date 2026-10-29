# QA Report — Bumi Makmur POS v4.2

## Audit otomatis

- Unit/static tests: **40/40 lulus** melalui `npm run test:core`.
- Pemeriksaan sintaks 42 file JS/JSX/MJS: **lulus**.
- Pemeriksaan relative import: **lulus**.
- Pemeriksaan fitur lama agar tidak hilang.
- Pemeriksaan workflow signed APK/AAB.
- Pemeriksaan tidak adanya Cloud Functions, Cloud Storage, service-account, keystore, atau private key di source.

## Bug penting yang diperbaiki

- Login PIN online sekarang mendeteksi sesi Firebase yang sudah berakhir dan meminta Email/Password, sehingga aplikasi tidak terlihat tersinkron padahal tidak punya sesi cloud.
- Login biometrik melakukan pemeriksaan sesi yang sama.
- Pembuatan akun karyawan membatalkan akun Auth yang baru dibuat bila profil Firestore gagal, sehingga tidak meninggalkan akun yatim.
- Cabang utama diseragamkan menjadi `BM001` sesuai Firestore dan GitHub Secrets.
- Kasir dapat membaca pesanan online cabangnya tanpa menyebabkan seluruh proses load Firestore gagal.
- Loyalty points yang berubah saat transaksi Kasir dapat disinkronkan, sementara harga tier, limit kredit, status, dan cabang tetap dilindungi.
- Security Rules memakai nilai default untuk field cabang yang tidak tersedia agar query valid tidak gagal karena missing field.
- Nota publik memakai Timestamp Firestore dan otomatis ditolak Rules setelah kedaluwarsa.
- Service worker cache dinaikkan ke v4.2 agar aset lama dibersihkan.
- Workflow memakai `npm install` karena paket tidak menyertakan `package-lock.json`.

## Pengujian perangkat yang tetap wajib

- Infinix Note 40 Pro+: portrait, kamera barcode, biometrik, nominal Rupiah, kasir, pembayaran, nota WhatsApp.
- Huawei MatePad SE 11: portrait/landscape, dua panel kasir, printer, multi-cabang.
- Uji putus internet saat transaksi, lalu sambungkan dan pastikan antrean menjadi tersinkron.
- Uji transaksi bersamaan dari dua perangkat pada produk yang sama.
- Uji role Owner, Manager, dan Kasir setelah Rules v4.2 dipublish.

Tidak ada pengujian yang dapat menjamin aplikasi kompleks bebas bug pada seluruh kombinasi perangkat. Gunakan data demo dahulu sebelum transaksi produksi.

## Keterbatasan verifikasi lokal

`npm install`/build Vite penuh tidak selesai di lingkungan audit karena akses registry npm mengalami timeout. Workflow GitHub sudah diperbaiki agar tidak membutuhkan `package-lock.json` dan akan melakukan instalasi, test, build web, build signed APK/AAB, serta verifikasi signature di runner GitHub.
