# Memperbarui repository ke v3.3

1. Backup JSON dari APK yang sekarang bila sudah berisi data penting.
2. Ekstrak ZIP v3.3.
3. Upload seluruh isi project ke repository `Bumi-Makmur-POS-Ultimate` dan izinkan file lama diganti.
4. Pastikan dua workflow ini ada:

```text
.github/workflows/generate-signing-key.yml
.github/workflows/build-android.yml
```

5. Commit message:

```text
Add premium e-wallet payments, WhatsApp receipts and custom receipt v3.3
```

6. Jika keystore v3.2 dan empat Actions Secrets sudah dibuat, **jangan membuat keystore baru**. Langsung jalankan **Build Signed Android Release**.
7. Hanya untuk repository yang belum pernah memiliki signing key, jalankan **Generate Android Signing Key** satu kali dan ikuti `ANDROID-SIGNING-SETUP.md`.
8. Download artifact `Bumi-Makmur-POS-signed-release`.
9. Instal file APK bertanda tangan.

Jangan membuat keystore baru untuk update berikutnya. Gunakan secret dan file `.jks` yang sama selamanya untuk package `app.bumimakmur.pos`.
