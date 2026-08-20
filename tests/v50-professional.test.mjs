import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ASSET_PROFILES, buildCompressionPlan, dataUrlByteLength, formatAssetBytes } from '../src/utils/assetProcessing.js';
import { buildOperationalHealth, buildReorderCsv, computeSuggestedReorder } from '../src/utils/operationsHealth.js';
import { normalizeDbShape } from '../src/utils/dbShape.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('QRIS v5 memakai pipeline adaptif dengan batas aman Firestore', () => {
  assert.equal(ASSET_PROFILES.qris.targetBytes, 330_000);
  assert.equal(ASSET_PROFILES.qris.hardLimitBytes, 420_000);
  assert.equal(ASSET_PROFILES.qris.maxSourceBytes, 24 * 1024 * 1024);
  assert.equal(ASSET_PROFILES.qris.whiteBackground, true);
  const plan = buildCompressionPlan('qris', 4000, 3000);
  assert.ok(plan.length >= 14);
  assert.equal(plan[0].mimeType, 'image/png');
  assert.ok(plan.some(item => item.mimeType === 'image/webp'));
  assert.ok(plan.some(item => item.mode === 'monochrome'));
  assert.equal(dataUrlByteLength('data:image/png;base64,AAAA'), 3);
  assert.equal(formatAssetBytes(1024), '1.0 KB');
});


test('migrasi database lama menambahkan wadah v5 tanpa data demo baru', () => {
  const seed = {
    meta: { version: '5.0.0' },
    configs: { companyName: 'BUMI MAKMUR', reorderMultiplier: 2 },
    categories: ['Listrik'], units: ['pcs'], products: [{ id: 'DEMO' }],
    sales: [], branchPaymentProfiles: [{ id: 'BMP-001' }]
  };
  const legacy = {
    meta: { version: '4.5.1' },
    configs: { companyName: 'TOKO LAMA' },
    categories: ['Air'], units: ['meter'], products: [{ id: 'REAL' }], sales: []
  };
  const result = normalizeDbShape(legacy, seed, '5.0.0');
  assert.equal(result.meta.version, '5.0.0');
  assert.equal(result.configs.companyName, 'TOKO LAMA');
  assert.equal(result.configs.reorderMultiplier, 2);
  assert.deepEqual(result.products.map(item => item.id), ['REAL']);
  assert.deepEqual(result.branchPaymentProfiles, []);
  assert.deepEqual(result.categories, ['Air']);
});

test('saran restock dan operational health menghitung risiko cabang', () => {
  const db = {
    configs: { shiftWarningHours: 12, reorderMultiplier: 2 },
    products: [
      { id: 'A', branchId: 'BR-1', name: 'Kabel', sku: 'KBL', barcode: '111', active: true, trackStock: true, stock: 2, minStock: 10, modalPrice: 8000, prices: { retail: 10000 }, baseUnit: 'meter' },
      { id: 'B', branchId: 'BR-1', name: 'Lampu', sku: 'KBL', barcode: '222', active: true, trackStock: true, stock: 0, minStock: 5, modalPrice: 30000, prices: { retail: 28000 }, baseUnit: 'pcs' }
    ],
    sales: [{ id: 'S1', branchId: 'BR-1', createdAt: '2026-07-26T03:00:00.000Z', total: 100000, refundedTotal: 10000, status: 'PAID' }],
    receivables: [{ id: 'R1', branchId: 'BR-1', balance: 50000, dueDate: '2026-07-20' }],
    payables: [],
    shifts: [{ id: 'SH1', branchId: 'BR-1', status: 'OPEN', startAt: '2026-07-25T00:00:00.000Z' }]
  };
  assert.equal(computeSuggestedReorder(db.products[0], 2), 18);
  const result = buildOperationalHealth(db, 'BR-1', { now: '2026-07-26T10:00:00.000Z' });
  assert.equal(result.lowStock.length, 2);
  assert.equal(result.outOfStock.length, 1);
  assert.equal(result.marginRisk.length, 1);
  assert.equal(result.duplicateCodes.length, 1);
  assert.equal(result.overdueReceivables.length, 1);
  assert.equal(result.staleShifts.length, 1);
  assert.equal(result.salesTodayTotal, 90000);
  assert.ok(result.score < 85);
  assert.match(buildReorderCsv(result.lowStock), /Saran Pesan/);
});

test('v5 menambahkan Pusat Kontrol dan QRIS per cabang untuk Manager', async () => {
  const defaults = await read('src/data/defaults.js');
  const app = await read('src/App.jsx');
  const context = await read('src/store/PosContext.jsx');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  const pos = await read('src/screens/POSScreen.jsx');
  const rules = await read('firestore.rules');
  const sync = await read('src/services/syncEngine.js');
  assert.match(defaults, /id: 'controlCenter'/);
  assert.match(defaults, /'control\.view', 'payments\.manage'/);
  assert.match(app, /ControlCenterScreen/);
  assert.match(context, /saveBranchPaymentProfile/);
  assert.match(context, /Store Manager hanya dapat mengubah QRIS cabangnya sendiri/);
  assert.match(settings, /QRIS Adaptive v3/);
  assert.match(settings, /Simpan Profil Pembayaran Cabang/);
  assert.match(pos, /branchPaymentProfile/);
  assert.match(sync, /branchPaymentProfiles/);
  assert.match(defaults, /updatedBy: 'SYSTEM'/);
  assert.match(rules, /match \/stores\/\{storeId\}\/branchPaymentProfiles\/\{id\}/);
  assert.match(rules, /managerOwnBranch\(storeId, request\.resource\.data\.branchId\)/);
});

test('setup toko tidak tampil pada login normal setelah direktori ditemukan', async () => {
  const login = await read('src/screens/LoginScreen.jsx');
  assert.match(login, /activationModeRequested/);
  assert.match(login, /get\('activate'\) === '1'/);
  assert.match(login, /setupAvailable = Boolean/);
  assert.match(login, /directoryChecked/);
  assert.match(login, /Aktivasi Toko Baru/);
  assert.doesNotMatch(login, /> Setup Toko Pertama Kali</);
});
