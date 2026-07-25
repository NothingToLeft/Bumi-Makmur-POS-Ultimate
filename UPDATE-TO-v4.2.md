# Memperbarui Repository ke v4.2

1. Backup JSON dari APK lama.
2. Ekstrak ZIP v4.2.
3. Upload seluruh isi ke root repository yang sama. `package.json` harus berada di root.
4. Pastikan `.github/workflows/build-android.yml` ikut diganti.
5. Commit:

```text
Upgrade to Firebase Spark Free Hybrid v4.2 and fix sync bugs
```

6. Salin `firestore.rules` ke Firebase Console dan Publish.
7. Jalankan **Build Signed Android Spark Free Hybrid Release**.
8. Download artifact signed release dan instal APK.
9. Login pertama menggunakan Email/Password Firebase, lalu buat PIN perangkat.

Jangan menjalankan **Generate Android Signing Key** lagi.
