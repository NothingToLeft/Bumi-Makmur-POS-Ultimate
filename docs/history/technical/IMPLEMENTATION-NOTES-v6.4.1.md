# Implementation Notes — v6.4.1 CI Secret Scan Hotfix

## Root cause

GitHub release workflow membuat `.env.production` sebelum `npm run build`. Script `prebuild` menjalankan `audit:static`; regex `AIza...` memindai seluruh file workspace lalu menandai `VITE_FIREBASE_API_KEY` sebagai secret. Firebase Web API key memang dikirim ke client bundle dan bukan authorization credential; authorization tetap dikendalikan Firebase Auth + Firestore Rules.

## Solution

1. Android/Web dan Windows workflow berhenti menulis `.env.production`.
2. Nilai `VITE_FIREBASE_*` diinjeksi langsung sebagai environment pada build step yang membutuhkannya.
3. Secret scanning dipindah ke `scripts/secret-scan-utils.mjs` agar rule dapat diuji terpisah.
4. Jika developer memakai `.env.production` lokal, scanner hanya mengizinkan daftar key runtime yang eksplisit. `VITE_FIREBASE_API_KEY=AIza...` mendapat exception sempit; Google API key pada file/key lain tetap gagal.
5. Test v6.4.1 mengunci perilaku ini untuk mencegah regresi.

## Impact

Tidak ada perubahan database, Firestore schema, QRIS payload, transaction state, atau synchronization contract. Patch hanya memengaruhi release/build security path dan version metadata.
