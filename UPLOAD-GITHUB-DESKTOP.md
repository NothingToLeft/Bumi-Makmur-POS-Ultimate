# Upload Bumi Makmur POS v5.2.0 melalui GitHub Desktop

## Sebelum mengganti source

1. Buka Pengaturan → Cloud & Backup → Unduh Backup.
2. Pastikan **Antrean Offline = 0**.
3. Tutup proses input transaksi pada HP, Web, dan PC.

## Menyalin source lengkap

1. Ekstrak `Bumi-Makmur-POS-FreeSync-v5.2-Smart-Inventory-Fractional-Sales-Web-PC-Android.zip`.
2. Di GitHub Desktop pilih **Repository → Show in Explorer**.
3. Salin seluruh isi hasil ekstrak ke root repository `Bumi-Makmur-POS-Ultimate`.
4. Pilih **Replace files in destination**.

Jangan memasukkan folder v5.2 sebagai subfolder. `package.json`, `src`, `.github`, `firestore.rules`, dan `electron` harus langsung berada di root.

## Commit dan push

```text
Bumi Makmur POS v5.2 Smart Inventory, Fractional Sales, and Employee Picker
```

Klik **Commit to main**, lalu **Push origin**. Banyak file berubah dan dua screen lama dihapus adalah normal.

## Pemeriksaan dan rilis

1. `Actions → Build Bumi Makmur POS v5.2.0 → test-only`.
2. Setelah hijau, jalankan `Deploy Firebase Spark Rules` — wajib untuk dropdown nama karyawan.
3. Cloudflare Pages memperbarui Web otomatis.
4. Jalankan `android-release` untuk APK/AAB.
5. Jalankan `Build Bumi Makmur POS Desktop v5.2.0 → windows-release` untuk EXE/MSI.
6. Unduh dari menu **Releases → Bumi Makmur POS v5.2.0**.
