import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findProductByCode, findProductsByCode } from '../src/utils/barcode.js';
import { generateVariantSku, groupVariantProducts } from '../src/utils/variantProducts.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const variants = [
  { id: 'P6', branchId: 'B1', name: 'Philips LED 6W', parentName: 'Philips LED', variantName: '6W', variantGroupId: 'VG-PHI', sku: 'BM-PHI-LED-006', barcode: 'BM-PHI-LED-006', sharedBarcode: '899111', active: true, available: true, stock: 4, minStock: 1, prices: { retail: 35000 } },
  { id: 'P10', branchId: 'B1', name: 'Philips LED 10W', parentName: 'Philips LED', variantName: '10W', variantGroupId: 'VG-PHI', sku: 'BM-PHI-LED-010', barcode: 'BM-PHI-LED-010', sharedBarcode: '899111', active: true, available: true, stock: 7, minStock: 1, prices: { retail: 48000 } }
];

test('SKU otomatis varian watt mengikuti format BM-PHI-LED-006 dan tetap unik', () => {
  assert.equal(generateVariantSku('Philips LED', '6W'), 'BM-PHI-LED-006');
  assert.equal(generateVariantSku('Philips LED', '10W'), 'BM-PHI-LED-010');
  assert.equal(generateVariantSku('Philips LED', '10W', ['BM-PHI-LED-010']), 'BM-PHI-LED-010-2');
});

test('barcode kemasan bersama mengembalikan pilihan varian sedangkan barcode internal langsung memilih satu', () => {
  const shared = findProductByCode(variants, '899111');
  assert.equal(shared.ambiguous, true);
  assert.equal(shared.matches.length, 2);
  assert.equal(findProductsByCode(variants, '899111').length, 2);
  assert.equal(findProductByCode(variants, 'bm-phi-led-010').product.id, 'P10');
});

test('produk varian dikelompokkan untuk katalog tetapi tetap SKU stok terpisah', () => {
  const grouped = groupVariantProducts(variants);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].isVariantGroup, true);
  assert.equal(grouped[0].children.length, 2);
  assert.equal(grouped[0].stock, 11);
});

test('UI, penyimpanan, restok, checkout, label, dan laporan memakai model varian SKU terpisah', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  const pos = await read('src/screens/POSScreen.jsx');
  const context = await read('src/store/PosContext.jsx');
  const purchases = await read('src/screens/PurchasesScreen.jsx');
  const label = await read('src/utils/barcodeLabel.js');

  assert.match(products, /Produk Induk \+ Varian Profesional/);
  assert.match(products, /Barcode Kemasan Bersama/);
  assert.match(products, /SKU Otomatis/);
  assert.match(products, /Barcode Internal \/ Stiker/);
  assert.match(products, /Buat Ulang SKU Otomatis/);
  assert.match(pos, /Pilih Varian Produk/);
  assert.match(pos, /Barcode kemasan bersama/);
  assert.match(context, /data\.variantMode === true/);
  assert.match(context, /variantGroupId/);
  assert.match(context, /sharedBarcode/);
  assert.match(context, /Stok awal varian/);
  assert.match(purchases, /selectedProduct\.id/);
  assert.match(label, /CODE39/);
});
