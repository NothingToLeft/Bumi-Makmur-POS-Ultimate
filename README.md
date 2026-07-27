# Bumi Makmur POS FreeSync v5.1.2

Satu source code untuk **Windows Desktop, Web/PWA, Android HP, dan tablet**. Rilis v5.1 berfokus pada pengalaman PC profesional, identitas toko yang dapat diganti Owner, input produk melalui scan barcode, dan layar pelanggan kedua—tanpa mengurangi fitur v5.0.

## Platform

- **Windows Desktop:** installer `.exe` (NSIS) dan `.msi`, dibuat gratis melalui GitHub Actions.
- **Web/PWA:** Cloudflare Pages.
- **Android:** APK/AAB Capacitor untuk Infinix Note 40 Pro+, Huawei MatePad SE 11, dan perangkat Android lain.
- **Cloud:** Firebase Authentication + Firestore pada Spark/free tier.
- **Offline:** IndexedDB, antrean mutasi, rebase konflik, dan sinkronisasi latar belakang.

## Fitur baru v5.1

### Desktop Windows profesional
- Mode kasir dua panel untuk monitor lebar.
- Shortcut `F2` cari produk, `F4` bayar, `F8` tahan transaksi, `F9` scan, dan `Esc` tutup dialog.
- Scanner barcode USB/Bluetooth dapat langsung mengetik ke pencarian atau kolom barcode produk.
- Layar pelanggan kedua dapat dibuka pada monitor tambahan.
- Installer Windows EXE dan MSI dibuat melalui workflow khusus.

### Nama toko dapat diganti
Owner dapat membuka:

```text
Pengaturan → Bisnis → Identitas Toko Utama
```

Nama seperti **Bumi Makmur Utama** akan diterapkan ke sidebar, login karyawan, judul aplikasi, nota, layar pelanggan, dan profil QRIS default yang masih mengikuti nama lama. Mengganti nama tidak membuat toko baru dan tidak menghapus transaksi.

### Scan barcode saat menambah produk
Pada formulir **Produk Baru**, tekan **Scan** untuk memakai kamera. Di PC, fokuskan kolom barcode lalu gunakan scanner USB/Bluetooth. Sistem memeriksa duplikasi sebelum menyimpan.

## Fitur utama yang dipertahankan

Kasir, open bill, split bill, refund, multi-harga, stok, transfer antarcabang, pembelian, retur pemasok, pelanggan, piutang, utang, kas, shift, laporan, promosi, nota digital, QRIS per cabang, Store Manager, Kasir, audit log, printer thermal, PWA, Android, dan Pusat Kontrol Operasional tetap tersedia.

## Role

- **Owner:** seluruh akses, identitas toko, cabang, Manager, Kasir, dan pengaturan global.
- **Store Manager:** operasional luas dan dapat mengelola Kasir pada cabangnya; tidak dapat mengubah identitas/global Owner atau mengelola Manager lain.
- **Kasir:** kasir dan fungsi yang diizinkan pada cabangnya.

## Upload source penuh melalui GitHub Desktop

1. Backup JSON dan pastikan antrean offline `0`.
2. Ekstrak ZIP v5.1.
3. Salin **seluruh isi** folder ke root repository lokal yang sama. Banyak file berubah adalah normal.
4. Commit dengan pesan:
   ```text
   Bumi Makmur POS v5.1 Desktop Windows, Dynamic Store Identity, and Product Barcode Scan
   ```
5. Klik **Push origin**.

## Workflow setelah push

### Pemeriksaan umum/Android

```text
Actions → Build Bumi Makmur POS v5.1.2 → test-only
```

Setelah hijau, Cloudflare Pages memperbarui Web otomatis. Firestore Rules v5.0 tetap kompatibel; jalankan **Deploy Firebase Spark Rules** hanya apabila file `firestore.rules` ikut berubah di repository.

Untuk Android:

```text
Actions → Build Bumi Makmur POS v5.1.2 → android-release
```

Instal APK langsung di atas versi lama. Jangan uninstall agar data lokal tetap tersimpan.

### Windows EXE dan MSI

```text
Actions → Build Bumi Makmur POS Desktop v5.1
→ Run workflow
→ windows-release
```

Unduh artifact:

```text
Bumi-Makmur-POS-Desktop-v5.1-Windows
```

Artifact berisi installer `.exe`, `.msi`, dan `SHA256SUMS.txt`.

## Uji penerimaan minimum

- Ubah nama toko menjadi `Bumi Makmur Utama`, simpan, logout/login, dan periksa seluruh perangkat.
- Tambah produk baru dengan kamera serta scanner fisik.
- Pastikan barcode ganda ditolak.
- Jalankan transaksi di PC memakai shortcut.
- Buka layar pelanggan kedua dan pastikan keranjang/total berubah realtime.
- Uji sinkronisasi PC–Web–Android dengan antrean offline kembali ke `0`.

## Batasan keamanan installer Windows

Installer lokal belum memakai sertifikat code-signing komersial. Windows SmartScreen dapat menampilkan peringatan publisher tidak dikenal pada instalasi pertama. Pastikan file berasal dari artifact GitHub repository sendiri dan cocokkan SHA-256.


## GitHub Releases

Setelah workflow `windows-release` berhasil, installer `.exe`, `.msi`, checksum, dan catatan rilis otomatis tersedia pada menu **Releases** repository. Workflow `android-release` menambahkan APK dan AAB ke tag versi yang sama. Actions Artifact tetap tersedia sebagai cadangan.
