const RUNTIME_KEY = 'bmpos-gemini-runtime-v1';
const DIAGNOSTICS_KEY = 'bmpos-gemini-diagnostics-v1';
const MAX_DIAGNOSTICS = 30;
const DEFAULT_QUOTA_BLOCK_MS = 10 * 60 * 1000;
const DEFAULT_SERVICE_BLOCK_MS = 60 * 1000;
const DEFAULT_AUTH_BLOCK_MS = 5 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

function storageAvailable() {
  try { return typeof localStorage !== 'undefined'; } catch { return false; }
}

function readJson(key, fallback) {
  if (!storageAvailable()) return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
}

function writeJson(key, value) {
  if (!storageAvailable()) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function removeItem(key) {
  if (!storageAvailable()) return;
  try { localStorage.removeItem(key); } catch {}
}

function parseDurationMs(value) {
  const text = clean(value).toLowerCase();
  if (!text) return 0;
  const match = text.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m|h)?$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const unit = match[2] || 's';
  const multiplier = unit === 'ms' ? 1 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 1000;
  return Math.min(MAX_RETRY_DELAY_MS, Math.round(amount * multiplier));
}

function retryDelayFromHeaders(headers) {
  if (!headers || typeof headers.get !== 'function') return 0;
  const raw = clean(headers.get('retry-after'));
  if (!raw) return 0;
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(raw)) return Math.min(MAX_RETRY_DELAY_MS, Math.round(Number(raw) * 1000));
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.min(MAX_RETRY_DELAY_MS, Math.max(0, date - Date.now())) : 0;
}

function retryDelayFromPayload(payload = {}) {
  const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
  for (const detail of details) {
    const type = clean(detail?.['@type']).toLowerCase();
    if (type.includes('retryinfo')) {
      const parsed = parseDurationMs(detail?.retryDelay);
      if (parsed) return parsed;
    }
  }
  return 0;
}

function quotaTechnicalDetails(payload = {}) {
  const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
  const output = [];
  for (const detail of details) {
    const type = clean(detail?.['@type']).toLowerCase();
    if (type.includes('quotafailure')) {
      for (const violation of Array.isArray(detail?.violations) ? detail.violations : []) {
        const metric = clean(violation?.quotaMetric);
        const quotaId = clean(violation?.quotaId);
        const description = clean(violation?.description);
        const dimensions = violation?.quotaDimensions && typeof violation.quotaDimensions === 'object'
          ? Object.entries(violation.quotaDimensions).map(([key, value]) => `${key}=${clean(value)}`).join(',')
          : '';
        output.push([metric, quotaId, dimensions, description].filter(Boolean).join(' · '));
      }
    }
  }
  return output.join(' | ').slice(0, 900);
}

function classifyCategory(status, payload = {}) {
  const apiStatus = clean(payload?.error?.status).toUpperCase();
  const message = clean(payload?.error?.message).toLowerCase();
  if (status === 429 || apiStatus === 'RESOURCE_EXHAUSTED' || /quota|rate limit|too many requests/.test(message)) return /rate limit/.test(message) ? 'rate_limit' : 'quota';
  if (status === 401 || status === 403 || ['UNAUTHENTICATED', 'PERMISSION_DENIED'].includes(apiStatus) || /api key.*(invalid|not valid)|invalid api key|permission denied/.test(message)) return 'auth';
  if (status === 404 || apiStatus === 'NOT_FOUND' || /model.*not found|model.*not supported/.test(message)) return 'model';
  if (status >= 500 || ['UNAVAILABLE', 'INTERNAL', 'DEADLINE_EXCEEDED'].includes(apiStatus)) return 'service';
  if (status === 400 || apiStatus === 'INVALID_ARGUMENT') return 'request';
  return 'service';
}

function defaultBlockMs(category) {
  if (category === 'quota' || category === 'rate_limit') return DEFAULT_QUOTA_BLOCK_MS;
  if (category === 'auth' || category === 'model') return DEFAULT_AUTH_BLOCK_MS;
  if (category === 'service') return DEFAULT_SERVICE_BLOCK_MS;
  return 0;
}

