# Changelog — Bumi Makmur POS v5.1.2

## Perbaikan tampilan Cloud
- Memperbaiki tombol “Sinkronkan Sekarang” yang sebelumnya terlihat seperti kotak putih kosong pada Desktop/Windows.
- Tombol memakai warna teks eksplisit agar tidak tertimpa urutan CSS Tailwind.

## Editor Cabang
- Menambahkan tombol **Edit Cabang** pada setiap kartu cabang untuk Owner.
- Nama, alamat, dan telepon cabang dapat diperbarui langsung dari aplikasi.
- Perubahan otomatis dipublikasikan ke pilihan cabang pada halaman login.

## Identitas sesuai akun dan cabang login
- Nama aplikasi setelah login mengikuti cabang aktif, bukan selalu nama global usaha.
- Sidebar, judul jendela, header mobile, Pengaturan, nota, layar pelanggan, test printer, dan nota online mengikuti identitas cabang aktif.
- Pengaturan kini memisahkan **Identitas Cabang Aktif** dari **Nama Brand / Grup Usaha** agar tidak tertukar.
- Owner yang berpindah cabang akan melihat identitas berubah otomatis; Manager/Kasir mengikuti cabang yang dipilih saat login.

## Stabilitas
- Menambahkan validasi nama cabang ganda dan batas panjang nama.
- Menyimpan snapshot nama/alamat/telepon cabang pada transaksi agar nota lama tetap konsisten walau cabang kemudian diganti nama.
- Tidak menghapus data, fitur, akun, transaksi, atau konfigurasi Firebase Spark.
