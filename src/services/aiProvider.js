// Abstraksi penyedia AI: Gemini (default) dan endpoint OpenAI-compatible
// (OpenAI, OpenRouter, Groq, DeepSeek, Ollama, LM Studio, gateway internal).
// Tujuan: pemilik toko dapat memakai provider lain tanpa mengubah kode panggilan.
export const AI_PROVIDERS = Object.freeze([
  {
    id: 'gemini',
    label: 'Google Gemini',
    needsBaseUrl: false,
    supportsImage: true,
    defaultModel: 'gemini-2.5-flash',
    keyHint: 'AIza...'
  },
  {
    id: 'openai',
    label: 'OpenAI / OpenAI-compatible',
    needsBaseUrl: true,
    supportsImage: true,
    defaultModel: 'gpt-4o-mini',
    keyHint: 'sk-...'
  },
  {
    id: 'custom',
    label: 'Kustom (endpoint kompatibel OpenAI)',
    needsBaseUrl: true,
    supportsImage: false,
    defaultModel: '',
    keyHint: 'token server'
  }
]);

export const DEFAULT_PROVIDER_ID = 'gemini';

export function normalizeProviderId(value) {
  const id = String(value || '').trim().toLowerCase();
  return AI_PROVIDERS.some(item => item.id === id) ? id : DEFAULT_PROVIDER_ID;
}

export function describeProvider(value) {
  const id = normalizeProviderId(value);
  return AI_PROVIDERS.find(item => item.id === id) || AI_PROVIDERS[0];
}

// Base URL dinormalisasi tanpa garis miring di akhir dan tanpa "/v1" ganda,
// karena sebagian provider sudah menyertakan /v1 pada base URL-nya.
export function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/v1$/i, '');
}

export function chatCompletionsUrl(baseUrl) {
  const clean = normalizeBaseUrl(baseUrl);
  if (!clean) throw new Error('Base URL provider AI belum diisi.');
  return `${clean}/v1/chat/completions`;
}

function extractOpenAiText(payload) {
  const choice = payload?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map(part => part?.text || '').join('').trim();
  return '';
}

/**
 * Panggil provider teks non-Gemini (OpenAI-compatible).
 * @returns {Promise<{text: string, provider: string, model: string, latencyMs: number}>}
 */
export async function requestOpenAiCompatible({
  baseUrl,
  apiKey,
  model,
  prompt,
  system = '',
  imageDataUrl = '',
  temperature = 0.1,
  timeoutMs = 45000
} = {}) {
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('API key provider AI belum diisi pada Pengaturan → AI & Otomasi.');
  const url = chatCompletionsUrl(baseUrl);
  const userContent = [];
  if (prompt) userContent.push({ type: 'text', text: String(prompt) });
  if (imageDataUrl) userContent.push({ type: 'image_url', image_url: { url: imageDataUrl } });
  const body = {
    model: String(model || '').trim(),
    temperature,
    messages: [
      ...(system ? [{ role: 'system', content: String(system) }] : []),
      { role: 'user', content: userContent.length === 1 && userContent[0].type === 'text' ? userContent[0].text : userContent }
    ]
  };
  if (!body.model) throw new Error('Model provider AI belum diisi.');
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller?.signal
    });
    const latencyMs = Date.now() - startedAt;
    if (response.status === 401 || response.status === 403) throw new Error('API key provider AI ditolak (401/403). Periksa kembali kunci Anda.');
    if (response.status === 429) throw new Error('Kuota/rate limit provider AI tercapai (429). Coba lagi nanti.');
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 180);
      throw new Error(`Provider AI gagal (${response.status}). ${detail}`.trim());
    }
    const payload = await response.json();
    const text = extractOpenAiText(payload);
    if (!text) throw new Error('Provider AI tidak mengembalikan teks yang dapat dibaca.');
    return { text, provider: normalizeProviderId('openai'), model: body.model, latencyMs };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Provider AI tidak merespons dalam batas waktu. Periksa koneksi atau Base URL.');
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Uji koneksi provider terpilih; mengembalikan teks penanda dari model. */
export async function testAiProviderConnection(settings = {}) {
  const provider = normalizeProviderId(settings.provider);
  if (provider === 'gemini') {
    const { testGeminiConnection } = await import('./aiProductAssistant.js');
    return testGeminiConnection(settings);
  }
  const result = await requestOpenAiCompatible({
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    prompt: 'Balas hanya dengan BM-AI-OK',
    temperature: 0
  });
  return result.text || 'OK';
}
