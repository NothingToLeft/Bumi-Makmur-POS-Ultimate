# Setup Firebase Spark Gratis — v4.2

## 1. Layanan yang dipakai

- Firebase Authentication: Email/Password
- Cloud Firestore: lokasi `asia-southeast2`
- Firebase Hosting
- Firestore Security Rules dan Indexes

Cloud Functions dan Cloud Storage tidak digunakan.

## 2. Data awal yang harus sudah ada

```text
stores/bumi-makmur
stores/bumi-makmur/users/{UID_OWNER}
stores/bumi-makmur/branches/BM001
```

Field penting profil Owner:

```text
active: true
branchId: "BM001"
role: "owner"
storeId: "bumi-makmur"
uid: "{UID_OWNER}"
```

## 3. Authorized domain

Authentication → Settings → Authorized domains harus memuat:

```text
localhost
```

Origin ini digunakan oleh APK Capacitor.

## 4. Publish Security Rules

1. Buka Firebase Console.
2. Firestore Database → Rules.
3. Hapus aturan lama.
4. Salin seluruh isi `firestore.rules`.
5. Klik Publish.

Aturan v4.2 mengatur Owner, Manager, dan Kasir berdasarkan dokumen profil pada subcollection `users`, membatasi cabang, melindungi data komersial pelanggan, dan membatasi nota publik berdasarkan waktu kedaluwarsa.

## 5. GitHub Secrets yang dibutuhkan

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_STORE_ID=bumi-makmur
VITE_FIREBASE_STORE_CODE=BM001
VITE_PUBLIC_APP_URL=https://PROJECT_ID.web.app

ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Jangan membuat signing key baru. Gunakan keystore release yang sudah disimpan.

## 6. Login pertama

1. Instal APK v4.2.
2. Pastikan internet aktif.
3. Masuk memakai Email/Password Firebase Owner.
4. Buat PIN perangkat 4 digit.
5. Aplikasi membaca profil Owner dari Firestore dan menyiapkan data toko.
6. Setelah cache terbentuk, PIN dan biometrik dapat digunakan saat offline.

## 7. Membuat akun Manager/Kasir

Owner membuka Karyawan → Karyawan Baru, lalu mengisi email, password awal, role, cabang, dan PIN lokal opsional. Aplikasi membuat Firebase Auth melalui secondary app sehingga sesi Owner tidak terganti, kemudian membuat profil Firestore.

## 8. Kuota Spark

Gunakan laporan dan sinkronisasi secara wajar. Bila kuota harian Firestore habis, operasi cloud akan tertunda tetapi transaksi lokal tetap masuk antrean dan dicoba lagi setelah layanan tersedia.
