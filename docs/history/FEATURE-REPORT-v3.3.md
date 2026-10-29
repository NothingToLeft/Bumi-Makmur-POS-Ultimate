# Feature & QA Report v3.3

## Fitur baru

- Pembayaran cepat: QRIS, ShopeePay, OVO, GoPay, DANA, transfer, kartu, tunai, dan tempo.
- Tampilan pembayaran premium dengan kartu merek, QR merchant, nominal cepat tunai, referensi transaksi, serta split payment.
- Nota digital terperinci yang dapat dikirim melalui WhatsApp.
- Tombol salin, bagikan, cetak, dan kirim ulang nota dari riwayat transaksi.
- Kustomisasi nota: logo, judul, footer, pesan toko, pesan WhatsApp, lebar 58/80 mm, serta pilihan informasi yang ditampilkan.
- Pengaturan QRIS: unggah QR merchant, nama merchant, dan instruksi pembayaran.
- Kompresi logo otomatis dan penyimpanan QR dengan kualitas tajam.
- Migrasi metode pembayaran: data pengguna versi lama tetap dipertahankan, sementara metode e-wallet baru otomatis ditambahkan.
- Penyempurnaan visual premium pada sidebar, header, kartu, modal pembayaran, dan nota.

## Audit integritas

- Struktur JSX/JavaScript diperiksa menggunakan TypeScript transpile diagnostics.
- Seluruh tes inti lulus: 18/18.
- Versi package dan VERSION.txt konsisten pada 3.3.0.
- Workflow Android tetap memakai release keystore yang sama dan melakukan verifikasi `apksigner`.
- Tidak ada secret, private key, atau keystore di paket proyek.

## Catatan

- Nota WhatsApp dikirim sebagai e-receipt teks terperinci. Tautan nota publik berbasis web dapat ditambahkan setelah Firebase/hosting cloud diaktifkan.
- QRIS menerima pembayaran dari aplikasi yang mendukung QRIS. Nama ShopeePay, OVO, GoPay, dan DANA juga disediakan sebagai metode pencatatan terpisah untuk laporan.