function friendlyMessage(category, scope = 'Gemini', retryAt = '') {
  const retryText = retryAt ? ` Coba lagi setelah ${new Date(retryAt).toLocaleString('id-ID')}.` : '';
  switch (category) {
    case 'quota':
      return `Kuota Gemini sedang habis atau batas pemakaian tercapai. ${scope} dihentikan sementara di perangkat ini agar tidak mengirim permintaan berulang.${retryText} Foto dari kamera/galeri dan pencarian dari link produk tetap dapat dipakai.`;
    case 'rate_limit':
      return `Gemini sedang membatasi terlalu banyak permintaan. ${scope} dijeda sementara.${retryText} Foto manual dan pencarian dari link produk tetap tersedia.`;
    case 'auth':
      return 'Gemini API key ditolak atau tidak memiliki izin. Periksa API key di Pengaturan → AI & Otomasi, lalu jalankan Tes Gemini.';
    case 'model':
      return 'Model Gemini yang dipilih tidak tersedia untuk API key ini. Periksa nama model di Pengaturan → AI & Otomasi.';
    case 'request':
      return `Permintaan ${scope.toLowerCase()} ditolak Gemini. Periksa model dan konfigurasi AI, lalu coba kembali.`;
    case 'network':
      return `${scope} tidak dapat menghubungi Gemini. Periksa koneksi internet; fitur foto manual tetap dapat digunakan.`;
    default:
      return `Layanan Gemini sedang tidak tersedia untuk ${scope.toLowerCase()}. Coba lagi beberapa saat lagi; fitur non-AI tetap berjalan normal.`;
  }
}

export class GeminiRequestError extends Error {
  constructor(message, info = {}) {
    super(message);
    this.name = 'GeminiRequestError';
    this.category = info.category || 'service';
    this.status = Number(info.status || 0);
    this.apiStatus = clean(info.apiStatus);
    this.scope = clean(info.scope || 'Gemini');
    this.retryAt = info.retryAt || '';
    this.retryDelayMs = Math.max(0, Number(info.retryDelayMs || 0));
    this.technicalMessage = clean(info.technicalMessage).slice(0, 1200);
    this.isGeminiError = true;
  }
}

export function createGeminiApiError({ status = 0, payload = {}, headers = null, scope = 'Gemini', now = Date.now() } = {}) {
  const category = classifyCategory(Number(status || 0), payload);
  const retryDelayMs = Math.max(retryDelayFromHeaders(headers), retryDelayFromPayload(payload), defaultBlockMs(category));
  const retryAt = retryDelayMs ? new Date(now + retryDelayMs).toISOString() : '';
  const apiStatus = clean(payload?.error?.status);
  const rawMessage = clean(payload?.error?.message) || `HTTP ${status || 0}`;
  const quotaDetails = quotaTechnicalDetails(payload);
  const technicalMessage = [`HTTP ${status || 0}`, apiStatus, rawMessage, quotaDetails].filter(Boolean).join(' · ');
  return new GeminiRequestError(friendlyMessage(category, scope, retryAt), {
    category, status, apiStatus, scope, retryAt, retryDelayMs, technicalMessage
  });
}

export function createGeminiNetworkError(error, scope = 'Gemini') {
  const technicalMessage = clean(error?.message || error || 'Network error');
  return new GeminiRequestError(friendlyMessage('network', scope), { category: 'network', scope, technicalMessage });
}

export function describeGeminiError(error) {
  if (error?.isGeminiError) {
    return {
      category: error.category || 'service',
      status: Number(error.status || 0),
      apiStatus: clean(error.apiStatus),
      retryAt: error.retryAt || '',
      userMessage: error.message || friendlyMessage(error.category || 'service', error.scope || 'Gemini', error.retryAt || ''),
      technicalMessage: clean(error.technicalMessage || error.message)
    };
  }
  return {
    category: 'unknown', status: 0, apiStatus: '', retryAt: '',
    userMessage: clean(error?.message) || 'Terjadi kesalahan pada layanan AI.',
    technicalMessage: clean(error?.stack || error?.message || error)
  };
}

