import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findProductByCode, findProductsByCode } from '../src/utils/barcode.js';
import { barcodeForPrint, normalizeBarcodeRows, productBarcodeEntries } from '../src/utils/productBarcodes.js';
import { buildInventoryImportPlan, parseExtraBarcodes } from '../src/utils/inventoryImport.js';
import { buildVariantGroupDraft, groupVariantProducts } from '../src/utils/variantProducts.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const philips10 = {
  id: 'P10', branchId: 'B1', name: 'Philips LED 10W', parentName: 'Philips LED', variantName: '10W', variantGroupId: 'VG-PHI',
  sku: 'BM-PHI-LED-010', factoryBarcode: '8719514345998', internalBarcode: 'BM-PHI-LED-010', barcode: '8719514345998',
  sharedBarcode: '899200000001', baseUnit: 'pcs', active: true, available: true, prices: { retail: 48000 },
  barcodes: [
    { id: 'BC-PACK', type: 'package', code: 'PACK-PHI-10W-12', unit: 'box', factor: 12 },
    { id: 'BC-SUP', type: 'supplier', code: 'SUP-PHI-10W', unit: 'pcs', factor: 1 }
  ],
  conversions: []
};

const philips6 = {
  ...philips10,
  id: 'P6', name: 'Philips LED 6W', variantName: '6W', sku: 'BM-PHI-LED-006',
  factoryBarcode: '8719514345981', internalBarcode: 'BM-PHI-LED-006', barcode: '8719514345981',
  barcodes: [], prices: { retail: 35000 }
};

test('v6.3.1 keeps factory, internal, supplier, package, and shared barcodes distinct', () => {
  const entries = productBarcodeEntries(philips10);
  assert.equal(entries.find(item => item.code === '8719514345998')?.source, 'factoryBarcode');
  assert.equal(entries.find(item => item.code === 'BM-PHI-LED-010')?.source, 'internalBarcode');
  assert.equal(entries.find(item => item.code === 'PACK-PHI-10W-12')?.unit, 'box');
  assert.equal(entries.find(item => item.code === 'PACK-PHI-10W-12')?.factor, 12);
  assert.equal(entries.find(item => item.code === 'SUP-PHI-10W')?.type, 'supplier');
});

test('scanner selects exact variant barcode first and package barcode carries conversion factor', () => {
  const products = [philips6, philips10];
  assert.equal(findProductByCode(products, '8719514345998').product.id, 'P10');
  assert.equal(findProductByCode(products, 'bm-phi-led-010').product.id, 'P10');
  const pack = findProductByCode(products, 'PACK-PHI-10W-12');
  assert.equal(pack.product.id, 'P10');
  assert.equal(pack.options.unit, 'box');
  assert.equal(pack.options.factor, 12);

  const shared = findProductByCode(products, '899200000001');
  assert.equal(shared.ambiguous, true);
  assert.equal(shared.matches.length, 2);
  assert.equal(findProductsByCode(products, '899200000001').length, 2);
});

test('mass label mode can print internal, factory, or automatic barcode per flattened variant SKU', () => {
  assert.equal(barcodeForPrint(philips10, 'internal'), 'BM-PHI-LED-010');
  assert.equal(barcodeForPrint(philips10, 'factory'), '8719514345998');
  assert.equal(barcodeForPrint(philips10, 'auto'), '8719514345998');
  const noFactory = { ...philips10, factoryBarcode: '', barcode: 'BM-PHI-LED-010' };
  assert.equal(barcodeForPrint(noFactory, 'auto'), 'BM-PHI-LED-010');
});

test('extra barcode parser supports package type, unit, and content factor', () => {
  const rows = parseExtraBarcodes('package:PACK-100@pack*100; supplier:SUP-OLD@pcs*1', 'pcs');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    id: 'IMP-BC-1', code: 'PACK-100', type: 'package', unit: 'pack', factor: 100, primary: false, note: ''
  });
  assert.equal(rows[1].type, 'supplier');
});

test('inventory import never uses a shared group barcode as identity for updating a variant', () => {
  const existing = [philips6, philips10];
  const plan = buildInventoryImportPlan([{
    __rowNumber: 2,
    'Nama Produk': 'Philips LED 15W', 'Kategori': 'Lampu & Penerangan', 'SKU': 'BM-PHI-LED-015',
    'Barcode Pabrik': '8719514346001', 'Barcode Internal': 'BM-PHI-LED-015', 'Satuan Dasar': 'pcs',
    'Stok Awal': 5, 'Stok Minimum': 2, 'Harga Modal': 45000, 'Harga Eceran': 57000,
    'Produk Induk': 'Philips LED', 'Nama Varian': '15W', 'Barcode Bersama': '899200000001'
  }], { products: existing, categories: ['Lampu & Penerangan'], branchId: 'B1' });
  assert.equal(plan.errors.length, 0);
  assert.equal(plan.rows[0].action, 'create');
  assert.equal(plan.rows[0].id, '');
});

