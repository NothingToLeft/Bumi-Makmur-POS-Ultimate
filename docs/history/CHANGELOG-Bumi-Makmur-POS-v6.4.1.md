# Changelog — Bumi Makmur POS v6.4.1

## Fixed

- Memperbaiki `npm run build` pada GitHub Actions yang gagal karena `.env.production` berisi `VITE_FIREBASE_API_KEY` dan static audit salah mengklasifikasikan Firebase Web API key sebagai private Google API key.
- Workflow Android/Web dan Windows tidak lagi membuat file `.env.production` sementara. Firebase Web configuration sekarang diinjeksi hanya ke proses build melalui environment step GitHub Actions.
- Static secret audit sekarang membedakan Firebase Web API key runtime dari Google/Gemini API key yang tidak boleh tertanam pada source.
- `.env.production` lokal tetap diaudit secara fail-closed: hanya key runtime yang diizinkan, unknown key/duplicate/malformed line ditolak.

## Security hardening

- Private key, Android keystore base64, dan `AIza...` di source biasa tetap menggagalkan audit.
- `GEMINI_API_KEY` atau Google API key lain di `.env.production` tetap ditolak.
- GitHub Secrets tidak ditulis ke workspace sebagai file pada release workflow.
- Firebase Spark architecture, Firestore Rules v6.4.0, QRIS Dynamic, dan Payment Assurance tidak diubah.

## Regression

- Menambahkan test khusus CI secret-scan agar false positive yang sama tidak kembali.
- Seluruh fitur v6.4.0 tetap dipertahankan.
