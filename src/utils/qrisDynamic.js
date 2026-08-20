const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export const QRIS_MIN_AMOUNT = 1;
export const QRIS_MAX_AMOUNT = 10_000_000;
export const QRIS_METHOD_STATIC = '11';
export const QRIS_METHOD_DYNAMIC = '12';

const REQUIRED_ROOT_TAGS = Object.freeze(['00', '01', '52', '53', '58', '59', '60', '63']);
const MANAGED_DYNAMIC_TAGS = new Set(['54', '55', '56', '57', '63']);
const MERCHANT_ACCOUNT_MIN = 26;
const MERCHANT_ACCOUNT_MAX = 51;
const MAX_PAYLOAD_BYTES = 4096;

const byteLength = value => encoder.encode(String(value ?? '')).length;

function isAsciiDigits(value) {
  return /^\d+$/.test(String(value || ''));
}

function decodeSlice(bytes, start, end, label = 'nilai') {
  try {
    return decoder.decode(bytes.slice(start, end));
  } catch {
    throw new Error(`${label} QRIS tidak menggunakan UTF-8 yang valid.`);
  }
}

/**
 * CRC16-CCITT-FALSE style calculation used by EMV merchant-presented QR.
 * Polynomial 0x1021, initial value 0xFFFF, no reflection, no xor-out.
 */
