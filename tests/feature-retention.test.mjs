import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const expectedModules = [
  'dashboard', 'pos', 'openBills', 'transactions', 'products', 'promotions', 'inventory',
  'purchases', 'suppliers', 'customers', 'shifts', 'finance', 'reports', 'orders',
  'branches', 'devices', 'customerDisplay', 'settings'
];

const expectedScreens = [
  'AdminScreens.jsx', 'DashboardScreen.jsx', 'DeviceSettingsScreens.jsx', 'InventoryScreen.jsx',
  'LoginScreen.jsx', 'OpenBillsScreen.jsx', 'OrdersScreen.jsx', 'POSScreen.jsx',
  'PartnersScreens.jsx', 'ProductsScreen.jsx', 'PromotionsScreen.jsx', 'PublicReceiptScreen.jsx',
  'PurchasesScreen.jsx', 'ReportsScreen.jsx', 'ShiftFinanceScreens.jsx', 'TransactionsScreen.jsx'
];

test('seluruh modul operasional utama tetap tersedia setelah migrasi hybrid', async () => {
  const defaults = await read('src/data/defaults.js');
  for (const id of expectedModules) assert.match(defaults, new RegExp(`id: '${id}'`), `modul ${id} hilang`);
  for (const screen of expectedScreens) await access(new URL(`../src/screens/${screen}`, import.meta.url));
});

test('fitur premium kasir, stok, nota digital, printer, dan Android tetap dipertahankan', async () => {
  const context = await read('src/store/PosContext.jsx');
  const receipt = await read('src/services/receiptShare.js');
  const android = await read('scripts/prepare-android.mjs');
  const defaults = await read('src/data/defaults.js');

  for (const action of [
    'SALE_COMPLETE', 'SALE_REFUND', 'SALE_VOID', 'PURCHASE_CREATE', 'PURCHASE_RETURN',
    'STOCK_TRANSFER', 'STOCK_OPNAME', 'RECEIVABLE_PAYMENT', 'PAYABLE_PAYMENT', 'SHIFT_START', 'SHIFT_END'
  ]) assert.match(context, new RegExp(action));

  for (const key of ['whatsappReceiptEnabled', 'receiptShowLogo', 'qrisImage', 'paymentMethods']) {
    assert.match(defaults, new RegExp(`${key}`));
  }
  assert.match(receipt, /WhatsApp/i);
  assert.match(android, /android\.permission\.CAMERA/);
  assert.match(android, /android\.permission\.USE_BIOMETRIC/);
});



test('pengelolaan karyawan tersedia langsung di Pengaturan Owner', async () => {
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  const admin = await read('src/screens/AdminScreens.jsx');
  const login = await read('src/screens/LoginScreen.jsx');
  assert.match(settings, /EmployeeManagementPanel/);
  assert.match(settings, /\['employees','Karyawan'\]/);
  assert.match(admin, /Karyawan & Hak Akses/);
  assert.match(admin, /export function EmployeeManagementPanel/);
  assert.match(login, /Login Owner/);
  assert.match(login, /Login Karyawan/);
});

test('seluruh koleksi cloud memiliki wadah data pada seed database', async () => {
  const defaults = await read('src/data/defaults.js');
  const sync = await read('src/services/syncEngine.js');
  const collectionBlock = sync.match(/CLOUD_ENTITY_COLLECTIONS\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
  const collections = [...collectionBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.ok(collections.length >= 20);
  for (const name of collections) {
    assert.match(defaults, new RegExp(`\\b${name}\\s*:`), `seed database tidak memiliki ${name}`);
  }
});
