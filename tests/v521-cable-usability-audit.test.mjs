import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeQuantity,
  normalizeQuantityStep,
  quickQuantityOptions,
  recommendedQuantityStep
} from '../src/utils/fractionalUnits.js';
import { normalizeDbShape } from '../src/utils/dbShape.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('kabel memakai kelipatan setengah meter dan nilai 0,499 dinormalisasi menjadi 0,5', () => {
  assert.equal(recommendedQuantityStep('meter', 'Listrik'), 0.5);
  assert.equal(recommendedQuantityStep('pcs', 'Kabel'), 0.5);
  assert.equal(normalizeQuantityStep(0.499, true), 0.5);
  assert.equal(normalizeQuantity(3.4, { allowFractional: true, step: 0.5 }), 3.5);
  assert.deepEqual(quickQuantityOptions(0.5), [0.5, 1, 1.5, 2, 2.5, 3.5]);
});

test('migrasi memperbaiki kelipatan kabel lama yang hampir setengah meter', () => {
  const migrated = normalizeDbShape({
    products: [{ id: 'KABEL-LAMA', name: 'Kabel NYM', category: 'Listrik', baseUnit: 'meter', allowFractional: true, quantityStep: 0.499, stock: 20, minStock: 5, conversions: [{ unit: 'roll', factor: 50 }] }]
  }, { meta: {}, configs: {}, categories: [], units: [], products: [] }, '5.6.1');
  assert.equal(migrated.products[0].quantityStep, 0.5);
});

test('form barang tidak lagi menerima angka kelipatan bebas yang membingungkan', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  assert.match(products, /Kelipatan penjualan/);
  assert.match(products, /QUANTITY_STEP_PRESETS/);
  assert.match(products, /0,5 meter/);
  assert.match(products, /Preset roll 50 meter/);
  assert.doesNotMatch(products, /Langkah jumlah terkecil/);
  assert.doesNotMatch(products, /min="0\.001" max="1" step="0\.001" value=\{form\.quantityStep\}/);
});

test('kasir menyediakan tombol jumlah cepat dan pembelian tidak meluber ke ringkasan', async () => {
  const pos = await read('src/screens/POSScreen.jsx');
  const purchases = await read('src/screens/PurchasesScreen.jsx');
  assert.match(pos, /Pilihan cepat/);
  assert.match(pos, /quickQuantityOptions/);
  assert.match(pos, /onBlur=\{\(\) => setQty\(safeQty\)\}/);
  assert.match(purchases, /Tambah ke Daftar/);
  assert.match(purchases, /2xl:grid-cols/);
  assert.match(purchases, /changeItemUnit/);
  assert.match(purchases, /priceForUnit\(effectiveBaseCost, nextFactor\)/);
  assert.match(purchases, /belum memiliki kemasan pembelian/i);
});


test('seluruh alur stok pecahan menormalisasi jumlah dan tetap responsif', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  const purchases = await read('src/screens/PurchasesScreen.jsx');
  const transactions = await read('src/screens/TransactionsScreen.jsx');
  assert.match(products, /normalizeSignedQuantity/);
  assert.match(products, /normalizeCount/);
  assert.match(products, /Maksimal \$\{formatQuantity\(maxQty\)\}/);
  assert.match(purchases, /qtyReturn: Math\.min\(item\.returnableQty, normalizeQuantity/);
  assert.match(purchases, /sm:grid-cols-\[minmax\(0,1fr\)_140px\]/);
  assert.match(transactions, /sm:grid-cols-\[minmax\(0,1fr\)_120px\]/);
});
