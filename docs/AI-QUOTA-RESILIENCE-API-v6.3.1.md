# AI Quota Resilience API — v6.3.1

## Gemini runtime client API

### `requestGeminiGenerateContent(options)`

Input:

- `apiKey: string` — secret lokal perangkat;
- `model: string` — model Gemini;
- `body: object` — payload `generateContent`;
- `scope: string` — label fitur untuk pesan/diagnostik;
- `bypassCooldown?: boolean` — hanya untuk tindakan eksplisit seperti Tes Gemini.

Output: payload JSON Gemini pada status berhasil.

Throws: `GeminiRequestError` pada network/API/cooldown error.

### `GeminiRequestError`

Field penting:

- `category`;
- `status`;
- `apiStatus`;
- `scope`;
- `retryAt`;
- `retryDelayMs`;
- `technicalMessage`;
- `isGeminiError = true`.

`message` selalu user-facing dan tidak menggunakan pesan mentah provider sebagai UI utama.

### `getGeminiRuntimeStatus()`

Mengembalikan status lokal terakhir. Bila cooldown sudah lewat, status kegagalan berubah menjadi `retry_available` tanpa melakukan request otomatis.

### `getGeminiDiagnostics()`

Mengembalikan maksimum 30 entry error lokal. Tidak berisi API key.

## Product media client API

### `searchProductImageCandidates(query, settings?)`

1. normalisasi query;
2. cek cache 12 jam;
3. jika cache miss, lakukan Gemini Google Search grounding;
4. kirim source pages ke Cloudflare helper;
5. cache kandidat berhasil.

### `searchProductImageCandidatesFromSourceUrl(query, sourcePageUrl)`

Tidak memakai Gemini. Mengirim source URL yang dipilih pengguna ke helper untuk ekstraksi kandidat.

### `buildProductWebSearchUrl(query)`

Membentuk URL Google Images untuk membantu pengguna menemukan halaman produk. URL ini tidak dipanggil oleh server dan tidak mengirim Gemini API key.

## Cloudflare Pages helper

Endpoint: `POST /api/product-image-search`

### Search

Payload:

```json
{
  "action": "search",
  "query": "Philips LED 10W E27",
  "sources": [
    { "url": "https://example.com/product", "title": "" }
  ]
}
```

`source` dapat berasal dari Gemini grounding atau link manual pengguna. Helper tidak mengetahui dan tidak membutuhkan API key Gemini.

### Image

Payload:

```json
{
  "action": "image",
  "imageUrl": "https://example.com/image.webp",
  "sourcePageUrl": "https://example.com/product"
}
```

Helper melakukan source re-verification sebelum mengambil gambar.
