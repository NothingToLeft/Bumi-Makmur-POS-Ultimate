import { toEpochMs } from './temporal.js';
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const dayMs = 86400000;

const validSale = sale => sale && !['VOIDED', 'VOID'].includes(String(sale.status || '').toUpperCase());
const validTime = value => toEpochMs(value);

export function salesVelocityByProduct(sales = [], days = 30, now = new Date()) {
  const safeDays = Math.max(1, Number(days) || 30);
  const since = now.getTime() - safeDays * dayMs;
  const totals = new Map();
  for (const sale of sales || []) {
    if (!validSale(sale)) continue;
    const created = validTime(sale.createdAt);
    if (!created || created < since) continue;
    for (const item of sale.items || []) {
      const id = String(item.productId || '');
      if (!id) continue;
      const baseQty = number(item.baseQty ?? number(item.qty) * number(item.factor || 1));
      totals.set(id, (totals.get(id) || 0) + Math.max(0, baseQty));
    }
  }
  return new Map([...totals].map(([id, qty]) => [id, qty / safeDays]));
}

export function buildSmartRestock({ products = [], sales = [], purchaseOrders = [], supplierPrices = [], days = 30, leadTimeDays = 7, safetyDays = 7, now = new Date() } = {}) {
  const velocity = salesVelocityByProduct(sales, days, now);
  const orderedByProduct = new Map();
  const draftByProduct = new Map();
  for (const order of purchaseOrders || []) {
    if (!['DRAFT', 'ORDERED', 'PARTIAL'].includes(order?.status)) continue;
    const target = order.status === 'DRAFT' ? draftByProduct : orderedByProduct;
    for (const item of order.items || []) {
      const ordered = number(item.baseQty ?? number(item.qty) * number(item.factor || 1));
      const received = number(item.receivedBaseQty);
      const outstanding = Math.max(0, ordered - received);
      target.set(item.productId, (target.get(item.productId) || 0) + outstanding);
    }
  }
  return (products || []).filter(product => product?.active !== false && product?.trackStock !== false).map(product => {
    const dailyVelocity = velocity.get(product.id) || 0;
    const demandWindow = Math.max(1, number(product.leadTimeDays || leadTimeDays) + number(product.safetyStockDays || safetyDays));
    const velocityTarget = Math.ceil(dailyVelocity * demandWindow);
    const minimumTarget = Math.max(0, number(product.minStock));
    const targetStock = Math.max(minimumTarget * 2, velocityTarget, minimumTarget);
    const incoming = orderedByProduct.get(product.id) || 0;
    const plannedDraft = draftByProduct.get(product.id) || 0;
    const available = Math.max(0, number(product.stock)) + incoming + plannedDraft;
    const suggestedQty = Math.max(0, Math.ceil(targetStock - available));
    const latestBySupplier = new Map();
    for (const row of (supplierPrices || []).filter(row => row.productId === product.id && number(row.unitCost) > 0)) {
      const supplierKey = String(row.supplierId || row.supplierName || row.id || 'UNKNOWN');
      const previous = latestBySupplier.get(supplierKey);
      const rowTime = validTime(row.createdAt);
      const previousTime = validTime(previous?.createdAt);
      if (!previous || rowTime >= previousTime) latestBySupplier.set(supplierKey, row);
    }
    const prices = [...latestBySupplier.values()].sort((a, b) => number(a.unitCost) - number(b.unitCost));
    const bestSupplier = prices[0] || null;
    const coverageDays = dailyVelocity > 0 ? number(product.stock) / dailyVelocity : null;
    return { ...product, dailyVelocity, targetStock, incoming, plannedDraft, suggestedQty, coverageDays, bestSupplier };
  }).filter(row => row.suggestedQty > 0 || number(row.stock) <= number(row.minStock) || row.plannedDraft > 0).sort((a, b) => b.suggestedQty - a.suggestedQty || b.dailyVelocity - a.dailyVelocity);
}

export function buildSuggestedPurchaseOrders(rows = [], suppliers = []) {
  const supplierMap = new Map((suppliers || []).map(row => [row.id, row]));
  const grouped = new Map();
  const unassigned = [];
  for (const row of rows || []) {
    const suggestedQty = Math.max(0, number(row?.suggestedQty));
    if (!row?.id || suggestedQty <= 0) continue;
    const supplierId = String(row.bestSupplier?.supplierId || '');
    const supplier = supplierMap.get(supplierId);
    if (!supplierId || !supplier || supplier.active === false) {
      unassigned.push(row);
      continue;
    }
    const group = grouped.get(supplierId) || { supplierId, supplierName: supplier.name, supplier, items: [], estimatedTotal: 0 };
    const unitCost = Math.max(0, number(row.bestSupplier?.unitCost));
    const item = {
      productId: row.id,
      name: row.name,
      qty: suggestedQty,
      unit: row.baseUnit,
      factor: 1,
      baseQty: suggestedQty,
      baseUnit: row.baseUnit,
      price: unitCost,
      baseUnitCost: unitCost,
      discount: 0
    };
    group.items.push(item);
    group.estimatedTotal += suggestedQty * unitCost;
    grouped.set(supplierId, group);
  }
  return { groups: [...grouped.values()].sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'id')), unassigned };
}

