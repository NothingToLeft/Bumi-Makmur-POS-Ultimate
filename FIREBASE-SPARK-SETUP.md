# Firebase Spark — Setup Gratis Bumi Makmur POS v6.0.0

Project tetap memakai **Firebase Spark/free tier**. Jangan upgrade Blaze dan jangan aktifkan billing.

## 1. Authentication

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Owner dan setiap karyawan memiliki akun Auth internal. Pembuatan karyawan dilakukan dari `Pengaturan → Karyawan` melalui secondary Auth agar sesi Owner/Manager tidak keluar. Karyawan tetap login harian memakai cabang + nama + PIN.

## 2. Firestore

Firebase Console → Firestore Database → Create database → Production mode. Jangan membuat koleksi manual. Aplikasi dan workflow memakai `firestore.rules` dan `firestore.indexes.json` dari source.

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

Secret service account hanya untuk workflow deploy rules. Jangan masukkan ke Cloudflare, aplikasi, atau source.

## 4. IAM service account workflow

Service account pada `FIREBASE_SERVICE_ACCOUNT_JSON` memerlukan:

- Firebase Rules Admin
- Cloud Datastore Index Admin

Tidak perlu role Owner dan tidak perlu billing.

## 5. Deploy Rules Business Suite — tidak berubah pada v6.0.0

```text
Actions → Deploy Firebase Spark Rules → Run workflow
```

Rules v5.8 mencakup:

- bootstrap Owner, user profile, dan direktori login aman;
- batas role/cabang Owner, Manager, Kasir;
- `branchPaymentProfiles` QRIS per cabang;
- `purchaseOrders`, price history, approval, device session;
- `supplierPriceHistory` append-only;
- `quotations` scoped per branch;
- `serialNumbers` dan `warrantyClaims`;
- transisi serial Kasir `IN_STOCK → SOLD` hanya ketika terikat sale miliknya;
- audit mutation dan mutation receipt untuk sinkronisasi idempotent.

Workflow hanya men-deploy Firestore Rules dan indexes. Tidak ada Functions, Storage, atau Firebase Hosting.

**v6.0.0 tidak menambah koleksi Firestore untuk AI ataupun file laporan.** Gemini API key hanya disimpan lokal pada perangkat. PDF closing dibuat client-side dan dibagikan/download tanpa Firebase Storage.

## 6. Authorized domain

Firebase → Authentication → Settings → Authorized domains:

```text
bumi-makmur.my.id
bumi-makmur-pos-ultimate.pages.dev
```

## 7. Saat muncul masalah izin

- Pastikan workflow Rules v5.8.0 atau lebih baru sudah hijau. v6.0.0 tidak menambah kebutuhan rules untuk AI Product Capture atau closing PDF.
- Logout/login ulang melalui role yang benar.
- Pastikan `VITE_FIREBASE_STORE_ID` dan `VITE_FIREBASE_STORE_CODE` tidak berubah dari toko produksi.
- Buka `Pengaturan → Cloud & Backup`; periksa nama koleksi pada Diagnostik Sinkronisasi.
- Jangan menghapus antrean offline secara manual. Sinkronkan sampai antrean 0.
