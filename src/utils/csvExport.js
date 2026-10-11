import { toEpochMs } from './temporal.js';

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

/**
 * Sel CSV aman: kutip bila perlu dan netralkan "CSV/formula injection".
 * Teks yang diawali = + - @ tab atau CR akan dibuka sebagai rumus oleh Excel/Sheets,
 * sehingga diberi awalan apostrof. Angka asli tidak diubah.
 */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'number' ? String(value) : String(value);
  if (typeof value !== 'number' && /^[\s\u200B-\u200D\uFEFF]*[=+\-@]/u.test(text)) text = `'${text}`;
  else if (typeof value !== 'number' && /^[\t\r\n]/.test(text)) text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export const toCsv = rows => `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;

const pad = value => String(value).padStart(2, '0');
export function formatCsvDateTime(value) {
  const epoch = toEpochMs(value);
  if (!epoch) return '';
  const date = new Date(epoch);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const TRANSACTION_CSV_HEADER = [
  'Invoice', 'Tanggal', 'Status', 'Kasir', 'Pelanggan', 'Cabang', 'Jumlah Item', 'Subtotal',
  'Diskon', 'Pajak', 'Servis', 'Pembulatan', 'Total', 'Direfund', 'Neto', 'Pembayaran', 'Kembalian'
];

export function buildTransactionsCsv(sales = [], { cashierName = () => '' } = {}) {
  const rows = [TRANSACTION_CSV_HEADER];
  for (const sale of sales || []) {
    const discount = num(sale.globalDiscount) + num(sale.loyaltyDiscount) + num(sale.promoDiscount)
      + (sale.items || []).reduce((sum, item) => sum + num(item.itemDiscount), 0);
    const payments = (sale.payments || []).filter(payment => num(payment.amount) > 0)
      .map(payment => `${payment.name || payment.type || 'Lainnya'}: ${Math.round(num(payment.amount))}`).join(' | ');
    rows.push([
      sale.id || '', formatCsvDateTime(sale.createdAt || sale.date), sale.status || '',
      cashierName(sale) || '', sale.customerName || 'Umum', sale.branchName || '',
      (sale.items || []).length, Math.round(num(sale.subtotal)), Math.round(discount),
      Math.round(num(sale.tax)), Math.round(num(sale.service)), Math.round(num(sale.rounding)),
      Math.round(num(sale.total)), Math.round(num(sale.refundedTotal)),
      Math.max(0, Math.round(num(sale.total) - num(sale.refundedTotal))), payments, Math.round(num(sale.change))
    ]);
  }
  return toCsv(rows);
}
