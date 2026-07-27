# Build & QA Report — Bumi Makmur POS v5.1.2

## Ruang lingkup perbaikan

- Tombol sinkronisasi Desktop/Windows yang sebelumnya tampak sebagai kotak putih kosong.
- Editor nama, alamat, dan telepon pada setiap cabang.
- Identitas aplikasi, nota, layar pelanggan, dan login mengikuti cabang aktif.
- Pemisahan identitas cabang dari nama brand/grup usaha.
- Snapshot identitas cabang pada transaksi agar nota lama tidak berubah setelah cabang diganti nama.

## Pemeriksaan yang dijalankan

- Core test Node: **85/85 lulus**.
- Static audit: **lulus**.
- File JS/JSX/MJS yang diperiksa audit: **63**.
- File JSON valid: **4**.
- Pemeriksaan import relatif, file wajib, layanan berbayar terlarang, dan kemungkinan secret: **lulus**.

## Kompilasi final

Instalasi dependency dan kompilasi Vite tidak dijalankan pada lingkungan penyusunan karena dependency registry tidak tersedia secara andal. Jalankan workflow GitHub Actions **test-only** setelah source di-push. Workflow tersebut menjadi pemeriksaan kompilasi Vite final sebelum Windows/Android release dibuat.

## Kompatibilitas data

- Tidak mengubah package ID Android atau app ID Desktop.
- Tidak menghapus data lokal, akun, transaksi, cabang, maupun konfigurasi Firebase.
- APK/EXE/MSI v5.1.2 dapat dipasang sebagai pembaruan di atas versi sebelumnya.
- Firestore Rules tidak berubah pada hotfix ini dan tidak perlu deploy ulang.
