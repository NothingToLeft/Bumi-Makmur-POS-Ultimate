# Bumi Makmur POS v5.7.0 — Smart Barcode Scanner & Camera Control

## Scanner barcode profesional

- Mengganti scanner kamera lama yang bergantung pada `BarcodeDetector` dengan komponen scanner bersama berbasis ZXing Browser.
- Mendukung kamera **depan maupun belakang** dan tombol cepat **Depan / Belakang**.
- Menampilkan daftar kamera/lensa yang tersedia agar pengguna dapat memilih kamera yang fokusnya paling baik.
- Mengingat kamera terakhir pada perangkat yang sama.
- Mengaktifkan fokus kontinu apabila didukung perangkat.
- Menambahkan kontrol **flash/torch** dan **zoom** bila kamera menyediakan kapabilitas tersebut.
- Menambahkan **Scan dari Foto** untuk membaca barcode dari gambar yang sudah tersimpan.
- Menambahkan bunyi dan getar saat scan berhasil, keduanya dapat dimatikan.
- Menambahkan **Mode Scan Cepat** di Kasir agar kamera tetap terbuka untuk scan banyak barang berturut-turut.
- Menambahkan perlindungan duplikasi pembacaan kamera agar satu barcode yang masih berada di frame tidak menambah jumlah terlalu cepat.
- Scanner USB/Bluetooth keyboard-wedge tetap didukung melalui input manual.

## Integrasi scanner

Scanner yang sama sekarang dipakai pada:

- Kasir / checkout.
- Tambah Barang & Stok.
- Produk Induk + Varian.
- Pemilih barang pada pembelian/restok.
- Penyesuaian stok.
- Transfer cabang.
- Modul lain yang memakai Product Picker.
- Pengaturan → Kamera & Scanner → Tes Scanner.

Shared barcode tetap aman: barcode kemasan bersama membuka pilihan varian, sedangkan SKU/barcode internal memilih varian secara langsung.

## Pengaturan perangkat

Ditambahkan panel **Kamera & Scanner Barcode** untuk:

- memeriksa izin kamera;
- membuka pengaturan izin aplikasi;
- menguji scanner tanpa mengubah stok/transaksi;
- memeriksa barcode terakhir yang berhasil dibaca.

## Stabilitas yang dipertahankan

- Pemulihan sesi Firebase Desktop v5.6.2 tetap dipertahankan.
- Sinkronisasi Web–Desktop–Android, antrean offline, konflik stok, impor Excel/CSV, Purchase Order, approval PIN, backup/restore, varian, satuan kemasan, dan hak Store Manager tidak dikurangi.
- Tidak ada perubahan struktur Firestore atau Firestore Rules pada rilis ini.
- Android tetap menggunakan Capacitor; Windows tetap menggunakan Electron; Web/PWA tetap menggunakan Vite.
