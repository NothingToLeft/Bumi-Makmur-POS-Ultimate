# Cara memperbarui repository GitHub

1. Ekstrak ZIP v3.1.
2. Buka repository `Bumi-Makmur-POS-Ultimate` di GitHub.
3. Upload seluruh isi folder v3.1 dan izinkan file lama diganti.
4. Pastikan folder `.github/workflows/build-android.yml` tetap ada.
5. Commit message:

```text
Fix price input, markup percentage, login and transaction bugs v3.1
```

6. Buka tab **Actions** dan tunggu workflow **Build Web and Android APK** menjadi hijau.
7. Download artifact `Bumi-Makmur-POS-debug-apk`, ekstrak, lalu instal `app-debug.apk`.

Data lokal pada APK lama tidak dijamin otomatis berpindah ke APK debug baru jika Android memperlakukan paket/signature berbeda. Gunakan menu Backup JSON sebelum mengganti aplikasi bila sudah ada data penting.
