# QA Report — Bumi Makmur POS v6.0.3 R2

## Scope release-blocking

R2 mengaudit ulang runtime shell, permission/role, Firebase FreeSync, offline queue ownership, Cloud & Backup, customer display, serta regresi seluruh fitur yang sudah ada. Tidak ada fitur sebelumnya yang dihapus.

## Defect yang ditutup

### Owner → Cloud & Backup blank putih

Cloud diagnostics legacy/korup kini dinormalisasi sebelum state/render. Invalid row tidak pernah langsung menerima `.filter()`/`.map()`. `ScreenErrorBoundary` juga mencegah satu module crash memutihkan seluruh aplikasi.

### Karyawan cloud bermasalah tetapi tidak dapat membuka Pengaturan

Ini adalah permission yang benar, bukan fitur yang harus dilonggarkan. Kasir tetap tidak memiliki `settings.view`. Recovery sekarang tersedia pada banner global melalui `Coba Sinkron Lagi` dan `Unduh Diagnostik`, serta background retry otomatis.

### Persistent permission error tidak pulih sesudah Rules diperbarui

Manual/background recovery sekarang force-revalidate subscription Firestore. Error lama dilepas sebelum health-check dan akan dibuat ulang bila masalah sebenarnya masih ada. Timestamp sukses hanya diperbarui setelah queue akun aktif benar-benar bersih dan tidak ada issue persistent.

### Customer Display jendela baru

Snapshot dikirim ulang setelah popup Web terbuka untuk menutup timing race BroadcastChannel. localStorage/polling dan Electron IPC tetap dipertahankan.

## Data safety

- Queue offline tidak dibersihkan otomatis.
- Queue hanya dikirim oleh user pemilik mutation.
- Queue akun lain tetap tersimpan sampai user tersebut login.
- Backup/restore/reset rules lama tetap berlaku.
- Tidak ada migrasi Firestore destruktif.
- API key/credential tidak dimasukkan ke diagnostik.

## Acceptance perangkat nyata setelah deploy

1. Owner login → `Pengaturan → Cloud & Backup` harus terbuka normal; tidak boleh blank putih.
2. Karyawan Zainal login → tidak melihat menu Pengaturan; jika banner cloud muncul, tekan `Coba Sinkron Lagi` dari banner.
3. Jika retry gagal, Karyawan dapat menekan `Unduh Diagnostik` tanpa memperoleh privilege Settings.
4. Queue milik Zainal harus turun ketika Zainal login; queue akun lain tidak boleh ikut dikirim.
5. Owner login kembali; queue milik Zainal tidak boleh dicoba memakai Auth Owner.
6. Buka `Layar Pelanggan` dari role yang memiliki `display.view`, lalu `Buka Layar 2`; tambah barang, ubah qty, pelanggan dan total harus update tanpa reload.
7. Uji Shift Start → sale tunai → kembalian → Shift End → closing PDF.
8. Uji barcode, produk/varian/multi-unit, stock adjustment/opname/transfer, PO/receiving, quotation, piutang, warranty/serial, reports, AI Product Capture, backup export, receipt/share/print.
9. Pastikan tidak ada `permission-denied` baru pada diagnostik setelah Rules v6.0.3 yang sudah hijau.

## Production build gate

GitHub Actions `test-only` dan Cloudflare Pages production build wajib hijau setelah source R2 di-push. Environment QA source-only tidak dapat menjamin full `vite build` lokal karena install dependency registry timeout.

## Hasil QA final R2

- `npm run test:core`: **206 / 206 PASS**, 0 fail, 0 skip.
- `npm run audit:static`: **PASS** — 107 JS/JSX/MJS, 4 JSON, import/required-file/Spark-only/secret guards.
- Parser TypeScript global seluruh source JS/JSX (`--jsx preserve --noResolve`): **PASS / exit 0**.
- `node --check electron/main.cjs`: **PASS**.
- `node --check electron/preload.cjs`: **PASS**.
- 4 workflow GitHub Actions YAML: **PASS**.
- `package.json`, `firebase.json`, `firestore.indexes.json`, `capacitor.config.json`: **PASS**.

## Batas validasi lokal

`npm run build` melewati prebuild static audit, lalu berhenti karena `vite` tidak tersedia (`node_modules` tidak disertakan di source worktree). Ini adalah keterbatasan environment lokal, bukan hasil production build. Setelah push R2, GitHub Actions/Cloudflare Pages tetap menjadi production bundle gate dan harus hijau.
