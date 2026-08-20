# Bumi Makmur POS FreeSync v6.3.1
## AI Quota Resilience Patch

Tanggal: 20 Agustus 2026

v6.3.1 adalah patch stabilitas untuk fitur AI Foto Produk dan Cari Foto Otomatis. Patch ini mempertahankan seluruh fitur Product Visual & Multi-Barcode v6.3.0, tetapi menghilangkan tampilan error Gemini mentah seperti `You exceeded your current quota...` dari UI pengguna.

## Perbaikan utama

### 1. Error Gemini menjadi aman dan mudah dipahami

Respons 429 / `RESOURCE_EXHAUSTED`, rate-limit, API key bermasalah, model tidak tersedia, gangguan jaringan, dan service error sekarang diklasifikasikan oleh satu runtime bersama.

Pengguna menerima pesan Bahasa Indonesia yang menjelaskan tindakan yang dapat dilakukan. Detail teknis disimpan pada Diagnostik AI lokal dan tidak lagi memenuhi form produk dengan pesan API mentah.

### 2. Anti-request-loop / cooldown lokal

Saat quota atau rate-limit terdeteksi, perangkat menahan request Gemini berulang untuk sementara. Durasi retry dari respons Google dihormati, tetapi guard lokal memakai minimum jeda aman untuk menghindari spam request dari tombol yang ditekan berulang kali.

Tes Gemini di Pengaturan tetap dapat dijalankan secara manual untuk memeriksa apakah layanan sudah pulih.

### 3. Cache kandidat foto 12 jam

Hasil kandidat foto yang berhasil disimpan secara lokal selama 12 jam, maksimum 24 query per perangkat. Mencari produk yang sama kembali tidak langsung memakai quota Gemini lagi.

Cache hanya berisi metadata URL kandidat dan sumber; thumbnail yang dipilih tetap mengikuti mekanisme penyimpanan v6.3.0.

### 4. Fallback gratis tanpa Gemini

Jika AI quota/rate-limit bermasalah, pengguna tetap dapat:

- mengambil foto dengan kamera;
- memilih foto dari galeri;
- membuka pencarian web untuk query produk;
- menempel link halaman produk resmi/distributor/toko;
- meminta Cloudflare Pages helper membaca metadata gambar dari halaman tersebut tanpa memakai Gemini.

Cloudflare helper tetap melakukan validasi URL, blok private network/localhost/custom port, validasi redirect, MIME, batas ukuran, dan verifikasi ulang bahwa gambar yang dipilih benar-benar tercantum pada halaman sumber.

### 5. Status dan Diagnostik AI

Pengaturan → AI & Otomasi sekarang menampilkan:

- status Gemini di perangkat;
- waktu jeda bila ada;
- waktu keberhasilan terakhir;
- Tes Gemini manual;
- Diagnostik AI lokal dengan kategori dan detail teknis;
- tombol membersihkan diagnostik.

Gemini API key tidak pernah dicatat pada diagnostik.

## Arsitektur dan biaya

- Firebase Authentication + Firestore Spark tetap digunakan.
- Tidak menambahkan Firebase Functions.
- Tidak menambahkan Firebase Storage.
- Tidak memerlukan Blaze.
- Gemini API key tetap local-device secret.
- Cloudflare Pages Function tidak menerima Gemini API key.
- PDF tetap dibuat lokal.
- Data v6.3.0 tetap backward compatible; tidak ada migrasi destruktif.

## Deployment

1. Upload seluruh source v6.3.1 ke GitHub.
2. Jalankan workflow `test-only` sampai hijau.
3. Tunggu Cloudflare Pages deployment hijau agar source web dan `/api/product-image-search` diperbarui.
4. Tidak ada perubahan Firestore Rules/Indexes khusus v6.3.1. Jika index exemption v6.3.0 sudah pernah di-deploy, tidak perlu deploy ulang hanya untuk patch ini.
5. Smoke test: Cari Foto Otomatis, fallback link produk, foto kamera/galeri, transaksi Kasir, dan cloud queue = 0.
6. Setelah Web/PWA stabil, jalankan Android/Windows release workflow.
