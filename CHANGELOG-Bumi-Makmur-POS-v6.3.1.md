# Changelog — Bumi Makmur POS v6.3.1

## Added

- Shared Gemini runtime untuk klasifikasi error, cooldown, status, dan diagnostik lokal.
- Cache kandidat Cari Foto Otomatis selama 12 jam, maksimum 24 query per perangkat.
- Fallback `Cari dari Link Produk` tanpa Gemini.
- Tombol pencarian web untuk membantu menemukan halaman produk yang benar sebelum URL ditempel.
- Panel Status Gemini pada Pengaturan → AI & Otomasi.
- Diagnostik AI lokal yang menyimpan kategori, status HTTP/API, retry time, pesan pengguna, dan detail teknis tanpa API key.
- Regression tests v6.3.1 untuk quota handling, auth error, fallback link, cache, dan secret isolation.

## Changed

- Request Gemini dari AI Product Capture dan Product Media sekarang memakai satu service `geminiRuntime.js`.
- Error 429/`RESOURCE_EXHAUSTED`, rate-limit, auth, model, network, dan service error diterjemahkan menjadi pesan Bahasa Indonesia yang aman.
- Request otomatis dihentikan sementara ketika runtime mendeteksi kondisi yang berpotensi memicu request loop.
- Tes Gemini manual dapat bypass cooldown agar Owner dapat memeriksa pemulihan secara eksplisit.
- Cloudflare product image helper memakai wording generik `halaman sumber yang dikirim perangkat` sehingga dapat melayani sumber hasil Gemini maupun link manual tanpa menerima secret.
- PWA cache, package version, workflow artifact naming, dan current release metadata dinaikkan ke v6.3.1.

## Fixed

- Pesan mentah Gemini `You exceeded your current quota...` tidak lagi ditampilkan langsung pada form Produk.
- Pencarian produk yang sama tidak lagi selalu menghabiskan request grounding baru ketika kandidat masih tersedia pada cache lokal.
- Quota/rate-limit tidak lagi membuat tombol Cari Otomatis terus mengirim request gagal berulang kali.
- Owner memiliki cara tetap menggunakan pencarian kandidat gambar melalui halaman sumber saat Gemini sedang tidak tersedia.
- AI Product Capture ikut menerima error handling konsisten dari runtime yang sama.

## Security / Cost Controls

- API key Gemini tetap hanya di `localStorage` perangkat sesuai arsitektur sebelumnya dan tidak disinkronkan.
- Diagnostic log tidak menyimpan API key.
- Cloudflare helper tidak memanggil Gemini dan tidak menerima `x-goog-api-key`.
- Fallback link tetap melewati SSRF/private-network/custom-port guard dan source re-verification.
- Tidak ada Firebase Functions/Storage/Blaze dependency baru.
