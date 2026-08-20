const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-BM-Client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff'
};

const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const MAX_SOURCE_HTML_BYTES = 1_600_000;
const MAX_SELECTED_IMAGE_BYTES = 2_500_000;

function isBlockedHostname(hostname = '') {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '0.0.0.0' || host === '::' || host === '::1') return true;
  if (/^(?:fc|fd|fe8|fe9|fea|feb)[0-9a-f:]*$/i.test(host)) return true;
  const parts = host.split('.');
  if (parts.length === 4 && parts.every(part => /^\d+$/.test(part))) {
    const nums = parts.map(Number);
    if (nums.some(value => value < 0 || value > 255)) return true;
    const [a, b] = nums;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
  }
  return false;
}

function safeHttpUrl(value, base = '') {
  try {
    const url = new URL(String(value || ''), base || undefined);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    if (isBlockedHostname(url.hostname)) return '';
    if (url.port && !['80', '443'].includes(url.port)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./i, ''); } catch { return ''; }
}

function htmlDecode(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function metaContent(html, keys = []) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i')
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return htmlDecode(match[1].trim());
    }
  }
  return '';
}

function titleFromHtml(html = '') {
  const og = metaContent(html, ['og:title', 'twitter:title']);
  if (og) return clean(og).slice(0, 140);
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return clean(htmlDecode(match?.[1] || '')).slice(0, 140);
}

function extractJsonLdImages(html = '', pageUrl = '') {
  const values = [];
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts.slice(0, 8)) {
    const raw = script.replace(/^.*?>/s, '').replace(/<\/script>\s*$/i, '').trim();
    try {
      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== 'object') continue;
        const image = item.image;
        if (typeof image === 'string') values.push(image);
        else if (Array.isArray(image)) values.push(...image.filter(value => typeof value === 'string'));
        else if (image && typeof image === 'object' && typeof image.url === 'string') values.push(image.url);
        if (Array.isArray(item['@graph'])) queue.push(...item['@graph']);
      }
    } catch {}
  }
  return values.map(value => safeHttpUrl(value, pageUrl)).filter(Boolean);
}

function extractPageImages(html = '', pageUrl = '') {
  const metaImages = [
    metaContent(html, ['og:image:secure_url']),
    metaContent(html, ['og:image']),
    metaContent(html, ['twitter:image']),
    metaContent(html, ['twitter:image:src'])
  ].map(value => safeHttpUrl(value, pageUrl)).filter(Boolean);
  return [...new Set([...metaImages, ...extractJsonLdImages(html, pageUrl)])].slice(0, 4);
}

async function safeFetch(url, options = {}, maxRedirects = 3) {
  let current = safeHttpUrl(url);
  if (!current) throw new Error('URL tidak diizinkan.');
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const response = await fetch(current, { ...options, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    const next = safeHttpUrl(location, current);
    if (!next) throw new Error('Redirect menuju alamat yang tidak diizinkan.');
    current = next;
  }
  throw new Error('Terlalu banyak redirect.');
}

async function fetchSourcePage(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await safeFetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BumiMakmurPOS/6.4.0; product-image-helper)' }
    });
    if (!response.ok) return null;
    const type = String(response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('text/html')) return null;
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_SOURCE_HTML_BYTES) return null;
    const html = (await response.text()).slice(0, MAX_SOURCE_HTML_BYTES);
    const pageUrl = safeHttpUrl(response.url || source.url);
    if (!pageUrl) return null;
    return {
      pageUrl,
      title: titleFromHtml(html) || clean(source.title) || domainOf(pageUrl),
      images: extractPageImages(html, pageUrl)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    const slice = bytes.subarray(offset, Math.min(offset + chunk, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function fetchSelectedImageDataUrl(imageUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const response = await safeFetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BumiMakmurPOS/6.4.0; product-image-helper)' }
    });
    if (!response.ok) throw new Error(`Sumber gambar merespons ${response.status}.`);
    const type = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Format gambar sumber tidak didukung.');
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_SELECTED_IMAGE_BYTES) throw new Error('Gambar sumber terlalu besar.');
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength || buffer.byteLength > MAX_SELECTED_IMAGE_BYTES) throw new Error('Gambar sumber terlalu besar.');
    return `data:${type};base64,${bytesToBase64(new Uint8Array(buffer))}`;
  } finally {
    clearTimeout(timer);
  }
}

