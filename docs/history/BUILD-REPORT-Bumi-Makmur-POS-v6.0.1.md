# Build Report — Bumi Makmur POS v6.0.1

## Source status
- Version: 6.0.1
- Change type: branding patch / asset refresh
- Data migration: none
- Firebase Rules migration: none
- Blaze requirement: none

## Build assets
- PWA 192/512: refreshed
- Maskable 512: refreshed with safe-zone
- Android splash: refreshed
- Windows ICO: refreshed multi-resolution
- Canonical logo master: included

Production binaries should be produced by the existing GitHub Actions Android/Windows workflows after `test-only` passes.

## Validation
- `node --test tests/*.test.mjs`: **177/177 PASS**.
- `node scripts/audit-project.mjs`: **PASS**.
- Production `vite`/APK/EXE build tetap dijalankan melalui GitHub Actions sebagai release gate.
