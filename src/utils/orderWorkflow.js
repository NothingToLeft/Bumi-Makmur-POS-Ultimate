// A repeated click must reuse the existing bill instead of duplicating checkout items.
export function existingBillForOrder(order, bills = []) {
  if (!order) throw new Error('Pesanan tidak ditemukan.');
  const existing = bills.find(bill => bill.sourceOrderId === order.id && bill.branchId === order.branchId);
  if (existing) return existing;
  if (!['NEW', 'PROCESSING'].includes(order.status)) throw new Error('Pesanan ini sudah diproses atau dibatalkan. Muat ulang daftar pesanan.');
  if (!Array.isArray(order.items) || !order.items.length) throw new Error('Pesanan belum memiliki barang.');
  return null;
}
