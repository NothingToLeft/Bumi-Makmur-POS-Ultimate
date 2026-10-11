# Changelog v6.4.2

- Preserve seluruh fitur tambahan Claude dan regresi fix v6.4.1 reviewed.
- Fix baris refund modal untuk produk yang muncul di banyak baris invoice.
- Cegah pemakaian ulang sesi QRIS dalam checkout yang sama, selain cek histori lokal.
- Buat tiket approval Manager lokal berumur pendek dan single-use, berdasarkan identitas dan tujuan. Risiko server-side tetap terbuka.
- Tahan prefix formula berbahaya CSV meski diawali whitespace.
- Batas input file inventaris maksimal 10 MB, tanpa menghapus dukungan Excel.
- Samakan version metadata, PWA cache dan version regression tests ke 6.4.2.
- Tambahkan unit tests perilaku serta dokumentasi verifikasi/risiko.

Tidak ada database migration, Firebase billing, perubahan indeks maupun penghapusan fitur.
