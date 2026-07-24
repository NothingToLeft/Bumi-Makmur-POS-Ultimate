import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOperationsToDb, buildDiffOperations, rebaseOperationsAgainstRemote } from '../src/services/syncEngine.js';

const baseDb = () => ({
  meta: { version: '4.1.0' }, configs: { companyName: 'BM' }, categories: [], units: [],
  products: [{ id: 'P1', name: 'Kabel', stock: 10, modalPrice: 5000, prices: { retail: 6500 } }],
  customers: [{ id: 'C1', name: 'Budi', points: 10 }],
  sales: [], users: [], auditLogs: []
});

test('diff captures operational changes but excludes users and audit logs', () => {
  const before = baseDb();
  const after = structuredClone(before);
  after.products[0].stock = 9;
  after.sales.push({ id: 'S1', total: 6500 });
  after.users.push({ id: 'U1' });
  const operations = buildDiffOperations(before, after);
  assert.ok(operations.some(op => op.collectionName === 'products' && op.id === 'P1'));
  assert.ok(operations.some(op => op.collectionName === 'sales' && op.id === 'S1'));
  assert.ok(!operations.some(op => op.collectionName === 'users'));
});

test('stock conflicts are merged as deltas instead of overwriting remote stock', () => {
  const operation = {
    collectionName: 'products', id: 'P1', type: 'set',
    beforeData: { name: 'Kabel', stock: 10, modalPrice: 5000, prices: { retail: 6500 } },
    afterData: { name: 'Kabel', stock: 9, modalPrice: 5000, prices: { retail: 6500 } }
  };
  const remote = baseDb();
  remote.products[0].stock = 8;
  const [rebased] = rebaseOperationsAgainstRemote([operation], remote);
  assert.equal(rebased.beforeData.stock, 8);
  assert.equal(rebased.afterData.stock, 7);
});

test('price edits remain absolute while stock uses delta merge', () => {
  const operation = {
    collectionName: 'products', id: 'P1', type: 'set',
    beforeData: { name: 'Kabel', stock: 10, modalPrice: 5000, prices: { retail: 6500 } },
    afterData: { name: 'Kabel', stock: 9, modalPrice: 5000, prices: { retail: 7000 } }
  };
  const remote = baseDb();
  remote.products[0].stock = 8;
  remote.products[0].prices.retail = 6800;
  const [rebased] = rebaseOperationsAgainstRemote([operation], remote);
  assert.equal(rebased.afterData.stock, 7);
  assert.equal(rebased.afterData.prices.retail, 7000);
});

test('queued operations can reconstruct the latest local view', () => {
  const db = baseDb();
  const operations = [
    { collectionName: 'products', id: 'P1', type: 'set', beforeData: {}, afterData: { name: 'Kabel', stock: 9 } },
    { collectionName: 'sales', id: 'S1', type: 'set', beforeData: null, afterData: { total: 6500 } }
  ];
  const result = applyOperationsToDb(db, operations);
  assert.equal(result.products[0].stock, 9);
  assert.equal(result.sales[0].id, 'S1');
});

test('concurrent receivable payments are merged without losing payment history', () => {
  const operation = {
    collectionName: 'receivables', id: 'R1', type: 'set',
    beforeData: { paid: 0, balance: 100000, payments: [] },
    afterData: { paid: 30000, balance: 70000, payments: [{ id: 'PAY-A', amount: 30000 }] }
  };
  const remote = {
    ...baseDb(),
    receivables: [{ id: 'R1', paid: 20000, balance: 80000, payments: [{ id: 'PAY-B', amount: 20000 }] }]
  };
  const [rebased] = rebaseOperationsAgainstRemote([operation], remote);
  assert.equal(rebased.afterData.paid, 50000);
  assert.equal(rebased.afterData.balance, 50000);
  assert.deepEqual(new Set(rebased.afterData.payments.map(item => item.id)), new Set(['PAY-A', 'PAY-B']));
});

test('concurrent purchase returns are merged by return id', () => {
  const operation = {
    collectionName: 'purchases', id: 'BUY-1', type: 'set',
    beforeData: { status: 'RECEIVED', returns: [] },
    afterData: { status: 'RECEIVED', returns: [{ id: 'RET-A', total: 10000 }] }
  };
  const remote = {
    ...baseDb(),
    purchases: [{ id: 'BUY-1', status: 'RECEIVED', returns: [{ id: 'RET-B', total: 5000 }] }]
  };
  const [rebased] = rebaseOperationsAgainstRemote([operation], remote);
  assert.deepEqual(new Set(rebased.afterData.returns.map(item => item.id)), new Set(['RET-A', 'RET-B']));
});
