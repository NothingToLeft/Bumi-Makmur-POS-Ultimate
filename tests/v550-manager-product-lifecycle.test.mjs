import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildProductLifecycleSummary } from '../src/utils/productLifecycle.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Store Manager menjadi admin operasional cabang tanpa akses Owner global', async () => {
  const defaults = await read('src/data/defaults.js');
  const managerBlock = defaults.match(/manager:\s*\[([\s\S]*?)\],\s*kasir:/)?.[1] || '';
  for (const permission of ['products.manage', 'products.delete', 'categories.manage', 'inventory.manage', 'purchases.manage', 'employees.manage', 'payments.manage']) {
    assert.match(managerBlock, new RegExp(permission.replace('.', '\\.')));
  }
  for (const forbidden of ['settings.manage', 'branches.manage', 'cloud.restore', 'owners.manage']) {
    assert.doesNotMatch(managerBlock, new RegExp(forbidden.replace('.', '\\.')));
  }
});

test('kategori Manager dibatasi pada field categories di dokumen settings', async () => {
  const rules = await read('firestore.rules');
  assert.match(rules, /manager\(storeId\)[\s\S]*affectedKeys\(\)\.hasOnly\(\['categories'\]\)/);
  assert.match(rules, /match \/stores\/\{storeId\}\/branches\/\{id\}[\s\S]*allow create, update, delete: if owner\(storeId\)/);
});

test('produk hanya dapat dihapus permanen saat stok nol dan tidak punya riwayat', () => {
  const empty = {
    products: [{ id: 'P1', stock: 0, bundleItems: [] }], sales: [], heldSales: [], purchases: [], refunds: [],
    onlineOrders: [], stockMovements: [], stockAdjustments: [], stockOpnames: [], stockTransfers: []
  };
  assert.equal(buildProductLifecycleSummary(empty, ['P1']).canDeletePermanently, true);

  const stocked = { ...empty, products: [{ id: 'P1', stock: 3, bundleItems: [] }] };
  assert.equal(buildProductLifecycleSummary(stocked, ['P1']).canDeletePermanently, false);

  const sold = { ...empty, sales: [{ id: 'S1', items: [{ productId: 'P1' }] }] };
  const summary = buildProductLifecycleSummary(sold, ['P1']);
  assert.equal(summary.canDeletePermanently, false);
  assert.equal(summary.historyCount, 1);
});

test('UI menyediakan kosongkan stok, arsip, pulihkan, dan hapus permanen', async () => {
  const screen = await read('src/screens/ProductsScreen.jsx');
  const context = await read('src/store/PosContext.jsx');
  assert.match(screen, /Kelola Produk & Stok/);
  assert.match(screen, /Kosongkan Stok/);
  assert.match(screen, /Arsipkan Produk/);
  assert.match(screen, /Pulihkan Produk/);
  assert.match(screen, /Hapus Permanen/);
  assert.match(context, /const deleteProduct =/);
  assert.match(context, /const zeroProductStock =/);
  assert.match(context, /type: 'STOCK_RESET'/);
});
