export const formatRp = number => {
  const value = Number(number);
  if (!Number.isFinite(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(value);
};

export const formatMoneyInput = value => {
  const number = Math.max(0, Math.round(Number(value) || 0));
  return number === 0 ? '' : number.toLocaleString('id-ID');
};

export const parseMoneyInput = value => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

export const calculateMarkupPrice = (cost, percent) => {
  const base = Math.max(0, Number(cost) || 0);
  const markup = Math.max(0, Number(percent) || 0);
  return Math.round(base * (1 + markup / 100));
};

export const calculateMarkupPercent = (cost, sellingPrice) => {
  const base = Math.max(0, Number(cost) || 0);
  const price = Math.max(0, Number(sellingPrice) || 0);
  if (base <= 0 || price <= base) return 0;
  return Math.round(((price - base) / base) * 10000) / 100;
};

export const generateId = prefix => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
};

export const localDateKey = (input = new Date()) => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dateInputToISO = dateString => {
  if (!dateString) return new Date().toISOString();
  return new Date(`${dateString}T12:00:00`).toISOString();
};

export const isToday = dateString => localDateKey(dateString) === localDateKey();

export const isThisMonth = dateString => {
  const key = localDateKey(dateString);
  return key.slice(0, 7) === localDateKey().slice(0, 7);
};

export const safeJSONParse = (dataString, fallback) => {
  try {
    return dataString ? JSON.parse(dataString) : fallback;
  } catch (error) {
    console.warn('Data lokal rusak, memakai data cadangan.', error);
    return fallback;
  }
};

export const downloadFile = (filename, content, type = 'application/json') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const clampMoney = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const number = Math.round(Number(value) || 0);
  return Math.min(max, Math.max(min, number));
};

export const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const printHtmlDocument = (title, bodyHtml, width = '80mm') => {
  const popup = window.open('', '_blank', 'width=480,height=720');
  if (!popup) throw new Error('Popup cetak diblokir browser. Izinkan popup lalu coba lagi.');
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:${width} auto;margin:4mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;width:${width};max-width:${width};margin:0 auto;color:#111;font-size:12px}h1,h2,h3,p{margin:0 0 6px}.center{text-align:center}.row{display:flex;justify-content:space-between;gap:12px}.bold{font-weight:700}.line{border-top:1px dashed #555;margin:8px 0}.small{font-size:10px}.item{margin:6px 0}.no-print{margin:16px 0;text-align:center}@media print{.no-print{display:none}}
  </style></head><body>${bodyHtml}<div class="no-print"><button onclick="window.print()">Cetak</button></div><script>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  popup.document.close();
  return popup;
};
