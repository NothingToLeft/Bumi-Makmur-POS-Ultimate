import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('splash awal terpisah dari sinkronisasi latar belakang', async () => {
  const app = await read('src/App.jsx');
  const context = await read('src/store/PosContext.jsx');
  assert.match(app, /initializingApp&&!dataReady/);
  assert.doesNotMatch(app, /cloudLoading&&!dataReady/);
  assert.match(context, /withTimeout/);
  assert.match(context, /syncRunRef/);
  assert.match(context, /initial: false, force: true/);
});

test('logo BM premium tersedia untuk web, PWA, Android, dan nota', async () => {
  for (const file of ['public/logo-bm.svg','public/icon.svg','public/icons/icon-192.png','public/icons/icon-512.png','public/icons/maskable-512.png']) {
    await access(new URL(`../${file}`, import.meta.url));
  }
  const defaults = await read('src/data/defaults.js');
  const app = await read('src/App.jsx');
  assert.match(defaults, /receiptLogo: '\/logo-bm\.svg'/);
  assert.match(app, /logo-bm\.svg/);
});

test('nota memakai renderer premium yang sama dan memiliki preview langsung', async () => {
  const share = await read('src/services/receiptShare.js');
  const transactions = await read('src/screens/TransactionsScreen.jsx');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  assert.match(share, /buildReceiptPrintHtml/);
  assert.match(share, /getReceiptLogo/);
  assert.match(transactions, /buildReceiptPrintHtml\(sale,configs\)/);
  assert.match(settings, /Preview Nota Langsung/);
});

test('tipografi dan angka memakai stack sistem yang presisi', async () => {
  const css = await read('src/index.css');
  assert.match(css, /Segoe UI Variable/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.match(css, /shape-rendering: geometricPrecision/);
});

test('instalasi sebelum Firebase siap masih dapat memakai akun lokal aman', async () => {
  const context = await read('src/store/PosContext.jsx');
  assert.match(context, /activateLocalSeed/);
  assert.match(context, /verifySeedUserPin/);
  assert.match(context, /source: 'local-seed'/);
  assert.match(context, /cacheOfflineCredential/);
});
