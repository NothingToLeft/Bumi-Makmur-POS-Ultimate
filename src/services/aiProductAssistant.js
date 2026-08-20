import { isNativeAndroid, recognizeTextFromImage } from './nativeDevice.js';
import { findBestProductMatch, normalizeProductCode, normalizeProductText, parseProductTextLocally } from '../utils/aiProductParsing.js';

export { findBestProductMatch, parseProductTextLocally } from '../utils/aiProductParsing.js';

const SETTINGS_KEY = 'bmpos-ai-product-assistant-v1';

export const DEFAULT_AI_SETTINGS = Object.freeze({
  enabled: true,
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: '',
  useNativeOcr: true,
  sendImageToAi: true,
  rememberLastPhoto: false
});

export function getAiDeviceSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...DEFAULT_AI_SETTINGS, ...stored, apiKey: String(stored.apiKey || '') };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveAiDeviceSettings(patch = {}) {
  const next = { ...getAiDeviceSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export const AI_SYNCABLE_KEYS = Object.freeze(['enabled', 'provider', 'model', 'useNativeOcr', 'sendImageToAi', 'rememberLastPhoto']);

export function pickSyncableAiSettings(settings = {}) {
  return Object.fromEntries(AI_SYNCABLE_KEYS.map(key => [key, settings[key] ?? DEFAULT_AI_SETTINGS[key]]));
}

export function applyCloudAiPreferences(preferences = {}) {
  const current = getAiDeviceSettings();
  const synced = pickSyncableAiSettings(preferences);
  const next = { ...current, ...synced, apiKey: current.apiKey };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function clearAiApiKey() {
  return saveAiDeviceSettings({ apiKey: '' });
}

export async function optimizeProductImage(file, { maxEdge = 1600, quality = 0.86 } = {}) {
  if (!file) throw new Error('Pilih foto produk terlebih dahulu.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('File harus berupa gambar produk.');
  let source = null;
  let objectUrl = '';
  try {
    if (typeof createImageBitmap === 'function') {
      source = await createImageBitmap(file);
    } else {
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = objectUrl;
      if (typeof image.decode === 'function') await image.decode();
      else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Gambar produk tidak dapat dibaca.')); });
      source = image;
    }
    const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Browser tidak dapat memproses gambar produk.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { dataUrl, mimeType: 'image/jpeg', width, height, bytes: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75) };
  } finally {
    source?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function scanBarcodeFromImageFile(file) {
  if (!file) return '';
  const url = URL.createObjectURL(file);
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const image = new Image();
    image.src = url;
    await image.decode();
    const reader = new BrowserMultiFormatReader();
    const result = await reader.decodeFromImageElement(image);
    return normalizeProductCode(typeof result?.getText === 'function' ? result.getText() : result?.text);
  } catch {
    return '';
  } finally {
    URL.revokeObjectURL(url);
  }
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: 'string', description: 'Nama keluarga produk yang ringkas tanpa harga atau jumlah stok.' },
    brand: { type: 'string' },
    model: { type: 'string' },
    category: { type: 'string' },
    variantName: { type: 'string', description: 'Ukuran, warna, watt, ampere, atau varian pembeda. Kosong bila tidak ada.' },
    specifications: { type: 'string' },
    size: { type: 'string' },
    color: { type: 'string' },
    material: { type: 'string' },
    packUnit: { type: 'string', description: 'Contoh pack, box, dus, roll. Kosong bila tidak terbaca.' },
    packQty: { type: 'integer', minimum: 0 },
    baseUnit: { type: 'string', enum: ['pcs', 'unit', 'meter', 'cm', 'batang', 'lembar', 'set', 'pair', 'roll', 'box', 'pack', 'kg', 'gram', 'liter', 'botol', 'tube'] },
    barcode: { type: 'string' },
    suggestedVariantMode: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['productName', 'brand', 'model', 'category', 'variantName', 'specifications', 'size', 'color', 'material', 'packUnit', 'packQty', 'baseUnit', 'barcode', 'suggestedVariantMode', 'confidence', 'warnings']
};

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map(part => part.text || '').join('').trim();
}

export async function analyzeProductWithGemini({ dataUrl, ocrText = '', barcode = '', categories = [], settings = getAiDeviceSettings() }) {
  const apiKey = String(settings.apiKey || '').trim();
  if (!apiKey) throw new Error('Gemini API key belum diatur pada Pengaturan → AI & Otomasi.');
  if (!navigator.onLine) throw new Error('Analisis Gemini memerlukan internet. OCR lokal tetap dapat digunakan pada Android.');
  const model = String(settings.model || DEFAULT_AI_SETTINGS.model).trim();
  const categoryList = categories.length ? categories.join(', ') : 'Listrik, Air & Pipa, Besi & Paku, Perkakas, Material, Paket';
  const prompt = `Anda adalah asisten katalog POS toko listrik/material Indonesia. Ekstrak informasi yang benar-benar terlihat pada foto/teks kemasan. Jangan menebak harga modal, harga jual, stok, supplier, garansi, atau barcode yang tidak terlihat.\nKategori yang diizinkan: ${categoryList}. Pilih yang paling dekat dari daftar tersebut.\nUntuk kemasan seperti QTY 100 PCS, isi packQty=100, packUnit=pack, baseUnit=pcs. productName sebaiknya nama keluarga produk (contoh: Cable Ties VISALUX), sedangkan ukuran/warna masuk ke variantName.\nBarcode hasil scanner lokal bila ada: ${barcode || '(tidak ada)'}. Pertahankan barcode ini kecuali foto jelas menunjukkan kode lain yang sama jenisnya.\nOCR lokal bila ada:\n${ocrText || '(tidak ada OCR lokal)'}`;
  const comma = dataUrl.indexOf(',');
  const mimeType = dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/jpeg';
  const imageData = comma >= 0 ? dataUrl.slice(comma + 1) : '';
  const parts = [{ text: prompt }];
  if (settings.sendImageToAi !== false && imageData) parts.push({ inlineData: { mimeType, data: imageData } });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0.1 }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini gagal (${response.status}).`);
  const text = extractGeminiText(payload);
  if (!text) throw new Error('Gemini tidak mengembalikan hasil produk.');
  let result;
  try { result = JSON.parse(text); } catch { throw new Error('Hasil Gemini tidak dapat dibaca sebagai data produk.'); }
  const local = parseProductTextLocally(ocrText, { barcode, categories });
  const allowedCategory = categories.find(category => String(category).toLowerCase() === String(result.category || '').toLowerCase());
  const valueOrLocal = (value, fallback) => normalizeProductText(value) || fallback || '';
  return {
    ...local,
    productName: valueOrLocal(result.productName, local.productName),
    brand: valueOrLocal(result.brand, local.brand),
    model: valueOrLocal(result.model, local.model),
    category: allowedCategory || local.category,
    variantName: valueOrLocal(result.variantName, local.variantName),
    specifications: valueOrLocal(result.specifications, local.specifications),
    size: valueOrLocal(result.size, local.size),
    color: valueOrLocal(result.color, local.color),
    material: valueOrLocal(result.material, local.material),
    packUnit: valueOrLocal(result.packUnit, local.packUnit).toLowerCase(),
    packQty: Math.max(0, Math.round(Number(result.packQty || local.packQty || 0))),
    baseUnit: valueOrLocal(result.baseUnit, local.baseUnit) || 'pcs',
    // Decoder barcode lokal lebih tepercaya daripada digit yang diinterpretasikan model vision.
    barcode: normalizeProductCode(barcode || result.barcode || local.barcode),
    suggestedVariantMode: Boolean(result.suggestedVariantMode ?? local.suggestedVariantMode),
    confidence: Math.min(1, Math.max(0, Number(result.confidence || Math.max(local.confidence, 0.7)))),
    warnings: Array.isArray(result.warnings) ? result.warnings.map(normalizeProductText).filter(Boolean) : [],
    source: 'gemini+vision',
    rawText: ocrText
  };
}

export async function collectProductPhotoSignals(file, { categories = [], settings = getAiDeviceSettings() } = {}) {
  const [optimized, barcode] = await Promise.all([optimizeProductImage(file), scanBarcodeFromImageFile(file)]);
  let ocrText = '';
  let ocrStatus = 'unavailable';
  if (settings.useNativeOcr !== false && isNativeAndroid()) {
    try {
      const result = await recognizeTextFromImage(optimized.dataUrl);
      ocrText = String(result?.text || '').trim();
      ocrStatus = result?.success ? 'native' : 'empty';
    } catch (error) {
      ocrStatus = 'error';
    }
  }
  const local = parseProductTextLocally(ocrText, { barcode, categories });
  return { optimized, barcode, ocrText, ocrStatus, local };
}

export async function analyzeProductPhoto(file, { categories = [], settings = getAiDeviceSettings() } = {}) {
  const signals = await collectProductPhotoSignals(file, { categories, settings });
  if (settings.enabled !== false && settings.apiKey && navigator.onLine) {
    try {
      const result = await analyzeProductWithGemini({ dataUrl: signals.optimized.dataUrl, ocrText: signals.ocrText, barcode: signals.barcode, categories, settings });
      return { ...signals, result };
    } catch (error) {
      return { ...signals, result: { ...signals.local, warnings: [...(signals.local.warnings || []), `Gemini tidak digunakan: ${error.message}`] }, aiError: error.message };
    }
  }
  const reason = !settings.apiKey ? 'Gemini API key belum diatur; memakai OCR/barcode lokal.' : !navigator.onLine ? 'Offline; memakai OCR/barcode lokal.' : 'AI dinonaktifkan; memakai OCR/barcode lokal.';
  return { ...signals, result: { ...signals.local, warnings: [...(signals.local.warnings || []), reason] } };
}

export async function testGeminiConnection(settings = getAiDeviceSettings()) {
  const apiKey = String(settings.apiKey || '').trim();
  if (!apiKey) throw new Error('Masukkan Gemini API key terlebih dahulu.');
  const model = String(settings.model || DEFAULT_AI_SETTINGS.model).trim();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Balas hanya dengan BM-AI-OK' }] }], generationConfig: { temperature: 0 } })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Koneksi Gemini gagal (${response.status}).`);
  return extractGeminiText(payload) || 'OK';
}
