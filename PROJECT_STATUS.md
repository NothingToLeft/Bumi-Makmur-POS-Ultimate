# Bumi Makmur POS — v6.5.1

## Baseline
Continue GitHub main `7e748ca17399632cda1efaf1440ee90f36f7a414` (v6.5.0), cross-checked with supplied DeepSeek session and accessible prior project conversation. Older v6.4.2 reports are historical. PIN diagnostics, offline credential renewal, customer tiers and POS modules remain.

## Changes
- Responsive bounded order modal; general customer default; empty/error states.
- Compact AI provider rows with Use/Edit/Delete and a separate editor modal. Cancelling leaves active connection unchanged. Keys stay local and isolated by endpoint.
- Full JSON schema for OpenAI-compatible product analysis; non-Gemini keys blocked from Gemini web photo search.
- Idempotent local order-to-bill conversion; completed/cancelled orders cannot be converted again.
- Accessible form labels, modal keyboard focus loop and Escape handling.
- Security dependency updates, lockfile-based CI install, version/PWA cache bump. Business DB key, Firebase schema and rules unchanged.

## Verified locally — 2026-10-29
- `npm ci --ignore-scripts --no-audit --no-fund`: PASS, 907 packages. Initial esbuild lock cleared by stopping QA before retry. Electron installation scripts skipped locally.
- `node --test tests/*.test.mjs`: 314/314 PASS.
- `npm run build`: PASS, including JSX parser, imports, secret scan and Spark-only checks. Bundle-size warning remains.
- Headless Chrome: PASS at 360×800, 412×915, 768×1024, 1024×768, 1440×900, 1920×1080 and 915×412. Real order/provider components, fake inventory, mocked AI. No horizontal overflow/runtime errors.
- SheetJS 0.20.3 workbook export/import round trip: PASS.
- `npm audit`: 12 findings reduced to 4 high, 0 critical. Remaining Node gRPC chain is pinned by Firebase; no forced downgrade or override.

## Limits
- Actual provider keys, production transactions, Firestore emulator, hardware scanners/printers, physical Android devices and Windows installer execution remain unverified locally.
- Client manager approval and local QRIS replay checks remain architectural risks. Order-to-bill guard is local, not a multi-device lock.
- Keys use local storage without app-level encryption. Profiles and keys require per-device setup; only active non-secret preferences sync.
- Remote native builds/deployment require separate pipeline confirmation. Build success does not prove installation or device behavior.

Details: `docs/QA-v6.5.1.md`. Rollback source: `7e748ca`; preserve local storage and business data.

## Verifikasi remote dan perapian repo

Build Android/Windows dari `1a4d69b` sukses dan APK/AAB/EXE/MSI tersedia pada Release v6.5.1. Cloudflare deploy sukses; domain produksi mengembalikan service worker v6.5.1. Smoke login produksi lulus pada lebar 360/768/1440. Instalasi perangkat fisik dan transaksi produksi tetap belum diuji. Bukti: [verifikasi rilis](docs/RELEASE-VERIFICATION-v6.5.1.md).

Root repo dirapikan dari 179 menjadi 25 file. Panduan aktif, catatan rilis, dan laporan historis dipisahkan dalam `docs/`; modul bisnis dan data tidak dihapus. 314 tes dan build tetap lulus setelah pemindahan.
