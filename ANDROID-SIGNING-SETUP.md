# Android Signing — Bumi Makmur POS v4.4

Package ID tetap:

```text
app.bumimakmur.pos
```

Version name: `4.4.0`  
Version code: `40400`

## Gunakan keystore lama

Android hanya menerima update di atas APK v4.3 bila package ID dan sertifikat signing sama. Pertahankan secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Workflow **Build Bumi Makmur POS v4.4** mode `android-release` atau `web-and-android` memakai key tersebut.

## Output

Artifact:

```text
Bumi-Makmur-POS-v4.4-Android-Signed
```

Berisi:

```text
app-release.apk
app-release.aab
SHA256SUMS.txt
```

Jangan uninstall APK lama sebelum mencoba update. Bila Android menolak pemasangan, hentikan dan periksa signature; jangan langsung menghapus data aplikasi.
