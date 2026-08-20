import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildClosingSummary } from '../src/utils/closingSummary.js';
import { buildNetPaymentBreakdown } from '../src/utils/accounting.js';
import { buildOperationalHealth } from '../src/utils/operationsHealth.js';
import { localDateKey } from '../src/utils/helpers.js';
import { toEpochMs } from '../src/utils/temporal.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('closing subtracts cash change so payment breakdown matches money actually retained', () => {
  const shift = { id: 'S-CASH', branchId: 'B1', userName: 'Kasir', startAt: '2026-08-20T08:00:00+07:00', endAt: '2026-08-20T16:00:00+07:00', startingCash: 100000, expectedEndingCash: 139000, actualEndingCash: 139000, difference: 0 };
  const sales = [{
    id: 'INV-CASH', branchId: 'B1', status: 'COMPLETED', createdAt: '2026-08-20T10:00:00+07:00', total: 39000, change: 11000,
    payments: [{ id: 'cash', type: 'cash', name: 'Tunai', amount: 50000 }],
    items: [{ lineId: 'L1', productId: 'P1', qty: 1, baseQty: 1, costTotal: 20000 }]
  }];
  const summary = buildClosingSummary({ shift, sales, branch: { id: 'B1', name: 'Bumi Makmur 2' } });
  assert.equal(summary.netSales, 39000);
  assert.equal(summary.payments.Tunai, 39000);
  assert.equal(summary.expectedCash, 139000);
});

test('closing supports Firestore timestamp shapes and excludes legacy VOID status', () => {
  const ts = iso => ({ seconds: Math.floor(Date.parse(iso) / 1000), nanoseconds: 0 });
  const shift = { id: 'S-TS', branchId: 'B1', userName: 'Kasir', startAt: ts('2026-08-20T01:00:00Z'), endAt: ts('2026-08-20T10:00:00Z'), startingCash: 0, actualEndingCash: 10000, expectedEndingCash: 10000, difference: 0 };
  const sales = [
    { id: 'OK', branchId: 'B1', status: 'COMPLETED', createdAt: ts('2026-08-20T05:00:00Z'), total: 10000, payments: [{ type: 'digital', name: 'QRIS', amount: 10000 }], items: [] },
    { id: 'VOID', branchId: 'B1', status: 'VOID', createdAt: ts('2026-08-20T06:00:00Z'), total: 90000, payments: [{ type: 'cash', name: 'Tunai', amount: 90000 }], items: [] }
  ];
  const summary = buildClosingSummary({ shift, sales, branch: { id: 'B1', name: 'BM' } });
  assert.equal(summary.transactionCount, 1);
  assert.equal(summary.voidCount, 1);
  assert.equal(summary.netSales, 10000);
  assert.equal(summary.payments.QRIS, 10000);
  assert.equal(summary.payments.Tunai, undefined);
});

test('operational health excludes VOID and VOIDED sales from todays revenue', () => {
  const db = {
    configs: {}, products: [], receivables: [], payables: [], shifts: [],
    sales: [
      { id: 'A', branchId: 'B1', status: 'COMPLETED', createdAt: '2026-08-20T09:00:00+07:00', total: 12000, refundedTotal: 0 },
      { id: 'B', branchId: 'B1', status: 'VOIDED', createdAt: '2026-08-20T10:00:00+07:00', total: 50000, refundedTotal: 0 },
      { id: 'C', branchId: 'B1', status: 'VOID', createdAt: '2026-08-20T11:00:00+07:00', total: 60000, refundedTotal: 0 }
    ]
  };
  const health = buildOperationalHealth(db, 'B1', { now: new Date('2026-08-20T12:00:00+07:00') });
  assert.equal(health.salesTodayCount, 1);
  assert.equal(health.salesTodayTotal, 12000);
});

test('local date helpers accept Firestore timestamp objects without Invalid Date', () => {
  const shape = { seconds: Math.floor(new Date(2026, 7, 20, 12, 30, 0).getTime() / 1000), nanoseconds: 0 };
  assert.ok(toEpochMs(shape) > 0);
  assert.equal(localDateKey(shape), '2026-08-20');
});


test('payment analytics uses net cash after change and refund payout', () => {
  const sales = [{ id: 'A', status: 'COMPLETED', total: 39000, change: 11000, payments: [{ type: 'cash', name: 'Tunai', amount: 50000 }] }];
  const refunds = [{ id: 'R', saleId: 'A', type: 'PARTIAL', method: 'Tunai', amount: 4000, payoutAmount: 4000 }];
  const breakdown = buildNetPaymentBreakdown(sales, refunds);
  assert.equal(breakdown.Tunai, 35000);
});
test('closing PDF renderer is branded, uses official logo, and keeps PDF local', async () => {
  const source = await read('src/services/dailyClosingReport.js');
  assert.match(source, /BUMI MAKMUR 2/);
  assert.match(source, /\/logo-bm\.svg/);
  assert.match(source, /BRAND_RED/);
  assert.match(source, /buildJpegPdf/);
  assert.match(source, /localDateKeyFromValue/);
  assert.doesNotMatch(source, /firebase\/storage|uploadBytes|Storage/);
});
