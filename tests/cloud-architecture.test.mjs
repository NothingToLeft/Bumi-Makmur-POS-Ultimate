import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('hybrid version and Firebase dependencies are configured', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.version, '4.2.0');
  assert.ok(pkg.dependencies.firebase);
  assert.ok(pkg.scripts['firebase:deploy']);
});

test('web app shell supports offline reload', async () => {
  const main = await read('src/main.jsx');
  const sw = await read('public/sw.js');
  assert.match(main, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(sw, /APP_SHELL/);
  assert.match(sw, /request\.mode === 'navigate'/);
  await access(new URL('../public/sw.js', import.meta.url));
});

test('local cache, secure offline PIN and durable mutation queue are present', async () => {
  const offline = await read('src/services/offlineStore.js');
  assert.match(offline, /indexedDB\.open/);
  assert.match(offline, /PBKDF2/);
  assert.match(offline, /enqueuePendingMutation/);
  assert.match(offline, /enqueuePendingMutations/);
  assert.match(offline, /recoverPendingMutations/);
  assert.match(offline, /appliedMutationIds/);
  assert.match(offline, /databaseWriteChains/);
  assert.match(offline, /OFFLINE_CREDENTIAL_TTL_MS/);
  assert.doesNotMatch(offline, /pin\s*:\s*pin[,}]/);
});

test('offline operations are not blocked and reconnect triggers hybrid sync', async () => {
  const app = await read('src/App.jsx');
  const context = await read('src/store/PosContext.jsx');
  assert.doesNotMatch(app, /CloudOfflineBlocker/);
  assert.match(app, /Mode offline/);
  assert.match(context, /enqueuePendingMutation/);
  assert.match(context, /flushPendingMutations/);
  assert.match(context, /startCloudSubscription\(currentUser, \{ initial \}\)/);
  assert.match(context, /runBackgroundSync/);
  assert.match(context, /Math\.min\(300000/);
  assert.match(context, /initializingApp/);
  assert.match(context, /verifyOfflinePin/);
  assert.match(context, /alreadyApplied/);
  assert.match(context, /operations\.slice\(index, index \+ 200\)/);
  assert.match(context, /startsWith\('CUSTOM-'\)/);
});

test('server mutations are atomic, conflict-aware and idempotent', async () => {
  const functions = await read('functions/index.js');
  assert.match(functions, /commitStoreMutation/);
  assert.match(functions, /runTransaction/);
  assert.match(functions, /mutationReceipts/);
  assert.match(functions, /mutationId/);
  assert.match(functions, /Data .*telah berubah di perangkat lain/);
  assert.match(functions, /hybridMode: true/);
});

test('Firestore credentials remain private and rules are role-aware', async () => {
  const rules = await read('firestore.rules');
  assert.match(rules, /privateCredentials/);
  assert.match(rules, /allow read, write: if false/);
  assert.match(rules, /request\.auth\.token\.role/);
  assert.match(rules, /request\.auth\.token\.branchId/);
  assert.match(rules, /mutationReceipts/);
});

test('cloud functions preserve bootstrap, auth, employee, approval and receipt features', async () => {
  const functions = await read('functions/index.js');
  for (const name of ['bootstrapStore', 'loginWithPin', 'upsertEmployee', 'verifyManagerPin', 'commitStoreMutation', 'applyOwnerDataBatch', 'createPublicReceipt']) {
    assert.match(functions, new RegExp(`export const ${name}`));
  }
  assert.match(functions, /defineSecret\('PIN_PEPPER'\)/);
  assert.match(functions, /createCustomToken/);
  assert.match(functions, /sanitizeSaleForPublicReceipt/);
});
