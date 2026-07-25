import test from 'node:test';
import assert from 'node:assert/strict';
import { findProductByCode, isEditableTarget } from '../src/utils/barcode.js';

const products = [{
  id: 'P1', active: true, available: true, sku: 'BM-001', barcode: '8991234567890', prices: { retail: 10000 },
  variants: [{ name: 'Putih', barcode: 'VAR-WHITE', priceDelta: 1000 }],
  conversions: [{ unit: 'box', factor: 12, barcode: 'BOX-001' }]
}];

test('barcode dan SKU cocok tanpa peka huruf besar kecil', () => {
  assert.equal(findProductByCode(products, '8991234567890').product.id, 'P1');
  assert.equal(findProductByCode(products, 'bm-001').product.id, 'P1');
});

test('barcode varian dan konversi membawa opsi yang tepat', () => {
  assert.deepEqual(findProductByCode(products, 'var-white').options, { variant: 'Putih', price: 11000 });
  assert.deepEqual(findProductByCode(products, 'box-001').options, { unit: 'box', price: 120000 });
});

test('produk nonaktif tidak dapat dipindai', () => {
  assert.equal(findProductByCode([{ ...products[0], active: false }], 'BM-001'), null);
});

test('deteksi target input mencegah scanner global mengganggu form', () => {
  assert.equal(isEditableTarget({ tagName: 'INPUT' }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: 'BUTTON' }), false);
});
