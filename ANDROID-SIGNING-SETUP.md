# Android Signing v4.2

Project menggunakan package ID:

```text
app.bumimakmur.pos
```

Workflow **Build Signed Android Spark Free Hybrid Release** membaca empat repository secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Keystore dan password tidak boleh dimasukkan ke repository. Jangan menjalankan generator signing key lagi. Semua pembaruan harus memakai keystore yang sama agar Android menerima update di atas APK lama.

Artifact berisi:

```text
Bumi-Makmur-POS-Spark-Free-Hybrid-v4.2.0-signed.apk
Bumi-Makmur-POS-Spark-Free-Hybrid-v4.2.0-signed.aab
SHA256SUMS.txt
SIGNING-CERTIFICATE.txt
INSTALL-NOTES.txt
```