function sourceConfidence(domain, query) {
  const lower = String(domain || '').toLowerCase();
  const tokens = clean(query).toLowerCase().split(/\s+/).filter(token => token.length >= 4);
  const domainHit = tokens.some(token => lower.includes(token.replace(/[^a-z0-9]/g, '')));
  if (domainHit) return 0.92;
  if (/philips|signify|schneider|panasonic|broco|legrand|visalux|supreme|clipsal|official/.test(lower)) return 0.9;
  if (/tokopedia|shopee|lazada|blibli|monotaro/.test(lower)) return 0.72;
  return 0.64;
}

function normalizeSources(value) {
  const output = [];
  const seen = new Set();
  for (const source of Array.isArray(value) ? value : []) {
    const url = safeHttpUrl(source?.url);
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ url, title: clean(source?.title).slice(0, 140) });
    if (output.length >= 6) break;
  }
  return output;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Payload pencarian foto tidak valid.' }, 400); }
  const action = clean(body?.action || 'search').toLowerCase();

  if (action === 'image') {
    const imageUrl = safeHttpUrl(body?.imageUrl);
    const sourcePageUrl = safeHttpUrl(body?.sourcePageUrl);
    if (!imageUrl || !sourcePageUrl) return json({ error: 'Sumber gambar tidak valid.' }, 400);
    try {
      // Jangan jadikan endpoint ini proxy gambar umum. Gambar hanya boleh diambil
      // bila URL tersebut benar-benar ditemukan kembali pada halaman sumber yang
      // sebelumnya dipilih atau ditemukan oleh perangkat.
      const sourcePage = await fetchSourcePage({ url: sourcePageUrl, title: '' });
      const allowedImages = new Set((sourcePage?.images || []).map(value => safeHttpUrl(value)).filter(Boolean));
      if (!allowedImages.has(imageUrl)) throw new Error('Gambar tidak lagi terverifikasi pada halaman sumber. Jalankan pencarian ulang.');
      const dataUrl = await fetchSelectedImageDataUrl(imageUrl);
      return json({ dataUrl });
    } catch (error) {
      return json({ error: error?.message || 'Gambar kandidat tidak dapat diambil.' }, 422);
    }
  }

  if (action !== 'search') return json({ error: 'Aksi layanan foto tidak dikenal.' }, 400);
  const query = clean(body?.query).slice(0, 180);
  const sources = normalizeSources(body?.sources);
  if (query.length < 3) return json({ error: 'Nama produk terlalu pendek.' }, 400);
  if (!sources.length) return json({ error: 'Belum ada sumber halaman produk yang dapat diverifikasi.' }, 400);

  const pages = (await Promise.all(sources.map(fetchSourcePage))).filter(Boolean);
  const rawCandidates = [];
  for (const page of pages) {
    for (const imageUrl of page.images) {
      rawCandidates.push({
        imageUrl,
        sourcePageUrl: page.pageUrl,
        sourceTitle: page.title,
        sourceDomain: domainOf(page.pageUrl),
        confidence: sourceConfidence(domainOf(page.pageUrl), query)
      });
    }
  }

  const candidates = [];
  const seenImage = new Set();
  for (const candidate of rawCandidates.sort((a, b) => b.confidence - a.confidence)) {
    const key = candidate.imageUrl.toLowerCase();
    if (seenImage.has(key)) continue;
    seenImage.add(key);
    candidates.push({ id: `WEB-${candidates.length + 1}`, ...candidate });
    if (candidates.length >= 6) break;
  }

  return json({
    query,
    candidates,
    note: candidates.length
      ? 'Pilih foto yang watt/ukuran/modelnya benar. Cloudflare hanya membaca halaman sumber yang dikirim perangkat dan tidak pernah menerima API key Gemini.'
      : 'Halaman sumber ditemukan, tetapi belum menyediakan gambar produk yang dapat dipakai sebagai kandidat.'
  });
}
