# QA Report — Bumi Makmur POS v6.0.4

## Production defects addressed
1. Owner → Pengaturan → Cloud & Backup crashed with `CloudUpload is not defined`.
2. Employee cloud queue remained blocked on `shifts` even after v6.0.3 rules deployment. Source audit found a legacy-profile semantics mismatch: the client treats a missing `active` field as active, while v6.0.3 Firestore Rules required `active == true`.

## Fix validation
- `CloudUpload` is imported from `lucide-react` where the Cloud & Backup card uses it.
- Static audit now includes a lightweight unresolved JSX-component guard that would catch this class of missing import even when esbuild is unavailable locally.
- Firestore `activeMember()` accepts a legacy profile only when `active` is absent; `active: false` remains denied.
- Shift create/update rules remain UID-scoped and branch-scoped.
- Firebase deploy workflow verifies `BUMI_MAKMUR_RULESET_VERSION=6.0.4` before deploying only Firestore Rules + Indexes.
- PWA cache and application metadata are v6.0.4.
- Closing-report footer reads APP_VERSION dynamically.

## Automated regression
- Node regression suite: **210 / 210 PASS**.
- Static project audit: **PASS**.
- Electron main/preload syntax: **PASS**.
- JSON validation: **PASS**.
- GitHub workflow YAML parsing: **PASS**.
- Secret scan: **PASS**.

## Build limitation in this workspace
`npm install` was attempted but registry installation exceeded the local execution timeout, so a local Vite production bundle is not claimed here. Cloudflare Pages and GitHub Actions remain the production build gates; both install dependencies before build and the prebuild audit runs automatically.

## Mandatory production smoke test
1. Deploy Firestore Rules v6.0.4.
2. Login Zainal and press `Coba Sinkron Lagi`; the 22 existing mutations must remain intact and begin draining.
3. Owner → Pengaturan → Cloud & Backup must render normally, with no error boundary.
4. Verify Customer Display, one cash sale, change calculation, shift close, and reopening the app.
