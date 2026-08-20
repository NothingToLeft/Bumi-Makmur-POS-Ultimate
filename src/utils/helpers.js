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
    return `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
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

export const safeJSONParse = (dataString, fallback, { silent = false } = {}) => {
  try {
    return dataString ? JSON.parse(dataString) : fallback;
  } catch (error) {
    if (!silent) console.warn('Data lokal rusak, memakai data cadangan.', error);
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
    @page{size:${width} auto;margin:3.5mm}*{box-sizing:border-box}body{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;width:${width};max-width:${width};margin:0 auto;color:#111827;font-size:11px;font-variant-numeric:tabular-nums;background:#fff}.receipt{width:100%;border-top:4px solid #111827;padding-top:2px}.receipt header{text-align:center;padding:8px 2px 12px;border-bottom:1px dashed #64748b}.receipt header img{width:56px;height:56px;object-fit:contain;border-radius:12px;margin-bottom:5px}.receipt .eyebrow{font-size:8px;font-weight:900;letter-spacing:.18em;color:#b91c1c}.receipt h1{font-size:17px;line-height:1.1;margin:3px 0 5px;font-weight:900}.receipt p{margin:2px 0;color:#475569}.receipt-id{display:inline-block;margin-top:6px;padding:3px 8px;border:1px solid #cbd5e1;border-radius:999px;color:#111827;font-weight:900;font-size:8px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:8px 0}.meta>div{background:#f8fafc;border:1px solid #e5e7eb;border-radius:7px;padding:6px}.meta span{display:block;font-size:8px;color:#64748b}.meta b{display:block;margin-top:2px;font-size:10px}.items{border-top:1px dashed #cbd5e1}.item{padding:7px 0;border-bottom:1px dashed #cbd5e1}.item-name{font-weight:900;margin-bottom:3px}.row{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.subtle{font-size:9px;color:#64748b}.discount{font-size:8px;color:#b91c1c;margin-top:2px}.totals{padding-top:8px}.totals .row,.payments .row{padding:2px 0}.green{color:#b91c1c}.gold{color:#92400e}.orange{color:#9a3412}.grand{display:flex;justify-content:space-between;align-items:center;background:#111827;color:#fff;border-radius:8px;padding:9px 10px;margin-top:7px;font-size:14px}.payments{margin-top:8px;padding-top:7px;border-top:1px dashed #64748b}.change-box{margin-top:8px;border:2px solid #111827;border-radius:8px;padding:8px;text-align:center}.change-box span{display:block;font-size:9px;letter-spacing:.16em;font-weight:900}.change-box b{display:block;font-size:20px;line-height:1.15;margin-top:2px}.change-box small{display:block;margin-top:3px;font-size:8px;font-weight:700}.paid-status{margin-top:7px;border:1px solid #111827;border-radius:7px;padding:6px;text-align:center;font-weight:900;letter-spacing:.14em}.receipt footer{text-align:center;margin-top:11px;padding-top:9px;border-top:1px dashed #cbd5e1}.receipt footer b{font-size:10px}.receipt footer p{font-size:8px;line-height:1.4;margin-top:4px}.no-print{margin:16px 0;text-align:center}.no-print button{border:0;border-radius:10px;background:#111827;color:#fff;font:700 14px inherit;padding:10px 18px}@media print{.no-print{display:none}.change-box{border:2px solid #000!important}.grand{background:#000!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>${bodyHtml}<div class="no-print"><button onclick="window.print()">Cetak</button></div><script>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  popup.document.close();
  return popup;
};
