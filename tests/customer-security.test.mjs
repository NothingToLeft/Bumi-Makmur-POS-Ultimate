import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('kasir tidak dapat mengubah tingkat harga, batas kredit, cabang, atau status pelanggan', async () => {
  const context = await read('src/store/PosContext.jsx');
  const screen = await read('src/screens/PartnersScreens.jsx');
  const rules = await read('firestore.rules');
  assert.match(context, /isCashier \? \(existing\?\.priceTier \|\| 'retail'\)/);
  assert.match(context, /isCashier \? money\(existing\?\.creditLimit\)/);
  assert.match(screen, /canSetCommercialTerms=currentUser\?\.role!=='kasir'/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\[\s*'name', 'phone', 'email', 'address', 'project', 'notes', 'points', 'updatedAt'/);
  assert.match(rules, /request\.resource\.data\.priceTier == 'retail'/);
  assert.match(rules, /request\.resource\.data\.creditLimit == 0/);
});

test('hak akses khusus divalidasi di klien dan profil Firestore', async () => {
  const context = await read('src/store/PosContext.jsx');
  const auth = await read('src/services/cloudAuth.js');
  const defaults = await read('src/data/defaults.js');
  const rules = await read('firestore.rules');
  assert.match(context, /const ACTION_PERMISSIONS =/);
  assert.match(context, /Hak akses .* tidak tersedia untuk akun ini/);
  assert.match(auth, /permissions: Array\.isArray/);
  assert.match(rules, /profile\(storeId\)\.role/);
  for (const permission of ['devices.manage', 'display.manage', 'settings.manage']) {
    assert.match(defaults, new RegExp(permission.replace('.', '\\.')));
  }
});

test('kasir hanya melihat layar pelanggan dan tidak dapat mengubah kampanye', async () => {
  const screen = await read('src/screens/DeviceSettingsScreens.jsx');
  const context = await read('src/store/PosContext.jsx');
  const rules = await read('firestore.rules');
  assert.match(screen, /canManage=hasPermission\('display\.manage'\)/);
  assert.match(screen, /editing&&canManage&&<CampaignForm/);
  assert.match(context, /tidak memiliki izin mengubah kampanye layar pelanggan/);
  assert.match(rules, /match \/stores\/\{storeId\}\/campaigns/);
  assert.match(rules, /allow create, update, delete: if ownerOrManager/);
});

test('stok kasir hanya boleh mengubah jumlah dan updatedAt', async () => {
  const rules = await read('firestore.rules');
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\['stock', 'updatedAt'\]\)/);
  assert.match(rules, /request\.resource\.data\.createdBy == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.userId == request\.auth\.uid/);
});

test('refund kasir membutuhkan dokumen profil approver Owner atau Manager', async () => {
  const rules = await read('firestore.rules');
  const context = await read('src/store/PosContext.jsx');
  assert.match(rules, /function managerApproval/);
  assert.match(rules, /role in \['owner', 'manager'\]/);
  assert.match(rules, /cashier\(storeId\).*managerApproval\(storeId\)/s);
  assert.match(context, /approvedBy = approval\.user\.id/);
});
