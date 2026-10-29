# Setup Firebase Hybrid — Bumi Makmur POS v4.1

Panduan ini dilakukan satu kali sebelum APK Hybrid digunakan.

## A. Buat proyek Firebase

1. Buka Firebase Console dan buat proyek baru, misalnya `bumi-makmur-pos`.
2. Tambahkan **Web App**.
3. Aktifkan:
   - Authentication
   - Cloud Firestore
   - Cloud Functions
   - Cloud Storage
   - Hosting
4. Pilih region Firestore yang dekat dengan operasional toko. Cloud Functions project ini menggunakan `asia-southeast2`.

## B. Siapkan komputer atau Cloud Shell

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

Pilih project Firebase lalu beri alias `default`.

## C. Pasang dua Functions secrets

Buat nilai acak panjang dan simpan aman.

```bash
firebase functions:secrets:set PIN_PEPPER
firebase functions:secrets:set BOOTSTRAP_SECRET
```

- `PIN_PEPPER`: rahasia HMAC untuk pencarian PIN tanpa menyimpan PIN mentah.
- `BOOTSTRAP_SECRET`: kode satu kali yang diperlukan saat membuat database toko pertama.

Jangan memasukkan kedua nilai ini ke source code atau `.env` frontend.

## D. Isi environment frontend

Salin `.env.example` menjadi `.env` untuk pengujian lokal. Isi dari konfigurasi Web App Firebase:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=PROJECT_ID.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORE_ID=bumi-makmur
VITE_FIREBASE_STORE_CODE=BUMIMAKMUR
VITE_FIREBASE_FUNCTIONS_REGION=asia-southeast2
VITE_PUBLIC_APP_URL=https://PROJECT_ID.web.app
```

`STORE_ID` dan `STORE_CODE` jangan diganti setelah toko dibuat.

## E. Deploy backend dan hosting pertama kali

```bash
npm install
cd functions
npm install
cd ..
npm run build
firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting
```

Pastikan semua deploy selesai tanpa error.

## F. Bootstrap toko pertama

1. Buka URL Firebase Hosting atau APK Hybrid.
2. Tekan **Setup cloud pertama kali**.
3. Isi kode toko, nama usaha, cabang utama, Owner, PIN Owner, dan `BOOTSTRAP_SECRET`.
4. Tekan **Buat Database Cloud**.
5. Setelah berhasil, Owner langsung masuk dan data awal tersimpan di Firestore.

Bootstrap hanya dapat dijalankan sekali untuk kombinasi `STORE_ID` dan `STORE_CODE` yang sama.

## G. Buat karyawan

Masuk sebagai Owner lalu buka **Karyawan**. Pembuatan Manager/Kasir akan:

- Membuat Firebase Auth user.
- Menulis profil publik tanpa PIN.
- Menyimpan hash PIN di koleksi privat yang tidak dapat dibaca klien.
- Menetapkan custom claims store, role, dan cabang.

## H. GitHub Actions Secrets

Buka repository > **Settings > Secrets and variables > Actions**. Tambahkan:

### Firebase build secrets

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_STORE_ID
VITE_FIREBASE_STORE_CODE
VITE_FIREBASE_FUNCTIONS_REGION
VITE_PUBLIC_APP_URL
```

### Firebase deploy secret

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

Isi dengan JSON service account yang memiliki izin deploy Firebase. Jangan unggah file JSON tersebut ke repository.

### Android signing secrets

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Gunakan nilai keystore release yang sama dengan versi APK sebelumnya.

## I. Workflow

- **Deploy Firebase Cloud Backend**: deploy rules, indexes, Storage, Functions, dan Hosting.
- **Build Signed Android Hybrid Release**: test, build web, build APK/AAB, dan verifikasi signature.

Jalankan deploy Firebase terlebih dahulu, kemudian build APK.

## J. Pemeriksaan setelah setup

1. Login Owner dari HP.
2. Login akun berbeda dari tablet.
3. Tambah produk di satu perangkat dan pastikan muncul realtime di perangkat lain.
4. Jalankan penjualan dan periksa stok, shift, transaksi, dan laporan.
5. Upload logo serta QRIS dan pastikan URL Storage dapat dibaca aplikasi.
6. Kirim nota WhatsApp dan buka tautan nota online.
7. Login online minimal sekali, lalu putuskan internet dan pastikan transaksi operasional tetap tersimpan pada cache lokal.
8. Sambungkan internet kembali dan pastikan antrean dikirim otomatis, data muncul di perangkat lain, serta jumlah pending sync kembali nol.
