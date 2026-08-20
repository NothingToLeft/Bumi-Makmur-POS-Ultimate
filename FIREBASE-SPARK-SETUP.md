# Firebase Spark — Setup Gratis Bumi Makmur POS v6.4.0

Project tetap memakai **Firebase Spark/free tier**. Jangan upgrade Blaze dan jangan aktifkan layanan berbayar.

## 1. Authentication

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Owner dan setiap karyawan memiliki akun Firebase Auth internal. Pembuatan karyawan dilakukan dari `Pengaturan → Karyawan` melalui secondary Auth agar sesi Owner/Manager tidak terputus. Karyawan tetap login harian memakai cabang + nama login + PIN.

## 2. Firestore

Firebase Console → Firestore Database → Create database → Production mode. Jangan membuat koleksi manual. Source memiliki `firestore.rules` dan `firestore.indexes.json` sebagai satu-satunya ruleset produksi.

Ruleset release ini memiliki marker:

```text
BUMI_MAKMUR_RULESET_VERSION=6.4.0
```

## 3. GitHub Secrets

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_STORE_ID=bumi-makmur
VITE_FIREBASE_STORE_CODE=BUMIMAKMUR02
VITE_PUBLIC_APP_URL=https://bumi-makmur.my.id
FIREBASE_SERVICE_ACCOUNT_JSON
```

Secret service account hanya digunakan GitHub Actions untuk deploy Firestore Rules/Indexes. Jangan dimasukkan ke aplikasi, Cloudflare client bundle, APK, atau source Git.

## 4. IAM service account workflow

`FIREBASE_SERVICE_ACCOUNT_JSON` memerlukan role minimum yang dapat menerbitkan Firestore Rules dan indexes, misalnya:

- Firebase Rules Admin
- Cloud Datastore Index Admin

Tidak perlu Firebase Functions, Storage, Hosting, atau billing Blaze.

## 5. Deploy Rules + Indexes — WAJIB sekali setelah upload v6.4.0

```text
GitHub → Actions → Deploy Firebase Spark Rules → Run workflow
```

Tunggu workflow hijau sebelum validasi produksi. **v6.4.0 menaikkan Firestore Rules ke marker v6.4.0** agar field QRIS Dinamis pada `branchPaymentProfiles` diizinkan dan tetap branch-scoped. Release ini juga menambah index exemption `branchPaymentProfiles.qrisImage` dan `branchPaymentProfiles.qrisPayload`, sehingga workflow wajib dijalankan setelah source v6.4.0 diunggah.

Rules mencakup:

- bootstrap Owner dan profil user;
- Owner / Store Manager / Kasir per cabang;
- `shifts` dan `cashMovements`;
- `purchaseOrders` dan histori harga;
- `supplierPriceHistory`;
- `quotations`;
- `serialNumbers` dan `warrantyClaims`;
- `approvalRequests` dan `deviceSessions`;
- QRIS per cabang;
- public receipt tersanitasi;
- mutation receipt dan audit log untuk sinkronisasi idempotent.

Workflow **hanya** men-deploy `firestore:rules,firestore:indexes`.


### Index foto Kasir v6.3.0

`firestore.indexes.json` menonaktifkan single-field index pada:

```text
products.posImage.dataUrl
products.groupPosImage.dataUrl
```

Tujuannya agar string thumbnail base64 tidak ikut membengkakkan index Firestore. Ini **bukan Firebase Storage** dan tidak membutuhkan Blaze. Workflow yang sama tetap hanya menjalankan `firestore:rules,firestore:indexes`.

Foto induk grup varian disimpan hanya pada satu child product dan digunakan sebagai fallback visual oleh sibling. Thumbnail varian hanya disimpan bila varian memang memiliki foto sendiri.

Gemini API key untuk pencarian foto tidak pernah diperlukan workflow Firebase dan tidak boleh dimasukkan ke GitHub secret tambahan untuk fitur ini. API key tetap pada perangkat pengguna.

### Index QRIS v6.4.0

`firestore.indexes.json` juga mengecualikan `branchPaymentProfiles.qrisImage` dan `branchPaymentProfiles.qrisPayload` dari single-field indexes. Keduanya tidak dipakai untuk query dan pengecualian ini mengurangi pemborosan index pada data QRIS merchant.


## 6. Authorized domains

Firebase → Authentication → Settings → Authorized domains:

```text
bumi-makmur.my.id
bumi-makmur-pos-ultimate.pages.dev
```

## 7. Jika muncul `Missing or insufficient permissions`

1. Jangan hapus antrean offline.
2. Pastikan repository sudah berisi source v6.4.0.
3. Jalankan workflow **Deploy Firebase Spark Rules** sampai hijau.
4. Keluar dan login lagi hanya bila diagnostik menyebut sesi/credential, bukan sekadar rules.
5. Buka `Pengaturan → Cloud & Backup → Sinkronkan Sekarang`.
6. Periksa pembagian antrean `akun aktif` dan `akun lain`. Queue milik akun lain hanya disinkronkan saat pemilik mutation login.
7. Pastikan antrean akun aktif turun ke 0 dan status cloud sehat. Total queue perangkat menjadi 0 setelah seluruh akun yang memiliki perubahan tertunda sempat login dan sinkron.

Jika rules sudah hijau tetapi permission masih muncul, ekspor Diagnostik Sinkronisasi dan periksa `storeId`, `branchId`, role, serta nama koleksi yang ditolak.


## Kebijakan sinkronisasi v6.4.0

- Semua data bisnis utama dan konfigurasi non-rahasia disinkronkan otomatis ke Firestore.
- Database lokal tetap dipakai sebagai cache/offline mirror agar kasir dapat bekerja tanpa internet.
- File PDF tidak diunggah ke Firebase; PDF dibuat lokal/on-demand dari data transaksi/shift.
- Gemini API key, kredensial, cache, dan state sementara perangkat tidak pernah disimpan di Firestore.
- Tidak memakai Firebase Storage, Cloud Functions, atau Blaze.
