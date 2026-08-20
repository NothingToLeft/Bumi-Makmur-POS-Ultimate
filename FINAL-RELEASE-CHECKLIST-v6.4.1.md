# Final Release Checklist — Bumi Makmur POS v6.4.1

## CI / Security

- [x] Root cause false-positive Firebase Web API key ditemukan.
- [x] Android/Web workflow tidak menulis `.env.production`.
- [x] Windows workflow tidak menulis `.env.production`.
- [x] Firebase web config diinjeksi hanya pada build process environment.
- [x] Structured secret scanner aktif.
- [x] Firebase Web API key runtime diterima pada konteks yang benar.
- [x] Gemini/Google key di konteks yang salah tetap ditolak.
- [x] Private key / keystore guard tetap aktif.

## Regression gates

- [x] Automated regression: 266/266 PASS.
- [x] Static audit PASS.
- [x] JSON 4/4 PASS.
- [x] GitHub Actions YAML 4/4 PASS.
- [x] Electron syntax PASS.
- [x] Cloudflare helper syntax PASS.
- [x] QRIS Payment Assurance regression PASS.
- [x] Firebase Spark-only guard PASS.

## Build gate

- [x] Failure v6.4.0 berhasil direproduksi secara sintetis.
- [x] Fixed source menerima Firebase Web API key tanpa mematikan security scan.
- [x] Negative Gemini-key leak test tetap gagal sesuai desain.
- [x] Local npm registry timeout didokumentasikan jujur.
- [ ] GitHub Actions `test-only` production dependency install + Vite compile — dijalankan setelah source v6.4.1 di-upload.

## Firebase

- [x] Ruleset tetap v6.4.0.
- [x] Tidak ada migration data/rules baru pada v6.4.1.
- [x] Tidak ada Storage/Functions/Blaze.
