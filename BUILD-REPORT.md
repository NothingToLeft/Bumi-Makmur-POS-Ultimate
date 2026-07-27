# Build & QA Report — Bumi Makmur POS v5.1.3

## Ruang lingkup

- Editor lengkap teks halaman login.
- Preview langsung tampilan login.
- Publikasi konfigurasi login lintas Web, PC, Android, HP, dan tablet.
- Normalisasi data lama agar tetap kompatibel.

## Hasil pemeriksaan lokal

```text
Core tests   : 88/88 lulus
Static audit : lulus
JS/JSX/MJS   : 65 file diperiksa
JSON         : 4 file valid
```

Kompilasi Vite lokal belum dapat diselesaikan karena registry dependency internal mengembalikan HTTP 503 saat `npm install`. Workflow GitHub `test-only` tetap wajib dijalankan untuk kompilasi Vite final.

## Urutan rilis

1. Jalankan workflow `test-only`.
2. Cloudflare Pages memperbarui Web otomatis setelah branch `main` dipush.
3. Jalankan `windows-release` untuk EXE/MSI.
4. Jalankan `android-release` untuk APK/AAB.
5. Firestore Rules tidak perlu di-deploy ulang untuk v5.1.3.

## Kompatibilitas data

- Dapat dipasang langsung di atas v5.1.2.
- Jangan uninstall APK/aplikasi Desktop lama bila ingin mempertahankan cache lokal.
- Konfigurasi baru menggunakan fallback aman untuk database lama.
