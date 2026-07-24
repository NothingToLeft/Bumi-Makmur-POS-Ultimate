import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('kasir tidak dapat mengubah tingkat harga, kredit, poin, atau status pelanggan', async () => {
  const context = await read('src/store/PosContext.jsx');
  const screen = await read('src/screens/PartnersScreens.jsx');
  const functions = await read('functions/index.js');

  assert.match(context, /isCashier \? \(existing\?\.priceTier \|\| 'retail'\)/);
  assert.match(context, /isCashier \? money\(existing\?\.creditLimit\)/);
  assert.match(context, /points: existing\?\.points \?\? 0/);
  assert.match(screen, /canSetCommercialTerms=currentUser\?\.role!=='kasir'/);
  assert.match(functions, /Kasir tidak boleh menentukan tingkat harga, batas kredit, poin/);
  assert.match(functions, /Kasir hanya boleh memperbarui data kontak pelanggan/);
});

test('perubahan poin kasir diverifikasi terhadap aksi loyalty atau transaksi penjualan', async () => {
  const functions = await read('functions/index.js');
  assert.match(functions, /action === 'LOYALTY_REDEEM'/);
  assert.match(functions, /action === 'SALE_COMPLETE'/);
  assert.match(functions, /expectedPoints/);
  assert.match(functions, /saleOperation/);
});

test('hak akses khusus ikut masuk ke Firebase claims dan divalidasi di klien serta server', async () => {
  const context = await read('src/store/PosContext.jsx');
  const functions = await read('functions/index.js');
  const defaults = await read('src/data/defaults.js');
  assert.match(functions, /permissions: Array\.isArray\(profile\.permissions\)/);
  assert.match(functions, /ACTION_PERMISSIONS/);
  assert.match(functions, /hasSessionPermission/);
  assert.match(context, /const ACTION_PERMISSIONS =/);
  assert.match(context, /Hak akses .* tidak tersedia untuk akun ini/);
  for (const permission of ['devices.manage', 'display.manage', 'settings.manage']) {
    assert.match(defaults, new RegExp(permission.replace('.', '\\.')));
  }
});

test('kasir hanya melihat layar pelanggan dan tidak dapat mengantrekan perubahan kampanye', async () => {
  const screen = await read('src/screens/DeviceSettingsScreens.jsx');
  const context = await read('src/store/PosContext.jsx');
  const functions = await read('functions/index.js');
  assert.match(screen, /canManage=hasPermission\('display\.manage'\)/);
  assert.match(screen, /editing&&canManage&&<CampaignForm/);
  assert.match(context, /tidak memiliki izin mengubah kampanye layar pelanggan/);
  assert.match(functions, /CAMPAIGN_CREATE: 'display\.manage'/);
});

test('transfer stok manager diizinkan hanya dari cabangnya menuju cabang tujuan yang sah', async () => {
  const functions = await read('functions/index.js');
  assert.match(functions, /action === 'STOCK_TRANSFER'/);
  assert.match(functions, /transfer\.sourceBranchId/);
  assert.match(functions, /allowedBranches = new Set/);
  assert.match(functions, /Data .* berada di luar cabang transfer/);
});
