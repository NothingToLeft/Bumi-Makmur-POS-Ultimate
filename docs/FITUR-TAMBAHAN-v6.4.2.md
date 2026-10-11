# Fitur Tambahan (setelah review v6.4.1)

Semua fitur bersifat aditif: tidak ada fitur lama yang dihapus, tidak ada perubahan skema
Firestore, rules, atau index, dan tidak ada dependensi baru.

## 1. Pencari Menu Cepat (Ctrl/Cmd + K)
- Tekan **Ctrl+K** (Mac: **Cmd+K**) di layar mana pun setelah login, atau klik **Cari menu** di sidebar.
- Ketik nama menu atau istilah sehari-hari: `refund`, `closing`, `stok`, `printer`, `piutang`.
- Panah atas/bawah untuk memilih, **Enter** untuk membuka, **Esc** untuk menutup.
- Hanya menampilkan menu yang boleh diakses peran yang sedang login.
- Kode: `src/components/CommandPalette.jsx`, `src/utils/commandPalette.js`.

## 2. Wawasan Penjualan di Dashboard
- Grafik omzet neto 7 hari (setelah refund, transaksi VOID dikeluarkan) dan perbandingan dengan kemarin.
- Rata-rata nilai per transaksi, **jam tersibuk** (30 hari terakhir), 5 **produk terlaris**, dan bauran **metode pembayaran**.
- Dihitung dari data cabang aktif yang sudah ada di perangkat; tidak ada query atau biaya cloud tambahan.
- Kode: `src/components/SalesInsightsPanel.jsx`, `src/utils/salesInsights.js`.

## 3. Hitung Kas per Pecahan saat Akhiri Shift
- Di dialog **Akhiri Shift**, tombol **Hitung per pecahan uang** membuka kalkulator Rp100.000 sampai Rp100.
- Totalnya mengisi kolom Kas Fisik Aktual secara otomatis; selisih tetap dihitung seperti sebelumnya.
- Kode: `src/components/CashCounter.jsx`, `src/utils/cashDenominations.js`.

## 4. Ekspor Transaksi ke CSV
- Tombol **Ekspor CSV** di halaman Transaksi mengekspor daftar yang sedang tampil (sesuai pencarian, filter status, dan urutan).
- Kolom: invoice, tanggal, status, kasir, pelanggan, cabang, jumlah item, subtotal, diskon, pajak, servis, pembulatan, total, direfund, neto, pembayaran, kembalian.
- Hanya untuk peran yang punya izin `reports.view` (Owner/Manager), sama seperti Laporan.
- Sel teks yang diawali `= + - @` diberi awalan apostrof agar tidak dieksekusi sebagai rumus di Excel/Sheets.
- Kode: `src/utils/csvExport.js`.

## Pengujian
`tests/v642-productivity-features.test.mjs` menguji perhitungan pecahan, keamanan CSV, wawasan
penjualan (VOID/refund/jam sibuk), dan peringkat pencarian menu. Komponen juga di-render
server-side dengan stub ikon sebagai smoke test. Jalankan `npm run test:core`.
