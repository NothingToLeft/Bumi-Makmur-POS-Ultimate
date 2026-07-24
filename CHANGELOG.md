# Changelog

## 4.1.0 — Hybrid Offline + Firebase Auto-Sync

- Mengaktifkan operasional offline melalui IndexedDB dan app shell service worker.
- Menambahkan queue mutasi persisten, mirror cadangan, auto-sync saat internet kembali, manual sync, dan status antrean.
- Menambahkan login PIN offline PBKDF2 dengan masa berlaku 30 hari setelah verifikasi online.
- Menambahkan idempotency receipt, conflict rebase, merge riwayat pembayaran/retur, dan chunk mutasi besar.
- Mempertahankan seluruh fitur kasir, stok, pembelian, pembayaran digital, nota WhatsApp, multi-cabang, laporan, kamera, biometrik, dan signed release.
- Memperbaiki double-apply antrean saat restart, stale queue recovery, custom item POS, perhitungan total domain, SKU kosong, stok pecahan, dan validasi data master.
- Memperketat hak Kasir pada data pelanggan: hanya data kontak; tingkat harga, batas kredit, poin, cabang, dan status divalidasi ulang oleh domain logic serta Cloud Functions.
- Menambahkan audit retensi fitur dan keamanan; 34 pengujian otomatis lulus.

## 3.0.0 — Ultimate All Features

- Fondasi data local-first tunggal dengan migrasi data lama, audit log, dan sync queue.
- Kasir cepat: pencarian, favorit, barcode kamera/manual/USB keyboard, item kustom, varian, modifier, bundle, dan konversi satuan.
- Harga eceran, grosir, proyek, promo otomatis, loyalty, diskon item/transaksi, pajak, service charge, dan pembulatan.
- Open bill, pending bill, split bill, split payment, pembayaran tunai/QRIS/transfer/kartu/tempo/metode khusus.
- Shift kasir, modal awal, kas masuk/keluar, expected cash, selisih, dan riwayat.
- Produk, label harga/barcode, kategori, SKU, rak, arsip produk, stok minimum, adjustment, opname, transfer cabang, dan stock movement.
- Pembelian, penerimaan barang, hutang pemasok, cicilan, pembatalan aman, serta retur pembelian.
- Pelanggan/member, harga khusus, proyek, batas kredit, poin, reward, dan feedback.
- Transaksi, detail, cetak ulang, refund sebagian/penuh, void, restock, dan approval PIN Manager/Owner.
- Pengeluaran, piutang, hutang, laporan omzet/HPP/laba/metode pembayaran/diskon/pajak/refund/stok/shift.
- Pesanan WhatsApp, marketplace, delivery, dan proyek.
- Role Owner/Manager/Kasir, permission khusus, multi-cabang, profil printer, customer display, kampanye, backup/restore.
- PWA offline shell, Capacitor Android, permission perangkat, dan workflow GitHub Actions untuk APK debug.

Catatan: implementasi ini menggunakan pola fitur POS umum. Source, aset, identitas merek, dan implementasi proprietary aplikasi referensi tidak disalin.

## 3.1.0
- Memperbaiki login yang berhenti pada layar “Memeriksa PIN” setelah PIN salah.
- Menambahkan input Rupiah dengan pemisah ribuan otomatis dan tanpa angka nol yang menempel di depan.
- Menambahkan markup persen untuk harga eceran, grosir, dan proyek; harga jual dihitung otomatis dari harga modal.
- Menambahkan preset markup 10%, 20%, 30%, 40%, dan 50% serta informasi laba per satuan.
- Memvalidasi SKU dan barcode ganda pada cabang yang sama.
- Memperketat pembayaran split/tempo, mencegah transaksi ganda, pembayaran kurang, dan kelebihan non-tunai.
- Menggabungkan kebutuhan stok produk/bundle sebelum transaksi agar stok tidak dapat menjadi negatif dari baris ganda.
- Membatasi refund dan retur pembelian berdasarkan sisa kuantitas yang benar-benar masih dapat dikembalikan.
- Memperbaiki penentuan status refund penuh berdasarkan kuantitas, bukan hanya nominal.
- Memperbaiki kalkulasi pembelian: diskon item tidak boleh melampaui subtotal dan jatuh tempo wajib untuk pembelian tempo yang diterima.

