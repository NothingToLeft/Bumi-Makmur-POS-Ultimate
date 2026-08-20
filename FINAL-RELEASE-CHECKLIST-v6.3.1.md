# Final Release Checklist — Bumi Makmur POS v6.3.1
## AI Quota Resilience Patch

## Functional / UX

- [x] Raw Gemini quota/provider error tidak ditampilkan langsung kepada pengguna
- [x] HTTP 429 / `RESOURCE_EXHAUSTED` ditangani khusus
- [x] Rate-limit, auth, model, request, network, dan service error diklasifikasikan
- [x] Pesan kegagalan AI menggunakan Bahasa Indonesia operasional
- [x] Kamera dan Galeri tetap tersedia saat Gemini gagal
- [x] Local cooldown mencegah request loop setelah quota/rate-limit
- [x] Tes Gemini manual tetap dapat digunakan untuk recovery check
- [x] Cache kandidat foto 12 jam
- [x] Cache dibatasi maksimum 24 query per perangkat
- [x] Fallback Cari di Web + Ambil dari Link tanpa Gemini
- [x] Kandidat fallback tetap melalui Cloudflare source verification
- [x] Status Gemini tampil di Pengaturan → AI & Otomasi
- [x] Diagnostics AI lokal tersedia
- [x] Seluruh Product Visual & Multi-Barcode v6.3.0 tetap dipertahankan

## Security / Firebase Spark

- [x] Tidak ada Firebase Functions runtime
- [x] Tidak ada Firebase Storage
- [x] Tidak ada Blaze requirement
- [x] Gemini API key tetap local-device secret
- [x] Diagnostics tidak menyimpan API key
- [x] Cloudflare helper tidak menerima Gemini API key
- [x] Cloudflare helper tidak memanggil Gemini
- [x] SSRF/private-network/custom-port guard tetap aktif
- [x] Redirect validation tetap aktif
- [x] MIME dan image-size validation tetap aktif
- [x] Selected image tetap di-reverify terhadap source page
- [x] Tidak ada migration Firestore destruktif
- [x] Firestore Rules/indexes tidak berubah pada patch v6.3.1

## Release gates

- [x] Automated regression tests: **253/253 PASS**
- [x] Static audit: **PASS**
- [x] Independent JS/JSX transpile validation: **68 file, 0 diagnostics**
- [x] Electron syntax: **PASS**
- [x] Cloudflare Function syntax: **PASS**
- [x] JSON/YAML validation: **PASS**
- [x] Spark-only/security/secret guard: **PASS**
- [ ] Local Vite production compilation — dependency registry timeout; tidak diklaim PASS
- [ ] GitHub Actions `test-only` v6.3.1 hijau
- [ ] Cloudflare Pages deployment v6.3.1 hijau
- [ ] Physical Android smoke test
- [ ] Windows installer smoke test

## Deployment after upload

1. Backup JSON; jangan menghapus antrean offline aktif.
2. Upload source v6.3.1 ke GitHub.
3. Jalankan `Build Bumi Makmur POS v6.3.1 → test-only` sampai hijau.
4. Pastikan Cloudflare Pages deployment hijau.
5. Jika index exemption v6.3.0 belum pernah di-deploy, jalankan `Deploy Firebase Spark Rules` sekali; selain kondisi itu tidak perlu deploy ulang untuk v6.3.1.
6. Validasi Owner dan employee login, satu penjualan, satu barcode scan, Cari Foto Otomatis, simulasi quota/fallback link, Kamera/Galeri, dan cloud queue kembali ke zero.
7. Jalankan Android dan Windows release workflow setelah web smoke test lulus.
