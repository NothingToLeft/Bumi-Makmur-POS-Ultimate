import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findSaleLine, isSameSaleLine, addCalendarMonths } from '../src/utils/saleLines.js';
import { computeRefundPlan } from '../src/utils/refundPlan.js';

const sale = () => ({
  id: 'INV-1', branchId: 'B1', status: 'COMPLETED', total: 270000, refundedTotal: 0,
  items: [
    { lineId: 'L1', productId: 'P1', name: 'Lampu', qty: 2, price: 100000, itemDiscount: 20000, netUnitPrice: 90000 },
    { lineId: 'L2', productId: 'P1', name: 'Lampu', qty: 1, price: 90000, itemDiscount: 0, netUnitPrice: 90000 }
  ]
});

test('findSaleLine memakai lineId sebagai identitas utama walau productId sama', () => {
  const items = sale().items;
  assert.equal(findSaleLine(items, { lineId: 'L2', productId: 'P1' }).lineId, 'L2');
  assert.equal(findSaleLine(items, { lineId: 'NOPE', productId: 'P1' }), undefined);
  assert.equal(findSaleLine([{ productId: 'P9', qty: 1 }], { productId: 'P9' }).productId, 'P9');
});

test('isSameSaleLine tidak menyamakan dua baris produk sama yang berbeda lineId', () => {
  assert.equal(isSameSaleLine({ lineId: 'L1', productId: 'P1' }, { lineId: 'L2', productId: 'P1' }), false);
  assert.equal(isSameSaleLine({ lineId: 'L1', productId: 'P1' }, { lineId: 'L1', productId: 'P1' }), true);
  assert.equal(isSameSaleLine({ productId: 'P1' }, { productId: 'P1' }), true);
});

test('refund baris L2 dihitung dari baris L2, bukan baris pertama dengan produk sama', () => {
  const source = { sales: [sale()], refunds: [], serialNumbers: [] };
  const { amount } = computeRefundPlan(source, { saleId: 'INV-1', items: [{ lineId: 'L2', productId: 'P1', qty: 1 }] });
  assert.equal(amount, 90000);
});

test('refund L1 tidak mengurangi sisa refund L2', () => {
  const source = {
    sales: [sale()], serialNumbers: [],
    refunds: [{ saleId: 'INV-1', items: [{ lineId: 'L1', productId: 'P1', qty: 2 }] }]
  };
  const { amount } = computeRefundPlan(source, { saleId: 'INV-1', items: [{ lineId: 'L2', productId: 'P1', qty: 1 }] });
  assert.equal(amount, 90000);
});

test('refund ulang dengan state terbaru ditolak (proteksi klik ganda)', () => {
  const first = { saleId: 'INV-1', items: [{ lineId: 'L2', productId: 'P1', qty: 1 }] };
  const source = { sales: [sale()], refunds: [], serialNumbers: [] };
  computeRefundPlan(source, first);
  source.refunds.push({ saleId: 'INV-1', items: first.items });
  assert.throws(() => computeRefundPlan(source, first), /melebihi sisa/);
});

test('qty yang sama dikirim dua kali dalam satu payload tidak melewati batas', () => {
  const source = { sales: [sale()], refunds: [], serialNumbers: [] };
  assert.throws(() => computeRefundPlan(source, {
    saleId: 'INV-1', items: [{ lineId: 'L2', qty: 1 }, { lineId: 'L2', qty: 1 }]
  }), /melebihi sisa/);
});

test('void harus mencakup seluruh baris transaksi', () => {
  const source = { sales: [sale()], refunds: [], serialNumbers: [] };
  assert.throws(() => computeRefundPlan(source, {
    saleId: 'INV-1', voidAll: true, items: [{ lineId: 'L1', qty: 2 }]
  }), /Void harus mencakup seluruh item/);
  const ok = computeRefundPlan(source, {
    saleId: 'INV-1', voidAll: true, items: [{ lineId: 'L1', qty: 2 }, { lineId: 'L2', qty: 1 }]
  });
  assert.equal(ok.amount, 270000);
});

test('addCalendarMonths tidak overflow ke bulan berikutnya', () => {
  const end = addCalendarMonths(new Date(2026, 0, 31, 10, 0, 0), 1);
  assert.equal(end.getMonth(), 1);
  assert.equal(end.getDate(), 28);
  assert.equal(addCalendarMonths('bukan-tanggal', 3), null);
});

test('guard v6.4.2 hadir pada source: QRIS replay, loyalty, lockout PIN, klik ganda', () => {
  const pos = fs.readFileSync(new URL('../src/store/PosContext.jsx', import.meta.url), 'utf8');
  const offline = fs.readFileSync(new URL('../src/services/offlineStore.js', import.meta.url), 'utf8');
  const tx = fs.readFileSync(new URL('../src/screens/TransactionsScreen.jsx', import.meta.url), 'utf8');
  assert.match(pos, /assertUniqueQrisSessions/);
  assert.match(pos, /Penukaran poin wajib memilih pelanggan terdaftar/);
  assert.match(pos, /computeRefundPlan\(next, payload\)/);
  assert.match(pos, /PIN_LOCKED/);
  assert.match(offline, /recordPinFailure/);
  assert.match(offline, /assertPinNotLocked/);
  assert.match(tx, /processingRef/);
});