test('inventory import rejects direct barcode collision with another product shared barcode', () => {
  const plan = buildInventoryImportPlan([{
    __rowNumber: 2,
    'Nama Produk': 'Produk Salah', 'Kategori': 'Lampu & Penerangan', 'SKU': 'NEW-1',
    'Barcode Pabrik': '899200000001', 'Barcode Internal': 'NEW-1', 'Satuan Dasar': 'pcs',
    'Harga Eceran': 10000
  }], { products: [philips6, philips10], categories: ['Lampu & Penerangan'], branchId: 'B1' });
  assert.ok(plan.errors.some(item => /Barcode Bersama|ambigu/i.test(item.message)));
  assert.equal(plan.validRows.length, 0);
});

test('variant group image can live on one child while all variants still resolve one parent image draft', () => {
  const groupImage = { dataUrl: 'data:image/webp;base64,AAAA', sourceType: 'manual', bytes: 3 };
  const children = [
    { ...philips6, groupPosImage: null },
    { ...philips10, groupPosImage: groupImage }
  ];
  const grouped = groupVariantProducts(children);
  assert.equal(grouped[0].posImage?.dataUrl, groupImage.dataUrl);
  const draft = buildVariantGroupDraft(children);
  assert.equal(draft.posImage?.dataUrl, groupImage.dataUrl);
});

test('product editor and cashier UI expose per-variant barcodes, package factors, photo editor, and lightweight fallback', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  const pos = await read('src/screens/POSScreen.jsx');
  const bulk = await read('src/components/BulkBarcodeLabelsModal.jsx');
  const editor = await read('src/components/ProductPosImageEditor.jsx');

  assert.match(products, /Barcode Pabrik \/ EAN/);
  assert.match(products, /Barcode Internal \/ Stiker/);
  assert.match(products, /Barcode Tambahan/);
  assert.match(products, /Foto Kasir/);
  assert.match(products, /sharedAcrossVariants=\{variantRows\.length > 1\}/);
  assert.match(bulk, /Barcode Internal \/ Stiker/);
  assert.match(bulk, /Barcode Pabrik \/ EAN/);
  assert.match(bulk, /Otomatis \(Pabrik → Internal\)/);
  assert.match(pos, /groupPosImages/);
  assert.match(pos, /loading="lazy"/);
  assert.match(editor, /Ambil Foto/);
  assert.match(editor, /Pilih Galeri/);
  assert.match(editor, /Cari Foto Otomatis/);
});

test('Gemini key goes directly to Gemini and never through the Cloudflare product-image helper', async () => {
  const media = await read('src/services/productMedia.js');
  const runtime = await read('src/services/geminiRuntime.js');
  const fn = await read('functions/api/product-image-search.js');
  assert.match(runtime, /generativelanguage\.googleapis\.com/);
  assert.match(media, /tools:\s*\[\{ google_search: \{\} \}\]/);
  assert.match(media, /API key hanya dikirim langsung dari perangkat ke Gemini/);
  assert.doesNotMatch(fn, /generativelanguage\.googleapis\.com|google_search|body\?\.apiKey|x-goog-api-key/);
  assert.match(fn, /safeFetch/);
  assert.match(fn, /isBlockedHostname/);
  assert.match(fn, /MAX_SELECTED_IMAGE_BYTES/);
});

test('cashier thumbnails are size-bounded and Firestore exempts binary-like data URL fields from indexes', async () => {
  const media = await read('src/services/productMedia.js');
  const context = await read('src/store/PosContext.jsx');
  const indexes = JSON.parse(await read('firestore.indexes.json'));
  assert.match(media, /MAX_BYTES = 90000/);
  assert.match(media, /preparePosImageForStorage/);
  assert.match(context, /groupPosImage:\s*rowIndex === 0 \? groupPosImage : null/);
  assert.match(context, /productAllCodes\(item, \{ includeShared: false \}\)/);
  for (const fieldPath of ['posImage.dataUrl', 'groupPosImage.dataUrl']) {
    assert.ok(indexes.fieldOverrides.some(item => item.collectionGroup === 'products' && item.fieldPath === fieldPath && Array.isArray(item.indexes) && item.indexes.length === 0));
  }
});

test('normalized barcode rows deduplicate equivalent codes and preserve package semantics', () => {
  const rows = normalizeBarcodeRows([
    { code: ' PACK-12 ', type: 'package', unit: 'box', factor: 12 },
    { code: 'PACK-12', type: 'alternate', unit: 'pcs', factor: 1 }
  ], { baseUnit: 'pcs' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, 'package');
  assert.equal(rows[0].factor, 12);
});
