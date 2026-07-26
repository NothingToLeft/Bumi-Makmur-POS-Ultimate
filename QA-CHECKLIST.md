# QA Checklist Bumi Makmur POS v5.0.0

## A. Build dan deploy

- [ ] Backup JSON sudah dibuat dan antrean offline sebelum update = 0.
- [ ] Workflow `test-only` hijau: 77 tests, audit statis, dan Vite compile.
- [ ] Workflow `Deploy Firebase Spark Rules` hijau setelah source v5 masuk.
- [ ] Cloudflare Pages branch `main` berstatus Success dan menampilkan v5.0.0.
- [ ] `android-release` menghasilkan APK/AAB signed versionCode 50000.
- [ ] APK dapat dipasang di atas versi lama tanpa uninstall dan data lama tetap ada.

## B. QRIS Adaptive v3

- [ ] Unggah PNG/JPG/WebP kecil dan besar hingga 24 MB.
- [ ] Tidak muncul popup `Gambar masih terlalu besar setelah dikompresi`.
- [ ] Status proses, ukuran asli/hasil, resolusi, dan penghematan tampil di halaman.
- [ ] Preview besar tidak terpotong, latar transparan menjadi putih, dan quiet zone tetap terlihat.
- [ ] Hasil tersimpan setelah menekan **Simpan Profil QRIS Cabang**.
- [ ] Refresh Web dan buka APK: profil cabang tetap sama.
- [ ] QRIS berhasil dipindai dari layar HP, tablet, dan PC dengan minimal dua aplikasi pembayaran.
- [ ] QRIS Cabang A tidak berubah ketika QRIS Cabang B diedit.
- [ ] Manager hanya dapat mengatur QRIS cabangnya.
- [ ] Kasir melihat QRIS cabang login yang benar.

## C. Migrasi dan data lama

- [ ] Produk, pelanggan, transaksi, stok, karyawan, cabang, dan pengaturan lama tetap ada.
- [ ] Tidak ada produk/transaksi demo baru masuk ke database nyata.
- [ ] QRIS lama tetap tampil sebagai fallback sebelum profil baru disimpan.
- [ ] Backup JSON v4.x dapat dipulihkan dan memperoleh struktur v5 tanpa error.
- [ ] Tambah cabang setelah update tidak menyebabkan error `branchPaymentProfiles`.

## D. Pusat Kontrol Operasional

- [ ] Owner dan Manager melihat menu **Pusat Kontrol**; Kasir tidak.
- [ ] Skor kesehatan mengikuti temuan cabang aktif.
- [ ] Stok rendah/habis dan saran restock sesuai stok minimum serta multiplier.
- [ ] Nilai stok modal dan potensi retail masuk akal.
- [ ] Omzet bersih hari ini memperhitungkan refund.
- [ ] Risiko margin menemukan harga retail ≤ modal.
- [ ] SKU/barcode ganda terdeteksi.
- [ ] Piutang/utang jatuh tempo serta shift terlalu lama terdeteksi.
- [ ] CSV restock dapat dibuka di Excel.
- [ ] Cetak restock 80 mm terbaca dengan baik.

## E. Login, karyawan, dan role

- [ ] Halaman Login Owner dan Login Karyawan tetap terpisah.
- [ ] Aktivasi Toko Baru tidak terlihat pada login normal; mode aktivasi hanya dapat dibuka secara khusus.
- [ ] Karyawan login dengan cabang + nama login + PIN 4 digit.
- [ ] Biometrik tidak muncul otomatis; hanya setelah tombol ditekan.
- [ ] Owner dapat tambah/edit/hapus Manager dan Kasir dari Pengaturan.
- [ ] Manager dapat mengelola Kasir cabangnya, tetapi tidak Manager/cabang/pengaturan global.
- [ ] Manager melihat transfer masuk dan keluar tanpa banner cloud bermasalah.
- [ ] Cabang baru muncul pada pilihan login setelah sinkronisasi.

## F. Cloud dan konflik Web–HP

- [ ] Status cloud tersambung dan antrean 0 setelah login.
- [ ] Ubah produk berbeda dari Web dan HP: keduanya tersinkron.
- [ ] Ubah dokumen yang sama hampir bersamaan: rebase selesai tanpa duplikasi.
- [ ] Perubahan QRIS tidak memicu konflik pengaturan toko global.
- [ ] Mode pesawat dapat melakukan transaksi; setelah online antrean kembali 0.
- [ ] Tidak ada banner mentah `Missing or insufficient permissions`.

## G. Operasional dan tampilan

- [ ] Kasir, barcode, open bill, split payment, refund, void, pembelian, retur, stok, shift, hutang/piutang, laporan, nota, WhatsApp, printer, dan layar pelanggan diuji.
- [ ] Search icon/input tidak bertumpuk pada HP/tablet/PC.
- [ ] Infinix Note 40 Pro+ portrait.
- [ ] Huawei MatePad SE 11 portrait dan landscape.
- [ ] PC 1366×768 dan 1920×1080.
