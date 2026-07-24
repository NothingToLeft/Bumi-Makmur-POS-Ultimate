# Setup Tanda Tangan APK Bumi Makmur POS

## Mengapa perlu dilakukan sekali

Android hanya menerima update aplikasi jika package ID dan sertifikat signing-nya cocok. Karena itu, semua rilis Bumi Makmur POS setelah v3.2 harus memakai keystore yang sama.

## Tahap A — Buat keystore di GitHub

1. Upload project v3.2 ke repository GitHub.
2. Buka tab **Actions**.
3. Pilih workflow **Generate Android Signing Key**.
4. Klik **Run workflow**.
5. Setelah hijau, download artifact:

```text
Bumi-Makmur-POS-signing-key-KEEP-SAFE
```

Artifact hanya disimpan GitHub selama satu hari.

## Tahap B — Simpan file rahasia

Ekstrak artifact. Isinya:

- `bumi-makmur-upload.jks`
- `SIGNING-SECRETS.txt`
- `CERTIFICATE-INFO.txt`
- `BACA-SAYA.txt`

Simpan `.jks` minimal di dua tempat aman. Jangan unggah file ini ke repository, chat publik, Drive publik, atau grup pesan.

## Tahap C — Tambahkan GitHub Actions Secrets

Buka:

```text
Repository → Settings → Secrets and variables → Actions
```

Klik **New repository secret** dan buat empat secret dari `SIGNING-SECRETS.txt`:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Salin nilainya persis tanpa spasi tambahan.

## Tahap D — Build release

1. Buka tab **Actions**.
2. Pilih **Build Signed Android Release**.
3. Klik **Run workflow** atau lakukan commit baru ke branch `main`.
4. Setelah hijau, download artifact:

```text
Bumi-Makmur-POS-signed-release
```

Isinya:

- `Bumi-Makmur-POS-v3.2.0-signed.apk`
- `Bumi-Makmur-POS-v3.2.0-signed.aab`
- `SHA256SUMS.txt`
- `SIGNING-CERTIFICATE.txt`
- `INSTALL-NOTES.txt`

## Peralihan dari APK debug lama

APK debug yang sebelumnya dibangun memakai debug certificate. APK release v3.2 memakai release certificate baru. Karena sertifikat berbeda, lakukan:

1. Backup JSON dari APK lama.
2. Simpan backup di luar aplikasi.
3. Hapus APK debug lama bila Android menolak update.
4. Instal APK release v3.2.
5. Restore JSON.

Langkah uninstall hanya diperlukan saat berpindah dari debug key ke release key. Setelah itu, jangan mengganti atau kehilangan keystore.
