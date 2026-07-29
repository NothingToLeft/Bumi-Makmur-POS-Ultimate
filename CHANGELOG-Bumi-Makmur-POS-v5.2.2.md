# Bumi Makmur POS v5.2.2 — Responsive Sidebar Identity Fix

## Identitas cabang pada sidebar

- Memperbaiki nama cabang panjang yang sebelumnya dipotong, misalnya `Bumi Makmur 02 Surabaya` hanya tampil sebagian.
- Nama cabang sekarang dapat tampil hingga dua baris secara rapi.
- Ukuran huruf mengecil secara adaptif ketika nama cabang lebih panjang dari 20 karakter.
- Lebar sidebar desktop ditambah secara terukur agar identitas toko lebih lega tanpa mengganggu area kerja utama.
- Tinggi bagian logo dan identitas dibuat fleksibel sehingga baris kedua tidak bertabrakan dengan menu Dashboard.
- Versi aplikasi tetap tampil sebagai baris metadata terpisah di bawah nama cabang.
- Tooltip nama lengkap tetap tersedia ketika pointer diarahkan ke nama toko.

## Responsivitas

- Desktop Windows menggunakan sidebar 288 px mulai resolusi desktop.
- Web menggunakan lebar 280–288 px pada layar besar dan tetap berubah menjadi mode ikon pada layar menengah.
- Nama sangat panjang dibatasi maksimal dua baris agar sidebar tetap stabil.
- Pemenggalan kata hanya dilakukan bila diperlukan; nama normal tidak lagi dipotong dengan ellipsis satu baris.

## Kompatibilitas

- Tidak mengubah data toko, cabang, produk, stok, transaksi, maupun akun.
- Tidak mengubah Firestore Rules atau struktur Firebase.
- Tetap kompatibel dengan Firebase Spark gratis.
- Dapat dipasang sebagai pembaruan langsung di atas v5.2.1 tanpa uninstall.

## QA

- Core tests: **101/101 lulus**.
- Static audit: **lulus**.
- Source JS/JSX/MJS: **67 file diperiksa**.
- JSON: **4 file valid**.
- Regression test khusus nama cabang panjang ditambahkan.
- Build Vite produksi tetap dijalankan melalui GitHub Actions `test-only` karena instalasi dependency lokal mengalami timeout.
