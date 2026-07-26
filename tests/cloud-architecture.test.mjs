import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v4.5 memakai Firebase Spark Auth dan Firestore tanpa layanan berbayar', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const firebase = await read('src/services/firebase.js');
  const firebaseJson = JSON.parse(await read('firebase.json'));
  assert.equal(pkg.version, '4.5.1');
  assert.ok(pkg.dependencies.firebase);
  assert.match(firebase, /persistentLocalCache/);
  assert.match(firebase, /persistentMultipleTabManager/);
  assert.deepEqual(Object.keys(firebaseJson).sort(), ['firestore']);
  await assert.rejects(access(new URL('../functions', import.meta.url)));
  await assert.rejects(access(new URL('../storage.rules', import.meta.url)));
});

test('web app shell mendukung reload offline tanpa memaksa splash atau reload berulang', async () => {
  const main = await read('src/main.jsx');
  const sw = await read('public/sw.js');
  assert.match(main, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(sw, /freesync-v4\.5\.1/);
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /stale-while-revalidate/i);
  assert.doesNotMatch(sw, /location\.reload/);
});

test('cache lokal, PIN aman, kredensial cloud terenkripsi, dan queue tahan restart tersedia', async () => {
  const offline = await read('src/services/offlineStore.js');
  assert.match(offline, /indexedDB\.open/);
  assert.match(offline, /PBKDF2/);
  assert.match(offline, /AES-GCM/);
  assert.match(offline, /encryptCloudCredential/);
  assert.match(offline, /enqueuePendingMutations/);
  assert.match(offline, /recoverPendingMutations/);
  assert.match(offline, /databaseWriteChains/);
  assert.doesNotMatch(offline, /localStorage\.setItem\([^\n]*password/);
});

test('operasi offline tidak diblokir dan reconnect menjalankan background sync bertahap', async () => {
  const app = await read('src/App.jsx');
  const context = await read('src/store/PosContext.jsx');
  assert.match(app, /Mode offline/);
  assert.match(context, /enqueuePendingMutation/);
  assert.match(context, /flushPendingMutations/);
  assert.match(context, /runBackgroundSync/);
  assert.match(context, /Math\.min\(300000/);
  assert.match(context, /initial: false, force: true/);
  assert.match(context, /verifyOfflineLogin/);
  assert.match(context, /operations\.slice\(index, index \+ 200\)/);
});

test('mutasi Firestore langsung bersifat atomik, idempotent, dan conflict-aware', async () => {
  const store = await read('src/services/cloudStore.js');
  assert.match(store, /runTransaction/);
  assert.match(store, /mutationReceipts/);
  assert.match(store, /receiptSnapshot\.exists\(\)/);
  assert.match(store, /telah berubah di perangkat lain/);
  assert.match(store, /rebaseOperationsAgainstRemote/);
  assert.doesNotMatch(store, /httpsCallable|firebase\/functions/);
});

test('login cloud, bootstrap, nama + PIN karyawan, dan hapus akun berjalan tanpa Cloud Functions', async () => {
  const auth = await read('src/services/cloudAuth.js');
  for (const token of ['signInWithEmailAndPassword', 'createUserWithEmailAndPassword', 'updatePassword', 'deleteUser', 'runTransaction']) {
    assert.match(auth, new RegExp(token));
  }
  assert.match(auth, /connectEmployeeWithNamePin/);
  assert.match(auth, /employeeLoginDirectory/);
  assert.match(auth, /secondaryApp/);
  assert.doesNotMatch(auth, /sendPasswordResetEmail|httpsCallable|firebase\/functions/);
});

test('logo dan QRIS dikompres lokal, bukan diunggah ke Firebase Storage', async () => {
  const store = await read('src/services/cloudStore.js');
  assert.match(store, /canvas\.toDataURL/);
  assert.match(store, /450_000/);
  assert.match(store, /180_000/);
  assert.doesNotMatch(store, /getStorage|uploadBytes|firebase\/storage/);
});

test('nota online disimpan sebagai dokumen publik tersanitasi di Firestore', async () => {
  const store = await read('src/services/cloudStore.js');
  const rules = await read('firestore.rules');
  assert.match(store, /sanitizeReceiptSale/);
  assert.match(store, /publicReceipts/);
  assert.match(store, /store\s*=\s*\{/);
  assert.match(rules, /match \/publicReceipts\/\{token\}/);
  assert.match(rules, /allow get:/);
  assert.match(rules, /allow list: if false/);
  assert.match(rules, /hasOnly\(\['token', 'storeId', 'active', 'expiresAt', 'createdAt', 'sale', 'store'\]\)/);
  assert.doesNotMatch(store, /modalPrice|costPrice|hpp/);
});


test('profil karyawan dibatasi per cabang dan sesi sinkron harus cocok dengan pengguna aktif', async () => {
  const store = await read('src/services/cloudStore.js');
  const context = await read('src/store/PosContext.jsx');
  const rules = await read('firestore.rules');
  assert.doesNotMatch(store, /GLOBAL_COLLECTIONS = new Set\(\['branches', 'users'/);
  assert.match(rules, /manager\(storeId\) && resource\.data\.branchId == profile\(storeId\)\.branchId/);
  assert.match(context, /auth\.currentUser\.uid !== profile\.id/);
  assert.match(context, /Hubungkan ulang akun cloud sebelum sinkronisasi/);
});

test('transfer stok Manager hanya boleh dikirim dari cabang yang ditugaskan', async () => {
  const rules = await read('firestore.rules');
  assert.match(rules, /request\.resource\.data\.sourceBranchId == profile\(storeId\)\.branchId/);
  assert.match(rules, /request\.resource\.data\.destinationBranchId != profile\(storeId\)\.branchId/);
  assert.match(rules, /Manager tidak bisa/);
});
