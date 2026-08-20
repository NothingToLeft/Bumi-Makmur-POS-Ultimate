import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendSyncDiagnostic, normalizeSyncDiagnostics } from '../src/utils/syncDiagnostics.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('diagnostik cloud lama atau korup tidak dapat membuat Cloud & Backup white screen', () => {
  assert.deepEqual(normalizeSyncDiagnostics(null), []);
  assert.deepEqual(normalizeSyncDiagnostics({ diagnostics: [] }), []);
  const normalized = normalizeSyncDiagnostics([null, 'rusak', { category: 'permission', message: 'Missing permission', at: 'invalid' }]);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].category, 'permission');
  assert.ok(normalized[0].id);
  assert.doesNotThrow(() => new Date(normalized[0].at).toISOString());
  const appended = appendSyncDiagnostic({ not: 'array' }, { id: 'X', at: new Date().toISOString(), category: 'network', code: 'x', message: 'x', action: 'retry' });
  assert.equal(appended.length, 1);
});

test('Cloud & Backup menormalisasi diagnostik sebelum render dan App punya error boundary', () => {
  const settings = read('src/screens/DeviceSettingsScreens.jsx');
  const app = read('src/App.jsx');
  assert.match(settings, /const safeDiagnostics=normalizeSyncDiagnostics\(syncDiagnostics\)/);
  assert.match(settings, /safeDiagnostics\.map\(item=>/);
  assert.match(app, /ScreenErrorBoundary/);
  assert.match(app, /Proteksi Tampilan Aktif|components\/ScreenErrorBoundary/);
});

test('karyawan dapat recovery cloud tanpa memperoleh akses Pengaturan', () => {
  const app = read('src/App.jsx');
  const defaults = read('src/data/defaults.js');
  assert.match(app, /Coba Sinkron Lagi/);
  assert.match(app, /Akun karyawan tidak memerlukan akses Pengaturan/);
  assert.match(app, /Unduh Diagnostik/);
  assert.match(app, /exportSyncDiagnostics/);
  assert.doesNotMatch(app, /cloudError[\s\S]{0,800}Kembali ke halaman login/);
  const cashierBlock = defaults.match(/kasir:\s*\[([\s\S]*?)\]\s*\n\};/)?.[1] || '';
  assert.ok(!cashierBlock.includes('settings.view'));
  assert.ok(cashierBlock.includes('display.view'));
});

test('fresh sync dan background recovery melepaskan error permission lama lalu memvalidasi cloud ulang', () => {
  const context = read('src/store/PosContext.jsx');
  assert.match(context, /persistentCloudIssueRef\.current = '';\s*setCloudError\(''\);\s*const result=await flushPendingMutations|persistentCloudIssueRef\.current = '';[\s\S]*setCloudError\(''\);[\s\S]*flushPendingMutations/);
  assert.match(context, /recoveringPersistentIssue/);
  assert.match(context, /startCloudSubscription\(currentUser, \{ initial: false, force: true \}\)/);
  assert.match(context, /filter\(item => !\['permission', 'session'\]\.includes\(item\.category\)\)/);
});

test('kasir tidak mencoba memuat koleksi harga pemasok yang memang rahasia', () => {
  const cloudStore = read('src/services/cloudStore.js');
  const cashierBlock = cloudStore.match(/const CASHIER_COLLECTIONS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
  assert.ok(!cashierBlock.includes('supplierPriceHistory'));
  assert.ok(!cashierBlock.includes('productPriceHistory'));
  assert.ok(cashierBlock.includes('quotations'));
  assert.ok(cashierBlock.includes('serialNumbers'));
  assert.ok(cashierBlock.includes('warrantyClaims'));
});

test('Layar Pelanggan mengirim ulang snapshot setelah popup Web dibuka', () => {
  const bridge = read('src/services/customerDisplayBridge.js');
  const settings = read('src/screens/DeviceSettingsScreens.jsx');
  assert.match(bridge, /openCustomerDisplayWindow\(snapshot = readCustomerDisplaySnapshot\(\)\)/);
  assert.match(bridge, /\[250, 800, 1600\]\.forEach/);
  assert.match(settings, /openCustomerDisplayWindow\(snapshot\)/);
});
