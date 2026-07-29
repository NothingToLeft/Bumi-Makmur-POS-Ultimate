# Build & QA Report — Bumi Makmur POS v5.2.2

## Ruang lingkup

Hotfix responsif untuk identitas cabang pada sidebar Web dan Desktop Windows.

## Perubahan source

- `src/App.jsx`: struktur identitas sidebar diubah dari teks `truncate` satu baris menjadi blok nama adaptif dua baris.
- `src/index.css`: menambahkan aturan wrapping, line clamp dua baris, ukuran font adaptif, tinggi header fleksibel, dan lebar sidebar desktop 288 px.
- `tests/v522-sidebar-branding.test.mjs`: regression test khusus nama cabang panjang.
- Versi aplikasi, cache service worker, workflow Android/Windows, dokumentasi, dan catatan rilis dinaikkan ke 5.2.2.

## Hasil pemeriksaan

```text
Core tests             : 101/101 lulus
Static audit           : lulus
JS/JSX/MJS diperiksa   : 67 file
JSON valid             : 4 file
Secret/private key scan: lulus
Firestore paid service : tidak ditemukan
```

## Batas pemeriksaan lokal

`npm install` tidak selesai dalam batas waktu lingkungan penyusunan, sehingga kompilasi Vite produksi tidak diklaim sebagai hasil lokal. Workflow GitHub Actions `test-only` tetap menjadi gerbang kompilasi final sebelum membuat installer.

## Firebase

Tidak ada perubahan Firestore Rules, indexes, Storage, Functions, Blaze, atau billing.
