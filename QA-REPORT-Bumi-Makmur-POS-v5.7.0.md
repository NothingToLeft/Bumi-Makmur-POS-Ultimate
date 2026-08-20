# QA Report — Bumi Makmur POS v5.7.0

## Area yang diaudit

### Scanner kamera
- Kamera depan/belakang.
- Pilih device/lensa.
- Fallback saat device tersimpan tidak tersedia.
- Fokus kontinu bila didukung.
- Torch/flash bila didukung.
- Zoom bila didukung.
- Scan dari foto.
- Debounce hasil kamera.
- Bunyi/getar hasil scan.
- Mode Scan Cepat.

### Integrasi operasional
- Kasir.
- Tambah barang standar.
- Produk varian.
- Product Picker untuk pembelian/restok, penyesuaian, transfer, dan modul terkait.
- Shared barcode dan pemilih varian.
- Scanner USB/Bluetooth.
- Tes Scanner pada Pengaturan.

### Regression
- 134 core/regression tests lulus.
- Audit secret/layanan berbayar lulus.
- Source JS/MJS/CJS dan JSX tidak memiliki error parser pada pemeriksaan lokal.

## Pemeriksaan yang tetap wajib di GitHub Actions

1. `test-only` — memastikan install dependency dan Vite production build berhasil.
2. `android-release` — memastikan Capacitor/Gradle dan kamera Android release berhasil.
3. `windows-release` — memastikan Electron EXE/MSI berhasil dibuat.

Tidak perlu deploy ulang Firestore Rules karena v5.7.0 tidak mengubah aturan cloud.
