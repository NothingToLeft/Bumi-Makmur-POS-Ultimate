import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  baseUnitCost,
  conversionFactor,
  normalizeQuantity,
  normalizeQuantityStep,
  priceForUnit,
  quickQuantityOptions,
  recommendedQuantityStep,
  toBaseQuantity
} from '../src/utils/fractionalUnits.js';
import { normalizeDbShape } from '../src/utils/dbShape.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const cable = {
  name: 'Kabel NYM',
  baseUnit: 'meter',
  allowFractional: true,
  quantityStep: 0.5,
  conversions: [{ unit: 'roll', factor: 50 }]
};

test('konversi kabel roll dan penjualan meter pecahan menjaga stok dasar yang benar', () => {
  assert.equal(conversionFactor(cable, 'roll'), 50);
  assert.equal(toBaseQuantity(cable, 1, 'roll'), 50);
  assert.equal(toBaseQuantity(cable, 3.5, 'meter'), 3.5);
  assert.equal(normalizeQuantity(3.47, { allowFractional: true, step: 0.5 }), 3.5);
  assert.equal(normalizeQuantityStep(0.01, true), 0.01);
});



test('migrasi data lama mengaktifkan pecahan ketika konversi memakai bagian dari satuan dasar', () => {
  const seed = { meta: {}, configs: {}, categories: [], units: [], products: [] };
  const migrated = normalizeDbShape({
    products: [{ id: 'OLD', baseUnit: 'box', stock: 40, minStock: 2, allowFractional: false, conversions: [{ unit: 'pcs', factor: 0.01 }] }]
  }, seed, '5.6.1');
  assert.equal(migrated.products[0].allowFractional, true);
  assert.equal(migrated.products[0].quantityStep, 0.01);
});

test('harga beli dan jual konversi dihitung dari satuan dasar secara konsisten', () => {
  assert.equal(priceForUnit(4_000, 50), 200_000);
  assert.equal(baseUnitCost(200_000, 50), 4_000);
});

test('login karyawan membaca daftar nama aman per cabang dan hanya meminta PIN', async () => {
  const login = await read('src/screens/LoginScreen.jsx');
  const store = await read('src/services/cloudStore.js');
  const context = await read('src/store/PosContext.jsx');
  const rules = await read('firestore.rules');

  assert.match(login, /Toko \/ Cabang/);
  assert.match(login, /Nama Karyawan/);
  assert.match(login, /<Select value=\{employeeLoginName\}/);
  assert.doesNotMatch(login, /placeholder="Nama login karyawan"/);
  assert.match(store, /publicEmployees/);
  assert.match(store, /loadPublicEmployeeDirectory/);
  assert.match(store, /publishPublicEmployeeDirectory/);
  assert.match(context, /refreshLoginEmployees/);
  assert.match(context, /publishEmployeeLoginList/);
  assert.match(rules, /match \/stores\/\{storeId\}\/publicEmployees\/\{branchId\}/);
  assert.match(rules, /allow get: if true/);
  assert.match(rules, /allow list: if false/);
});

test('Produk dan Stok menjadi satu alur ramah pengguna dengan stok awal langsung', async () => {
  const defaults = await read('src/data/defaults.js');
  const products = await read('src/screens/ProductsScreen.jsx');
  const app = await read('src/App.jsx');
  const context = await read('src/store/PosContext.jsx');

  assert.match(defaults, /id: 'products', label: 'Produk & Stok'/);
  assert.doesNotMatch(defaults, /id: 'inventory'/);
  assert.doesNotMatch(defaults, /id: 'promotions'/);
  assert.match(products, /Tambah Barang & Stok/);
  assert.match(products, /Tambah Barang & Stok Awal/);
  assert.match(products, /Stok Opname/);
  assert.match(products, /Transfer Cabang/);
  assert.match(products, /INITIAL_STOCK|stok awal/i);
  assert.match(app, /case\s*'inventory':/);
  assert.match(app, /case\s*'promotions':/);
  assert.match(context, /type: 'INITIAL_STOCK'/);
});

test('checkout dan pembelian mendukung satuan konversi serta jumlah desimal', async () => {
  const pos = await read('src/screens/POSScreen.jsx');
  const purchases = await read('src/screens/PurchasesScreen.jsx');
  const orders = await read('src/screens/OrdersScreen.jsx');
  const context = await read('src/store/PosContext.jsx');

  assert.match(pos, /Pilih Jumlah & Satuan/);
  assert.match(pos, /baseQty/);
  assert.match(pos, /quantityStep/);
  assert.match(pos, /Pilihan cepat/);
  assert.match(pos, /quickQuantityOptions/);
  assert.match(pos, /normalizeQuantity/);
  assert.match(purchases, /toBaseQuantity/);
  assert.match(purchases, /baseUnitCost/);
  assert.match(purchases, /Masuk stok/);
  assert.match(purchases, /quantityStepFor/);
  assert.match(orders, /toBaseQuantity/);
  assert.match(orders, /Nama Karyawan|Pesanan Online Baru/);
  assert.match(orders, /quantityStep/);
  assert.match(orders, /Mengurangi stok/);
  assert.match(context, /baseQty \?\? cartItem\.qty/);
  assert.match(context, /validateBaseQuantity\(row\.product, row\.qty, 'Jumlah penjualan'\)/);
  assert.match(context, /refundStep/);
  assert.match(context, /Jumlah restock refund/);
  assert.match(context, /Jumlah retur .* harus mengikuti kelipatan/);
  assert.match(context, /Tambahkan minimal satu barang ke pesanan/);
});

test('promo baru dinonaktifkan tanpa merusak histori transaksi lama', async () => {
  const context = await read('src/store/PosContext.jsx');
  const defaults = await read('src/data/defaults.js');
  assert.match(context, /const safePromoDiscount = 0/);
  assert.doesNotMatch(defaults, /id: 'promotions'/);
  assert.match(context, /promoDiscount: safePromoDiscount/);
});
