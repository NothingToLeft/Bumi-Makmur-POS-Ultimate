# AI Product Assistant API Notes — v6.0.0

## Provider
v6 menyediakan provider `gemini` pada device settings. Provider abstraction ditempatkan pada `aiProductAssistant.js` agar provider lain dapat ditambahkan tanpa mengubah form Produk/Pembelian.

## Request flow

```text
Photo File
  → optimizeProductImage()
  → barcode decoder
  → Android ML Kit OCR (bila native)
  → parseProductTextLocally()
  → optional analyzeProductWithGemini()
  → validated draft
  → human confirmation
```

## Gemini request
Method: `POST`

Endpoint pattern:
```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

Header:
```text
Content-Type: application/json
x-goog-api-key: <device-local-key>
```

Generation config menggunakan JSON response schema. Image dikirim sebagai `inlineData` hanya jika `sendImageToAi=true`.

## Validation policy
- local decoded barcode wins over model-supplied barcode;
- category must exist in current application category list;
- blank model fields fall back to local OCR result;
- pack quantity is normalized to non-negative integer;
- confidence clamped 0–1;
- AI cannot set cost, selling price, stock, supplier, warranty, or approval data.

## Failure policy
- Gemini HTTP/auth/quota/parsing error → local result + warning;
- offline → local result;
- no key → local result;
- native OCR unavailable → barcode-only/local manual fallback.
