import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Spark Free Hybrid version and Firebase dependencies are configured', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.version, '4.2.0');
  assert.ok(pkg.dependencies.firebase);
  assert.ok(pkg.scripts['firebase:deploy:free']);
  assert.equal(pkg.scripts['firebase:deploy:backend'], undefined);
});

test('web app shell and IndexedDB cache support offline reload', async () => {
  const main = await read('src/main.jsx');
  const sw = await read('public/sw.js');
  const firebase = await read('src/services/firebase.js');
  assert.match(main, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(sw, /APP_SHELL/);
  assert.match(firebase, /enableMultiTabIndexedDbPersistence/);
  await access(new URL('../public/sw.js', import.meta.url));
});

test('local cache, PBKDF2 PIN and durable mutation queue are present', async () => {
  const offline = await read('src/services/offlineStore.js');
  assert.match(offline, /indexedDB\.open/);
  assert.match(offline, /PBKDF2/);
  assert.match(offline, /enqueuePendingMutation/);
  assert.match(offline, /recoverPendingMutations/);
  assert.match(offline, /OFFLINE_CREDENTIAL_TTL_MS/);
  assert.doesNotMatch(offline, /pin\s*:\s*pin[,}]/);
});

test('first login uses Firebase Email Password and PIN becomes local unlock', async () => {
  const auth = await read('src/services/cloudAuth.js');
  const login = await read('src/screens/LoginScreen.jsx');
  const context = await read('src/store/PosContext.jsx');
  assert.match(auth, /signInWithEmailAndPassword/);
  assert.match(auth, /stores', storeId, 'users'/);
  assert.match(login, /Hubungkan Perangkat/);
  assert.match(login, /Password hanya digunakan Firebase/);
  assert.match(context, /loginWithEmail/);
  assert.match(context, /cacheOfflineCredential/);
  assert.doesNotMatch(auth, /signInWithCustomToken|httpsCallable|getFunctions/);
});

test('direct Firestore mutations are atomic, conflict-aware and idempotent', async () => {
  const store = await read('src/services/cloudStore.js');
  assert.match(store, /runTransaction/);
  assert.match(store, /auditLogs/);
  assert.match(store, /mutationId/);
  assert.match(store, /telah berubah di perangkat lain/);
  assert.match(store, /auditSnapshot\.exists\(\)/);
  assert.doesNotMatch(store, /httpsCallable|firebase\/functions|firebase\/storage/);
});

test('Firestore rules read role profiles from nested store users collection', async () => {
  const rules = await read('firestore.rules');
  assert.match(rules, /stores\/\$\(storeId\)\/users\/\$\(request\.auth\.uid\)/);
  assert.match(rules, /profile\(storeId\)\.role/);
  assert.match(rules, /publicReceipts/);
  assert.match(rules, /allow read, write: if false/);
  assert.doesNotMatch(rules, /request\.auth\.token\.role/);
});

test('Cloud Functions and Cloud Storage project code are removed from active architecture', async () => {
  const firebase = await read('src/services/firebase.js');
  const config = JSON.parse(await read('firebase.json'));
  assert.doesNotMatch(firebase, /getFunctions|getStorage/);
  assert.equal(config.functions, undefined);
  assert.equal(config.storage, undefined);
});


test('Spark Free rules and receipts protect branch data and expiry', async () => {
  const rules = await read('firestore.rules');
  const store = await read('src/services/cloudStore.js');
  assert.match(rules, /data\.get\('branchId', ''\)/);
  assert.match(rules, /request\.resource\.data\.get\('points', 0\) >= 0/);
  assert.match(rules, /request\.time < resource\.data\.expiresAt/);
  assert.match(store, /expiresAt: expiresAtDate/);
  assert.match(store, /createdAt: new Date\(\)/);
});

test('workflows install dependencies without requiring an absent package lock', async () => {
  const build = await read('.github/workflows/build-android.yml');
  const deploy = await read('.github/workflows/deploy-firebase.yml');
  assert.match(build, /npm install --no-audit --no-fund/);
  assert.match(deploy, /npm install --no-audit --no-fund/);
  assert.doesNotMatch(build, /npm ci/);
  assert.doesNotMatch(deploy, /npm ci/);
  assert.doesNotMatch(build, /cache: npm/);
  assert.doesNotMatch(deploy, /cache: npm/);
});

test('employee Auth account is rolled back when Firestore profile creation fails', async () => {
  const auth = await read('src/services/cloudAuth.js');
  assert.match(auth, /deleteUser/);
  assert.match(auth, /Akun Firebase dibatalkan karena profil Firestore gagal dibuat/);
});
