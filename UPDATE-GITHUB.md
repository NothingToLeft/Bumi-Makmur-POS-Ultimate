# Memperbarui Repository ke Bumi Makmur POS Hybrid v4.1

1. Backup JSON dari APK lama bila ada data operasional.
2. Ekstrak ZIP v4.1.
3. Upload seluruh isi ke repository yang sama dan timpa file lama.
4. Pastikan `.github/workflows`, `functions`, `public/sw.js`, `src/services/offlineStore.js`, dan `src/services/syncEngine.js` ikut terunggah.
5. Commit:

```text
Migrate Bumi Makmur POS to Hybrid Offline Auto-Sync Enterprise v4.1
```

6. Pertahankan Firebase secrets dan Android signing secrets yang lama.
7. Jalankan workflow **Deploy Firebase Cloud Backend** agar Functions dan Rules v4.1 terpasang.
8. Jalankan workflow **Build Signed Android Hybrid Release**.
9. Download artifact `Bumi-Makmur-POS-Hybrid-signed-release`.
10. Instal sebagai update dan uji pada HP serta tablet.

Jangan membuat signing key baru. Package ID dan sertifikat harus tetap sama agar Android menerima update aplikasi.
