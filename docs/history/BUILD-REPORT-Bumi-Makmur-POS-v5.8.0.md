# Build Report — Bumi Makmur POS FreeSync v5.8.0

Tanggal audit source: 19 Agustus 2026

## Status validasi

| Pemeriksaan | Hasil |
|---|---|
| Core/regression tests | **161/161 PASS** |
| Static project audit | **PASS** |
| JS/JSX parser seluruh `src` | **PASS** |
| Node syntax Electron main/preload | **PASS** |
| Node syntax prepare Android/audit/business insights | **PASS** |
| GitHub Actions YAML | **PASS** |
| JSON package/capacitor/firebase | **PASS** |
| Vite production build lokal | **Tidak dijalankan: dependency registry tidak tersedia** |
| Android Gradle APK/AAB lokal | **Tidak tersedia: Android SDK/ADB tidak ada** |
| Windows EXE/MSI lokal | **Tidak tersedia pada container Linux** |

## Environment audit

- Node.js: v22.16.0
- npm: 10.9.2
- Java: OpenJDK 21
- Android SDK / `ANDROID_HOME`: tidak tersedia
- `node_modules`: tidak tersedia pada source ZIP dan tidak dapat diunduh karena DNS/registry diblokir

## Workflow rilis yang disiapkan

### Android/Web

`.github/workflows/build-android.yml`

- `test-only`: install dependency → 161 tests → static audit → Vite build.
- `web-only`: build PWA/Web.
- `android-release`: signed APK + AAB + signature verification + checksum + GitHub Release.
- `web-and-android`: menjalankan keduanya.

### Windows

`.github/workflows/build-windows.yml`

- `test-only`: dependency + tests + audit + Vite compile.
- `windows-release`: EXE + MSI + SHA-256 + GitHub Release.

### Perlindungan quota artifact

Artifact Actions normal menggunakan `retention-days: 1` dan `continue-on-error: true`. Dengan demikian quota artifact yang belum selesai dihitung ulang tidak seharusnya sendirian menggagalkan langkah publikasi GitHub Release. Signing key memakai retention 7 hari karena ukurannya sangat kecil, tetapi tetap harus dibackup permanen di luar Actions artifact segera setelah dibuat.

## Release gate

1. Push source v5.8.0.
2. Jalankan `Deploy Firebase Spark Rules` satu kali.
3. Jalankan Android workflow `test-only`.
4. Jika hijau, jalankan `android-release`.
5. Jalankan Windows `test-only`, lalu `windows-release`.
6. Jalankan smoke test hardware pada HP, tablet, printer, dan Windows toko.
