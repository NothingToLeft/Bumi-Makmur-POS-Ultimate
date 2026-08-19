import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSyncStatus, classifySyncError, FIRESTORE_RULESET_VERSION } from '../src/utils/syncDiagnostics.js';

const read = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v6.0.3 menandai permission-denied sebagai masalah rules dan tidak menampilkan cloud sehat palsu', () => {
  const diagnostic = classifySyncError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }, { collection: 'shifts' });
  assert.equal(FIRESTORE_RULESET_VERSION, '6.0.3');
  assert.equal(diagnostic.category, 'permission');
  assert.equal(diagnostic.permanent, true);
  assert.match(diagnostic.action, /Deploy Firebase Spark Rules/);

  for (const state of [
    { cloudReady: true, cloudSaving: true, pendingCount: 22 },
    { cloudReady: true, cloudSaving: false, pendingCount: 22 },
    { cloudReady: true, cloudSaving: false, pendingCount: 0 }
  ]) {
    const status = buildSyncStatus({ online: true, cloudError: 'Firestore Rules belum kompatibel', ...state });
    assert.equal(status.code, 'degraded');
    assert.equal(status.healthy, false);
  }
});

test('Firestore Rules v6.0.3 mencakup seluruh koleksi bisnis yang muncul pada diagnostik', async () => {
  const rules = await read('firestore.rules');
  assert.match(rules, /BUMI_MAKMUR_RULESET_VERSION=6\.0\.3/);
  for (const collection of ['shifts', 'warrantyClaims', 'quotations', 'serialNumbers', 'supplierPriceHistory']) {
    assert.match(rules, new RegExp(`match \\/stores\\/\\{storeId\\}\\/${collection}\\/\\{id\\}`));
  }
  assert.match(rules, /match \/stores\/\{storeId\}\/shifts\/\{id\}[\s\S]*allow create: if activeMember\(storeId\)/);
  assert.match(rules, /match \/stores\/\{storeId\}\/quotations\/\{id\}[\s\S]*allow read: if activeMember\(storeId\)/);
});

test('customer display memakai multi-channel bridge Web dan Electron serta mendeteksi popup diblokir', async () => {
  const [bridge, preload, electron, display, settings, defaults] = await Promise.all([
    read('src/services/customerDisplayBridge.js'),
    read('electron/preload.cjs'),
    read('electron/main.cjs'),
    read('src/screens/DesktopCustomerDisplayScreen.jsx'),
    read('src/screens/DeviceSettingsScreens.jsx'),
    read('src/data/defaults.js')
  ]);
  assert.match(bridge, /localStorage/);
  assert.match(bridge, /BroadcastChannel/);
  assert.match(bridge, /setInterval/);
  assert.match(bridge, /window\.bmDesktop\?\.publishCustomerDisplay/);
  assert.match(bridge, /if \(!popup\)/);
  assert.match(bridge, /popup-blocked/);
  assert.match(preload, /publishCustomerDisplay/);
  assert.match(preload, /onCustomerDisplayUpdate/);
  assert.match(electron, /latestCustomerDisplaySnapshot/);
  assert.match(electron, /bm-desktop:customer-display-update/);
  assert.match(display, /subscribeCustomerDisplaySnapshot/);
  assert.match(settings, /openCustomerDisplayWindow/);
  assert.match(settings, /companyName:db\.configs\.companyName/);
  assert.match(settings, /branchName:activeBranch\?\.name/);
  assert.match(defaults, /'display\.view'/);
});

test('snapshot layar pelanggan mengikuti identitas akun dan cabang aktif setelah pergantian login', async () => {
  const source = await read('src/store/PosContext.jsx');
  assert.match(source, /companyName: db\.configs\.companyName/);
  assert.match(source, /branchName: activeBranch\?\.name/);
  assert.match(source, /currentUser\?\.id, currentUser\?\.role, currentUser\?\.branchId/);
});

test('workflow Firebase tetap Spark-only dan menyediakan deploy rules eksplisit', async () => {
  const [workflow, firebaseJson] = await Promise.all([
    read('.github/workflows/deploy-firebase.yml'),
    read('firebase.json')
  ]);
  assert.match(workflow, /Deploy Firebase Spark Rules/);
  assert.match(workflow, /firestore:rules,firestore:indexes/);
  assert.doesNotMatch(workflow, /functions|storage/);
  assert.match(firebaseJson, /firestore\.rules/);
  assert.doesNotMatch(firebaseJson, /"functions"|"storage"/);
});
