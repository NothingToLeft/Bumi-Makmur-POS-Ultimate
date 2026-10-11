import { toEpochMs } from './temporal.js';
import { localDateKey } from './helpers.js';
import { buildNetPaymentBreakdown, buildNetProductPerformance } from './accounting.js';

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const DAY_MS = 86400000;
const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const isVoid = sale => ['VOID', 'VOIDED'].includes(String(sale?.status || '').toUpperCase());
const saleTime = sale => toEpochMs(sale?.createdAt || sale?.date);
const netRevenue = sale => Math.max(0, num(sale.total) - num(sale.refundedTotal));

/**
 * Ringkasan wawasan penjualan: tren harian, jam tersibuk, produk terlaris, dan bauran pembayaran.
 * Transaksi VOID dikeluarkan; omzet dihitung neto setelah refund.
 */
export function buildSalesInsights(sales = [], refunds = [], { now = new Date(), days = 7, hourDays = 30 } = {}) {
  const safeDays = Math.max(2, Math.min(31, Math.round(num(days)) || 7));
  const valid = (sales || []).filter(sale => !isVoid(sale) && saleTime(sale));

  const dayRows = [];
  const dayIndex = new Map();
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime());
    date.setDate(date.getDate() - offset);
    const row = { key: localDateKey(date), label: DAY_LABELS[date.getDay()], revenue: 0, count: 0 };
    dayIndex.set(row.key, row);
    dayRows.push(row);
  }
  const windowSales = [];
  for (const sale of valid) {
    const row = dayIndex.get(localDateKey(saleTime(sale)));
    if (!row) continue;
    row.revenue += netRevenue(sale);
    row.count += 1;
    windowSales.push(sale);
  }

  const today = dayRows[dayRows.length - 1];
  const yesterday = dayRows[dayRows.length - 2];
  const todayVsYesterday = yesterday.revenue > 0 ? Math.round(((today.revenue - yesterday.revenue) / yesterday.revenue) * 100) : null;
  const periodRevenue = dayRows.reduce((sum, row) => sum + row.revenue, 0);
  const periodCount = dayRows.reduce((sum, row) => sum + row.count, 0);

  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0, revenue: 0 }));
  const hourCutoff = now.getTime() - Math.max(1, num(hourDays)) * DAY_MS;
  for (const sale of valid) {
    const time = saleTime(sale);
    if (time < hourCutoff || time > now.getTime() + DAY_MS) continue;
    const bucket = hours[new Date(time).getHours()];
    bucket.count += 1;
    bucket.revenue += netRevenue(sale);
  }
  const peakHours = hours.filter(row => row.count > 0).sort((a, b) => b.count - a.count || b.revenue - a.revenue || a.hour - b.hour).slice(0, 3);

  const windowIds = new Set(windowSales.map(sale => String(sale.id)));
  const windowRefunds = (refunds || []).filter(refund => windowIds.has(String(refund.saleId)));
  const topProducts = buildNetProductPerformance(windowSales, windowRefunds).slice(0, 5);
  const paymentRaw = Object.entries(buildNetPaymentBreakdown(windowSales, windowRefunds)).filter(([, amount]) => amount > 0);
  const paymentTotal = paymentRaw.reduce((sum, [, amount]) => sum + amount, 0);
  const paymentMix = paymentRaw.sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount, share: paymentTotal > 0 ? Math.round((amount / paymentTotal) * 100) : 0 }));

  return {
    days: dayRows, hours, peakHours, topProducts, paymentMix,
    todayVsYesterday, periodRevenue, periodCount,
    averageTicket: periodCount > 0 ? Math.round(periodRevenue / periodCount) : 0,
    bestDay: [...dayRows].sort((a, b) => b.revenue - a.revenue)[0]?.revenue > 0 ? [...dayRows].sort((a, b) => b.revenue - a.revenue)[0] : null
  };
}
