# Sinkronisasi ke CHARISNA SuperApp

Khusus Owner. Buka `https://zen.charisna-superapp.workers.dev/pos`, masuk, lalu pilih **Buat kode penghubung**. Di POS, tunggu cloud Firebase sehat dan semua antrean selesai. Buka **Pengaturan Sistem → CHARISNA SuperApp**, masukkan kode 24 karakter, lalu pilih **Hubungkan dan kirim ringkasan**. Kode berlaku 10 menit.

SuperApp menerima ringkasan bulan berjalan untuk setiap cabang: omzet bersih, jumlah transaksi, dan laba perkiraan setelah HPP serta beban. Angka dipisah per cabang. Penghitungan memakai zona waktu Asia/Jakarta. Data transaksi, pelanggan, stok, PIN, dan token Firebase tidak dikirim. SuperApp hanya menampilkan informasi.

Setelah terhubung, POS Owner mengirim ringkasan saat data cloud berubah dan antrean mutasi kosong. POS yang ditutup tidak dapat mengirim; SuperApp tetap menampilkan ringkasan terakhir dan menandai data tertunda setelah 24 jam. Buka POS web atau Android lagi agar diperbarui. Aplikasi Windows native memakai `file://` dan belum dapat mengirim karena Origin tidak diizinkan; gunakan POS web pada PC.

Kunci sinkron disimpan di local storage perangkat Owner yang dipakai memasangkan, terikat ID Owner dan toko. Jangan ekspor atau kirim kunci itu. Jika koneksi diputus dari SuperApp, buat kode baru dan hubungkan lagi. Sinkron otomatis dari beberapa perangkat Owner secara serentak belum didukung.

Tes kontrak: `node --test tests/superapp-sync.test.mjs`. Pemeriksaan penuh: `npm run test:core` dan `npm run build`. Kontrak server dan rincian keamanan ada di repo SuperApp, `docs/BUMI_MAKMUR_POS_CONNECTOR.md`.
