# QA Report — Bumi Makmur POS v6.1.1

## Release focus

- Kasir/employee Unified AutoSync recovery
- Firestore transaction CREATE pre-read regression
- mixed-mutation conflict rebase
- offline queue ownership and replay
- Shift / Cash Movement / Sale / Stock Movement cloud path
- single-variant product retention
- no feature removal regression

## Root cause verified

Queue Kasir berisi mutation CREATE baru seperti `shifts` dan `cashMovements` dengan `beforeData = null`. `persistOperations()` sebelumnya tetap melakukan `transaction.get()` ke seluruh target sebelum write. Pada target baru yang belum ada, branch-scoped read rules dapat menolak GET sebelum rule CREATE yang valid dievaluasi. Hal yang sama dapat terjadi ketika conflict rebase membaca kembali seluruh operasi dalam mutation campuran.

v6.1.1 hanya melakukan remote precondition read untuk UPDATE/DELETE atau operasi yang benar-benar mempunyai `beforeData`. CREATE baru langsung menuju write transaction dan tetap divalidasi Firestore Security Rules.

## Regression result

- Automated tests: **219 PASS / 219 total**
- Failed: **0**
- Skipped: **0**
- Static project audit: **PASS**
- JS/JSX/MJS inspected: **110**
- JSON validation: **4 PASS**
- Relative import validation: **PASS**
- Firebase Spark-only guard: **PASS**
- Secret scan: **PASS**
- Electron main/preload syntax: **PASS**
- GitHub Actions YAML parse: **PASS**

## Additional regression found and fixed

Business-layer validation in `PosContext` had regressed to requiring two variants, while the Product UI correctly allowed one variant. It is corrected so a real product can start with one variant, matching the v5.8.1 behavior.

Entity IDs generated with `crypto.randomUUID()` now retain a 64-bit random segment instead of only 32 bits, further reducing collision risk for CREATE operations that intentionally skip target pre-read.

## Production build note

`npm install` was attempted in the execution environment but the package registry request timed out. Therefore this report does not claim a local Vite production build. Cloudflare Pages / GitHub Actions remains the production build gate and uses Node 24.

## Firestore Rules

No Security Rules change is required in this release. Expected production ruleset remains:

`BUMI_MAKMUR_RULESET_VERSION=6.1.0`

If that rules workflow already completed successfully, v6.1.1 only requires the new application deployment.
