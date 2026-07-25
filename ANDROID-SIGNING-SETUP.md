# Android Signing — Bumi Makmur POS Hybrid v4.1

Android hanya menerima update jika package ID dan sertifikat signing sama. Package ID tetap:

```text
app.bumimakmur.pos
```

## Gunakan keystore lama

Jika release v3.2/v3.3/v4.0 sudah pernah dibuat, **jangan membuat keystore baru**. Pertahankan empat GitHub Actions secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Workflow **Build Signed Android Hybrid Release** menggunakan key tersebut untuk menghasilkan APK dan AAB v4.1.

## Bila belum pernah memiliki release key

1. Jalankan workflow **Generate Android Signing Key** satu kali.
2. Download artifact `Bumi-Makmur-POS-signing-key-KEEP-SAFE` sebelum kedaluwarsa.
3. Simpan file `.jks` minimal di dua tempat aman.
4. Masukkan empat nilai dari `SIGNING-SECRETS.txt` sebagai Repository secrets.
5. Hapus artifact setelah key dan secrets dicadangkan.

## Output build

Artifact:

```text
Bumi-Makmur-POS-Hybrid-signed-release
```

Isinya:

```text
Bumi-Makmur-POS-Hybrid-v4.1.0-signed.apk
Bumi-Makmur-POS-Hybrid-v4.1.0-signed.aab
SHA256SUMS.txt
SIGNING-CERTIFICATE.txt
INSTALL-NOTES.txt
```

## Update dari APK debug

APK debug memakai sertifikat berbeda. Jika Android menolak update debug ke release:

1. Backup JSON dari versi lama.
2. Pastikan seluruh antrean offline sudah tersinkron.
3. Hapus APK debug satu kali.
4. Instal APK release v4.1.
5. Login dan restore backup bila diperlukan.

Sesudah release key tetap digunakan, update berikutnya tidak memerlukan uninstall.
