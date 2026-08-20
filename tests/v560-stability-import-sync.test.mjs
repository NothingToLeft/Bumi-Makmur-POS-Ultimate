import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildInventoryImportPlan,
  buildInventoryTemplateCsv,
  normalizeInventoryImportRow,
  parseConversions,
  parseCsvText,
  rowsToObjects
} from '../src/utils/inventoryImport.js';
import { buildSyncStatus, classifySyncError, summarizePendingMutations } from '../src/utils/syncDiagnostics.js';
import { validateBackupPayload } from '../src/utils/backupValidation.js';

const source = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('template impor CSV memuat produk, stok, harga kemasan, dan varian', () => {
  const csv = buildInventoryTemplateCsv();
  assert.match(csv, /Konversi & Harga Kemasan/);
  assert.match(csv, /pack=100@45000\|42000\|40000/);
  assert.match(csv, /Philips LED 6W/);
  const rows = rowsToObjects(parseCsvText(csv));
  assert.equal(rows.length >= 4, true);
});

test('impor kabel dan kabel ties menjaga satuan dasar serta harga kemasan khusus', () => {
  const cable = normalizeInventoryImportRow({
    __rowNumber: 2, 'Nama Produk': 'Kabel NYM 2x2,5', Kategori: 'Kabel', 'Satuan Dasar': 'meter',
    'Stok Awal': '100', 'Harga Modal': '3.000', 'Harga Eceran': '3.900', 'Jual Pecahan': 'Ya',
    'Kelipatan Jual': '0,5', 'Konversi & Harga Kemasan': 'roll=50@185000|180000|175000'
  });
  assert.equal(cable.baseUnit, 'meter');
  assert.equal(cable.quantityStep, 0.5);
  assert.equal(cable.conversions[0].factor, 50);
  assert.equal(cable.conversions[0].prices.retail, 185000);
  const ties = parseConversions('pack=100@45000|42000|40000', 'pcs')[0];
  assert.deepEqual([ties.unit, ties.factor, ties.prices.retail], ['pack', 100, 45000]);
});

test('rencana impor membuat kategori baru, memperbarui SKU lama, dan menolak duplikat', () => {
  const rows = [
    { __rowNumber: 2, 'Nama Produk': 'Philips LED 6W', Kategori: 'Lampu', SKU: 'BM-PHI-LED-006', Barcode: 'A1', 'Harga Eceran': 35000 },
    { __rowNumber: 3, 'Nama Produk': 'Philips LED 10W', Kategori: 'Lampu', SKU: 'BM-PHI-LED-010', Barcode: 'A2', 'Harga Eceran': 48000 },
    { __rowNumber: 4, 'Nama Produk': 'Duplikat', Kategori: 'Lampu', SKU: 'BM-PHI-LED-010', Barcode: 'A3', 'Harga Eceran': 50000 }
  ];
  const plan = buildInventoryImportPlan(rows, {
    products: [{ id: 'P1', branchId: 'B1', sku: 'BM-PHI-LED-006', barcode: 'A1', name: 'Philips LED 6W' }],
    categories: ['Listrik'], branchId: 'B1'
  });
  assert.equal(plan.updateCount, 1);
  assert.equal(plan.createCount, 1);
  assert.deepEqual(plan.categoriesToCreate, ['Lampu']);
  assert.equal(plan.errors.length > 0, true);
});

test('status sinkron membedakan offline, antrean, sesi salah, dan tersinkron', () => {
  assert.equal(buildSyncStatus({ online: false, pendingCount: 2 }).code, 'offline');
  assert.equal(buildSyncStatus({ online: true, pendingCount: 2 }).code, 'queued');
  assert.equal(buildSyncStatus({ online: true, authMatched: false }).code, 'session-mismatch');
  assert.equal(buildSyncStatus({ online: true, cloudReady: true }).code, 'synced');
  const permission = classifySyncError({ code: 'permission-denied', message: 'Missing or insufficient permissions' }, { collection: 'products' });
  assert.equal(permission.category, 'permission');
  assert.equal(permission.permanent, true);
});

test('ringkasan antrean menjelaskan operasi dan koleksi yang tertunda', () => {
  const summary = summarizePendingMutations([{ action: 'INVENTORY_IMPORT', createdAt: '2026-07-28T00:00:00Z', operations: [{ collectionName: 'products' }, { collectionName: 'stockMovements' }] }]);
  assert.equal(summary.count, 1);
  assert.equal(summary.operations, 2);
  assert.equal(summary.byCollection.products, 1);
});

test('restore backup memvalidasi struktur sebelum mengganti cloud', () => {
  const valid = validateBackupPayload({
    meta: { version: '5.7.0' }, configs: {}, branches: [], users: [], products: [], sales: [], purchases: [], stockMovements: []
  });
  assert.equal(valid.valid, true);
  const invalid = validateBackupPayload({ meta: {}, configs: {}, branches: [] });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join(' '), /products/);
});

test('UI v5.6 menyediakan impor, label massal, diagnostik, preview backup, dan riwayat harga', async () => {
  const [products, importModal, labels, settings, context] = await Promise.all([
    source('src/screens/ProductsScreen.jsx'), source('src/components/InventoryImportModal.jsx'),
    source('src/components/BulkBarcodeLabelsModal.jsx'), source('src/screens/DeviceSettingsScreens.jsx'),
    source('src/store/PosContext.jsx')
  ]);
  assert.match(products, /Impor Excel\/CSV/);
  assert.match(products, /Label Massal/);
  assert.match(importModal, /Template Excel/);
  assert.match(labels, /Cetak Label Barcode Massal/);
  assert.match(settings, /Diagnostik Sinkronisasi/);
  assert.match(settings, /Preview Restore Backup/);
  assert.match(context, /productPriceHistory/);
});

test('diskon besar memakai approval PIN dan PO/restok mempunyai alur terpisah', async () => {
  const [pos, context, purchases] = await Promise.all([
    source('src/screens/POSScreen.jsx'), source('src/store/PosContext.jsx'), source('src/screens/PurchasesScreen.jsx')
  ]);
  assert.match(pos, /Persetujuan Diskon/);
  assert.match(pos, /authorizeManagerPin\(pin, discountApproval\.purpose \|\| 'SALE_DISCOUNT'\)/);
  assert.match(pos, /SALE_BELOW_COST/);
  assert.match(context, /cashierMaxDiscountPercent/);
  assert.match(context, /approvalRequests\.unshift/);
  assert.match(purchases, /Buat PO/);
  assert.match(purchases, /Terima Barang/);
});

test('Firestore Rules membatasi riwayat harga, approval, PO, dan sesi perangkat', async () => {
  const rules = await source('firestore.rules');
  assert.match(rules, /productPriceHistory/);
  assert.match(rules, /allow update, delete: if false/);
  assert.match(rules, /approvalRequests/);
  assert.match(rules, /purchaseOrders/);
  assert.match(rules, /deviceSessions/);
});

test('closing harian dapat dicetak dan workflow rilis memakai versi 6.0.3', async () => {
  const [shift, android, windows] = await Promise.all([
    source('src/screens/ShiftFinanceScreens.jsx'), source('.github/workflows/build-android.yml'), source('.github/workflows/build-windows.yml')
  ]);
  assert.match(shift, /LAPORAN CLOSING SHIFT/);
  assert.match(shift, /Cetak laporan closing/);
  assert.match(android, /6\.1\.1/);
  assert.match(windows, /6\.1\.1/);
});
