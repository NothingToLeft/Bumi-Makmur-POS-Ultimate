import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  CUSTOMER_TIERS,
  customerTierProgress,
  nextCustomerTier,
  resolveCustomerTier,
  tierBadgeLabel
} from '../src/utils/customerTiers.js';
import { getOfflineCredentialStatus, refreshOfflineCredential } from '../src/services/offlineStore.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('tier pelanggan: batas Bronze, Silver, Gold, Platinum', () => {
  assert.equal(CUSTOMER_TIERS.length, 4);
  assert.equal(resolveCustomerTier(0).id, 'bronze');
  assert.equal(resolveCustomerTier(999).id, 'bronze');
  assert.equal(resolveCustomerTier(1000).id, 'silver');
  assert.equal(resolveCustomerTier(4999).id, 'silver');
  assert.equal(resolveCustomerTier(5000).id, 'gold');
  assert.equal(resolveCustomerTier(14999).id, 'gold');
  assert.equal(resolveCustomerTier(15000).id, 'platinum');
  assert.equal(resolveCustomerTier(999999).id, 'platinum');
});

test('tier pelanggan: input tidak valid dianggap 0 poin, bukan NaN', () => {
  for (const value of [null, undefined, '', 'abc', -50, NaN, Infinity]) {
    assert.equal(resolveCustomerTier(value).id, 'bronze');
  }
});

test('tier pelanggan: nextCustomerTier dan progres menuju tier berikutnya', () => {
  assert.equal(nextCustomerTier(0).id, 'silver');
  assert.equal(nextCustomerTier(1200).id, 'gold');
  assert.equal(nextCustomerTier(20000), null);

  const progress = customerTierProgress(3000);
  assert.equal(progress.current.id, 'silver');
  assert.equal(progress.next.id, 'gold');
  assert.equal(progress.pointsToNext, 2000);
  assert.equal(progress.percent, 50);

  const top = customerTierProgress(20000);
  assert.equal(top.next, null);
  assert.equal(top.percent, 100);
});

test('tier pelanggan: label badge informatif dan tidak kosong', () => {
  assert.match(tierBadgeLabel(1200), /Silver/);
  assert.match(tierBadgeLabel(1200), /Gold/);
  assert.match(tierBadgeLabel(30000), /Platinum/);
  assert.match(tierBadgeLabel(30000), /tertinggi/);
});

test('diagnosa PIN: perangkat tanpa kredensial melaporkan belum terdaftar', async () => {
  const status = await getOfflineCredentialStatus('BUMIMAKMUR', { expectedRole: 'owner' });
  assert.equal(status.hasAnyCredential, false);
  assert.equal(status.hasUsableCredential, false);
  assert.equal(status.expiredCount, 0);
  assert.equal(status.nearestExpiryAt, null);
});

test('diagnosa PIN: refreshOfflineCredential aman tanpa kredensial tersimpan', async () => {
  assert.equal(await refreshOfflineCredential('BUMIMAKMUR', ''), false);
  assert.equal(await refreshOfflineCredential('BUMIMAKMUR', 'USER-TIDAK-ADA'), false);
});

test('login PIN: Pesan dibedakan antara PIN salah, belum terdaftar, dan kedaluwarsa', () => {
  const context = read('src/store/PosContext.jsx');
  assert.match(context, /PIN_CREDENTIAL_EXPIRED/);
  assert.match(context, /PIN_INVALID/);
  assert.match(context, /PIN_NOT_ENROLLED/);
  assert.match(context, /PIN Owner salah\. Periksa kembali 4 digit PIN Anda\./);
  // Kredensial offline diperpanjang setelah login PIN berhasil.
  assert.match(context, /refreshOfflineCredential\(key, profile\.id\)/);
});

test('kredensial offline: TTL diperpanjang saat login dan status dapat dibaca', () => {
  const store = read('src/services/offlineStore.js');
  assert.match(store, /export async function getOfflineCredentialStatus/);
  assert.match(store, /export async function refreshOfflineCredential/);
  assert.match(store, /lastUsedAt/);
});

test('versi metadata konsisten pada package.json, defaults, service worker, dan VERSION.txt', () => {
  const version = read('VERSION.txt').trim();
  assert.equal(JSON.parse(read('package.json')).version, version);
  assert.match(read('src/data/defaults.js'), new RegExp(`APP_VERSION = '${version.replace(/\./g, '\\.')}'`));
  assert.match(read('public/sw.js'), new RegExp(`bumi-makmur-pos-freesync-v${version.replace(/\./g, '\\.')}`));
});
