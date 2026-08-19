# Native Android Notes v6.0.1

- Package ID: `app.bumimakmur.pos`
- Version name: `6.0.1`
- Tetap gunakan **keystore rilis yang sama** dengan versi produksi sebelumnya.
- Instal APK update langsung di atas versi lama; jangan uninstall jika ingin mempertahankan cache/perangkat pairing.
- Kamera digunakan oleh Smart Barcode Scanner, Stock Opname Scanner, Product Picker, Tes Scanner, dan AI Product Capture.
- Scanner menyediakan kamera depan/belakang, pemilih lensa, flash/torch, zoom, dan scan foto bila capability tersedia.
- AI Product Capture memakai barcode scanner + OCR native ML Kit; Gemini tetap opsional.
- Custom Capacitor plugin v6 menyediakan `recognizeText` untuk OCR gambar dan `sharePdf` untuk PDF tutup harian.
- Share PDF mencoba WhatsApp, lalu WhatsApp Business, kemudian Android chooser/share sheet sebagai fallback. Pengguna tetap menekan Send sendiri.
- Produk berserial memerlukan pemilihan serial sebelum checkout.
- Layout ditargetkan untuk Infinix Note 40 Pro+ dan Huawei MatePad SE 11, portrait/landscape.
- Fitur inti tetap dapat berjalan offline setelah perangkat berhasil pairing dan memiliki snapshot lokal; AI cloud tidak menjadi dependency.
- Build release: GitHub Actions `Build Bumi Makmur POS v6.0.1` → `android-release`.
