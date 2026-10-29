# Verifikasi rilis v6.5.1 — 29 Oktober 2026

Runtime dibangun dari commit `1a4d69bc634b60f328520f9cf676932052205365`.

| Pemeriksaan | Bukti | Hasil |
|---|---|---|
| Android APK/AAB | [GitHub Actions](https://github.com/NothingToLeft/Bumi-Makmur-POS-Ultimate/actions/runs/40913967733) | success |
| Windows EXE/MSI | [GitHub Actions](https://github.com/NothingToLeft/Bumi-Makmur-POS-Ultimate/actions/runs/40913974058) | success |
| Artefak | [Release v6.5.1](https://github.com/NothingToLeft/Bumi-Makmur-POS-Ultimate/releases/tag/v6.5.1) | APK, AAB, EXE, MSI, checksum Android/Windows terdaftar |
| Cloudflare Pages | Check run commit `1a4d69b` | success |
| Website produksi | `https://bumi-makmur.my.id/sw.js` | cache `freesync-v6.5.1` |
| Smoke login produksi | Headless Chrome, lebar 360/768/1440 | HTTP 200; tidak ada overflow horizontal atau pageerror |
| Regresi setelah perapian repo | `node --test tests/*.test.mjs` | 314/314 pass |
| Build setelah perapian repo | `npm run build` | pass, static audit termasuk |

Ukuran artefak yang diverifikasi melalui GitHub API: APK 56.335.588 byte; AAB 31.567.861 byte; EXE 133.777.058 byte; MSI 144.154.624 byte. Ketersediaan artefak tidak membuktikan instalasi, tanda tangan komersial Windows, printer/scanner, transaksi QRIS, atau perilaku perangkat fisik.

## Perapian repo

Root turun dari 179 menjadi 25 file. Dokumen lama masuk `docs/history/`, panduan aktif ke `docs/guides/`, catatan rilis ke `docs/releases/`. README dan indeks dokumentasi kini menunjukkan status aktif. Referensi audit, tes, workflow dan tautan dokumen ikut disesuaikan.

Dua manifest checksum lama dihapus karena tidak cocok dengan source saat ini. Panduan `UPLOAD-GITHUB-DESKTOP.md` yang identik dengan panduan lama lainnya dihapus. Git history mempertahankan versi awal. Tidak ada modul bisnis, data, konfigurasi Firebase, keystore, aset atau fitur aplikasi yang dihapus.

Commit perapian dokumentasi terjadi sesudah build native di atas dan tidak mengubah `src/`, `electron/`, atau dependency runtime. Source ZIP terbaru mencakup struktur dokumentasi yang sudah rapi; tag rilis tetap menunjuk commit runtime yang dibangun.
