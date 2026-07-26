# Update GitHub ke v4.5.1

1. Backup data aplikasi ke JSON.
2. Ekstrak ZIP v4.5.1.
3. Upload seluruh isi folder ke repository `Bumi-Makmur-POS-Ultimate`, timpa file v4.5.
4. Commit ke branch `main` dengan pesan:

```text
Bumi Makmur POS v4.5.1 fix Store Manager cloud stock transfer scope
```

5. Jalankan **Build Bumi Makmur POS v4.5.1 → test-only**.
6. Tidak perlu deploy ulang Firestore Rules karena rules v4.5 sudah kompatibel.
7. Jalankan **android-release** untuk APK baru. Cloudflare Pages memperbarui web otomatis.
