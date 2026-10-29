# Bumi Makmur POS — Project Status

## Baseline verified

User attachment `Bumi-Makmur-POS-Ultimate-v6.4.2-reviewed.zip` is the source for this update. Internal package metadata was 6.4.1 before the continuation. This copy now identifies as 6.4.2. Original attachments untouched.

## Supported architecture

React/Vite web PWA, Capacitor Android, Electron Windows, Firebase Auth + Firestore Spark, Cloudflare Pages, offline queue, cashier/stock/variant/employee/receipts/QRIS, reporting. Four productivity features added by Claude retained.

## Risks before production

1. Manager approval client token is not authoritative and can be manipulated by a modified client; Firestore rules/server governance design required.
2. QRIS merchant confirmation remains manual; replay guard local only, not cross-device atomic.
3. Spreadsheet import XLSX package `xlsx@0.18.5` has known security advisories; no verified update possible in this offline build environment.
4. Build dependencies/lockfile absent, so no authenticated signed APK/EXE or online deployment has been verified.

## Next verified milestone

Online reproducible npm install with lockfile, Vite build, Android/Windows CI builds, Firebase emulator transaction policy checks, real-device acceptance tests, and rollback rehearsal.
