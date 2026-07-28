const rows = value => Array.isArray(value) ? value : [];
const idSet = value => new Set((Array.isArray(value) ? value : [value]).filter(Boolean).map(String));

const itemMatches = (item, ids) => ids.has(String(item?.productId || ''));
const lineCount = (groups, ids) => rows(groups).reduce((sum, group) => sum + rows(group?.items).filter(item => itemMatches(item, ids)).length, 0);

export function buildProductLifecycleSummary(db, productIds) {
  const ids = idSet(productIds);
  const products = rows(db?.products).filter(product => ids.has(String(product.id)));
  const stock = products.reduce((sum, product) => sum + Math.max(0, Number(product.stock || 0)), 0);
  const usage = [
    ['transaksi', lineCount(db?.sales, ids)],
    ['open bill', lineCount(db?.heldSales, ids)],
    ['pembelian', lineCount(db?.purchases, ids)],
    ['refund', lineCount(db?.refunds, ids)],
    ['pesanan online', lineCount(db?.onlineOrders, ids)],
    ['pergerakan stok', rows(db?.stockMovements).filter(item => ids.has(String(item?.productId || ''))).length],
    ['penyesuaian stok', rows(db?.stockAdjustments).filter(item => ids.has(String(item?.productId || ''))).length],
    ['stok opname', rows(db?.stockOpnames).reduce((sum, opname) => sum + rows(opname?.items).filter(item => itemMatches(item, ids)).length, 0)],
    ['transfer stok', rows(db?.stockTransfers).filter(item => ids.has(String(item?.productId || ''))).length],
    ['paket produk lain', rows(db?.products).reduce((sum, product) => sum + rows(product?.bundleItems).filter(item => ids.has(String(item?.productId || ''))).length, 0)]
  ].filter(([, count]) => count > 0);
  const historyCount = usage.reduce((sum, [, count]) => sum + count, 0);
  return {
    ids: [...ids],
    products,
    stock,
    usage,
    historyCount,
    canDeletePermanently: products.length > 0 && stock <= 0 && historyCount === 0,
    shouldArchive: stock > 0 || historyCount > 0
  };
}

export function productLifecycleLabel(summary) {
  if (!summary?.products?.length) return 'Produk tidak ditemukan.';
  if (summary.stock > 0) return `Masih ada stok ${summary.stock}. Kosongkan stok atau arsipkan produk.`;
  if (summary.historyCount > 0) return `Produk memiliki ${summary.historyCount} referensi operasional dan hanya boleh diarsipkan.`;
  return 'Produk belum memiliki stok maupun riwayat dan dapat dihapus permanen.';
}
