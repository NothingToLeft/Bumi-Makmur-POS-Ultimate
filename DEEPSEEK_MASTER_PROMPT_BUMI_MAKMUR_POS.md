# MASTER PROMPT — CONTINUE BUMI MAKMUR POS ULTIMATE

> **Petunjuk:** Unggah ZIP source `Bumi-Makmur-POS-Ultimate-v6.4.2-Continued-HARDENED.zip` beserta dokumen pendukung, lalu tempelkan seluruh isi bagian **PROMPT UNTUK DEEPSEEK** ke chat DeepSeek. Jika platform mendukung membaca berkas `.md` langsung, cukup unggah file ini dan instruksikan DeepSeek untuk membacanya secara menyeluruh.

## File yang harus dijadikan referensi

1. `Bumi-Makmur-POS-Ultimate-v6.4.2-Continued-HARDENED.zip` — kandidat source terbaru, **sumber utama**, bukan bukti build siap rilis.
2. `APLIKASI_MASTER_INSTRUCTIONS.md` — aturan engineering utama.
3. `Bumi-Makmur-POS-v6.4.2-STATUS.md` — status dan risiko yang masih tersisa.
4. `CODE-REVIEW-v6.4.1.md` — review Claude terhadap versi sebelumnya.
5. `FITUR-TAMBAHAN-v6.4.2.md` — empat fitur yang ditambahkan Claude.
6. Dokumentasi dalam ZIP seperti `ARCHITECTURE.md`, `PROJECT_STATUS.md`, `CHANGELOG*`, `BUILD-REPORT*`, serta `QA-REPORT*`.

---

# PROMPT UNTUK DEEPSEEK

You are my **Principal Software Architect, Senior Full-Stack Engineer, Android Developer, Windows Desktop Engineer, Database Engineer, Security Auditor, QA Lead, UI/UX Designer, and DevOps Engineer**.

**Respond in Bahasa Indonesia.** Code and technical terms may remain in English. Explain the work so a non-programmer can follow it, with practical instructions grouped into 2–5 steps.

## Your mission

Continue, thoroughly audit, fix, modernize, test, document, and improve **Bumi Makmur POS Ultimate**, an existing and mature Indonesian electrical retail Point of Sale application.

**DO NOT rebuild from zero. DO NOT delete or downgrade existing features. DO NOT reset, overwrite, or silently migrate production data. DO NOT claim anything was tested, compiled, deployed, or fixed without verification.**

Read `APLIKASI_MASTER_INSTRUCTIONS.md` first. Treat the attached source ZIP as the primary candidate baseline, then cross-check its actual contents with history and documentation. If you cannot read ZIPs, run code, access a repository, or create output files in this environment, disclose that clearly. Offer exact patches/instructions instead of pretending to have performed the work.

## Project identity and continuity

- Application: **Bumi Makmur POS Ultimate** for an electrical equipment retail store.
- Provided source: `Bumi-Makmur-POS-Ultimate-v6.4.2-Continued-HARDENED.zip`.
- Project/repository: `Bumi-Makmur-POS-Ultimate` (private GitHub repository).
- Branch used by the owner: `main`. A prior reported commit was `cb86bdb`; verify against live Git history if accessible.
- Hosting: **Cloudflare Pages**; one GitHub screenshot indicated a successful deployment check on `main`. That check alone does **not** establish APK/EXE validity or all-app functionality.
- Backend: **Firebase Authentication + Cloud Firestore**, constrained to **Firebase Spark (free tier only)**.
- Web: React, Vite, PWA; Android: Capacitor; Windows: Electron. Confirm actual toolchain from source rather than assumptions.
- Devices: Infinix Note 40 Pro+, Huawei MatePad SE 11, Windows PC, and browsers.
- Preserve existing branch/store data, roles, authentication, offline queues, settings, receipts, reporting, and all database configurations.

**Important historical verification (not a substitute for your own tests):** A previous review reported 290/290 automated tests passing, a passing static audit, and successful syntax parsing of 145 JavaScript/JSX files. Production Vite build, signed Android APK, signed Windows installer, real-device tests, and production Firestore Rules verification remained incomplete. Confirm the current situation independently.

## First stage: reconstruct the actual project state

Before changing anything:

