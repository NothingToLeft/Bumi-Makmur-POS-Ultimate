import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { IDR_DENOMINATIONS, sumDenominations, countDenominationPieces, normalizeDenominationCount } from '../src/utils/cashDenominations.js';
import { csvCell, toCsv, buildTransactionsCsv } from '../src/utils/csvExport.js';
import { buildSalesInsights } from '../src/utils/salesInsights.js';
import { rankCommands, MODULE_KEYWORDS } from '../src/utils/commandPalette.js';

// defaults.js mengimpor lucide-react; baca id/label/group dari source agar tes tidak bergantung pada node_modules.
const defaultsSource = fs.readFileSync(new URL('../src/data/defaults.js', import.meta.url), 'utf8');
const MODULES = [...defaultsSource.matchAll(/\{ id: '([A-Za-z]+)', label: '([^']+)', icon: \w+, permission: '[^']+', group: '([^']+)' \}/g)]
  .map(([, id, label, group]) => ({ id, label, group }));

test('hitung pecahan: total, jumlah lembar, dan input tidak valid diabaikan', () => {
  assert.equal(sumDenominations({ 100000: 2, 50000: 1, 2000: 3, 500: 4 }), 258000);
  assert.equal(sumDenominations({ 100000: -5, 50000: 'abc', 20000: 1.9 }), 20000);
  assert.equal(sumDenominations({ 12345: 9 }), 0);
  assert.equal(countDenominationPieces({ 100000: 2, 1000: 5 }), 7);
  assert.equal(normalizeDenominationCount(null), 0);
  assert.ok(IDR_DENOMINATIONS.every((value, index, list) => index === 0 || list[index - 1] > value));
});

test('csvCell menetralkan formula injection dan mengutip karakter khusus', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('+62812'), "'+62812");
  assert.equal(csvCell('@cmd'), "'@cmd");
  assert.equal(csvCell(-5000), '-5000');
  assert.equal(csvCell('Budi, Toko'), '"Budi, Toko"');
  assert.equal(csvCell(null), '');
  assert.ok(toCsv([['a', 'b']]).startsWith('\uFEFF'));
});

test('ekspor transaksi: kolom, neto setelah refund, dan nama pelanggan berbahaya aman', () => {
  const csv = buildTransactionsCsv([{
    id: 'INV-1', createdAt: new Date(2026, 9, 11, 9, 5, 0).toISOString(), status: 'PARTIAL_REFUND',
    customerName: '=cmd|calc', subtotal: 100000, tax: 11000, total: 111000, refundedTotal: 20000,
    items: [{ itemDiscount: 5000 }], payments: [{ name: 'Tunai', amount: 120000 }, { name: 'QRIS', amount: 0 }], change: 9000
  }], { cashierName: () => 'Sari' });
  const [header, row] = csv.replace('\uFEFF', '').split('\r\n');
  assert.match(header, /^Invoice,Tanggal,Status,Kasir/);
  assert.match(row, /^INV-1,2026-10-11 09:05:00,PARTIAL_REFUND,Sari,'=cmd\|calc,/);
  assert.match(row, /,111000,20000,91000,Tunai: 120000,9000$/);
  assert.doesNotMatch(row, /QRIS/);
});

const at = (day, hour, extra = {}) => ({
  id: `S-${day}-${hour}-${Math.random()}`, createdAt: new Date(2026, 9, day, hour, 0, 0).toISOString(),
  status: 'COMPLETED', total: 100000, refundedTotal: 0, change: 0,
  items: [{ lineId: 'L', productId: 'P1', name: 'Lampu', qty: 1, price: 100000, itemDiscount: 0, modalPrice: 60000 }],
  payments: [{ type: 'cash', name: 'Tunai', amount: 100000 }], ...extra
});

test('wawasan penjualan: tren 7 hari, VOID dikeluarkan, refund mengurangi omzet', () => {
  const now = new Date(2026, 9, 11, 18, 0, 0);
  const sales = [
    at(11, 10), at(11, 10), at(11, 14, { total: 50000, refundedTotal: 20000, payments: [{ type: 'transfer', name: 'Transfer', amount: 50000 }] }),
    at(10, 9), at(10, 9, { status: 'VOIDED' }), at(9, 10), at(1, 9)
  ];
  const result = buildSalesInsights(sales, [], { now });
  assert.equal(result.days.length, 7);
  assert.equal(result.days.at(-1).revenue, 230000);
  assert.equal(result.days.at(-1).count, 3);
  assert.equal(result.days.at(-2).revenue, 100000);
  assert.equal(result.todayVsYesterday, 130);
  assert.equal(result.periodRevenue, 430000);
  assert.equal(result.peakHours[0].hour, 10);
  assert.equal(result.topProducts[0].name, 'Lampu');
  assert.ok(result.paymentMix.find(row => row.name === 'Tunai').share > 0);
  assert.equal(result.paymentMix.reduce((sum, row) => sum + row.share, 0) >= 99, true);
});

test('wawasan penjualan aman untuk data kosong', () => {
  const result = buildSalesInsights([], [], { now: new Date(2026, 9, 11) });
  assert.equal(result.periodRevenue, 0);
  assert.equal(result.todayVsYesterday, null);
  assert.equal(result.bestDay, null);
  assert.deepEqual(result.peakHours, []);
});

test('daftar modul terbaca dari source', () => { assert.ok(MODULES.length >= 19); });

test('command palette: urutan, kata kunci, dan tanpa hasil', () => {
  const items = MODULES.map(module => ({ id: module.id, label: module.label, group: module.group, keywords: MODULE_KEYWORDS[module.id] || '' }));
  assert.equal(rankCommands(items, 'kasir')[0].id, 'pos');
  assert.equal(rankCommands(items, 'refund')[0].id, 'transactions');
  assert.equal(rankCommands(items, 'closing')[0].id, 'shifts');
  assert.equal(rankCommands(items, 'stok')[0].id, 'products');
  assert.equal(rankCommands(items, 'xyzqq').length, 0);
  assert.equal(rankCommands(items, '').length, items.length);
  assert.equal(rankCommands(items, 'LAPORAN')[0].id, 'reports');
});

test('setiap modul punya kata kunci dan fitur baru terpasang di layar terkait', () => {
  for (const module of MODULES) assert.ok(MODULE_KEYWORDS[module.id], `kata kunci ${module.id}`);
  const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  assert.match(read('src/App.jsx'), /CommandPalette/);
  assert.match(read('src/App.jsx'), /ctrlKey\|\|event\.metaKey/);
  assert.match(read('src/screens/DashboardScreen.jsx'), /SalesInsightsPanel/);
  assert.match(read('src/screens/ShiftFinanceScreens.jsx'), /CashCounter/);
  assert.match(read('src/screens/TransactionsScreen.jsx'), /buildTransactionsCsv/);
  // fitur lama tetap ada
  assert.match(read('src/screens/POSScreen.jsx'), /event\.key === 'F4'/);
  assert.match(read('src/screens/ReportsScreen.jsx'), /Ekspor CSV/);
});
