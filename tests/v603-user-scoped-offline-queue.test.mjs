import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearPendingMutations,
  enqueuePendingMutation,
  getOfflineQueueOwnershipStats,
  pendingMutationBelongsToUser,
  readPendingMutations
} from '../src/services/offlineStore.js';
import { readFile } from 'node:fs/promises';

function installLocalStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    clear: () => map.clear()
  };
  return map;
}

test('antrean offline dipisahkan secara logis per user agar Owner tidak mengirim mutasi Karyawan', () => {
  const old = globalThis.localStorage;
  installLocalStorage();
  const store = 'BUMIMAKMUR';
  try {
    enqueuePendingMutation(store, { id: 'SYNC-EMP', userId: 'EMP-1', action: 'SHIFT_START', operations: [{ collectionName: 'shifts', id: 'S1' }] });
    enqueuePendingMutation(store, { id: 'SYNC-OWNER', userId: 'OWNER-1', action: 'SETTING_UPDATE', operations: [{ collectionName: '__settings__', id: 'settings' }] });
    const owner = getOfflineQueueOwnershipStats(store, 'OWNER-1');
    assert.equal(owner.totalCount, 2);
    assert.equal(owner.currentUserCount, 1);
    assert.equal(owner.otherUserCount, 1);
    assert.deepEqual(owner.otherUserIds, ['EMP-1']);
    assert.equal(pendingMutationBelongsToUser(readPendingMutations(store)[0], 'OWNER-1'), false);
    assert.equal(pendingMutationBelongsToUser(readPendingMutations(store)[0], 'EMP-1'), true);
  } finally {
    clearPendingMutations(store);
    globalThis.localStorage = old;
  }
});

test('queue legacy tanpa userId tetap dapat dipulihkan oleh sesi aktif', () => {
  assert.equal(pendingMutationBelongsToUser({ id: 'OLD', operations: [] }, 'OWNER-1'), true);
});

test('PosContext memfilter queue berdasarkan pemilik sebelum persist Firestore', async () => {
  const source = await readFile(new URL('../src/store/PosContext.jsx', import.meta.url), 'utf8');
  const settings = await readFile(new URL('../src/screens/DeviceSettingsScreens.jsx', import.meta.url), 'utf8');
  assert.match(source, /eligibleQueue = queue\.filter\(mutation => pendingMutationBelongsToUser\(mutation, profile\.id\)\)/);
  assert.match(source, /otherUserPendingSyncCount/);
  assert.match(source, /queueOwnership\.currentUserCount === 0/);
  assert.match(source, /setPendingSyncCount\(queueOwnership\.totalCount\)/);
  assert.match(settings, /pembaruan milik akun lain/);
});
