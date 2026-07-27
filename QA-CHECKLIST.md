# QA Checklist Bumi Makmur POS v5.1.3

## Build dan versi
- [ ] `npm run test:core` lulus seluruh test.
- [ ] `npm run audit:static` menampilkan `AUDIT LULUS`.
- [ ] `npm run build` berhasil.
- [ ] Workflow Android `test-only` hijau.
- [ ] Workflow Windows `windows-release` menghasilkan EXE, MSI, dan checksum.
- [ ] Cloudflare Pages branch `main` berstatus Success dan menampilkan v5.1.3.

## Identitas toko dinamis
- [ ] Owner dapat membuka Pengaturan → Bisnis.
- [ ] Nama toko dapat diganti menjadi “Bumi Makmur Utama”.
- [ ] Nama baru bertahan setelah reload dan login ulang.
- [ ] Sidebar, login karyawan, judul aplikasi, nota, QRIS default, dan layar pelanggan memakai nama baru.
- [ ] Manager/Kasir tidak dapat mengubah identitas toko utama.

## Produk dan barcode
- [ ] Produk baru dapat menerima barcode dari kamera.
- [ ] Scanner USB/Bluetooth mengisi kolom barcode saat fokus.
- [ ] Tombol Enter scanner tidak menutup/merusak form.
- [ ] Barcode ganda menampilkan peringatan dan tidak dapat disimpan.
- [ ] Kamera berhenti ketika modal ditutup.
- [ ] Izin kamera yang ditolak menghasilkan instruksi yang jelas.

## Desktop Windows
- [ ] Installer EXE dapat dipasang.
- [ ] Installer MSI dapat dipasang.
- [ ] Data dan sesi tetap ada setelah aplikasi ditutup/dibuka.
- [ ] F2 fokus pencarian, F4 bayar, F8 tahan, F9 scan, Esc tutup dialog.
- [ ] Scanner USB bekerja pada kasir dan formulir produk.
- [ ] Layar pelanggan kedua menampilkan nama toko, cabang, item, dan total.
- [ ] Link eksternal tidak dibuka di dalam renderer aplikasi.

## Cloud dan lintas perangkat
- [ ] Perubahan PC muncul di Web/Android.
- [ ] Perubahan Web/Android muncul di PC.
- [ ] Antrean offline kembali ke `0` setelah koneksi pulih.
- [ ] Konflik lintas perangkat digabung tanpa menghilangkan pembayaran, retur, atau stok.
- [ ] Owner, Manager, dan Kasir hanya melihat data sesuai hak akses/cabang.

## Regresi modul utama
- [ ] Kasir, hold, split, pembayaran, refund, dan nota.
- [ ] Produk, stok, transfer cabang, pembelian, dan retur pemasok.
- [ ] Pelanggan, piutang, utang, kas, shift, dan laporan.
- [ ] QRIS per cabang, promo, karyawan, audit, backup, dan Pusat Kontrol.
- [ ] HP Infinix Note 40 Pro+ serta Huawei MatePad SE 11 portrait/landscape.
