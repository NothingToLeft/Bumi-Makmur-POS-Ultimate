# Folder Structure — Bumi Makmur POS v6.3.1

Hanya bagian yang relevan dengan patch v6.3.1 ditampilkan. Struktur fitur lama tetap dipertahankan.

```text
src/
  components/
    AIProductCaptureModal.jsx
    ProductPosImageEditor.jsx        # UI foto Kasir + fallback link produk
  services/
    aiProductAssistant.js            # AI capture, sekarang memakai geminiRuntime
    geminiRuntime.js                 # NEW: error classifier, cooldown, status, diagnostics
    productMedia.js                  # grounding, cache kandidat, fallback source URL
  screens/
    DeviceSettingsScreens.jsx        # status & diagnostik Gemini
functions/
  api/
    product-image-search.js          # source verification/image fetch, tanpa Gemini key
tests/
  v631-ai-quota-resilience.test.mjs # NEW: regression patch v6.3.1
docs/
  IMPLEMENTATION-NOTES-v6.3.1.md
  AI-QUOTA-RESILIENCE-API-v6.3.1.md
  FOLDER-STRUCTURE-v6.3.1.md
```

Tidak ada folder Firebase Functions/Storage baru. Cloudflare Pages Function tetap berada di `functions/api` sesuai deployment Cloudflare Pages.
