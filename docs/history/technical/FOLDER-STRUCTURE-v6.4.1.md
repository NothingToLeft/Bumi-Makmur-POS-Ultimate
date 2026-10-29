# Folder Structure Changes — v6.4.1

File baru/berubah khusus hotfix:

- `scripts/secret-scan-utils.mjs` — structured runtime-env dan secret detection.
- `scripts/audit-project.mjs` — memakai structured scanner.
- `tests/v641-ci-secret-scan-hotfix.test.mjs` — regression CI secret handling.
- `.github/workflows/build-android.yml` — ephemeral env injection tanpa `.env.production`.
- `.github/workflows/build-windows.yml` — ephemeral env injection tanpa `.env.production`.
- `../CHANGELOG-Bumi-Makmur-POS-v6.4.1.md`
- `../RELEASE-NOTES-Bumi-Makmur-POS-v6.4.1.md`
- `../QA-REPORT-Bumi-Makmur-POS-v6.4.1.md`
- `../BUILD-REPORT-Bumi-Makmur-POS-v6.4.1.md`
- `../FINAL-RELEASE-CHECKLIST-v6.4.1.md`

Semua modul bisnis v6.4.0 tetap berada pada struktur yang sama.
