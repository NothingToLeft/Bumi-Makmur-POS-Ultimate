# Build & QA Report — Bumi Makmur POS v5.5.0

## Hasil pemeriksaan lokal

- Core/regression tests: **115/115 lulus**
- Static audit: **lulus**
- File JS/JSX/MJS yang diaudit: **76**
- Parser sintaks source `src/`: **43 file, 0 error**
- JSON: **valid**
- Workflow YAML: **valid**
- Secret/private-key scan: **lulus**

## Ruang lingkup

- Store Manager Operational Admin
- Safe Product & Stock Lifecycle
- Category permission isolation
- Product usage/history protection
- Web, Windows, Android, Firebase Spark compatibility

## Batas keamanan role

Store Manager dibatasi ke cabang yang ditugaskan. Role ini tidak memperoleh `settings.manage` atau `branches.manage`, tidak dapat mengubah akun Owner/Manager lain, dan tidak dapat menjalankan restore/reset cloud.

## Catatan kompilasi

`npm install` pada lingkungan penyusunan mengalami timeout, sehingga kompilasi Vite/Electron/Android final belum dijalankan secara lokal. Jalankan workflow GitHub `test-only`; workflow tersebut wajib lulus `npm run build` sebelum rilis dibuat.

Firestore Rules **wajib dideploy ulang** karena v5.5.0 membuka perubahan field kategori bagi Store Manager tanpa membuka pengaturan global lainnya.
