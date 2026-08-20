import { getAiDeviceSettings } from './aiProductAssistant.js';

const MAX_QUERY = 180;
const TARGET_BYTES = 52000;
const MAX_BYTES = 90000;
const MAX_EDGE = 256;
const MAX_GROUNDED_SOURCES = 6;

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

export function buildProductImageQuery(product = {}) {
  return clean([
    product.brand,
    product.parentName || product.name,
    product.variantName,
    product.model,
    product.specifications
  ].filter(Boolean).join(' ')).slice(0, MAX_QUERY);
}

export function normalizePosImage(value) {
  if (!value || typeof value !== 'object') return null;
  const dataUrl = String(value.dataUrl || '').trim();
  const url = String(value.url || '').trim();
  const validDataUrl = dataUrl && /^data:image\/(?:webp|jpeg|png);base64,/i.test(dataUrl) ? dataUrl : '';
  const validUrl = url && /^https?:\/\//i.test(url) ? url : '';
  if (!validDataUrl && !validUrl) return null;
  return {
    dataUrl: validDataUrl,
    url: validUrl,
    sourceType: clean(value.sourceType || (validDataUrl ? 'manual' : 'ai-web')) || 'manual',
    sourcePageUrl: /^https?:\/\//i.test(String(value.sourcePageUrl || '')) ? String(value.sourcePageUrl) : '',
    sourceDomain: clean(value.sourceDomain),
    query: clean(value.query).slice(0, MAX_QUERY),
    width: Math.max(0, Math.round(Number(value.width || 0))),
    height: Math.max(0, Math.round(Number(value.height || 0))),
    bytes: Math.max(0, Math.round(Number(value.bytes || 0))),
    updatedAt: value.updatedAt || new Date().toISOString()
  };
}

export function resolveProductPosImage(product = {}, groupFallback = null) {
  const own = normalizePosImage(product.posImage);
  const group = normalizePosImage(product.groupPosImage) || normalizePosImage(groupFallback);
  const selected = own || group;
  return selected?.dataUrl || selected?.url || '';
}

function bytesFromDataUrl(dataUrl = '') {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? Math.round((dataUrl.length - comma - 1) * 0.75) : 0;
}

export function preparePosImageForStorage(value) {
  const normalized = normalizePosImage(value);
  if (!normalized) return null;
  if (!normalized.dataUrl) return normalized;
  const actualBytes = bytesFromDataUrl(normalized.dataUrl);
  if (!actualBytes || actualBytes > MAX_BYTES) throw new Error('Thumbnail Kasir melebihi batas 90 KB. Pilih ulang foto agar aplikasi tetap ringan dan aman untuk sinkronisasi.');
  return { ...normalized, bytes: actualBytes, url: '' };
}

async function loadImageSource(source) {
  if (typeof source === 'string') {
    if (!/^data:image\//i.test(source) && !/^blob:/i.test(source)) throw new Error('Sumber gambar tidak aman untuk diproses.');
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    if (typeof image.decode === 'function') await image.decode();
    else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Gambar tidak dapat dibaca.')); });
    return { image, cleanup: () => {} };
  }
  if (!source || !String(source.type || '').startsWith('image/')) throw new Error('Pilih file gambar produk.');
  if (Number(source.size || 0) > 12 * 1024 * 1024) throw new Error('Foto terlalu besar. Gunakan gambar di bawah 12 MB.');
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(source);
    return { image: bitmap, cleanup: () => bitmap.close?.() };
  }
  const url = URL.createObjectURL(source);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  if (typeof image.decode === 'function') await image.decode();
  else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Gambar tidak dapat dibaca.')); });
  return { image, cleanup: () => URL.revokeObjectURL(url) };
}

