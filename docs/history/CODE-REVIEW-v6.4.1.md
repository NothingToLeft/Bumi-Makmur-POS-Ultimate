# Code Review Bumi Makmur POS v6.4.1

Review statis (pembacaan kode). Aplikasi tidak dijalankan dan `npm install`/`vite build` tidak
dapat dijalankan di lingkungan review karena tidak ada akses internet. Yang diverifikasi:
268 tes bawaan lulus, audit statis lulus, dan seluruh 130+ file JS/JSX bebas error sintaks.
Setelah perbaikan: 277 tes lulus.

## Bug yang diperbaiki

| # | Tingkat | Lokasi | Masalah | Perbaikan |
|---|---------|--------|---------|-----------|
| 1 | Tinggi | `PosContext.refundSale` | Baris refund dicocokkan dengan `lineId === x \|\| productId === x`. Bila produk yang sama ada di dua baris (mis. satu baris diberi diskon/catatan atau satuan berbeda), refund baris kedua dihitung dari baris pertama: nominal, sisa qty, dan restock salah. | `findSaleLine` / `isSameSaleLine` (`utils/saleLines.js`): `lineId` jadi identitas utama, `productId` hanya fallback data lama. |
| 2 | Tinggi | `PosContext.refundSale` | Validasi refund memakai state lama (`db` pada closure), sedangkan `commit()` tidak memvalidasi ulang. Ada `await` PIN Manager di antaranya, jadi klik ganda/retry dapat membuat refund ganda dan restock stok dua kali. | Validasi dipindah ke `computeRefundPlan` (`utils/refundPlan.js`) dan dijalankan ulang di dalam `commit()` terhadap state terbaru. Tombol juga diberi guard klik ganda. |
| 3 | Sedang | `refundSale` (void) | Void penuh menerima subset item dari payload sehingga transaksi berstatus VOIDED walau refund/restock hanya sebagian. | Void wajib mencakup seluruh baris dengan qty penuh. |
| 4 | Sedang | `completeSale` | `sessionId` konfirmasi QRIS hanya dicek tidak kosong. Sesi yang sama bisa dipakai ulang di transaksi lain. `confirmedAt` di-parse tetapi tidak pernah dibandingkan. | Sesi yang sudah dipakai ditolak; konfirmasi bertanggal masa depan (>5 menit) ditolak. |
| 5 | Sedang | `completeSale` | Diskon poin loyalitas dihitung dari `payload.pointsRedeemed` sebelum divalidasi. Bila loyalitas nonaktif atau pelanggan "Umum", diskon tetap diberikan tanpa memotong poin. | Penukaran poin divalidasi di awal (program aktif, pelanggan terdaftar, saldo cukup). |
| 6 | Sedang | `offlineStore.verifyOfflineLogin` | Tidak ada pembatasan percobaan PIN. PIN 4 digit (10.000 kombinasi) pada login offline dan persetujuan diskon/void/di bawah modal dapat ditebak berulang. | Jeda eskalatif per perangkat: 5 salah = 30 dtk, 8 = 2 mnt, 10+ = 5 mnt. Hanya PIN yang benar-benar dibandingkan dan salah yang dihitung; sukses mereset. |
| 7 | Rendah | `completeSale` (garansi) | `setMonth` meluap: 31 Jan + 1 bulan menjadi 3 Maret. | `addCalendarMonths` menjepit ke hari terakhir bulan. |
| 8 | Rendah | `helpers.printHtmlDocument` | CSS `font:700 14px inherit` tidak valid sehingga tombol Cetak tidak mendapat font. | Diganti shorthand yang valid. |

## Temuan yang TIDAK diubah (perlu keputusan Anda)

1. **Token persetujuan hanya dicek tidak kosong** (`approvedBy && approvalToken`). Token `LOCAL-...`
   dibuat di client dan tidak diverifikasi. Pengguna dengan DevTools dapat memalsukannya untuk
   melewati batas diskon atau jual di bawah modal. Karena arsitektur Spark tanpa Functions,
   perbaikan sejati butuh verifikasi di sisi server (Firestore Rules atau Function).
2. **`xlsx@0.18.5`** memiliki kerentanan yang diketahui (prototype pollution, ReDoS) dan paket npm-nya
   tidak lagi diperbarui. Dipakai untuk import file, jadi menerima input tidak tepercaya. Disarankan
   pindah ke rilis resmi SheetJS 0.20.x.
3. **PIN hanya 4 digit.** Lockout di atas memperlambat tebakan, tetapi 6 digit akan jauh lebih kuat.
4. **Puluhan file laporan per versi di root repo** (BUILD-REPORT, QA-REPORT, RELEASE-NOTES, ...).
   Tidak saya pindahkan karena `scripts/audit-project.mjs` dan workflow CI merujuk path-nya. Jika
   ingin rapi, pindahkan ke `docs/releases/` sekaligus dengan memperbarui daftar di audit dan workflow.
5. **Folder `.git` ikut di zip** (termasuk reflog 50 KB). Tidak berbahaya, tetapi tidak perlu dibagikan.
6. Sebagian besar tes bawaan berupa pencocokan teks pada source (regression guard), bukan tes
   perilaku. Tes baru `v642-refund-lines-and-guards.test.mjs` menguji perilaku nyata.

## File yang berubah

- Baru: `src/utils/saleLines.js`, `src/utils/refundPlan.js`, `tests/v642-refund-lines-and-guards.test.mjs`, dokumen ini.
- Diubah: `src/store/PosContext.jsx`, `src/services/offlineStore.js`, `src/screens/TransactionsScreen.jsx`,
  `src/utils/helpers.js`, `tests/v520-smart-inventory-fractional.test.mjs` (guard dipindah mengikuti refactor).
- Nomor versi sengaja tidak dinaikkan agar audit/CI yang mengunci v6.4.1 tetap lulus.
