import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { normalizeDbShape } from '../src/utils/dbShape.js';
import { compareNewest, sortNewest, toEpochMs } from '../src/utils/temporal.js';

const read = path => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('timestamp parser accepts ISO, seconds, milliseconds, and Firestore timestamp shapes', () => {
  const iso = '2026-08-19T14:43:06.000Z';
  const expected = Date.parse(iso);
  assert.equal(toEpochMs(iso), expected);
  assert.equal(toEpochMs(expected), expected);
  assert.equal(toEpochMs(expected / 1000), expected);
  assert.equal(toEpochMs({ seconds: expected / 1000, nanoseconds: 0 }), expected);
  assert.equal(toEpochMs({ _seconds: expected / 1000, _nanoseconds: 0 }), expected);
  assert.equal(toEpochMs({ toMillis: () => expected }), expected);
});

test('transaction chronology is newest-first and deterministic regardless of input order', () => {
  const rows = [
    { id: 'INV-A', createdAt: '2026-08-19T02:27:29+07:00' },
    { id: 'INV-D', createdAt: '2026-08-19T21:41:36+07:00' },
    { id: 'INV-B', createdAt: '2026-08-19T21:43:06+07:00' },
    { id: 'INV-C', createdAt: '2026-08-19T12:52:01+07:00' }
  ];
  assert.deepEqual(sortNewest(rows, ['createdAt']).map(row => row.id), ['INV-B', 'INV-D', 'INV-C', 'INV-A']);
  assert.ok(compareNewest(rows[1], rows[0], ['createdAt']) < 0);
});

test('database normalization repairs Firestore unordered history and keeps general customer first', () => {
  const seed = {
    meta: {}, configs: {}, categories: [], units: [], products: [], branches: [], users: [], suppliers: [], customers: [],
    sales: [], heldSales: [], purchases: [], purchaseOrders: [], stockMovements: [], stockAdjustments: [], stockOpnames: [], stockTransfers: [],
    expenses: [], receivables: [], payables: [], refunds: [], shifts: [], cashMovements: [], onlineOrders: [], promotions: [], campaigns: [], feedback: [],
    branchPaymentProfiles: [], productPriceHistory: [], supplierPriceHistory: [], approvalRequests: [], deviceSessions: [], quotations: [], serialNumbers: [], warrantyClaims: [], auditLogs: []
  };
  const normalized = normalizeDbShape({
    ...seed,
    customers: [{ id: 'CUS-2', name: 'Zeta' }, { id: 'CUS-GENERAL', name: 'Umum (Non-Member)' }, { id: 'CUS-1', name: 'Andi' }],
    sales: [
      { id: 'OLD', createdAt: '2026-08-19T02:27:29+07:00' },
      { id: 'NEW', createdAt: '2026-08-19T21:43:06+07:00' }
    ],
    stockMovements: [
      { id: 'M1', createdAt: '2026-08-18T10:00:00Z' },
      { id: 'M2', createdAt: '2026-08-20T10:00:00Z' }
    ]
  }, seed, '6.2.0');
  assert.deepEqual(normalized.sales.map(row => row.id), ['NEW', 'OLD']);
  assert.deepEqual(normalized.stockMovements.map(row => row.id), ['M2', 'M1']);
  assert.deepEqual(normalized.customers.map(row => row.id), ['CUS-GENERAL', 'CUS-1', 'CUS-2']);
});

test('transaction screen exposes chronological sort controls and wider search coverage', async () => {
  const source = await read('src/screens/TransactionsScreen.jsx');
  assert.match(source, /sortNewest\(filtered,transactionTimeFields\)/);
  assert.match(source, /sortOldest\(filtered,transactionTimeFields\)/);
  assert.match(source, /Nominal terbesar/);
  assert.match(source, /barcode/);
  assert.match(source, /Urutan/);
});

test('POS no longer chooses an arbitrary first customer as the default', async () => {
  const source = await read('src/screens/POSScreen.jsx');
  assert.match(source, /generalCustomerId/);
  assert.doesNotMatch(source, /useState\(scoped\.customers\[0\]\?\.id/);
  assert.doesNotMatch(source, /bill\.customerId \|\| scoped\.customers\[0\]/);
});

test('cloud bootstrap, realtime, and local commits normalize database ordering', async () => {
  const source = await read('src/store/PosContext.jsx');
  assert.match(source, /const next = normalizeDbShape\(draft, seedRef\.current, APP_VERSION\)/);
  assert.match(source, /normalizeDbShape\(overlayPendingOnRemote\(normalizeDbShape\(loaded/);
  assert.match(source, /normalizeDbShape\(overlayPendingOnRemote\(normalizeDbShape\(remoteDb/);
});

test('legacy VOID transactions remain visible under the Void filter and timestamp fallbacks are complete', async () => {
  const source = await read('src/screens/TransactionsScreen.jsx');
  assert.match(source, /status==='VOIDED'&&sale\.status==='VOID'/);
  assert.match(source, /'completedAt', 'createdAt', 'updatedAt', 'date', 'timestamp'/);
});

test('receipt and operational history screens format Firestore timestamps through temporal helpers', async () => {
  const receipt = await read('src/components/ReceiptDocument.jsx');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  const partners = await read('src/screens/PartnersScreens.jsx');
  const bills = await read('src/screens/OpenBillsScreen.jsx');
  const control = await read('src/screens/ControlCenterScreen.jsx');
  const display = await read('src/screens/DesktopCustomerDisplayScreen.jsx');
  assert.match(receipt, /formatDateTimeId/);
  assert.doesNotMatch(receipt, /const parsed = new Date\(value\)/);
  assert.match(settings, /formatDateTimeId\(row\.createdAt\)/);
  assert.match(partners, /formatDateId\(s\.createdAt\)/);
  assert.match(bills, /formatDateTimeId\(bill\.updatedAt\|\|bill\.createdAt\)/);
  assert.match(control, /formatDateTimeId\(row\.startAt\)/);
  assert.match(display, /toEpochMs\(snapshot\.updatedAt\)/);
});

test('purchase modal-price chronology accepts Firestore timestamps without direct Date coercion', async () => {
  const source = await read('src/store/PosContext.jsx');
  assert.match(source, /date: toEpochMs\(purchase\.updatedAt \|\| purchase\.createdAt\)/);
  assert.doesNotMatch(source, /date: new Date\(purchase\.updatedAt \|\| purchase\.createdAt/);
});

test('serial warranty expiry calculation accepts Firestore timestamp soldAt values', async () => {
  const source = await read('src/store/PosContext.jsx');
  assert.match(source, /const soldEpoch = toEpochMs\(soldAt\)/);
  assert.doesNotMatch(source, /new Date\(soldAt\)/);
});