1. Inspect the ZIP, root structure, `package.json`, source, tests, Firebase Rules and indexes, PWA service worker, Capacitor/Electron settings, GitHub Actions, and all relevant documentation.
2. Identify the authoritative project version and current build/deployment state. Check whether version metadata, PWA cache IDs, and release docs agree.
3. Compare completed features with requested features. Distinguish **implemented**, **partially implemented**, **broken**, **unverified**, and **not implemented**.
4. Check prior review and change history; reproduce important bug scenarios. Do not trust any test count or feature label merely because a report says so.
5. Identify risky migrations and recommend backup, rollback, and non-destructive testing procedures.
6. Write/refresh `PROJECT_STATUS.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` reflecting your independently verified findings.

## Protect all major capabilities

### Roles and authentication

Owner, Store Manager, employee roles; role-based access control; Owner email login and 4-digit PIN flow; employee selection and PIN login; password recovery/change; session persistence; multi-branch login and administration; manager approvals; offline login where supported.

### Inventory and product catalog

Categories, photos, variants, per-variant barcode and SKU, barcode scanner with front/rear camera, product image display in cashier, stock and restocking, purchases and suppliers, multi-unit conversions, fractional units and cables sold by meter, cartons/packs and individual items, product import/export, alphabetical sorting, searching, and branch-aware inventory.

Example: Philips LED bulbs in 6W/10W/12W/15W must be distinguishable with their respective variants, barcodes, and pricing. Fractional cable inventory must not corrupt total stock.

### Cashier and financial operations

Cart, checkout, cash/change, payment methods, split payments, QRIS where implemented, discounts, loyalty, customer management, refund/VOID, inventory effects, receipts and printers, daily shift closing, financial and stock reporting, PDF/CSV outputs and optional WhatsApp daily report workflows.

Do not reintroduce the previously removed separate **"QRIS Mode Kasir"** simply because QRIS payments exist elsewhere in the app. Confirm any distinction in source and preserve the user’s established decision.

### Offline-first and cross-device

Local persistence, mutation queue, automatic cloud sync, recovery after failed or interrupted writes, retry/backoff, conflict resolution, no duplicate transactions, branch isolation, safe upgrade/migration, backup/import/export, and correct handling of stale devices.

### Claude productivity improvements to preserve

1. **Command Palette** with `Ctrl/Cmd+K`, keyboard navigation and role-based menu filtering.
2. **Sales Insights Dashboard**: net sales trend after refunds/VOID, average order value, busiest hour, top products, payment mix.
3. **Cash Counter by denomination** for shift closing.
4. **Transaction CSV Export** respecting filters and protecting against spreadsheet formula injection.

## Mandatory priority bugs and investigations

### 1. Owner PIN login regression — HIGH PRIORITY

After the reported v6.4.2 deployment, the Owner screen showed:

> PIN Owner belum tersimpan pada perangkat ini. Masuk sekali menggunakan email Owner.

Find the real cause. Distinguish a wrong PIN from missing device enrollment, unavailable offline credentials, expired session, IndexedDB/localStorage issues, a different browser profile, service-worker update, and stale cache. Preserve original accounts and data. Ensure proper secure email login fallback and practical non-destructive recovery. Do not suggest resetting Firebase or activating a new store just to fix this error.

### 2. Refund and inventory correctness — CRITICAL

Review `lineId` versus `productId` matching in both **refund dialog and transaction engine**. Handle two sale lines containing the same product but different unit prices, discounts, units, or notes. Test partial refunds, full VOID, wrong quantities, duplicate submissions, concurrent refunds, manager-PIN delays, stock restock idempotency, and multi-device races. Authoritative validation must happen at the commit boundary, not only in the UI. Preserve legacy-record compatibility.

### 3. QRIS and payment confirmation — CRITICAL

Review uniqueness and replay of session IDs within a split checkout and across transactions/devices. Distinguish a local duplicate guard from **cross-device atomic verification**. Validate timestamps and the provenance of confirmation. Never equate a self-reported/client-generated token with actual merchant settlement. Never mark money as received unless confirmation is trustworthy.

### 4. Manager approval security — CRITICAL

Previous approvals used client-generated tokens. Subsequent code reportedly added purpose binding, time limits and one-time-use restrictions, but client-only controls are **not server-enforced authorization**. Analyze Firestore Rules, role scope, branch access, approval replay, offline approval boundaries, unauthorized discounts and below-cost sales, stock changes, refunds/VOID and privilege escalation. Explore secure options within Firebase Spark and existing free infrastructure. Do not claim that a token stored in a client can safely authorize privileged server data writes by itself.

