# Native Android Notes v4.2

- Version name: `4.2.0`
- Version code: `40200`
- Package ID: `app.bumimakmur.pos`
- Kamera diminta ketika aplikasi dibuka bila pengaturan tersebut aktif.
- Biometrik memakai AndroidX Biometric dan tidak menyimpan sidik jari/wajah.
- Bluetooth, USB host, notification, network, dan camera permissions dipersiapkan oleh `scripts/prepare-android.mjs`.
- APK/AAB release ditandatangani oleh workflow GitHub Actions menggunakan keystore tetap.