## 3.2.0 — Camera, Biometric, Signed Release & Stability

- Menambahkan permission kamera native Android dan permintaan izin otomatis saat aplikasi pertama dibuka.
- Scanner langsung memulai kamera belakang saat modal Scan dibuka, dilengkapi retry dan pintasan Pengaturan Android.
- Menambahkan plugin native Capacitor `BumiMakmurNative` untuk permission kamera, app settings, dan autentikasi biometrik.
- Menambahkan pengaturan keamanan untuk kamera, sidik jari/pengenalan wajah, dan prompt biometrik otomatis.
- Mengganti build debug menjadi APK/AAB release bertanda tangan dengan keystore tetap melalui GitHub Actions.
- Menambahkan workflow satu kali untuk membuat keystore dan empat Actions Secrets.
- Menambahkan verifikasi signature APK memakai `apksigner`.
- Menetapkan version code `30200` dan version name `3.2.0` secara otomatis saat build Android.
- Memperketat validasi produk, PIN karyawan ganda, kas masuk/keluar, pembayaran campuran, loyalty, refund, pembelian, retur, stok opname, dan transfer stok.
- Menambahkan 5 pengujian konfigurasi release; total 14 pengujian otomatis lulus.

## 3.3.0 — Premium Payments, WhatsApp Receipt & Custom Branding

- Menambahkan metode pembayaran QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, tunai, tempo, dan metode khusus.
- Menambahkan kartu pembayaran cepat, nominal tunai cepat, nomor referensi, tampilan QR merchant, serta split payment yang lebih jelas.
- Menambahkan nota digital teks terperinci untuk WhatsApp dan nota gambar premium melalui menu berbagi Android.
- Menambahkan kirim ulang nota dari riwayat transaksi, tombol salin, bagikan, WhatsApp, dan cetak.
- Menambahkan unggah logo toko, judul nota, footer, pesan khusus, pesan WhatsApp, dan pilihan informasi nota.
- Menambahkan unggah QRIS, nama merchant, petunjuk pembayaran, dan pilihan kertas 58/80 mm.
- Menambahkan migrasi metode pembayaran agar data lama tidak hilang saat e-wallet baru ditambahkan.
- Memperbarui tampilan global menjadi lebih premium dengan sidebar gradasi, header lembut, kartu pembayaran bermerek, dan nota modern.
- Menambahkan pengujian nota digital dan metode pembayaran; total 18 pengujian otomatis lulus.

## 4.0.0 — Firebase Cloud Enterprise

- Mengubah sumber data operasional dari local-first menjadi Firebase Cloud online-only.
- Menghapus service worker offline dan antrean sinkronisasi transaksi lokal.
- Menambahkan Firebase Authentication custom-token dengan login PIN melalui Cloud Functions.
- Menambahkan PIN lookup HMAC dan scrypt hash pada koleksi privat yang tidak dapat dibaca klien.
- Menambahkan Firestore realtime untuk produk, stok, penjualan, pembelian, partner, shift, laporan, dan seluruh cabang.
- Menambahkan transaksi Firestore atomik dengan optimistic concurrency untuk mencegah stok/data antarperangkat saling menimpa.
- Menambahkan approval refund/void satu kali dan audit log yang dibuat server-side.
- Menambahkan role/cabang melalui Firebase custom claims dan Firestore Security Rules.
- Menambahkan bootstrap toko pertama: store code, Owner, cabang utama, database, dan seed data.
- Menambahkan pembuatan karyawan serta approval Manager/Owner melalui callable Cloud Functions.
- Menambahkan Firebase Storage untuk logo, QRIS, dan aset toko.
- Menambahkan Firebase Hosting serta nota online publik untuk WhatsApp.
- Menambahkan audit log cloud, backup/restore Firestore, status cloud, dan full Firebase sign-out.
- Menambahkan workflow deploy Firebase dan build APK/AAB Cloud bertanda tangan.
- Mempertahankan seluruh modul premium v3.3 tanpa pengurangan fitur.
