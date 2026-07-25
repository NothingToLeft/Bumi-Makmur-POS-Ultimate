const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function saleLineHpp(line = {}, quantityOverride = null) {
  const soldQty = Math.max(0, numeric(line.qty));
  const baseQty = Math.max(0, numeric(line.baseQty || line.qty));
  const targetQty = quantityOverride == null ? soldQty : Math.max(0, Math.min(soldQty, numeric(quantityOverride)));
  if (soldQty <= 0 || targetQty <= 0) return 0;
  const baseQtyForTarget = baseQty * (targetQty / soldQty);
  return Math.max(0, numeric(line.modalPrice)) * baseQtyForTarget;
}

export function calculateSaleHpp(sale = {}) {
  return (sale.items || []).reduce((sum, line) => sum + saleLineHpp(line), 0);
}

function findOriginalLine(sale, refundItem) {
  return (sale?.items || []).find(line => (
    (refundItem?.lineId && line.lineId === refundItem.lineId)
    || (!refundItem?.lineId && refundItem?.productId && line.productId === refundItem.productId)
  ));
}

export function calculateRestockedRefundHpp(sales = [], refunds = []) {
  const saleMap = new Map((sales || []).map(sale => [String(sale.id), sale]));
  return (refunds || []).filter(refund => refund?.restock).reduce((sum, refund) => {
    const sale = saleMap.get(String(refund.saleId));
    if (!sale) return sum;
    return sum + (refund.items || []).reduce((itemSum, refundItem) => {
      const original = findOriginalLine(sale, refundItem);
      return original ? itemSum + saleLineHpp(original, refundItem.qty) : itemSum;
    }, 0);
  }, 0);
}

export function calculateNetHpp(sales = [], refunds = []) {
  const grossHpp = (sales || []).reduce((sum, sale) => sum + calculateSaleHpp(sale), 0);
  return Math.max(0, grossHpp - calculateRestockedRefundHpp(sales, refunds));
}

export function buildNetProductPerformance(sales = [], refunds = []) {
  const refundedByLine = new Map();
  for (const refund of refunds || []) {
    for (const item of refund.items || []) {
      const key = `${refund.saleId}:${item.lineId || item.productId || ''}`;
      refundedByLine.set(key, (refundedByLine.get(key) || 0) + Math.max(0, numeric(item.qty)));
    }
  }

  const rows = new Map();
  for (const sale of sales || []) {
    for (const line of sale.items || []) {
      const soldQty = Math.max(0, numeric(line.qty));
      if (soldQty <= 0) continue;
      const key = `${sale.id}:${line.lineId || line.productId || ''}`;
      const refundedQty = Math.min(soldQty, refundedByLine.get(key) || 0);
      const netQty = Math.max(0, soldQty - refundedQty);
      if (netQty <= 0) continue;
      const ratio = netQty / soldQty;
      const lineRevenue = Math.max(0, numeric(line.price) * soldQty - numeric(line.itemDiscount)) * ratio;
      const lineHpp = saleLineHpp(line, netQty);
      const productKey = String(line.productId || line.name || 'unknown');
      const row = rows.get(productKey) || { productId: line.productId || '', name: line.name || 'Produk', qty: 0, revenue: 0, hpp: 0 };
      row.qty += netQty;
      row.revenue += lineRevenue;
      row.hpp += lineHpp;
      rows.set(productKey, row);
    }
  }
  return [...rows.values()].sort((first, second) => second.revenue - first.revenue);
}

export function calculateNetPurchaseValue(purchases = []) {
  return (purchases || [])
    .filter(purchase => purchase.status === 'RECEIVED')
    .reduce((sum, purchase) => {
      const returned = (purchase.returns || []).reduce((returnSum, row) => returnSum + Math.max(0, numeric(row.total)), 0);
      return sum + Math.max(0, numeric(purchase.total) - returned);
    }, 0);
}
