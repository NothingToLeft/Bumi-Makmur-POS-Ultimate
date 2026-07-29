import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { appendSyncDiagnostic, buildSyncStatus } from '../src/utils/syncDiagnostics.js';

const source = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Desktop memakai Firebase Auth persistence eksplisit tanpa memindahkan penyimpanan perangkat', async () => {
  const [firebase, electron] = await Promise.all([
    source('src/services/firebase.js'),
    source('electron/main.cjs')
  ]);
  assert.match(firebase, /initializeAuth/);
  assert.match(firebase, /indexedDBLocalPersistence/);
  assert.match(firebase, /browserLocalPersistence/);
  assert.match(firebase, /authStateReady/);
  assert.doesNotMatch(electron, /persist:bmpos-main/);
  assert.match(electron, /session\.defaultSession/);
});

test('koleksi tambahan tidak mematikan sinkronisasi inti dan diagnostik membawa nama koleksi', async () => {
  const [cloudStore, context] = await Promise.all([
    source('src/services/cloudStore.js'),
    source('src/store/PosContext.jsx')
  ]);
  assert.match(cloudStore, /OPTIONAL_SYNC_COLLECTIONS/);
  assert.match(cloudStore, /purchaseOrders/);
  assert.match(cloudStore, /options\.onCollectionError/);
  assert.match(cloudStore, /collectionName: name/);
  assert.match(context, /context\.optional/);
  assert.match(context, /collection: context\.collectionName/);
});

test('status tersinkron mengalahkan error lama dan diagnostik identik digabung', () => {
  const status = buildSyncStatus({
    online: true,
    cloudReady: true,
    cloudError: 'Error lama',
    pendingCount: 0,
    lastSuccessAt: '2026-07-29T03:55:15.528Z'
  });
  assert.equal(status.code, 'synced');

  const entry = {
    id: 'A', at: '2026-07-29T00:00:00.000Z', category: 'permission',
    code: 'permission-denied', mutationAction: 'REALTIME_LISTENER',
    collection: 'purchaseOrders', entityId: '', branchId: 'BM001'
  };
  const first = appendSyncDiagnostic([], entry);
  const second = appendSyncDiagnostic(first, { ...entry, id: 'B', at: '2026-07-29T00:01:00.000Z' });
  assert.equal(second.length, 1);
  assert.equal(second[0].occurrences, 2);
});
