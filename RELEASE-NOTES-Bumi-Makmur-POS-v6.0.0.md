# Bumi Makmur POS v6.0.0 — AI Product Capture & Daily Automation

v6.0.0 adalah major release yang mempercepat input katalog dan penerimaan barang tanpa mengorbankan offline-first atau Firebase Spark.

## Highlight
- **Foto Produk AI:** foto kemasan → barcode/OCR → draft produk yang dapat diperiksa.
- **OCR lokal Android:** ML Kit membaca teks kemasan secara on-device pada APK.
- **Gemini opsional:** menyempurnakan struktur nama/merek/model/ukuran/isi pack bila API key lokal tersedia.
- **Smart Receiving:** foto barang masuk → cocokkan ke katalog → isi baris penerimaan.
- **Closing PDF:** tutup shift menghasilkan ringkasan omzet/HPP/laba/kas/refund/void dan PDF.
- **WhatsApp Android:** PDF diarahkan ke WhatsApp/WhatsApp Business bila terpasang, dengan fallback share sheet.
- **Historical HPP Snapshot:** laporan lama tidak berubah saat harga modal produk berubah.

## Upgrade dari v5.8.1
1. Backup JSON dan pastikan antrean offline 0.
2. Replace source repository dengan isi ZIP v6.0.0.
3. Push ke `main`.
4. Jalankan workflow Android `test-only`.
5. Bila rules v5.8.x sudah aktif, v6 tidak memerlukan deploy rules baru untuk fitur AI/closing.
6. Jalankan `android-release` dan `windows-release` setelah test-only hijau.
7. Web Cloudflare Pages akan memakai source v6 setelah deployment repository berhasil.

## Catatan AI
- AI key tidak termasuk source code dan tidak disinkronkan.
- Tanpa API key, aplikasi tetap berfungsi penuh; pada Android, OCR/barcode lokal masih tersedia.
- Harga dan stok tetap harus dikonfirmasi manusia.

## Catatan WhatsApp
- v6 tidak menyimpan token WhatsApp Business.
- Android membuka aplikasi WhatsApp dengan PDF terlampir; pengguna tetap mengonfirmasi penerima dan mengirim pesan.
- Windows/Web menggunakan mekanisme share/download yang didukung platform.

## QA source
- 174/174 automated core/regression tests PASS.
- Static project audit PASS.
- JS/JSX syntax parse PASS.
- Production APK/EXE/Web compilation tetap harus lulus GitHub Actions sebelum release dipakai sebagai build produksi.
