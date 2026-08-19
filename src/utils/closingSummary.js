const money = value => Math.round(Number(value || 0));
const qty = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function itemCostSnapshot(item, product) {
  if (Number.isFinite(Number(item?.costTotal))) return money(item.costTotal);
  const baseQty = qty(item?.baseQty ?? item?.qty);
  const unitCost = money(item?.modalPrice ?? item?.costPrice ?? item?.baseModalPrice ?? product?.modalPrice);
  return Math.round(unitCost * baseQty);
}

function refundCostRecovery(refund, sale, productMap) {
  if (!refund?.restock || !sale) return 0;
  return (refund.items || []).reduce((sum, refundItem) => {
    const original = (sale.items || []).find(item => item.lineId === refundItem.lineId || item.productId === refundItem.productId);
    if (!original) return sum;
    const originalQty = Math.max(0.000001, qty(original.qty));
    const ratio = Math.min(1, Math.max(0, qty(refundItem.qty) / originalQty));
    const product = productMap.get(original.productId);
    return sum + Math.round(itemCostSnapshot(original, product) * ratio);
  }, 0);
}

export function buildClosingSummary({ shift, sales = [], refunds = [], expenses = [], receivables = [], products = [], branch = {}, configs = {} }) {
  if (!shift) throw new Error('Data shift tidak tersedia.');
  const startedAt = new Date(shift.startAt || 0).getTime();
  const endedAt = new Date(shift.endAt || Date.now()).getTime();
  const inRange = value => {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) && time >= startedAt && time <= endedAt;
  };
  const sameBranchInRange = row => row?.branchId === shift.branchId && inRange(row.createdAt);
  const allShiftSales = sales.filter(sameBranchInRange);
  const shiftSales = allShiftSales.filter(sale => sale.status !== 'VOIDED');
  // VOID dikeluarkan bersama transaksi asalnya agar omzet tidak dikurangi dua kali.
  const shiftRefunds = refunds.filter(sameBranchInRange).filter(row => row.type !== 'VOID');
  const shiftExpenses = expenses.filter(sameBranchInRange);
  const shiftReceivables = receivables.filter(sameBranchInRange);
  const saleMap = new Map(sales.map(sale => [sale.id, sale]));
  const productMap = new Map(products.map(product => [product.id, product]));

  const grossSales = shiftSales.reduce((sum, sale) => sum + money(sale.total), 0);
  const refundTotal = shiftRefunds.reduce((sum, row) => sum + money(row.amount ?? row.total), 0);
  const netSales = grossSales - refundTotal;

  const soldCost = shiftSales.reduce((sum, sale) => sum + (sale.items || []).reduce((itemSum, item) => {
    return itemSum + itemCostSnapshot(item, productMap.get(item.productId));
  }, 0), 0);
  const returnedCost = shiftRefunds.reduce((sum, refund) => sum + refundCostRecovery(refund, saleMap.get(refund.saleId), productMap), 0);
  const netCost = soldCost - returnedCost;
  const grossProfit = netSales - netCost;

  const soldItemQty = shiftSales.reduce((sum, sale) => sum + (sale.items || []).reduce((itemSum, item) => itemSum + qty(item.qty), 0), 0);
  const refundItemQty = shiftRefunds.reduce((sum, refund) => sum + (refund.items || []).reduce((itemSum, item) => itemSum + qty(item.qty), 0), 0);
  const itemQty = soldItemQty - refundItemQty;
  const discounts = shiftSales.reduce((sum, sale) => sum + money(sale.globalDiscount) + money(sale.promoDiscount) + money(sale.loyaltyDiscount) + (sale.items || []).reduce((itemSum, item) => itemSum + money(item.itemDiscount), 0), 0);
  const taxes = shiftSales.reduce((sum, sale) => sum + money(sale.tax), 0);

  const methods = {};
  shiftSales.forEach(sale => (sale.payments || []).forEach(payment => {
    const name = String(payment.name || payment.type || 'Lainnya');
    methods[name] = money(methods[name]) + money(payment.amount);
  }));
  shiftRefunds.forEach(refund => {
    const name = String(refund.method || 'Tunai');
    const payout = refund.payoutAmount !== undefined
      ? money(refund.payoutAmount)
      : Math.max(0, money(refund.amount) - money(refund.receivableReduction));
    if (payout > 0) methods[name] = money(methods[name]) - payout;
  });

  const expenseTotal = shiftExpenses.reduce((sum, row) => sum + money(row.amount), 0);
  const newReceivable = shiftReceivables.reduce((sum, row) => sum + money(row.total), 0);
  const refundPayout = shiftRefunds.reduce((sum, row) => sum + (row.payoutAmount !== undefined ? money(row.payoutAmount) : Math.max(0, money(row.amount) - money(row.receivableReduction))), 0);

  return {
    shiftId: shift.id,
    branchId: shift.branchId,
    branchName: branch.name || configs.companyName || 'BUMI MAKMUR',
    branchAddress: branch.address || configs.address || '',
    cashierName: shift.userName || '-',
    startAt: shift.startAt,
    endAt: shift.endAt,
    transactionCount: shiftSales.length,
    voidCount: allShiftSales.filter(sale => sale.status === 'VOIDED').length,
    refundCount: shiftRefunds.length,
    soldItemQty,
    refundItemQty,
    itemQty,
    grossSales,
    refundTotal,
    refundPayout,
    netSales,
    discounts,
    taxes,
    soldCost,
    returnedCost,
    estimatedCost: netCost,
    grossProfit,
    expenses: expenseTotal,
    newReceivable,
    payments: methods,
    startingCash: money(shift.startingCash),
    expectedCash: money(shift.expectedEndingCash ?? shift.expectedCash),
    actualCash: money(shift.actualEndingCash),
    difference: money(shift.difference),
    notes: shift.endNotes || shift.notes || '',
    generatedAt: new Date().toISOString()
  };
}
