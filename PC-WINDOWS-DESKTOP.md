# Bumi Makmur POS Desktop Windows v5.2.3

## Build cloud tanpa program berat

Buka GitHub:

```text
Actions → Build Bumi Makmur POS Desktop v5.2.3
→ Run workflow → windows-release
```

Unduh artifact `Bumi-Makmur-POS-Desktop-v5.2.3-Windows`.

## Isi artifact

- Installer `.exe` untuk pemasangan umum.
- Installer `.msi` untuk administrasi Windows.
- `SHA256SUMS.txt` untuk pemeriksaan integritas.

## Fitur desktop

- Mode layar lebar dua panel.
- Shortcut kasir F2/F4/F8/F9/Esc.
- Scanner USB/Bluetooth.
- Layar pelanggan kedua.
- Cloud Firebase Spark dan cache lokal yang sama dengan Web/Android.

## Catatan

Installer belum ditandatangani sertifikat komersial sehingga SmartScreen dapat memperingatkan publisher tidak dikenal. Gunakan artifact dari repository sendiri dan cocokkan checksum.


## GitHub Releases

Setelah workflow `windows-release` berhasil, installer `.exe`, `.msi`, checksum, dan catatan rilis otomatis tersedia pada menu **Releases** repository. Workflow `android-release` menambahkan APK dan AAB ke tag versi yang sama. Actions Artifact tetap tersedia sebagai cadangan.
