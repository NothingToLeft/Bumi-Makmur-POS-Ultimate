# Memperbarui GitHub

1. Gunakan checkout repo yang sama; simpan backup bisnis dan jangan menghapus penyimpanan lokal perangkat.
2. Tinjau diff. Jangan menambahkan `.env.local`, API key, keystore, backup transaksi atau password.
3. Jalankan `npm ci`, `npm run test:core`, dan `npm run build` dari root repo sebelum commit/push.
4. Push ke branch kerja untuk review, atau ke `main` bila pembaruan langsung sudah disetujui. Cloudflare Pages membangun web dari branch produksi.
5. Build/publikasi Android: workflow `build-android.yml`, mode `android-release` atau `web-and-android`. Windows: `build-windows.yml`, mode `windows-release`. Workflow ini juga mengunggah artefak ke GitHub Releases.

Deploy Firestore Rules bukan langkah rutin setiap update UI. Lakukan hanya bila rules/index berubah, sudah diuji, dan telah diizinkan. Jangan menimpa `.env.local`, keystore, database, atau konfigurasi produksi dengan file dari ZIP.
