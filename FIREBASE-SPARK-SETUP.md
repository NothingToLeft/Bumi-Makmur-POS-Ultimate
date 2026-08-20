# Firebase Spark — Setup Gratis Bumi Makmur POS v6.0.3

Project tetap memakai **Firebase Spark/free tier**. Jangan upgrade Blaze dan jangan aktifkan layanan berbayar.

## 1. Authentication

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Owner dan setiap karyawan memiliki akun Firebase Auth internal. Pembuatan karyawan dilakukan dari `Pengaturan → Karyawan` melalui secondary Auth agar sesi Owner/Manager tidak terputus. Karyawan tetap login harian memakai cabang + nama login + PIN.

## 2. Firestore

Firebase Console → Firestore Database → Create database → Production mode. Jangan membuat koleksi manual. Source memiliki `firestore.rules` dan `firestore.indexes.json` sebagai satu-satunya ruleset produksi.

Ruleset release ini memiliki marker:

```text
BUMI_MAKMUR_RULESET_VERSION=6.1.0
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

## 5. Deploy Rules — WAJIB setelah upload v6.0.3

```text
GitHub → Actions → Deploy Firebase Spark Rules → Run workflow
```

Tunggu workflow hijau **sebelum** menganggap cloud sehat. v6.0.3 menampilkan peringatan khusus bila aplikasi menerima `permission-denied`, sehingga status tidak lagi terlihat hijau palsu ketika antrean gagal dikirim.

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

## 6. Authorized domains

Firebase → Authentication → Settings → Authorized domains:

```text
bumi-makmur.my.id
bumi-makmur-pos-ultimate.pages.dev
```

## 7. Jika muncul `Missing or insufficient permissions`

1. Jangan hapus antrean offline.
2. Pastikan repository sudah berisi source v6.0.3.
3. Jalankan workflow **Deploy Firebase Spark Rules** sampai hijau.
4. Keluar dan login lagi hanya bila diagnostik menyebut sesi/credential, bukan sekadar rules.
5. Buka `Pengaturan → Cloud & Backup → Sinkronkan Sekarang`.
6. Periksa pembagian antrean `akun aktif` dan `akun lain`. Queue milik akun lain hanya disinkronkan saat pemilik mutation login.
7. Pastikan antrean akun aktif turun ke 0 dan status cloud sehat. Total queue perangkat menjadi 0 setelah seluruh akun yang memiliki perubahan tertunda sempat login dan sinkron.

Jika rules sudah hijau tetapi permission masih muncul, ekspor Diagnostik Sinkronisasi dan periksa `storeId`, `branchId`, role, serta nama koleksi yang ditolak.


## Kebijakan sinkronisasi v6.1.0

- Semua data bisnis utama dan konfigurasi non-rahasia disinkronkan otomatis ke Firestore.
- Database lokal tetap dipakai sebagai cache/offline mirror agar kasir dapat bekerja tanpa internet.
- File PDF tidak diunggah ke Firebase; PDF dibuat lokal/on-demand dari data transaksi/shift.
- Gemini API key, kredensial, cache, dan state sementara perangkat tidak pernah disimpan di Firestore.
- Tidak memakai Firebase Storage, Cloud Functions, atau Blaze.
