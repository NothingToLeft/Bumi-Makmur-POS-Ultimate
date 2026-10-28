import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGeminiApiError, describeGeminiError } from '../src/services/geminiRuntime.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v6.3.1 maps Gemini RESOURCE_EXHAUSTED into a friendly quota error with retry window', () => {
  const now = Date.parse('2026-08-20T12:00:00.000Z');
  const error = createGeminiApiError({
    status: 429,
    now,
    scope: 'Pencarian foto AI',
    payload: {
      error: {
        status: 'RESOURCE_EXHAUSTED',
        message: 'You exceeded your current quota, please check your plan and billing details.',
        details: [
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '30s' },
          { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId: 'FreeTierRequestsPerDay' }] }
        ]
      }
    }
  });
  assert.equal(error.category, 'quota');
  assert.equal(error.retryAt, '2026-08-20T12:10:00.000Z'); // default anti-hammer guard is intentionally longer than a short server hint.
  assert.match(error.message, /Kuota Gemini sedang habis/i);
  assert.match(error.message, /dihentikan sementara/i);
  assert.doesNotMatch(error.message, /billing details|ai\.google\.dev/i);
  assert.match(error.technicalMessage, /FreeTierRequestsPerDay/);
});

test('v6.3.1 keeps authentication errors user-facing while preserving technical details locally', () => {
  const error = createGeminiApiError({
    status: 403,
    scope: 'Tes koneksi Gemini',
    payload: { error: { status: 'PERMISSION_DENIED', message: 'API key not valid. Please pass a valid API key.' } }
  });
  const info = describeGeminiError(error);
  assert.equal(info.category, 'auth');
  assert.match(info.userMessage, /API key ditolak/i);
  assert.match(info.technicalMessage, /API key not valid/i);
});

test('product photo search caches successful candidates and offers a no-Gemini source-link fallback', async () => {
  const [media, editor, helper] = await Promise.all([
    read('src/services/productMedia.js'), read('src/components/ProductPosImageEditor.jsx'), read('functions/api/product-image-search.js')
  ]);
  assert.match(media, /SEARCH_CACHE_TTL_MS = 12 \* 60 \* 60 \* 1000/);
  assert.match(media, /readCachedCandidates/);
  assert.match(media, /searchProductImageCandidatesFromSourceUrl/);
  assert.match(media, /buildProductWebSearchUrl/);
  assert.match(editor, /Pencarian AI sementara tidak tersedia/);
  assert.match(editor, /Ambil dari Link/);
  assert.match(editor, /Fallback link tidak memakai Gemini/);
  assert.doesNotMatch(helper, /generativelanguage\.googleapis\.com|x-goog-api-key|body\?\.apiKey/);
  assert.match(helper, /halaman sumber yang dikirim perangkat/);
});

test('AI settings expose runtime status and local diagnostics without synchronizing secrets', async () => {
  const [settings, ai, runtime] = await Promise.all([
    read('src/screens/DeviceSettingsScreens.jsx'), read('src/services/aiProductAssistant.js'), read('src/services/geminiRuntime.js')
  ]);
  assert.match(settings, /Status AI di perangkat ini/);
  assert.match(settings, /Diagnostik AI lokal/);
  assert.match(settings, /Tes koneksi tetap dapat dijalankan manual/);
  assert.match(ai, /requestGeminiGenerateContent/);
  assert.match(runtime, /DIAGNOSTICS_KEY/);
  assert.match(runtime, /assertGeminiRequestAllowed/);
  assert.doesNotMatch(ai.split('AI_SYNCABLE_KEYS')[1].split(';')[0], /apiKey/);
});
