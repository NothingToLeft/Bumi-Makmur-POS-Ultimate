# Build Report — Bumi Makmur POS v6.1.1

## Source validation

- `node --test tests/*.test.mjs`: 219/219 PASS
- `node scripts/audit-project.mjs`: PASS
- `node --check electron/main.cjs`: PASS
- `node --check electron/preload.cjs`: PASS
- All GitHub workflow YAML files parse successfully

## Local production build

A dependency installation was attempted, but registry access timed out in this environment. As a result Vite/Electron/Capacitor production binaries are not claimed as locally built here.

## Production gates

1. Cloudflare Pages: `npm run build`
2. GitHub Actions: `Build Bumi Makmur POS v6.1.1` → `test-only`
3. Android/Windows release workflows after the web gate is green

## Firebase

Rules are unchanged from v6.1.0. No rules redeploy is required if `BUMI_MAKMUR_RULESET_VERSION=6.1.0` is already active.
