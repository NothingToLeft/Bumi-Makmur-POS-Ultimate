# Final Release Checklist — Bumi Makmur POS v6.2.0

## Source package
- [x] Version `6.2.0` konsisten pada package/defaults/service worker/workflow.
- [x] Changelog v6.2.0 tersedia.
- [x] Release notes v6.2.0 tersedia.
- [x] QA report v6.2.0 tersedia.
- [x] Build report v6.2.0 tersedia.
- [x] Implementation notes v6.2.0 tersedia.
- [x] Official Bumi Makmur 2 branding dipertahankan.
- [x] Secret scan lulus.
- [x] Firebase Spark-only guard lulus.

## Automated validation
- [x] 235/235 regression tests PASS.
- [x] Static audit PASS.
- [x] Electron syntax PASS.
- [x] GitHub workflow YAML PASS.
- [ ] Vite production compilation — jalankan di Cloudflare/GitHub karena registry dependency tidak tersedia di container audit.

## Deployment
1. Replace source repository dengan paket v6.2.0.
2. Push ke `main`.
3. Pastikan Cloudflare Pages build hijau.
4. GitHub Actions → **Build Bumi Makmur POS v6.2.0** → `test-only`.
5. Firestore Rules **tidak perlu** di-deploy ulang bila v6.1.0 sudah aktif.
6. Jika memerlukan APK baru → workflow `android-release`.
7. Jika memerlukan Windows installer baru → workflow Desktop `windows-release`.

## Smoke test sesudah deploy
- [ ] Owner login.
- [ ] Karyawan login.
- [ ] Cloud sehat / queue 0.
- [ ] Kasir tunai + kembalian.
- [ ] QRIS.
- [ ] Histori transaksi terbaru berada paling atas.
- [ ] Refund dan void.
- [ ] Tambah/edit produk + satu varian.
- [ ] Pack/pcs dan stok.
- [ ] Scanner barcode.
- [ ] Customer Display.
- [ ] AI Foto Produk.
- [ ] Pembelian/PO/receiving.
- [ ] Tutup Shift + PDF + share WhatsApp.
- [ ] Offline → transaksi → online → queue kembali 0.
