import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  AI_PROVIDERS,
  chatCompletionsUrl,
  describeProvider,
  normalizeBaseUrl,
  normalizeProviderId,
  requestOpenAiCompatible
} from '../src/services/aiProvider.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('provider AI: id tidak dikenal jatuh ke Gemini, bukan error', () => {
  assert.equal(normalizeProviderId('gemini'), 'gemini');
  assert.equal(normalizeProviderId('OpenAI'), 'openai');
  assert.equal(normalizeProviderId('custom'), 'custom');
  assert.equal(normalizeProviderId(''), 'gemini');
  assert.equal(normalizeProviderId('antah-berantah'), 'gemini');
  assert.equal(normalizeProviderId(null), 'gemini');
});

test('provider AI: metadata konsisten untuk pemilihan di Pengaturan', () => {
  assert.equal(AI_PROVIDERS.length, 3);
  for (const provider of AI_PROVIDERS) {
    assert.ok(provider.id && provider.label);
    assert.equal(typeof provider.needsBaseUrl, 'boolean');
  }
  assert.equal(describeProvider('openai').needsBaseUrl, true);
  assert.equal(describeProvider('gemini').needsBaseUrl, false);
});

test('base URL dinormalisasi tanpa garis miring dan tanpa /v1 ganda', () => {
  assert.equal(normalizeBaseUrl('https://api.openai.com/'), 'https://api.openai.com');
  assert.equal(normalizeBaseUrl('https://api.openai.com/v1/'), 'https://api.openai.com');
  assert.equal(normalizeBaseUrl('  http://192.168.1.10:11434  '), 'http://192.168.1.10:11434');
  assert.equal(chatCompletionsUrl('https://openrouter.ai/api/v1'), 'https://openrouter.ai/api/v1/chat/completions');
});

test('base URL kosong ditolak dengan pesan jelas', () => {
  assert.throws(() => chatCompletionsUrl(''), /Base URL provider AI belum diisi/);
});

test('analisis produk memilih jalur provider, bukan hanya Gemini', () => {
  const source = read('src/services/aiProductAssistant.js');
  assert.match(source, /normalizeProviderId\(settings\.provider\)/);
  assert.match(source, /requestOpenAiCompatible/);
  assert.match(source, /provider === 'gemini'/);
  // API key wajib untuk semua provider, bukan hanya Gemini.
  assert.match(source, /API key AI belum diatur/);
});

test('pengaturan AI menyediakan Base URL dan sinkronisasi provider', () => {
  const assistant = read('src/services/aiProductAssistant.js');
  assert.match(assistant, /baseUrl: ''/);
  assert.match(assistant, /AI_SYNCABLE_KEYS[\s\S]*'baseUrl'/);
  const screen = read('src/screens/DeviceSettingsScreens.jsx') + read('src/components/AiConnectionManager.jsx');
  assert.match(screen, /AI_PROVIDERS\.map/);
  assert.match(screen, /testAiProviderConnection/);
  assert.match(screen, /Base URL/);
});

test('halaman login responsif pada layar pendek (HP kecil dan landscape)', () => {
  const css = read('src/index.css');
  assert.match(css, /@media \(max-height: 700px\)/);
  assert.match(css, /@media \(max-height: 620px\) and \(orientation: landscape\)/);
  const login = read('src/screens/LoginScreen.jsx');
  assert.match(login, /flex-col items-center text-center/);
  assert.match(login, /w-14 h-14 sm:w-16 sm:h-16/);
});

test('requestOpenAiCompatible: mengirim payload benar dan mengembalikan teks', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'BM-AI-OK' } }] })
    };
  };
  const result = await requestOpenAiCompatible({
    baseUrl: 'https://api.contoh.ai/v1',
    apiKey: 'sk-test',
    model: 'gpt-4o-mini',
    prompt: 'Halo',
    system: 'Ringkas.'
  });
  assert.equal(result.text, 'BM-AI-OK');
  assert.equal(result.provider, 'openai');
  assert.equal(calls[0].url, 'https://api.contoh.ai/v1/chat/completions');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, 'gpt-4o-mini');
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[1].content, 'Halo');
});

test('requestOpenAiCompatible: 401 dan 429 menjadi pesan Indonesia yang jelas', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' });
  await assert.rejects(
    () => requestOpenAiCompatible({ baseUrl: 'https://x.ai', apiKey: 'k', model: 'm', prompt: 'p' }),
    /API key provider AI ditolak/
  );
  globalThis.fetch = async () => ({ ok: false, status: 429, text: async () => 'quota' });
  await assert.rejects(
    () => requestOpenAiCompatible({ baseUrl: 'https://x.ai', apiKey: 'k', model: 'm', prompt: 'p' }),
    /Kuota\/rate limit provider AI tercapai/
  );
});

test('requestOpenAiCompatible: base URL atau API key kosong ditolak sebelum request', async () => {
  await assert.rejects(
    () => requestOpenAiCompatible({ baseUrl: '', apiKey: 'k', model: 'm', prompt: 'p' }),
    /Base URL provider AI belum diisi/
  );
  await assert.rejects(
    () => requestOpenAiCompatible({ baseUrl: 'https://x.ai', apiKey: '', model: 'm', prompt: 'p' }),
    /API key provider AI belum diisi/
  );
});
