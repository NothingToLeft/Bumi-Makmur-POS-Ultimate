# Implementation Notes — v6.3.1 AI Quota Resilience

## Tujuan

Menghilangkan single point of failure pada pengalaman Foto Produk ketika Gemini menolak request karena quota/rate-limit, tanpa mengganti provider berbayar dan tanpa menurunkan keamanan Cloudflare helper.

## Arsitektur

### `src/services/geminiRuntime.js`

Service ini menjadi satu pintu request Gemini untuk fitur yang sudah ada. Tanggung jawabnya:

1. memeriksa cooldown lokal sebelum request normal;
2. mengirim `generateContent` langsung dari perangkat dengan `x-goog-api-key`;
3. mengklasifikasikan respons error;
4. membaca `Retry-After` dan `google.rpc.RetryInfo` bila tersedia;
5. menerapkan minimum anti-hammer cooldown untuk quota/rate-limit;
6. menyimpan status runtime lokal;
7. menyimpan diagnostik teknis lokal tanpa secret;
8. menghapus status gagal setelah request berhasil.

Kategori runtime: `quota`, `rate_limit`, `auth`, `model`, `request`, `network`, `service`, `ready`, `retry_available`, dan `unknown`.

### Integrasi AI Product Capture

`aiProductAssistant.js` tidak lagi membuat fetch Gemini sendiri. `analyzeProductWithGemini()` dan `testGeminiConnection()` memakai `requestGeminiGenerateContent()`.

Tes Gemini memakai `bypassCooldown: true` karena merupakan tindakan eksplisit Owner. Request operasional normal tetap mematuhi cooldown.

Mengubah API key atau model menghapus runtime block lama agar konfigurasi baru dapat diuji tanpa menunggu cooldown konfigurasi sebelumnya.

### Integrasi Product Media

`productMedia.js` mempertahankan Google Search grounding Gemini, tetapi pemanggilan HTTP dipindahkan ke runtime bersama.

Sebelum memakai Gemini, service memeriksa cache kandidat lokal:

- TTL: 12 jam;
- maksimum: 24 query;
- key: query yang dinormalisasi;
- data: kandidat aman yang sudah dinormalisasi;
- tidak disinkronkan ke Firestore.

Jika cache tersedia, kandidat langsung dikembalikan dan request Gemini tidak dilakukan.

### Fallback link produk

`searchProductImageCandidatesFromSourceUrl(query, sourcePageUrl)` mengirim satu halaman sumber yang dipilih pengguna ke Cloudflare helper.

Alur:

1. pengguna membuka pencarian web;
2. pengguna memastikan produk/model/watt benar;
3. pengguna menyalin URL halaman produk;
4. client memvalidasi URL HTTP/HTTPS;
5. Cloudflare helper mengambil HTML halaman;
6. helper membaca `og:image`, Twitter image, dan JSON-LD images;
7. kandidat ditampilkan;
8. saat dipilih, helper fetch ulang halaman sumber dan memastikan URL gambar masih tercantum;
9. gambar baru diambil satu kali, dikompres lokal, dan disimpan sebagai thumbnail Kasir.

Tidak ada arbitrary image URL proxy yang ditambahkan.

## UI/UX

Pada error Gemini, Product Image Editor menampilkan panel oranye dengan bahasa operasional, bukan error teknis merah. Kamera/Galeri tetap terlihat dan fallback link ditampilkan langsung.

Dalam kondisi normal, fallback link tetap tersedia melalui `<details>` agar UI utama tidak terlalu padat.

Pengaturan AI menampilkan status runtime dan diagnostics sehingga Owner dapat membedakan masalah quota, API key, model, network, dan service.

## Data model

Tidak ada perubahan Firestore schema.

Local-only keys baru:

- `bmpos-gemini-runtime-v1`;
- `bmpos-gemini-diagnostics-v1`;
- `bmpos-product-image-search-cache-v1`.

Ketiga key tersebut bersifat cache/runtime dan tidak ikut Unified AutoSync atau backup cloud.

## Compatibility

- Android Capacitor: menggunakan fetch/browser runtime yang sama; Kamera/Galeri tetap native-compatible.
- Web/PWA: fallback web search membuka tab baru dan helper berjalan pada Cloudflare Pages.
- Windows Electron: external web URL dibuka melalui handler `shell.openExternal`; source URL ditempel kembali ke aplikasi.
- Existing v6.3.0 product images dan Firestore index exemptions tetap valid.
