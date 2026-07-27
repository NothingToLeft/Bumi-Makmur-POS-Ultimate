import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v5.1.2 menampilkan tombol sinkronisasi yang tidak kosong', async () => {
  const source = await read('src/screens/DeviceSettingsScreens.jsx');
  assert.match(source, /style=\{\{backgroundColor:'#ffffff',color:'#064e3b'\}\}/);
  assert.match(source, /Sinkronkan Sekarang/);
});

test('Owner dapat mengedit identitas cabang dari aplikasi', async () => {
  const [screen, store] = await Promise.all([read('src/screens/AdminScreens.jsx'), read('src/store/PosContext.jsx')]);
  assert.match(screen, /Edit Cabang/);
  assert.match(screen, /Edit Identitas Cabang/);
  assert.match(store, /const updateBranch = data =>/);
  assert.match(store, /BRANCH_UPDATE/);
});

test('identitas aplikasi mengikuti cabang aktif dan brand dipisahkan', async () => {
  const [app, settings, pos] = await Promise.all([read('src/App.jsx'), read('src/screens/DeviceSettingsScreens.jsx'), read('src/screens/POSScreen.jsx')]);
  assert.match(app, /activeBranch\?\.name\|\|db\.configs\.companyName/);
  assert.match(settings, /Identitas Cabang Aktif/);
  assert.match(settings, /Nama Brand \/ Grup Usaha/);
  assert.match(pos, /receiptDisplayConfig/);
  assert.match(pos, /branch\?\.name \|\| db\.configs\.companyName/);
});