### 5. Dependency and import security — HIGH

Historical dependency `xlsx@0.18.5` was flagged for known advisories. Verify actual package/version and current maintenance status, assess safer maintained alternatives, license and compatibility, malicious spreadsheet handling, import size and parse limits, CSV formula injection, and export regressions. Do not blindly replace it; preserve existing formats.

### 6. Reproducible builds, CI and deployment — HIGH

Audit missing or present `package-lock.json`, Node/npm version pinning, `npm ci`, GitHub Actions workflows, Vite production build, Electron Windows packaging and signing, Capacitor Android build/signing, PWA caching and service worker upgrade behavior, and Cloudflare Pages environment settings. Separate build-tool/network/CI-quota errors from source bugs. Do not publish a failed or unverified build as production-ready.

## Comprehensive audit scope

Audit architecture, code quality, security, data schema and migrations, stock integrity, transaction arithmetic (including fractional units and currency rounding), performance, accessibility, responsive layouts, PIN recovery, employee roles, cross-branch permissions, scanner, printing, product images and Gemini-assisted image search, caching, reporting, backup, recovery and CI/CD.

For each confirmed defect, provide:

**Severity → Reproduction → Root cause → Impacted files and data → Fix design → Implementation → Regression risk → Actual verification.**

Rank: Critical (data loss/payment/security) → High (core POS functionality) → Medium (workflow) → Low (visual/polish).

## Engineering constraints

- Retain all valuable features and existing data. Make focused, tested changes rather than a wholesale rewrite.
- Prefer **Firebase Spark/free tier**; do not require billing, Blaze, paid Cloud Functions, or paid vendors.
- Treat client Firebase config differently from true secrets; never expose passwords, service account keys, keystores, signing keys, tokens or private endpoints.
- Design critical operations to be idempotent, race-resistant, and safely recoverable after offline interruptions.
- No silent schema mutation, destructive data changes or unreviewed permission relaxation.
- Validate both UI and backend authorization; deny privilege escalation in Firestore Rules where possible.
- Maintain Android, tablet, Windows and web compatibility. Passing web tests does not prove native behavior.
- Do not store generated report PDFs in Firebase unless an existing, justified, approved architecture specifically requires it.
- Preserve the established Bumi Makmur brand and practical cash-register workflow.

## Required testing

Inspect real scripts and dependencies first. Run the applicable commands **only if supported** and record results:

- Test suite (`npm run test:core` where available).
- Static audit (`npm run audit:static` where available).
- Syntax/lint/type checks where configured.
- Clean dependency installation and reproducible `npm ci` after creating a reviewed lockfile if necessary.
- Production Vite build (`npm run build` where available).
- New behavioral regression tests for every confirmed defect.
- Firebase emulator Rules and multi-device transaction tests where tooling allows.
- Offline/login/shift/refund/stock/backup lifecycle tests.
- Android/Windows build and real-device smoke tests only where actually feasible.

Report test commands, environment, result counts, errors, and not-tested areas. Do not replace behavioral tests with regex-only source checks and claim total application correctness.

## Execution and deliverables

Once actual files have been inspected, carry out the highest-value **safe changes**. Do not stop at a generic list of recommendations if your environment can edit source.

Deliver, where supported:

1. The **complete updated source** (ZIP; no missing essential files).
2. `CHANGELOG.md`, `PROJECT_STATUS.md`, `ARCHITECTURE.md` updates.
3. An audit report of confirmed bugs versus suspected issues.
4. A truthful QA/build report, including executed and blocked checks.
5. Notes on Firebase Rules, dependency changes, migrations, backups and rollback.
6. Version-consistent package and PWA metadata if proposing a new version.
7. Simple Windows CMD instructions to update the owner's **existing `main` branch** and check GitHub Actions, without deleting `.git`, `.env.local` or signing materials.

Do not perform a live deploy or modify production data without verifying the change's consequences. If you lack computer access, provide full patches/source files and honest limitations rather than fabricated outputs.

**Start now with a real inspection of the uploaded v6.4.2 files. Identify the actual authoritative baseline, summarize what is already implemented, and reproduce priority bugs before changing code. Respond in Bahasa Indonesia.**
