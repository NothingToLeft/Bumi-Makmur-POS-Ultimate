import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  deriveEmployeeAuthCredential,
  employeeDirectoryId,
  normalizeEmployeeLoginName
} from '../src/utils/employeeLogin.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('nama login dinormalisasi dan direktori login dipisahkan per cabang', async () => {
  assert.equal(normalizeEmployeeLoginName('  Ándi   Kasir  '), 'andi kasir');
  const pusat = await employeeDirectoryId('bumi-makmur', 'BMP-001', 'Andi Kasir');
  const cabang = await employeeDirectoryId('bumi-makmur', 'BMP-002', 'Andi Kasir');
  assert.notEqual(pusat, cabang);
  assert.equal(pusat, await employeeDirectoryId('bumi-makmur', 'BMP-001', 'andi kasir'));
});

test('PIN menghasilkan identitas Auth aman tanpa menampilkan email kepada karyawan', async () => {
  const first = await deriveEmployeeAuthCredential({ storeId:'bumi-makmur', storeCode:'BUMIMAKMUR', branchId:'BMP-001', loginAlias:'emp-test', pin:'1234' });
  const movedBranch = await deriveEmployeeAuthCredential({ storeId:'bumi-makmur', storeCode:'BUMIMAKMUR', branchId:'BMP-002', loginAlias:'emp-test', pin:'1234' });
  assert.equal(first.email, 'emp-test@employee.bmpos.invalid');
  assert.equal(first.password, movedBranch.password);
  assert.ok(first.password.length > 30);
});

test('Owner dan Store Manager dapat mengelola karyawan sesuai batas cabang', async () => {
  const auth = await read('src/services/cloudAuth.js');
  const defaults = await read('src/data/defaults.js');
  const rules = await read('firestore.rules');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  assert.match(auth, /Store Manager hanya dapat mengelola akun Kasir/);
  assert.match(auth, /deleteCloudEmployee/);
  assert.match(defaults, /employees\.manage/);
  assert.doesNotMatch(defaults.match(/manager:\s*\[([\s\S]*?)\],\s*kasir:/)?.[1] || '', /branches\.manage|settings\.manage/);
  assert.match(rules, /function canManageEmployee/);
  assert.match(rules, /managerOwnBranch/);
  assert.match(rules, /cashierPermissionsSafe/);
  assert.match(settings, /canManageEmployees/);
});

test('daftar cabang login publik aman dan tidak dapat dilisting', async () => {
  const store = await read('src/services/cloudStore.js');
  const rules = await read('firestore.rules');
  const login = await read('src/screens/LoginScreen.jsx');
  assert.match(store, /loadPublicLoginDirectory/);
  assert.match(store, /publishPublicLoginDirectory/);
  assert.match(rules, /match \/stores\/\{storeId\}\/public\/login/);
  assert.match(rules, /allow get: if true/);
  assert.match(rules, /allow list: if false/);
  assert.match(login, /branches\.map/);
});


test('migrasi akun tidak menghapus direktori baru ketika nama dan cabang tetap sama', async () => {
  const auth = await read('src/services/cloudAuth.js');
  assert.match(auth, /previousDirectoryRef\.path !== targetDirectoryRef\.path/);
});

test('konflik lintas perangkat direbase otomatis tanpa dijadikan error permanen', async () => {
  const context = await read('src/store/PosContext.jsx');
  const cloudStore = await read('src/services/cloudStore.js');
  assert.match(context, /refreshOperationsAgainstCloud/);
  assert.match(context, /attempt < 6/);
  assert.match(context, /Konflik lintas perangkat bukan error pengguna/);
  assert.match(context, /setCloudError\(''\)/);
  assert.match(cloudStore, /rebaseOperationAgainstRemoteData/);
});