export function calculateQrisCrc16(input) {
  const bytes = input instanceof Uint8Array ? input : encoder.encode(String(input ?? ''));
  let crc = 0xffff;
  for (const value of bytes) {
    crc ^= value << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Strict byte-aware TLV parser. EMV lengths are byte lengths, not JS UTF-16
 * string lengths. Invalid or trailing data throws instead of being ignored.
 */
export function parseQrisTlvStrict(payload) {
  const normalized = String(payload ?? '').trim();
  if (!normalized) throw new Error('Data QRIS kosong.');
  const bytes = encoder.encode(normalized);
  if (bytes.length > MAX_PAYLOAD_BYTES) throw new Error(`Data QRIS terlalu panjang (${bytes.length} byte).`);

  const elements = [];
  let offset = 0;
  while (offset < bytes.length) {
    if (offset + 4 > bytes.length) throw new Error(`Struktur TLV terpotong pada byte ${offset}.`);
    const tag = decodeSlice(bytes, offset, offset + 2, 'Tag');
    const lengthText = decodeSlice(bytes, offset + 2, offset + 4, 'Panjang');
    if (!/^\d{2}$/.test(tag)) throw new Error(`Tag QRIS tidak valid pada byte ${offset}.`);
    if (!/^\d{2}$/.test(lengthText)) throw new Error(`Panjang TLV tidak valid untuk tag ${tag}.`);
    const length = Number(lengthText);
    const valueStart = offset + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > bytes.length) throw new Error(`Nilai tag ${tag} terpotong. Dinyatakan ${length} byte, data tidak mencukupi.`);
    const value = decodeSlice(bytes, valueStart, valueEnd, `Nilai tag ${tag}`);
    elements.push({ tag, length, value, start: offset, valueStart, end: valueEnd });
    offset = valueEnd;
  }
  if (offset !== bytes.length) throw new Error('Terdapat data sisa setelah TLV QRIS terakhir.');
  return { payload: normalized, bytes, elements };
}

export function encodeQrisTlv(tag, value) {
  const safeTag = String(tag ?? '');
  const safeValue = String(value ?? '');
  if (!/^\d{2}$/.test(safeTag)) throw new Error(`Tag TLV tidak valid: ${safeTag || '(kosong)'}.`);
  const length = byteLength(safeValue);
  if (length > 99) throw new Error(`Nilai tag ${safeTag} terlalu panjang (${length} byte).`);
  return `${safeTag}${String(length).padStart(2, '0')}${safeValue}`;
}

function findTag(elements, tag) {
  return elements.find(element => element.tag === tag);
}

function duplicateTags(elements) {
  const counts = new Map();
  for (const element of elements) counts.set(element.tag, (counts.get(element.tag) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([tag]) => tag);
}

function summarize(elements) {
  const method = findTag(elements, '01')?.value || '';
  const amountText = findTag(elements, '54')?.value || '';
  const amount = amountText && /^\d+$/.test(amountText) ? Number(amountText) : null;
  return {
    version: findTag(elements, '00')?.value || '',
    method,
    methodLabel: method === QRIS_METHOD_STATIC ? 'static' : method === QRIS_METHOD_DYNAMIC ? 'dynamic' : 'unknown',
    merchantCategoryCode: findTag(elements, '52')?.value || '',
    currency: findTag(elements, '53')?.value || '',
    amount,
    amountText,
    countryCode: findTag(elements, '58')?.value || '',
    merchantName: findTag(elements, '59')?.value || '',
    merchantCity: findTag(elements, '60')?.value || '',
    postalCode: findTag(elements, '61')?.value || '',
    crc: findTag(elements, '63')?.value || '',
    hasConvenienceFeeFields: elements.some(element => ['55', '56', '57'].includes(element.tag)),
    merchantAccountTags: elements.filter(element => {
      const numericTag = Number(element.tag);
      return Number.isInteger(numericTag) && numericTag >= MERCHANT_ACCOUNT_MIN && numericTag <= MERCHANT_ACCOUNT_MAX;
    }).map(element => element.tag)
  };
}

/**
 * Validates a QRIS/EMV merchant-presented payload without silently repairing it.
 * This validator intentionally rejects malformed CRC/TLV before conversion.
 */
export function validateQrisPayload(payload, { requireStatic = false, requireIdr = true, requireIndonesia = true } = {}) {
  const errors = [];
  const warnings = [];
  let parsed;
  try {
    parsed = parseQrisTlvStrict(payload);
  } catch (error) {
    return { valid: false, errors: [error.message || 'Data QRIS tidak valid.'], warnings, data: null, elements: [] };
  }
  const { elements, bytes } = parsed;
  const tags = new Set(elements.map(element => element.tag));
  for (const tag of REQUIRED_ROOT_TAGS) if (!tags.has(tag)) errors.push(`Tag wajib ${tag} tidak ditemukan.`);

  // Every root EMV tag is single-occurrence. Multiple merchant account templates
  // are allowed only by using different tag IDs (26, 27, ...), never duplicate IDs.
  const duplicates = duplicateTags(elements);
  if (duplicates.length) errors.push(`Tag tunggal terduplikasi: ${duplicates.join(', ')}.`);

  const data = summarize(elements);
  if (data.version !== '01') errors.push(`Payload Format Indicator harus 01, ditemukan ${data.version || '(kosong)'}.`);
  if (![QRIS_METHOD_STATIC, QRIS_METHOD_DYNAMIC].includes(data.method)) errors.push(`Point of Initiation Method harus 11 (statis) atau 12 (dinamis).`);
  if (requireStatic && data.method !== QRIS_METHOD_STATIC) errors.push('Sumber QRIS untuk generator dinamis harus berupa QRIS MPM statis (tag 01 = 11).');
  if (requireIdr && data.currency !== '360') errors.push(`Mata uang harus IDR/360, ditemukan ${data.currency || '(kosong)'}.`);
  if (requireIndonesia && data.countryCode !== 'ID') errors.push(`Country Code QRIS harus ID, ditemukan ${data.countryCode || '(kosong)'}.`);
  if (!data.merchantName.trim()) errors.push('Nama merchant QRIS kosong.');
  if (!data.merchantCity.trim()) errors.push('Kota merchant QRIS kosong.');
  if (!/^\d{4}$/.test(data.merchantCategoryCode)) errors.push('Merchant Category Code harus 4 digit.');
  if (!data.merchantAccountTags.length) errors.push('Merchant Account Information (tag 26–51) tidak ditemukan.');

  const crcElement = findTag(elements, '63');
  if (crcElement) {
    if (crcElement.length !== 4) errors.push('Tag CRC 63 harus memiliki panjang 04.');
    if (crcElement.end !== bytes.length) errors.push('Tag CRC 63 harus menjadi elemen terakhir.');
    if (!/^[0-9A-Fa-f]{4}$/.test(crcElement.value)) errors.push('Nilai CRC harus 4 digit heksadesimal.');
    if (crcElement.length === 4 && crcElement.end === bytes.length) {
      const expected = calculateQrisCrc16(bytes.slice(0, crcElement.valueStart));
      if (expected !== crcElement.value.toUpperCase()) errors.push(`CRC QRIS tidak cocok (seharusnya ${expected}).`);
    }
  }

  if (data.method === QRIS_METHOD_DYNAMIC) {
    if (!data.amountText) errors.push('QRIS dinamis tidak memiliki Transaction Amount (tag 54).');
    else if (!isAsciiDigits(data.amountText)) errors.push('Nominal QRIS dinamis harus berupa bilangan Rupiah tanpa pemisah.');
    else if (!Number.isSafeInteger(data.amount) || data.amount < QRIS_MIN_AMOUNT || data.amount > QRIS_MAX_AMOUNT) errors.push(`Nominal QRIS harus Rp${QRIS_MIN_AMOUNT.toLocaleString('id-ID')}–Rp${QRIS_MAX_AMOUNT.toLocaleString('id-ID')} per transaksi.`);
  } else if (data.amountText) {
    warnings.push('QRIS statis memiliki tag nominal. Generator akan mengganti nominal saat membuat QR dinamis.');
  }

  if (data.hasConvenienceFeeFields) warnings.push('Sumber mengandung tag convenience fee/tip. Bumi Makmur tidak meneruskan tag 55/56/57 ke QR dinamis hasil generate.');
  return { valid: errors.length === 0, errors, warnings, data, elements };
}

export function normalizeQrisAmount(value) {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (typeof raw === 'string' && !/^(0|[1-9]\d*)$/.test(raw)) {
    throw new Error('Nominal QRIS harus berupa angka Rupiah bulat tanpa desimal, pemisah, atau notasi ilmiah.');
  }
  const amount = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(amount)) throw new Error('Nominal QRIS harus berupa Rupiah bulat.');
  if (amount < QRIS_MIN_AMOUNT || amount > QRIS_MAX_AMOUNT) {
    throw new Error(`Nominal QRIS per pembayaran harus antara Rp${QRIS_MIN_AMOUNT.toLocaleString('id-ID')} dan Rp${QRIS_MAX_AMOUNT.toLocaleString('id-ID')}.`);
  }
  return amount;
}

/**
 * Converts a validated static QRIS payload into a transaction-specific payload.
 * Only initiation method + amount are managed; merchant/acquirer fields are kept.
 * Convenience-fee tags are deliberately removed.
 */
export function createDynamicQrisPayload(staticPayload, amountValue) {
  const amount = normalizeQrisAmount(amountValue);
  const validation = validateQrisPayload(staticPayload, { requireStatic: true });
  if (!validation.valid) throw new Error(validation.errors[0] || 'QRIS statis tidak valid.');

  const result = [];
  let methodWritten = false;
  let amountWritten = false;
  for (const element of validation.elements) {
    if (MANAGED_DYNAMIC_TAGS.has(element.tag)) continue;
    if (element.tag === '01') {
      result.push(encodeQrisTlv('01', QRIS_METHOD_DYNAMIC));
      methodWritten = true;
      continue;
    }
    if (!amountWritten && element.tag === '58') {
      result.push(encodeQrisTlv('54', String(amount)));
      amountWritten = true;
    }
    result.push(encodeQrisTlv(element.tag, element.value));
  }
  if (!methodWritten) throw new Error('QRIS tidak memiliki tag Point of Initiation Method.');
  if (!amountWritten) {
    const crcIndex = result.findIndex(row => row.startsWith('63'));
    const amountTlv = encodeQrisTlv('54', String(amount));
    if (crcIndex >= 0) result.splice(crcIndex, 0, amountTlv); else result.push(amountTlv);
  }
  const withoutCrc = result.join('');
  const crcPrefix = `${withoutCrc}6304`;
  const crc = calculateQrisCrc16(crcPrefix);
  const generated = `${crcPrefix}${crc}`;
  const generatedValidation = validateQrisPayload(generated, { requireStatic: false });
  if (!generatedValidation.valid || generatedValidation.data?.method !== QRIS_METHOD_DYNAMIC || generatedValidation.data?.amount !== amount) {
    throw new Error(generatedValidation.errors[0] || 'Generator QRIS menghasilkan payload yang tidak valid.');
  }
  return generated;
}

export function qrisPayloadFingerprint(payload) {
  const validation = validateQrisPayload(payload);
  if (!validation.valid) return '';
  const data = validation.data;
  return [data.merchantName, data.merchantCity, data.merchantCategoryCode, data.currency, data.crc].join('|');
}

export function qrisPayloadMeta(payload) {
  const validation = validateQrisPayload(payload);
  if (!validation.valid) throw new Error(validation.errors[0] || 'QRIS tidak valid.');
  const data = validation.data;
  return {
    merchantName: data.merchantName,
    merchantCity: data.merchantCity,
    merchantCategoryCode: data.merchantCategoryCode,
    currency: data.currency,
    sourceMethod: data.methodLabel,
    crc: data.crc,
    payloadBytes: byteLength(String(payload || '').trim()),
    fingerprint: qrisPayloadFingerprint(payload)
  };
}
