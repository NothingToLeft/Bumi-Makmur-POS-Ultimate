# Firebase Spark — Setup Gratis Bumi Makmur POS v5.0

Project tetap memakai **Firebase Spark/free tier**. Jangan upgrade Blaze dan jangan aktifkan billing.

## 1. Authentication

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Owner dan setiap karyawan memiliki akun Auth internal. Pembuatan karyawan dilakukan dari `Pengaturan → Karyawan` melalui secondary Auth agar sesi Owner/Manager tidak keluar. Karyawan tetap login harian memakai cabang + nama + PIN.

## 2. Firestore

Firebase Console → Firestore Database → Create database → Production mode. Jangan membuat koleksi manual. Aplikasi dan workflow akan menggunakan rules/indexes source.

## 3. GitHub Secrets

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_STORE_ID=bumi-makmur
VITE_FIREBASE_STORE_CODE=BUMIMAKMUR02
VITE_PUBLIC_APP_URL=https://bumi-makmur-pos-ultimate.pages.dev
FIREBASE_SERVICE_ACCOUNT_JSON
```

Secret service account hanya untuk workflow deploy rules. Jangan masukkan ke Cloudflare atau source.

## 4. IAM service account workflow

Service account pada `FIREBASE_SERVICE_ACCOUNT_JSON` memerlukan:

- Firebase Rules Admin
- Cloud Datastore Index Admin

Tidak perlu role Owner dan tidak perlu billing.

## 5. Deploy rules v5 — wajib

```text
Actions → Deploy Firebase Spark Rules → Run workflow
```

Rules v5 mencakup:

- bootstrap Owner dan profil sendiri;
- direktori login nama + PIN serta daftar cabang aman;
- batas role Owner/Manager/Kasir;
- transfer Manager berdasarkan cabang sumber/tujuan;
- koleksi `branchPaymentProfiles` per cabang;
- batas data URL QRIS maksimal 600.000 karakter;
- Manager hanya dapat menulis profil pembayaran cabangnya.

Workflow hanya men-deploy `firestore.rules` dan `firestore.indexes.json`. Tidak ada Functions, Storage, atau Hosting Firebase.

## 6. Authorized domain

Firebase → Authentication → Settings → Authorized domains:

```text
bumi-makmur-pos-ultimate.pages.dev
```

## 7. Saat muncul masalah izin

- Pastikan workflow rules dari commit v5 sudah hijau.
- Logout lalu login kembali melalui role yang benar.
- Pertahankan nilai `VITE_FIREBASE_STORE_ID` dan `VITE_FIREBASE_STORE_CODE` yang sudah dipakai toko (untuk instalasi ini: `BUMIMAKMUR02`) pada GitHub dan Cloudflare.
- Buka `Pengaturan → Cloud & Backup` dan pastikan antrean 0.
