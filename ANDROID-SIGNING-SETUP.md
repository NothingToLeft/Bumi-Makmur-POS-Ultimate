# Android Signing — Bumi Makmur POS v5.6.1

Gunakan keystore yang sama dengan v4.x/v5.x agar APK v5.6.1 dapat dipasang sebagai pembaruan tanpa uninstall.

- Package ID: `app.bumimakmur.pos`
- Version name: `5.6.1`
- Workflow: **Build Bumi Makmur POS v5.6.1**
- Mode: `android-release` atau `web-and-android`

GitHub Secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Artifact:

```text
Bumi-Makmur-POS-v5.6.1-Android-Signed
```

Jangan mengunggah `.jks`, password, atau base64 ke repository.
