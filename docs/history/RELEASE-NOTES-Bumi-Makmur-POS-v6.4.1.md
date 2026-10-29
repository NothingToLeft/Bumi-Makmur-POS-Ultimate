# Bumi Makmur POS FreeSync v6.4.1
## QRIS Dynamic & Payment Assurance — CI Secret Scan Hotfix

v6.4.1 adalah patch release untuk pipeline build v6.4.0. Tidak ada perubahan schema transaksi atau perilaku QRIS. Patch memperbaiki static audit yang sebelumnya membaca `.env.production` buatan workflow dan salah menganggap Firebase Web API key sebagai private secret.

### Perubahan utama

- Release workflow tidak lagi menulis `.env.production`.
- Firebase web configuration hanya tersedia sebagai process environment selama Vite/Electron build.
- Secret scanner baru memvalidasi runtime env secara terstruktur.
- Firebase Web API key hanya diizinkan pada `VITE_FIREBASE_API_KEY` di `.env.production` lokal; kemunculan `AIza...` di source lain tetap dianggap kebocoran.
- Gemini API key tetap local-device secret dan tidak pernah menjadi build environment.

### Firebase / QRIS

- Firestore Rules tetap ruleset `6.4.0`; tidak perlu rules migration baru khusus v6.4.1 bila rules v6.4.0 sudah berhasil dideploy.
- QRIS Dynamic, Payment Assurance, split payment, Customer Display, QRIS static fallback, Unified AutoSync, Product Visual, Multi-Barcode, dan AI Quota Resilience tetap sama.
