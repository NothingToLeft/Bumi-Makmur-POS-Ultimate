# Firebase Spark — Setup Gratis Bumi Makmur POS v4.3

Project Firebase yang dipakai: `bumi-makmur-pos`. Jangan upgrade Blaze dan jangan mengaktifkan billing.

## 1. Authentication

Firebase Console → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.

Jangan aktifkan Email link jika tidak dibutuhkan.

## 2. Firestore

Firebase Console → Firestore Database → Create database → Production mode → pilih lokasi yang sesuai dan tersedia untuk project.

Setelah database dibuat, jangan membuat koleksi manual. Setup Owner pertama dari aplikasi akan membuat struktur toko.

## 3. GitHub Secrets untuk build

Tambahkan di Repository → Settings → Secrets and variables → Actions:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_STORE_ID=bumi-makmur
VITE_FIREBASE_STORE_CODE=BUMIMAKMUR
VITE_PUBLIC_APP_URL=https://NAMA-PROJECT.pages.dev
```

`VITE_PUBLIC_APP_URL` boleh diperbarui setelah URL Cloudflare Pages diketahui.

## 4. Deploy rules gratis

Jalankan GitHub Actions:

```text
Deploy Firebase Spark Rules → Run workflow → main
```

Workflow hanya men-deploy:

```text
firestore.rules
firestore.indexes.json
```

Ia tidak men-deploy Functions, Storage, atau Hosting.

`FIREBASE_SERVICE_ACCOUNT_JSON` yang sudah dibuat tetap dapat dipakai untuk workflow rules. Jangan commit file JSON tersebut ke repository.

## 5. Setup toko pertama

Buka web/APK saat online → `Setup Toko Pertama Kali` → masukkan identitas toko, email Owner, password, dan PIN perangkat.

Sesudah setup:

- akun karyawan dibuat Owner dengan email dan password sementara;
- karyawan memilih `Hubungkan Akun Cloud` sekali pada perangkatnya;
- setelah itu login harian memakai PIN 4 digit atau biometrik;
- saat offline data tetap masuk antrean lokal dan dikirim otomatis ketika online.

## Batas desain Spark-only

- Logo dan QRIS dikompres sebagai Data URL dengan batas ketat agar dokumen Firestore tetap kecil.
- Nota online tersimpan sebagai dokumen Firestore yang sudah disanitasi dan tidak berisi harga modal.
- Operasi sensitif dilindungi Authentication, role/branch Security Rules, audit log, dan approval Manager/Owner.