export function buildInventoryAging({ products = [], sales = [], stockMovements = [], now = new Date(), velocityDays = 30 } = {}) {
  const lastSale = new Map();
  const lastInbound = new Map();
  const velocity = salesVelocityByProduct(sales, velocityDays, now);
  const touchLatest = (map, productId, date) => {
    const time = validTime(date);
    if (!productId || !time) return;
    if (!map.has(productId) || time > map.get(productId)) map.set(productId, time);
  };
  for (const sale of sales || []) {
    if (!validSale(sale)) continue;
    for (const item of sale.items || []) touchLatest(lastSale, item.productId, sale.createdAt);
  }
  for (const movement of stockMovements || []) {
    if (number(movement.qtyChange) > 0) touchLatest(lastInbound, movement.productId, movement.createdAt);
  }
  const nowTime = now.getTime();
  const ageDays = time => time > 0 ? Math.max(0, Math.floor((nowTime - time) / dayMs)) : 9999;
  return (products || []).filter(row => row?.active !== false && row?.trackStock !== false).map(product => {
    const soldAt = lastSale.get(product.id) || 0;
    const stockedAt = lastInbound.get(product.id) || validTime(product.createdAt) || validTime(product.updatedAt);
    // Untuk barang yang pernah terjual, umur stok mengikuti penjualan terakhir.
    // Barang yang belum pernah terjual memakai tanggal stok masuk/produk agar produk baru tidak langsung dianggap dead stock.
    const referenceTime = soldAt || stockedAt;
    const inactiveDays = ageDays(referenceTime);
    const daysSinceSale = soldAt ? ageDays(soldAt) : null;
    const stock = Math.max(0, number(product.stock));
    const capital = Math.round(stock * number(product.modalPrice));
    const retailValue = Math.round(stock * number(product.prices?.retail));
    const dailyVelocity = velocity.get(product.id) || 0;
    const soldWindowQty = dailyVelocity * Math.max(1, Number(velocityDays) || 30);
    const coverageDays = dailyVelocity > 0 ? stock / dailyVelocity : null;
    const minimum = Math.max(0, number(product.minStock));
    const excessThreshold = Math.max(minimum * 3, dailyVelocity > 0 ? dailyVelocity * 90 : minimum * 2);
    const excessStock = stock > 0 && stock > excessThreshold;
    let movementClass = 'normal';
    if (stock > 0 && inactiveDays >= 90) movementClass = 'dead';
    else if (stock > 0 && (inactiveDays >= 30 || (coverageDays !== null && coverageDays >= 90))) movementClass = 'slow';
    else if (stock > 0 && dailyVelocity > 0 && coverageDays !== null && coverageDays <= 30) movementClass = 'fast';
    const bucket = inactiveDays >= 90 ? '90+' : inactiveDays >= 60 ? '60-89' : inactiveDays >= 30 ? '30-59' : '0-29';
    return {
      ...product,
      inactiveDays,
      daysSinceSale,
      neverSold: !soldAt,
      dailyVelocity,
      soldWindowQty,
      coverageDays,
      movementClass,
      excessStock,
      clearanceSuggested: movementClass === 'dead' || (movementClass === 'slow' && excessStock),
      capital,
      retailValue,
      bucket
    };
  }).sort((a, b) => b.inactiveDays - a.inactiveDays || b.capital - a.capital);
}

export function receivableAging(receivables = [], today = new Date()) {
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  for (const row of receivables || []) {
    if (row?.status !== 'OPEN' || number(row.balance) <= 0) continue;
    const due = row.dueDate ? new Date(`${String(row.dueDate).slice(0, 10)}T00:00:00`).getTime() : todayTime;
    const overdueDays = Math.max(0, Math.floor((todayTime - due) / dayMs));
    const balance = number(row.balance);
    if (overdueDays <= 0) buckets.current += balance;
    else if (overdueDays <= 30) buckets.d1_30 += balance;
    else if (overdueDays <= 60) buckets.d31_60 += balance;
    else if (overdueDays <= 90) buckets.d61_90 += balance;
    else buckets.d90plus += balance;
  }
  return buckets;
}

export function quotationTotals(items = [], discount = 0, taxRate = 0, taxEnabled = false) {
  const subtotal = (items || []).reduce((sum, item) => sum + Math.max(0, number(item.qty) * number(item.price) - number(item.discount)), 0);
  const safeDiscount = Math.min(subtotal, Math.max(0, number(discount)));
  const taxable = Math.max(0, subtotal - safeDiscount);
  const tax = taxEnabled ? Math.round(taxable * Math.max(0, number(taxRate)) / 100) : 0;
  return { subtotal: Math.round(subtotal), discount: Math.round(safeDiscount), tax, total: Math.round(taxable + tax) };
}
