# Android Signing — Bumi Makmur POS v4.3

Android hanya menerima update jika package ID dan sertifikat signing sama. Package ID tetap:

```text
app.bumimakmur.pos
```

## Gunakan keystore lama

Jangan membuat keystore baru jika release sebelumnya sudah pernah dibuat. Pertahankan:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Workflow **Build Bumi Makmur POS v4.3** dengan mode `android-release` atau `web-and-android` memakai key tersebut.

## Bila belum pernah memiliki release key

1. Jalankan **Generate Android Signing Key** satu kali.
2. Download artifact sebelum masa simpan 1 hari habis.
3. Simpan `.jks` minimal di dua tempat aman.
4. Masukkan empat nilai dari `SIGNING-SECRETS.txt` sebagai Repository secrets.
5. Jangan commit `.jks` atau isi secrets.

## Output

Artifact:

```text
Bumi-Makmur-POS-v4.3-Android-Signed
```

Isinya:

```text
app-release.apk
app-release.aab
SHA256SUMS.txt
```

Jika APK lama memakai debug certificate, backup JSON dan pastikan antrean sinkron kosong sebelum uninstall satu kali. Setelah release key tetap digunakan, update berikutnya dapat dipasang tanpa uninstall.
