# Catatan Android Native

Project menggunakan Capacitor agar satu source web dapat dibungkus menjadi APK Android.

Permission yang disiapkan:

- CAMERA
- INTERNET
- ACCESS_NETWORK_STATE
- POST_NOTIFICATIONS
- BLUETOOTH / BLUETOOTH_ADMIN untuk Android lama
- BLUETOOTH_SCAN / BLUETOOTH_CONNECT untuk Android 12+
- USB host sebagai fitur opsional

Tahap native berikutnya:

1. Pasang adapter barcode kamera native bila BarcodeDetector browser tidak memadai.
2. Pasang adapter ESC/POS Bluetooth, USB, dan LAN.
3. Tambahkan print queue, retry, timeout, dan test profile per printer.
4. Tambahkan biometric credential Android bila login biometrik benar-benar diperlukan.
5. Tambahkan Firebase Auth/Firestore melalui environment dan repository adapter.
6. Uji pada Infinix Note 40 Pro+ serta Huawei MatePad SE 11 portrait/landscape.
