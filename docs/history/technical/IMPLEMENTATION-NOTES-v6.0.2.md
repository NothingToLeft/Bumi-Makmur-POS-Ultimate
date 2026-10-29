# Implementation Notes v6.0.2

## Architectural decision
Receipt rendering sebelumnya tersebar pada POS modal, public receipt, setting preview, image share, dan print HTML. v6.0.2 memusatkan UI utama pada `ReceiptDocument.jsx` agar perubahan visual dan kalkulasi pembayaran tidak saling menyimpang.

## Cash change
`getReceiptPaymentSummary(sale)` menormalisasi payment line, mengenali pembayaran tunai, membaca `sale.change` jika tersedia, dan menyediakan fallback derived change untuk transaksi lama. `cashApplied` digunakan agar cash movement mencatat uang bersih yang benar-benar tinggal di laci.

## UI
Receipt modal memakai flex-column shell dengan `100dvh` safe sizing. Hanya badan nota yang scroll; tombol Tutup/Salin/Bagikan/Cetak tetap dapat dijangkau. Nama item dan identitas memakai wrapping, sedangkan angka rupiah memakai tabular numerals dan kolom `max-content`.

## Branding
Receipt mengutamakan white space, teks hitam, dan aksen merah–hitam Bumi Makmur 2. Warna hijau hanya dipakai sebagai semantic success, bukan warna brand utama.

## Compatibility
Tidak ada perubahan database wajib. Transaksi existing tetap dirender karena fallback change calculation.
