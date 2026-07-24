# Catatan Android Native v3.3

Project menggunakan Capacitor agar source React yang sama dapat dibungkus menjadi APK Android.

## Fitur native yang sudah dipasang

- Permission CAMERA dan permintaan izin runtime sejak startup.
- Pemeriksaan status permission dan pintasan membuka Pengaturan Aplikasi Android.
- AndroidX BiometricPrompt untuk sidik jari atau pengenalan wajah.
- Release signing hook dengan keystore tetap dari GitHub Actions Secrets.
- Version code/version name otomatis dari `VERSION.txt`.
- Verifikasi APK memakai `apksigner`.

## Permission Android

- CAMERA
- INTERNET
- ACCESS_NETWORK_STATE
- POST_NOTIFICATIONS
- USE_BIOMETRIC / USE_FINGERPRINT untuk Android lama
- BLUETOOTH / BLUETOOTH_ADMIN untuk Android lama
- BLUETOOTH_SCAN / BLUETOOTH_CONNECT untuk Android 12+
- USB host, kamera, dan fingerprint sebagai fitur perangkat opsional

## Adapter yang masih memerlukan pengembangan perangkat-spesifik

1. Scanner barcode native khusus jika `BarcodeDetector` WebView tidak tersedia pada model tertentu.
2. ESC/POS Bluetooth, USB, dan LAN yang diuji per merek/model printer.
3. Print queue, retry, timeout, dan profil command set printer.
4. Firebase Auth/Firestore menggunakan konfigurasi proyek milik pengguna.
5. Pengujian fisik menyeluruh pada Infinix Note 40 Pro+ dan Huawei MatePad SE 11.