export async function createCashierThumbnail(source, { sourceType = 'manual', sourcePageUrl = '', sourceDomain = '', query = '' } = {}) {
  const loaded = await loadImageSource(source);
  try {
    const sourceWidth = Number(loaded.image.width || loaded.image.naturalWidth || 0);
    const sourceHeight = Number(loaded.image.height || loaded.image.naturalHeight || 0);
    if (!sourceWidth || !sourceHeight) throw new Error('Ukuran gambar produk tidak valid.');
    if (sourceWidth * sourceHeight > 50_000_000) throw new Error('Resolusi foto terlalu besar. Gunakan foto dengan resolusi lebih rendah.');

    let edge = MAX_EDGE;
    let final = null;
    for (const quality of [0.72, 0.62, 0.52, 0.44]) {
      const scale = Math.min(1, edge / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Browser tidak dapat memproses thumbnail produk.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(loaded.image, 0, 0, width, height);
      let dataUrl = canvas.toDataURL('image/webp', quality);
      if (!/^data:image\/(?:webp|jpeg|png);base64,/i.test(dataUrl)) dataUrl = canvas.toDataURL('image/jpeg', quality);
      final = { dataUrl, width, height, bytes: bytesFromDataUrl(dataUrl) };
      if (final.bytes <= TARGET_BYTES) break;
      edge = Math.max(176, edge - 28);
    }
    if (!final?.dataUrl) throw new Error('Thumbnail produk gagal dibuat.');
    if (final.bytes > MAX_BYTES) throw new Error('Foto masih terlalu besar setelah dikompres. Pilih foto lain atau crop lebih dekat ke produk.');
    return normalizePosImage({
      ...final,
      sourceType,
      sourcePageUrl,
      sourceDomain,
      query,
      updatedAt: new Date().toISOString()
    });
  } finally {
    loaded.cleanup();
  }
}

export async function createCashierThumbnailFromDataUrl(dataUrl, meta = {}) {
  if (!/^data:image\/(?:webp|jpeg|png);base64,/i.test(String(dataUrl || ''))) return null;
  return createCashierThumbnail(dataUrl, meta);
}

function publicAppBase() {
  const configured = String(import.meta.env?.VITE_PUBLIC_APP_URL || '').trim();
  if (/^https?:\/\//i.test(configured)) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && /^https?:\/\//i.test(window.location?.origin || '')) {
    try {
      const current = new URL(window.location.origin);
      const host = current.hostname.toLowerCase();
      const localRuntime = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
      if (!localRuntime) return current.origin.replace(/\/$/, '');
    } catch {}
  }
  return 'https://bumi-makmur.my.id';
}

function safeExternalUrl(value = '') {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    const hostname = url.hostname.toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local')) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function extractGroundingSources(payload) {
  const chunks = payload?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const output = [];
  const seen = new Set();
  for (const chunk of chunks) {
    const url = safeExternalUrl(chunk?.web?.uri);
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ url, title: clean(chunk?.web?.title).slice(0, 140) });
    if (output.length >= MAX_GROUNDED_SOURCES) break;
  }
  return output;
}

async function findGroundedProductSources(query, settings) {
  const apiKey = String(settings?.apiKey || '').trim();
  if (!apiKey) throw new Error('Gemini API key belum diatur pada Pengaturan → AI & Otomasi.');
  const model = clean(settings?.model || 'gemini-2.5-flash').slice(0, 80);
  const prompt = `Cari halaman produk yang paling cocok untuk: "${query}". Fokus pada website resmi merek, distributor resmi, atau official store; marketplace tepercaya boleh menjadi fallback. Gunakan Google Search. Jangan mengarang URL. Tujuan pencarian hanya membantu kasir mengenali produk secara visual. Prioritaskan sumber yang jelas menampilkan model, watt, ukuran, atau spesifikasi yang sama.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.05, maxOutputTokens: 500 }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini Search gagal (${response.status}).`);
  const sources = extractGroundingSources(payload);
  if (!sources.length) throw new Error('Gemini belum menemukan halaman produk yang dapat diverifikasi. Tambahkan merek, model, watt/ukuran, atau gunakan foto manual.');
  return sources;
}

async function callProductImageHelper(payload) {
  const response = await fetch(`${publicAppBase()}/api/product-image-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-BM-Client': 'product-media-v630' },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || `Layanan foto produk gagal (${response.status}).`);
  return result;
}

export async function searchProductImageCandidates(query, settings = getAiDeviceSettings()) {
  const normalizedQuery = clean(query).slice(0, MAX_QUERY);
  if (normalizedQuery.length < 3) throw new Error('Isi nama/merek/varian produk terlebih dahulu.');
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Pencarian foto otomatis memerlukan internet. Foto manual tetap dapat dipakai saat offline.');

  // API key hanya dikirim langsung dari perangkat ke Gemini. Cloudflare helper tidak pernah menerima key.
  const sources = await findGroundedProductSources(normalizedQuery, settings);
  const payload = await callProductImageHelper({ action: 'search', query: normalizedQuery, sources });
  const candidates = (Array.isArray(payload.candidates) ? payload.candidates : []).map((item, index) => ({
    id: item.id || `IMG-${index + 1}`,
    imageUrl: safeExternalUrl(item.imageUrl),
    sourcePageUrl: safeExternalUrl(item.sourcePageUrl),
    sourceTitle: clean(item.sourceTitle),
    sourceDomain: clean(item.sourceDomain),
    confidence: Math.max(0, Math.min(1, Number(item.confidence || 0)))
  })).filter(item => item.imageUrl && item.sourcePageUrl);
  if (!candidates.length) throw new Error('Foto yang cukup meyakinkan belum ditemukan. Coba tambahkan merek, model, watt/ukuran, atau gunakan foto manual.');
  return { query: normalizedQuery, candidates, note: clean(payload.note) };
}

export async function fetchProductImageCandidateDataUrl(candidate = {}) {
  const imageUrl = safeExternalUrl(candidate.imageUrl);
  const sourcePageUrl = safeExternalUrl(candidate.sourcePageUrl);
  if (!imageUrl || !sourcePageUrl) throw new Error('Sumber kandidat foto tidak valid.');
  const payload = await callProductImageHelper({ action: 'image', imageUrl, sourcePageUrl });
  const dataUrl = String(payload.dataUrl || '');
  if (!/^data:image\/(?:webp|jpeg|png);base64,/i.test(dataUrl)) throw new Error('Gambar kandidat tidak dapat dipindahkan dengan aman. Pilih kandidat lain atau gunakan foto manual.');
  return dataUrl;
}
