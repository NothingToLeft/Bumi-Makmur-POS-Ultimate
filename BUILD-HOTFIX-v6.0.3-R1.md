# Bumi Makmur POS v6.0.3 — Build Integrity Hotfix R1

## Root cause
Cloudflare Pages berhasil meng-install dependency dan mentransform 1.594 modul, lalu Vite/esbuild berhenti pada `src/screens/DeviceSettingsScreens.jsx` karena tuple pertama pada array `groups` di `ReleaseNotesSettings` kehilangan satu penutup `]`.

## Fix
- Menambahkan penutup array yang hilang.
- Menyeragamkan Node.js 24 pada `.node-version`, Android workflow, dan Windows workflow.
- Menambahkan gate syntax JSX berbasis esbuild ke `npm run audit:static` ketika dependencies tersedia.
- Menambahkan regression test khusus build integrity.

## Compatibility
Tetap app/data version 6.0.3. Firestore ruleset tetap 6.0.3 karena tidak ada perubahan schema/rules.
- Menambahkan `prebuild` gate sehingga Cloudflare Pages menjalankan audit statis sebelum Vite build.