function appendDiagnostic(entry = {}) {
  const previous = readJson(DIAGNOSTICS_KEY, []);
  const rows = Array.isArray(previous) ? previous : [];
  const next = [{
    id: `AI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    level: entry.level || 'error',
    category: clean(entry.category || 'unknown'),
    scope: clean(entry.scope || 'Gemini'),
    status: Number(entry.status || 0),
    apiStatus: clean(entry.apiStatus),
    retryAt: entry.retryAt || '',
    message: clean(entry.message).slice(0, 500),
    technicalMessage: clean(entry.technicalMessage).slice(0, 1200)
  }, ...rows].slice(0, MAX_DIAGNOSTICS);
  writeJson(DIAGNOSTICS_KEY, next);
  return next[0];
}

export function recordGeminiFailure(error, { scope = '', now = Date.now() } = {}) {
  const info = describeGeminiError(error);
  const retryAt = info.retryAt || (error?.retryDelayMs ? new Date(now + Number(error.retryDelayMs)).toISOString() : '');
  const state = {
    status: info.category,
    scope: clean(scope || error?.scope || 'Gemini'),
    blockedUntil: retryAt,
    lastFailureAt: new Date(now).toISOString(),
    lastSuccessAt: readJson(RUNTIME_KEY, {})?.lastSuccessAt || '',
    message: info.userMessage,
    technicalMessage: info.technicalMessage
  };
  writeJson(RUNTIME_KEY, state);
  appendDiagnostic({
    level: 'error', category: info.category, scope: state.scope, status: info.status, apiStatus: info.apiStatus,
    retryAt, message: info.userMessage, technicalMessage: info.technicalMessage
  });
  return state;
}

export function recordGeminiSuccess({ scope = 'Gemini', now = Date.now() } = {}) {
  const state = {
    status: 'ready', scope: clean(scope), blockedUntil: '', lastFailureAt: '',
    lastSuccessAt: new Date(now).toISOString(), message: 'Gemini siap digunakan.', technicalMessage: ''
  };
  writeJson(RUNTIME_KEY, state);
  return state;
}

export function getGeminiRuntimeStatus(now = Date.now()) {
  const state = readJson(RUNTIME_KEY, {});
  if (!state || typeof state !== 'object' || !state.status) return { status: 'unknown', blocked: false, blockedUntil: '', message: 'Gemini belum diuji pada perangkat ini.', lastSuccessAt: '', lastFailureAt: '' };
  const blockedUntilMs = Date.parse(state.blockedUntil || '');
  const blocked = Number.isFinite(blockedUntilMs) && blockedUntilMs > now;
  if (!blocked && ['quota', 'rate_limit', 'auth', 'model', 'service'].includes(state.status)) {
    return { ...state, status: 'retry_available', blocked: false, message: 'Jeda sementara sudah selesai. Gemini dapat diuji atau dicoba kembali.' };
  }
  return { ...state, blocked };
}

export function assertGeminiRequestAllowed({ scope = 'Gemini', bypassCooldown = false, now = Date.now() } = {}) {
  if (bypassCooldown) return;
  const state = getGeminiRuntimeStatus(now);
  if (!state.blocked) return;
  const category = state.status || 'quota';
  const retryAt = state.blockedUntil || '';
  throw new GeminiRequestError(friendlyMessage(category, scope, retryAt), {
    category, scope, retryAt,
    retryDelayMs: Math.max(0, Date.parse(retryAt) - now),
    technicalMessage: clean(state.technicalMessage || `Local cooldown aktif sampai ${retryAt}`)
  });
}

export async function requestGeminiGenerateContent({ apiKey, model, body, scope = 'Gemini', bypassCooldown = false } = {}) {
  assertGeminiRequestAllowed({ scope, bypassCooldown });
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(clean(model))}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clean(apiKey) },
      body: JSON.stringify(body)
    });
  } catch (error) {
    const wrapped = createGeminiNetworkError(error, scope);
    recordGeminiFailure(wrapped, { scope });
    throw wrapped;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const wrapped = createGeminiApiError({ status: response.status, payload, headers: response.headers, scope });
    recordGeminiFailure(wrapped, { scope });
    throw wrapped;
  }
  recordGeminiSuccess({ scope });
  return payload;
}

export function getGeminiDiagnostics() {
  const rows = readJson(DIAGNOSTICS_KEY, []);
  return Array.isArray(rows) ? rows.slice(0, MAX_DIAGNOSTICS) : [];
}

export function clearGeminiDiagnostics() {
  removeItem(DIAGNOSTICS_KEY);
}

export function clearGeminiRuntimeBlock() {
  removeItem(RUNTIME_KEY);
}
