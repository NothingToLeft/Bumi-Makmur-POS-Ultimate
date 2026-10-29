# Build Report — Bumi Makmur POS v6.0.3

## Version

`6.0.3 — Cloud & Customer Display Stability`

## Source validation

| Gate | Status |
|---|---|
| Core regression | PASS — 196/196 |
| Static project audit | PASS |
| Electron main syntax | PASS |
| Electron preload syntax | PASS |
| Core JSON parse | PASS |
| GitHub workflow YAML parse | PASS |
| Spark-only guard | PASS |
| Exposed secret literal scan | PASS |

## Production build status

Full local build belum dapat dijalankan di environment source-only ini karena `node_modules` tidak tersedia dan percobaan dependency installation dari registry timeout. Oleh karena itu tidak ada klaim palsu bahwa Web bundle, APK, atau EXE telah dikompilasi lokal.

Production build gate yang harus dipakai:

1. GitHub Actions `Deploy Firebase Spark Rules`.
2. GitHub Actions `Build Bumi Makmur POS v6.0.3` dengan mode `test-only`.
3. Web build/deploy Cloudflare Pages.
4. Android release build.
5. Windows release build.

## Mandatory deployment order

Firestore Rules **harus** dipublish sebelum menguji ulang queue lama. Source rules memiliki marker:

```text
BUMI_MAKMUR_RULESET_VERSION=6.0.3
```

Workflow Firebase memverifikasi marker tersebut dan hanya deploy:

```text
firestore:rules,firestore:indexes
```

Tidak ada Functions atau Storage sehingga tetap kompatibel dengan Firebase Spark.

## Existing offline queue

Jangan hapus queue lama. v6.0.3 mempertahankan mutation berdasarkan pemilik akun. Login dengan akun pembuat mutation untuk menyelesaikan sync-nya.

## Cloudflare Build Hotfix R1

Build commit `3fde001` berhenti setelah 1.594 module transformed karena syntax error di `src/screens/DeviceSettingsScreens.jsx` (`Expected "]" but found ";"`). Source hotfix memperbaiki tuple Changelog yang kehilangan penutup array.

Hardening tambahan:
- `.node-version` = 24.
- GitHub Windows workflow = Node 24, konsisten dengan Android/Firebase dan requirement scanner.
- `npm run build` sekarang memiliki `prebuild` gate `npm run audit:static`.
- Audit CI memanfaatkan esbuild untuk parser JSX setelah dependencies tersedia.

Local source-only environment tidak memiliki `node_modules`, sehingga Vite production build final tetap divalidasi oleh Cloudflare/GitHub setelah upload hotfix.

