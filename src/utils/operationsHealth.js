import { localDateKeyFromValue, toEpochMs } from './temporal.js';
const asNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const normalizeCode = value => String(value || '').trim().toLowerCase();
const dateOnly = value => localDateKeyFromValue(value, String(value || '').slice(0, 10));
const localDateOnly = value => localDateKeyFromValue(value, String(value || '').slice(0, 10));

export function computeSuggestedReorder(product, multiplier = 2) {
  if (!product || product.active === false || product.trackStock === false) return 0;
  const stock = Math.max(0, asNumber(product.stock));
  const minimum = Math.max(0, asNumber(product.minStock));
  if (minimum <= 0 || stock > minimum) return 0;
  return Math.max(1, Math.ceil((minimum * Math.max(1, asNumber(multiplier))) - stock));
}

function findDuplicates(rows, field) {
  const groups = new Map();
  for (const row of rows) {
    const value = normalizeCode(row?.[field]);
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([value, items]) => ({ field, value, items }));
}

export function buildOperationalHealth(db, branchId, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const today = localDateOnly(now);
  const shiftWarningHours = Math.max(6, asNumber(options.shiftWarningHours || db?.configs?.shiftWarningHours || 14));
  const branchProducts = (db?.products || []).filter(row => row.branchId === branchId && row.active !== false);
  const branchSales = (db?.sales || []).filter(row => row.branchId === branchId && !['VOID', 'VOIDED'].includes(String(row.status || '').toUpperCase()));
  const branchReceivables = (db?.receivables || []).filter(row => row.branchId === branchId && asNumber(row.balance) > 0);
  const branchPayables = (db?.payables || []).filter(row => row.branchId === branchId && asNumber(row.balance) > 0);
  const branchShifts = (db?.shifts || []).filter(row => row.branchId === branchId && row.status === 'OPEN');

  const lowStock = branchProducts
    .filter(row => row.trackStock !== false && asNumber(row.minStock) > 0 && asNumber(row.stock) <= asNumber(row.minStock))
    .map(row => ({
      ...row,
      suggestedQty: computeSuggestedReorder(row, options.reorderMultiplier || db?.configs?.reorderMultiplier || 2),
      shortage: Math.max(0, asNumber(row.minStock) - asNumber(row.stock))
    }))
    .sort((a, b) => (a.stock / Math.max(1, a.minStock)) - (b.stock / Math.max(1, b.minStock)));

  const outOfStock = lowStock.filter(row => asNumber(row.stock) <= 0);
  const marginRisk = branchProducts
    .filter(row => asNumber(row.prices?.retail) <= asNumber(row.modalPrice))
    .map(row => ({ ...row, margin: asNumber(row.prices?.retail) - asNumber(row.modalPrice) }))
    .sort((a, b) => a.margin - b.margin);

  const duplicateCodes = [
    ...findDuplicates(branchProducts, 'sku'),
    ...findDuplicates(branchProducts, 'barcode')
  ];

  const overdueReceivables = branchReceivables
    .filter(row => row.dueDate && dateOnly(row.dueDate) < today)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const overduePayables = branchPayables
    .filter(row => row.dueDate && dateOnly(row.dueDate) < today)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const staleShifts = branchShifts
    .map(row => { const startedAt = toEpochMs(row.startAt || row.createdAt) || now.getTime(); return { ...row, openHours: Math.max(0, (now.getTime() - startedAt) / 3_600_000) }; })
    .filter(row => row.openHours >= shiftWarningHours)
    .sort((a, b) => b.openHours - a.openHours);

  const stockValue = branchProducts.reduce((sum, row) => sum + Math.max(0, asNumber(row.stock)) * Math.max(0, asNumber(row.modalPrice)), 0);
  const retailStockValue = branchProducts.reduce((sum, row) => sum + Math.max(0, asNumber(row.stock)) * Math.max(0, asNumber(row.prices?.retail)), 0);
  const receivableTotal = branchReceivables.reduce((sum, row) => sum + Math.max(0, asNumber(row.balance)), 0);
  const overdueReceivableTotal = overdueReceivables.reduce((sum, row) => sum + Math.max(0, asNumber(row.balance)), 0);
  const payableTotal = branchPayables.reduce((sum, row) => sum + Math.max(0, asNumber(row.balance)), 0);
  const salesToday = branchSales.filter(row => localDateOnly(row.createdAt) === today);
  const salesTodayTotal = salesToday.reduce((sum, row) => sum + Math.max(0, asNumber(row.total) - asNumber(row.refundedTotal)), 0);

  const deductions = Math.min(100,
    outOfStock.length * 8 +
    Math.max(0, lowStock.length - outOfStock.length) * 3 +
    marginRisk.length * 5 +
    duplicateCodes.length * 6 +
    overdueReceivables.length * 4 +
    overduePayables.length * 2 +
    staleShifts.length * 4
  );

  return {
    score: Math.max(0, 100 - deductions),
    branchId,
    generatedAt: now.toISOString(),
    lowStock,
    outOfStock,
    marginRisk,
    duplicateCodes,
    overdueReceivables,
    overduePayables,
    staleShifts,
    stockValue,
    retailStockValue,
    receivableTotal,
    overdueReceivableTotal,
    payableTotal,
    salesTodayCount: salesToday.length,
    salesTodayTotal,
    productCount: branchProducts.length,
    issueCount: lowStock.length + marginRisk.length + duplicateCodes.length + overdueReceivables.length + overduePayables.length + staleShifts.length
  };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildReorderCsv(rows = []) {
  const header = ['SKU', 'Produk', 'Stok', 'Stok Minimum', 'Saran Pesan', 'Satuan', 'Rak', 'Harga Modal'];
  const lines = rows.map(row => [row.sku, row.name, row.stock, row.minStock, row.suggestedQty, row.baseUnit, row.rack, row.modalPrice].map(csvCell).join(','));
  return `\uFEFF${header.join(',')}\n${lines.join('\n')}\n`;
}
