import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNetProductPerformance,
  calculateNetHpp,
  calculateNetPurchaseValue,
  calculateSaleHpp
} from '../src/utils/accounting.js';

test('HPP memakai modal snapshot dan base quantity', () => {
  const sale = { items: [{ qty: 2, baseQty: 10, modalPrice: 500 }] };
  assert.equal(calculateSaleHpp(sale), 5000);
});

test('refund yang direstock mengurangi HPP, refund tanpa restock tetap menjadi beban', () => {
  const sales = [{ id: 'S1', items: [{ lineId: 'L1', productId: 'P1', qty: 2, baseQty: 2, modalPrice: 5000 }] }];
  assert.equal(calculateNetHpp(sales, [{ saleId: 'S1', restock: true, items: [{ lineId: 'L1', qty: 1 }] }]), 5000);
  assert.equal(calculateNetHpp(sales, [{ saleId: 'S1', restock: false, items: [{ lineId: 'L1', qty: 1 }] }]), 10000);
});

test('laporan produk memakai penjualan bersih setelah refund', () => {
  const sales = [{ id: 'S1', items: [{ lineId: 'L1', productId: 'P1', name: 'Lampu', qty: 2, baseQty: 2, price: 10000, itemDiscount: 0, modalPrice: 6000 }] }];
  const rows = buildNetProductPerformance(sales, [{ saleId: 'S1', items: [{ lineId: 'L1', qty: 1 }] }]);
  assert.equal(rows[0].qty, 1);
  assert.equal(rows[0].revenue, 10000);
  assert.equal(rows[0].hpp, 6000);
});

test('pembelian bersih mengurangi nilai retur pemasok', () => {
  const purchases = [{ status: 'RECEIVED', total: 100000, returns: [{ total: 25000 }] }, { status: 'DRAFT', total: 50000 }];
  assert.equal(calculateNetPurchaseValue(purchases), 75000);
});
