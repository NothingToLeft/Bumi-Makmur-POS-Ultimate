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
