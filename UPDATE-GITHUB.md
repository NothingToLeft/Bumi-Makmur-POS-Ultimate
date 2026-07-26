# Upload v5.0 melalui GitHub Desktop

Metode ini disarankan untuk paket source lengkap karena jumlah file memang banyak dan seluruh folder harus ikut diperbarui.

## Sebelum menyalin file

1. Di Bumi Makmur POS versi lama, unduh **Backup Hybrid ke JSON**.
2. Pastikan **Antrean Offline = 0** dan status sinkronisasi terakhir berhasil.
3. Tutup aplikasi/PWA di HP, tablet, dan PC agar tidak ada perubahan baru selama update.

## Menimpa source lokal

1. Ekstrak ZIP `Bumi-Makmur-POS-FreeSync-v5.0-Professional-Control-Center-Web-PC-Android.zip`.
2. Buka folder hasil ekstrak sampai terlihat langsung folder/file berikut:

```text
.github/
src/
public/
tests/
package.json
firestore.rules
```

3. Buka folder repository lokal `Bumi-Makmur-POS-Ultimate` yang dipakai GitHub Desktop.
4. Salin **seluruh isi** folder v5.0 ke root repository lokal tersebut.
5. Pilih **Replace the files in the destination** untuk menimpa source v4.x.

Jangan menyalin folder pembungkus v5.0 sebagai satu subfolder baru. File `package.json` dan folder `src` harus tetap berada langsung di root repository.

## Commit dan push

1. Buka GitHub Desktop dan tunggu sampai semua perubahan terbaca.
2. Banyak file berubah adalah normal karena v5.0 merupakan pembaruan source lengkap, bukan patch kecil.
3. Isi Summary:

```text
Bumi Makmur POS v5.0 Professional Control Center and QRIS Adaptive v3
```

4. Klik **Commit to main**.
5. Klik **Push origin**.

Jangan ikut menambahkan file rahasia atau hasil build lokal berikut:

```text
.env
*.jks
*.keystore
*.apk
*.aab
node_modules/
dist/
gha-creds-*.json
```

## Urutan GitHub Actions

1. Jalankan **Build Bumi Makmur POS v5.0.0 → test-only**.
2. Pastikan 77 test, audit statis, dan Vite build semuanya hijau.
3. Jalankan **Deploy Firebase Spark Rules**. Ini wajib karena v5.0 menambahkan `branchPaymentProfiles` untuk QRIS per cabang.
4. Tunggu Cloudflare Pages deployment `main` berstatus **Success**.
5. Jalankan **android-release** memakai keystore/signing secrets lama.
6. Instal APK v5.0 langsung di atas versi sebelumnya. Jangan uninstall.

## Pemeriksaan pertama setelah update

- Login Owner dan pastikan data lama masih ada.
- Pastikan tombol setup toko tidak muncul pada login normal.
- Unggah dan simpan QRIS pada setiap cabang.
- Uji QRIS dengan minimal dua aplikasi pembayaran.
- Login Store Manager dan pastikan cloud, transfer stok, QRIS cabang, serta pengelolaan Kasir normal.
- Ubah satu data uji dari Web dan HP, lalu pastikan Antrean Offline kembali 0.
