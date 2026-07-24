# Build & QA Report — v4.1.0

- Mode: Hybrid offline + Firebase auto-sync.
- Service worker app shell: disertakan.
- Cache database: IndexedDB.
- Queue mutasi: localStorage + mirror IndexedDB.
- Version name: 4.1.0.
- Android versionCode: 40100.
- Test inti: 34/34 lulus.
- Static parse JS/JSX/MJS: 39 file lulus.
- Relative import audit: 86 import lulus.
- Cloud Functions syntax: lulus.
- Firestore rules: role/store/branch aware; kredensial, approval, dan mutation receipt tidak dapat dibaca klien.
- Signed release workflow: APK + AAB + `apksigner` verification.

Build Vite/Android final tetap dijalankan melalui GitHub Actions karena dependency installation membutuhkan akses registry npm.
