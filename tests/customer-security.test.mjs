import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('kasir tidak dapat mengubah tingkat harga, kredit, cabang, atau status pelanggan secara manual', async () => {
  const context = await read('src/store/PosContext.jsx');
  const screen = await read('src/screens/PartnersScreens.jsx');
  assert.match(context, /isCashier \? \(existing\?\.priceTier \|\| 'retail'\)/);
  assert.match(context, /isCashier \? money\(existing\?\.creditLimit\)/);
  assert.match(context, /points: existing\?\.points \?\? 0/);
  assert.match(screen, /canSetCommercialTerms=currentUser\?\.role!=='kasir'/);
});

test('role permissions remain validated in domain logic and Firestore rules', async () => {
  const context = await read('src/store/PosContext.jsx');
  const rules = await read('firestore.rules');
  const defaults = await read('src/data/defaults.js');
  assert.match(context, /const ACTION_PERMISSIONS =/);
  assert.match(context, /Hak akses .* tidak tersedia untuk akun ini/);
  assert.match(rules, /function owner\(storeId\)/);
  assert.match(rules, /function manager\(storeId\)/);
  assert.match(rules, /function branchAllowed\(storeId, data\)/);
  for (const permission of ['devices.manage', 'display.manage', 'settings.manage']) {
    assert.match(defaults, new RegExp(permission.replace('.', '\\.')));
  }
});

test('employee creation uses a secondary Firebase Auth app without replacing Owner session', async () => {
  const auth = await read('src/services/cloudAuth.js');
  const context = await read('src/store/PosContext.jsx');
  const screen = await read('src/screens/AdminScreens.jsx');
  assert.match(auth, /createUserWithEmailAndPassword/);
  assert.match(auth, /secondaryApp/);
  assert.match(auth, /deleteApp/);
  assert.match(context, /Hanya Owner yang boleh mengelola akun karyawan/);
  assert.match(screen, /Email Firebase/);
  assert.match(screen, /Password Awal/);
});

test('manager approval uses encrypted PIN cache and works offline', async () => {
  const context = await read('src/store/PosContext.jsx');
  assert.match(context, /verifyOfflinePin\(storeCode, pin\)/);
  assert.match(context, /\['owner', 'manager'\]\.includes\(profile\.role\)/);
  assert.doesNotMatch(context, /Approval Manager.*memerlukan koneksi internet/);
});
