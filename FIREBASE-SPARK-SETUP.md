# Firebase Spark — Setup Gratis Bumi Makmur POS v4.5

Project tetap memakai **Firebase Spark/free tier**. Jangan upgrade Blaze dan jangan aktifkan billing.

## 1. Authentication

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Owner dan setiap karyawan memiliki akun Auth masing-masing. Pembuatan karyawan dilakukan dari `Pengaturan → Karyawan`; aplikasi memakai instance Auth sekunder agar sesi Owner tidak keluar.

## 2. Firestore

Firebase Console → Firestore Database → Create database → Production mode.

Jangan membuat koleksi manual. Setup Owner pertama membuat dokumen bootstrap, profil Owner, dan seed database.

## 3. GitHub Secrets build

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

## 4. Deploy rules v4.5 — wajib

Setelah source v4.5 di-upload:

```text
Actions → Deploy Firebase Spark Rules → Run workflow
```

Rules v4.5 memperbaiki:

- pembacaan bootstrap pertama oleh pengguna yang sudah login;
- pembacaan profil sendiri sebelum `activeMember()` dapat dievaluasi;
- pembuatan profil Owner atomik;
- pembuatan Manager/Kasir oleh Owner;
- pembuatan Kasir oleh Store Manager pada cabang sendiri;
- direktori login nama + PIN per cabang dan daftar cabang login tersanitasi;
- perlindungan agar Owner tidak berubah menjadi karyawan.

Workflow hanya men-deploy:

```text
firestore.rules
firestore.indexes.json
```

Tidak ada Functions, Storage, Hosting Firebase, Blaze, atau billing.

## 5. Alur akun

### Owner

1. Pilih `Login Owner`.
2. Setup Toko Pertama Kali hanya untuk database yang benar-benar baru.
3. Pada perangkat berikutnya pilih `Masuk Owner dengan Email`.
4. Setelah terhubung, login harian memakai PIN/biometrik.

### Karyawan

1. Owner masuk → Pengaturan → Karyawan → Karyawan Baru.
2. Isi nama lengkap, nama login, role, cabang, dan PIN awal 4 digit.
3. Pada perangkat karyawan pilih `Login Karyawan`.
4. Pilih toko/cabang, masukkan nama login, lalu PIN yang dibuat Owner/Manager.
5. Store Manager masuk melalui halaman Karyawan dan hanya dapat mengelola Kasir pada cabangnya.
6. Sidik jari/Face ID dapat diaktifkan setelah login; dialog hanya muncul ketika tombol biometrik ditekan.

## 6. Saat muncul masalah izin

- Pastikan workflow Deploy Firebase Spark Rules sudah hijau.
- Pastikan akun masuk melalui halaman role yang benar.
- Pastikan kode toko, `VITE_FIREBASE_STORE_ID`, dan project Firebase sama.
- Gunakan Pengaturan → Cloud & Backup untuk melihat status sinkronisasi.
