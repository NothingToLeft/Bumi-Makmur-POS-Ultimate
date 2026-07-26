# Upload v5.1 melalui GitHub Desktop

## Sebelum mengganti source

1. Pada aplikasi lama, buka Pengaturan → Sistem → Backup JSON.
2. Pastikan status cloud tersambung dan antrean offline `0`.
3. Tutup aplikasi Web/PC/Android yang sedang melakukan input.

## Menyalin source lengkap

1. Ekstrak `Bumi-Makmur-POS-FreeSync-v5.1-Desktop-Windows-Web-Android.zip`.
2. Buka repository lokal `Bumi-Makmur-POS-Ultimate` melalui GitHub Desktop.
3. Pilih **Repository → Show in Explorer**.
4. Salin seluruh isi folder v5.1 ke root repository tersebut dan pilih **Replace**.

Jangan memasukkan folder v5.1 sebagai subfolder. `package.json`, `src`, `.github`, dan `electron` harus langsung berada di root repository.

## Commit dan push

Banyak file berubah adalah normal karena ini rilis source lengkap untuk Windows, Web, dan Android.

Pesan commit yang disarankan:

```text
Bumi Makmur POS v5.1 Desktop Windows, Dynamic Store Identity, and Product Barcode Scan
```

Klik **Commit to main**, lalu **Push origin**.

## Pemeriksaan dan rilis

1. `Actions → Build Bumi Makmur POS v5.1.0 → test-only`.
2. Pastikan test, audit, dan Vite build hijau.
3. Cloudflare Pages akan memperbarui Web otomatis.
4. Untuk Android jalankan mode `android-release`.
5. Untuk PC jalankan `Actions → Build Bumi Makmur POS Desktop v5.1 → windows-release`.
6. Unduh artifact Windows yang berisi EXE, MSI, dan checksum.

Firestore Rules v5.0 tetap kompatibel dengan fitur v5.1. Deploy rules hanya diperlukan ketika `firestore.rules` berubah pada commit Anda.
