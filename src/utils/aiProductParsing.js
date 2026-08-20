import { productAllCodes } from './productBarcodes.js';

export const normalizeProductText = value => String(value || '').replace(/\s+/g, ' ').trim();
export const normalizeProductCode = value => String(value || '').replace(/[^0-9A-Za-z._/-]/g, '').trim();

function parsePackQty(text) {
  const patterns = [
    /(?:QTY|ISI|CONTENTS?|PACK(?:ING)?)\s*[:=]?\s*(\d{1,6})\s*(?:PCS?|PIECES?|BUAH|UNIT)?\b/i,
    /\b(\d{1,6})\s*(?:PCS?|PIECES?|BUAH|UNIT)\s*(?:\/\s*PACK|PER\s*PACK)?\b/i,
    /\bPACK\s*(?:OF\s*)?(\d{1,6})\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Math.max(1, Number(match[1]) || 1);
  }
  return 0;
}

function parseSize(text) {
  const patterns = [
    /\b(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(MM|CM|M)\b/i,
    /\bSIZE\s*[:=]?\s*([^\n|]{2,40})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    if (match.length >= 4) return `${match[1].replace(',', '.')} × ${match[2].replace(',', '.')} ${match[3].toLowerCase()}`;
    return normalizeProductText(match[1]);
  }
  return '';
}

function parseColor(text) {
  const values = [
    ['Hitam', /\b(BLACK|HITAM)\b/i], ['Putih', /\b(WHITE|PUTIH)\b/i], ['Merah', /\b(RED|MERAH)\b/i],
    ['Biru', /\b(BLUE|BIRU)\b/i], ['Hijau', /\b(GREEN|HIJAU)\b/i], ['Kuning', /\b(YELLOW|KUNING)\b/i],
    ['Abu-abu', /\b(GR[AE]Y|ABU(?:-ABU)?)\b/i], ['Transparan', /\b(TRANSPARENT|CLEAR|TRANSPARAN)\b/i]
  ];
  return values.find(([, pattern]) => pattern.test(text))?.[0] || '';
}

function parseModel(text) {
  const lines = String(text || '').split(/\r?\n/).map(normalizeProductText).filter(Boolean);
  const explicit = String(text || '').match(/(?:MODEL|TYPE|TIPE|ITEM|CODE|KODE)\s*[:#]?\s*([A-Z0-9][A-Z0-9._/-]{3,24})/i);
  if (explicit) return normalizeProductCode(explicit[1]).toUpperCase();
  const candidates = lines.flatMap(line => line.match(/\b[A-Z]{1,5}[A-Z0-9._/-]*\d[A-Z0-9._/-]{2,20}\b/g) || [])
    .filter(value => !/^\d+$/.test(value) && !/^\d+(?:MM|CM|M)$/i.test(value));
  return normalizeProductCode(candidates[0] || '').toUpperCase();
}

function parseBrand(text) {
  const lines = String(text || '').split(/\r?\n/).map(normalizeProductText).filter(Boolean);
  const explicit = String(text || '').match(/(?:BRAND|MEREK)\s*[:#]?\s*([A-Z][A-Z0-9 .&-]{2,30})/i);
  if (explicit) return normalizeProductText(explicit[1]).replace(/[®™©]/g, '').trim();
  const ignored = /^(QTY|SIZE|MODEL|TYPE|MATERIAL|NYLON|CABLE|TIES?|BARCODE|MADE|WARNING|UL|ROHS|PCS?|MM|CM)\b/i;
  const candidate = lines.find(line => line.length >= 3 && line.length <= 30 && /[A-Za-z]/.test(line) && !ignored.test(line) && !/\d{4,}/.test(line));
  return candidate ? candidate.replace(/[®™©]/g, '').trim().split(/\s+/).slice(0, 3).join(' ') : '';
}

function parseMaterial(text) {
  const match = String(text || '').match(/\b(NYLON\s*66|NYLON\s*6\/6|PVC|COPPER|TEMBAGA|ALUMINIUM|ALUMINUM|STEEL|BAJA|BRASS|KUNINGAN|ABS|POLYCARBONATE)\b/i);
  return normalizeProductText(match?.[1] || '');
}

function parseBaseUnit(text, packQty) {
  if (packQty > 1 || /\bPCS?|PIECES?|BUAH\b/i.test(text)) return 'pcs';
  if (/\b(METER|METRE|MTR)\b/i.test(text)) return 'meter';
  if (/\b(BATANG)\b/i.test(text)) return 'batang';
  if (/\b(KG|KILOGRAM)\b/i.test(text)) return 'kg';
  if (/\b(LITER|LITRE)\b/i.test(text)) return 'liter';
  if (/\b(SET)\b/i.test(text)) return 'set';
  return 'pcs';
}

function parseGenericName(text) {
  const rules = [
    [/cable\s*ties?|nylon\s*cable\s*ties?|kabel\s*tis/i, 'Cable Ties'],
    [/\bled\b.*\b(lamp|bulb)|\blampu\b.*\bled\b/i, 'Lampu LED'],
    [/\bmcb\b|miniature\s+circuit\s+breaker/i, 'MCB'],
    [/stop\s*kontak|socket\s*outlet/i, 'Stop Kontak'],
    [/\bsaklar\b|wall\s*switch/i, 'Saklar'],
    [/\bsekrup\b|\bscrew\b/i, 'Sekrup'],
    [/\bfisher\b|wall\s*plug/i, 'Fisher'],
    [/\bkran\b|\bfaucet\b/i, 'Kran'],
    [/\bkabel\b|electric\s+cable|electrical\s+wire/i, 'Kabel']
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || '';
}

export function chooseProductCategory(text, categories = []) {
  const lower = String(text || '').toLowerCase();
  const rules = [
    [/cable\s*ties?|kabel\s*tis|lampu|led|switch|saklar|stop\s*kontak|mcb|kabel|fitting|terminal/, ['Aksesoris Listrik', 'Listrik']],
    [/kran|faucet|pvc|pipa|elbow|socket|valve|selang/, ['Air & Pipa']],
    [/sekrup|screw|fisher|paku|bolt|mur|baut/, ['Besi & Paku', 'Material']],
    [/drill|bor|tang|obeng|hammer|palu|cutter/, ['Perkakas']],
    [/semen|cement|lem|sealant|silicone/, ['Material']]
  ];
  const normalized = categories.map(value => String(value));
  for (const [pattern, preferred] of rules) {
    if (!pattern.test(lower)) continue;
    for (const name of preferred) {
      const found = normalized.find(value => value.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
  }
  return normalized.find(value => value.toLowerCase() === 'listrik') || normalized[0] || 'Material';
}

export function parseProductTextLocally(text, { barcode = '', categories = [] } = {}) {
  const clean = String(text || '').replace(/\u0000/g, '').trim();
  const packQty = parsePackQty(clean);
  const size = parseSize(clean);
  const color = parseColor(clean);
  const brand = parseBrand(clean);
  const model = parseModel(clean);
  const material = parseMaterial(clean);
  const category = chooseProductCategory(clean, categories);
  const genericName = parseGenericName(clean);
  const productName = normalizeProductText([genericName, brand].filter(Boolean).join(' ')) || brand || model || 'Produk Baru';
  const variantName = normalizeProductText([size, color].filter(Boolean).join(' '));
  const baseUnit = parseBaseUnit(clean, packQty);
  const specifications = normalizeProductText([model ? `Model ${model}` : '', size, color, material, packQty ? `${packQty} ${baseUnit}/pack` : ''].filter(Boolean).join(' · '));
  const signals = [brand, model, size, color, material, packQty, barcode].filter(Boolean).length;
  return {
    productName,
    brand,
    model,
    category,
    variantName,
    specifications,
    size,
    color,
    material,
    packUnit: packQty > 1 ? 'pack' : '',
    packQty,
    baseUnit,
    barcode: normalizeProductCode(barcode),
    suggestedVariantMode: Boolean(variantName),
    confidence: clean ? Math.min(0.82, 0.42 + signals * 0.055) : barcode ? 0.35 : 0.15,
    source: clean ? 'local-ocr' : barcode ? 'barcode-only' : 'manual',
    rawText: clean,
    warnings: clean ? [] : ['Teks kemasan belum terbaca. Periksa hasil sebelum menyimpan.']
  };
}

function tokens(value) {
  return new Set(String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(token => token.length >= 2));
}

function tokenScore(a, b) {
  const first = tokens(a); const second = tokens(b);
  if (!first.size || !second.size) return 0;
  let shared = 0;
  for (const token of first) if (second.has(token)) shared += 1;
  return shared / Math.max(first.size, second.size);
}

export function findBestProductMatch(analysis, products = []) {
  const active = products.filter(product => product.active !== false && product.productType !== 'parent');
  const barcode = normalizeProductCode(analysis?.barcode);
  if (barcode) {
    const exact = active.find(product => productAllCodes(product, { includeShared: true })
      .some(code => normalizeProductCode(code) === barcode));
    if (exact) return { product: exact, score: 1, reason: 'barcode' };
  }
  const target = [analysis?.productName, analysis?.brand, analysis?.model, analysis?.variantName, analysis?.specifications].filter(Boolean).join(' ');
  const ranked = active.map(product => {
    const value = [product.name, product.brand, product.sku, product.model, product.variantName, product.specifications].filter(Boolean).join(' ');
    let score = tokenScore(target, value);
    if (analysis?.model && String(value).toLowerCase().includes(String(analysis.model).toLowerCase())) score += 0.35;
    if (analysis?.brand && String(value).toLowerCase().includes(String(analysis.brand).toLowerCase())) score += 0.15;
    return { product, score: Math.min(0.99, score), reason: 'text' };
  }).sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 0.38 ? ranked[0] : null;
}
