import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildInventoryAging,
  buildSmartRestock,
  buildSuggestedPurchaseOrders,
  quotationTotals,
  receivableAging,
  salesVelocityByProduct
} from '../src/utils/businessInsights.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const now = new Date('2026-08-19T00:00:00.000Z');

test('Smart Restock menghitung velocity, incoming PO, dan harga terbaru per pemasok', () => {
  const products = [{ id: 'P1', name: 'Kabel NYM', stock: 2, minStock: 5, baseUnit: 'meter', active: true, trackStock: true }];
  const sales = [
    { id: 'S1', createdAt: '2026-08-18T00:00:00.000Z', status: 'PAID', items: [{ productId: 'P1', baseQty: 30 }] },
    { id: 'S2', createdAt: '2026-08-10T00:00:00.000Z', status: 'VOIDED', items: [{ productId: 'P1', baseQty: 999 }] }
  ];
  const purchaseOrders = [{ id: 'PO1', status: 'PARTIAL', items: [{ productId: 'P1', baseQty: 10, receivedBaseQty: 4 }] }];
  const supplierPrices = [
    { id: 'OLD-A', productId: 'P1', supplierId: 'SUP-A', supplierName: 'A', unitCost: 1000, createdAt: '2026-01-01T00:00:00Z' },
    { id: 'NEW-A', productId: 'P1', supplierId: 'SUP-A', supplierName: 'A', unitCost: 1800, createdAt: '2026-08-18T00:00:00Z' },
    { id: 'NEW-B', productId: 'P1', supplierId: 'SUP-B', supplierName: 'B', unitCost: 1500, createdAt: '2026-08-18T00:00:00Z' }
  ];
  const velocity = salesVelocityByProduct(sales, 30, now);
  assert.equal(velocity.get('P1'), 1);
  const rows = buildSmartRestock({ products, sales, purchaseOrders, supplierPrices, days: 30, leadTimeDays: 7, safetyDays: 7, now });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].incoming, 6);
  assert.equal(rows[0].targetStock, 14);
  assert.equal(rows[0].suggestedQty, 6);
  assert.equal(rows[0].bestSupplier.supplierId, 'SUP-B');
  assert.equal(rows[0].bestSupplier.unitCost, 1500, 'harga lama murah dari SUP-A tidak boleh mengalahkan harga terbaru supplier itu');
});

test('Draft PO Smart Restock dikelompokkan per pemasok dan produk tanpa histori dipisahkan', () => {
  const plan = buildSuggestedPurchaseOrders([
    { id: 'P1', name: 'Lampu 10W', baseUnit: 'pcs', suggestedQty: 12, bestSupplier: { supplierId: 'SUP-1', unitCost: 20000 } },
    { id: 'P2', name: 'MCB 6A', baseUnit: 'pcs', suggestedQty: 3, bestSupplier: { supplierId: 'SUP-1', unitCost: 30000 } },
    { id: 'P3', name: 'Klem Kabel', baseUnit: 'pcs', suggestedQty: 10, bestSupplier: null }
  ], [{ id: 'SUP-1', name: 'Pemasok Utama', active: true }]);
  assert.equal(plan.groups.length, 1);
  assert.equal(plan.groups[0].items.length, 2);
  assert.equal(plan.groups[0].estimatedTotal, 330000);
  assert.equal(plan.unassigned.length, 1);
});

test('inventory aging menghitung dead stock dan modal tertahan', () => {
  const rows = buildInventoryAging({
    products: [
      { id: 'P1', name: 'Stok Mati', stock: 10, modalPrice: 5000, prices: { retail: 7000 }, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'P2', name: 'Aktif', stock: 2, modalPrice: 10000, prices: { retail: 13000 }, createdAt: '2026-01-01T00:00:00Z' }
    ],
    sales: [{ createdAt: '2026-08-18T00:00:00Z', items: [{ productId: 'P2', qty: 1 }] }],
    now
  });
  const dead = rows.find(row => row.id === 'P1');
  const active = rows.find(row => row.id === 'P2');
  assert.equal(dead.bucket, '90+');
  assert.equal(dead.capital, 50000);
  assert.equal(active.bucket, '0-29');
});

test('aging piutang memisahkan current, 1-30, 31-60, 61-90, dan 90+', () => {
  const buckets = receivableAging([
    { status: 'OPEN', balance: 100, dueDate: '2026-08-19' },
    { status: 'OPEN', balance: 200, dueDate: '2026-08-10' },
    { status: 'OPEN', balance: 300, dueDate: '2026-07-01' },
    { status: 'OPEN', balance: 400, dueDate: '2026-06-01' },
    { status: 'OPEN', balance: 500, dueDate: '2026-04-01' },
    { status: 'PAID', balance: 999, dueDate: '2026-01-01' }
  ], now);
  assert.deepEqual(buckets, { current: 100, d1_30: 200, d31_60: 300, d61_90: 400, d90plus: 500 });
});

test('quotation totals membatasi diskon dan menghitung pajak setelah diskon', () => {
  const totals = quotationTotals([
    { qty: 2, price: 100000, discount: 10000 },
    { qty: 1, price: 50000, discount: 0 }
  ], 40000, 11, true);
  assert.deepEqual(totals, { subtotal: 240000, discount: 40000, tax: 22000, total: 222000 });
  assert.equal(quotationTotals([{ qty: 1, price: 10000 }], 999999, 0, false).total, 0);
});

test('v5.8 menyinkronkan seluruh koleksi Business Suite dan backup mengenalinya', async () => {
  const [sync, cloud, defaults, backup] = await Promise.all([
    read('src/services/syncEngine.js'), read('src/services/cloudStore.js'), read('src/data/defaults.js'), read('src/utils/backupValidation.js')
  ]);
  for (const name of ['supplierPriceHistory', 'quotations', 'serialNumbers', 'warrantyClaims']) {
    assert.match(sync, new RegExp(name));
    assert.match(cloud, new RegExp(name));
    assert.match(defaults, new RegExp(name));
    assert.match(backup, new RegExp(name));
  }
});

test('Firestore Rules Business Suite tetap scoped dan tidak memakai layanan Blaze', async () => {
  const rules = await read('firestore.rules');
  for (const name of ['supplierPriceHistory', 'quotations', 'serialNumbers', 'warrantyClaims']) assert.match(rules, new RegExp(`match /stores/\\{storeId\\}/${name}`));
  assert.match(rules, /supplierPriceHistory[\s\S]*allow update, delete: if false/);
  assert.doesNotMatch(rules, /firebase\.storage|cloudfunctions|functions\./i);
});

test('PO parsial, supplier price history, quotation, serial, dan garansi tersedia di domain utama', async () => {
  const context = await read('src/store/PosContext.jsx');
  assert.match(context, /receivePurchaseOrder/);
  assert.match(context, /order\.status = completed \? 'RECEIVED' : 'PARTIAL'/);
  assert.match(context, /supplierPriceHistory\.unshift/);
  assert.match(context, /saveQuotation/);
  assert.match(context, /convertQuotationToBill/);
  assert.match(context, /saveSerialNumber/);
  assert.match(context, /saveWarrantyClaim/);
  assert.match(context, /serialTracking/);
  assert.match(context, /Serial .* belum tersedia|nomor serial/i);
});

test('opname scanner, alasan selisih, varian, bundle, dan proteksi harga modal tetap aktif', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  assert.match(products, /Scan Barang untuk Opname/);
  assert.match(products, /Pilih alasan selisih/);
  assert.match(products, /PRODUCT_COST_OVERRIDE/);
  assert.match(products, /serialTracking/);
  assert.match(products, /specifications/);
  assert.match(products, /bundleItems/);
});

test('POS mewajibkan serial dan PIN untuk transaksi di bawah modal', async () => {
  const [pos, context] = await Promise.all([read('src/screens/POSScreen.jsx'), read('src/store/PosContext.jsx')]);
  assert.match(pos, /SALE_BELOW_COST/);
  assert.match(pos, /serialIds/);
  assert.match(context, /SALE_BELOW_COST/);
  assert.match(context, /approvalRequests\.unshift/);
  assert.match(context, /serial\.status = 'SOLD'/);
});

test('quotation dapat dicetak atau Save PDF dan dikonversi tanpa input ulang', async () => {
  const screen = await read('src/screens/BusinessToolsScreen.jsx');
  assert.match(screen, /printHtmlDocument/);
  assert.match(screen, /convertQuotationToBill/);
  assert.match(screen, /Penawaran/);
  assert.match(screen, /Serial & Garansi/);
});

test('navigasi dikelompokkan profesional tanpa menghapus modul utama', async () => {
  const defaults = await read('src/data/defaults.js');
  const app = await read('src/App.jsx');
  for (const group of ['Ringkasan', 'Penjualan', 'Persediaan', 'Keuangan & Laporan', 'Operasional', 'Sistem']) assert.match(defaults, new RegExp(group.replace('&', '\\&')));
  for (const id of ['pos', 'transactions', 'products', 'purchases', 'quotations', 'warranty', 'reports', 'settings']) assert.match(defaults, new RegExp(`id: '${id}'`));
  assert.match(app, /group\|\|'Menu'/);
});

test('backup/restore, reset cloud, dan tindakan sensitif memakai approval PIN', async () => {
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  const products = await read('src/screens/ProductsScreen.jsx');
  assert.match(settings, /BACKUP_RESTORE/);
  assert.match(settings, /CLOUD_RESET/);
  assert.match(settings, /PIN Owner/);
  assert.match(products, /SensitivePinModal/);
});



test('regresi POS: HoldModal tersedia dan approval tidak mengakses variabel sebelum deklarasi', async () => {
  const pos = await read('src/screens/POSScreen.jsx');
  const context = await read('src/store/PosContext.jsx');
  assert.match(pos, /function HoldModal\(/);
  const declarationIndex = context.indexOf("const hasApproval = Boolean(payload.approvedBy && payload.approvalToken)");
  const firstGuardIndex = context.indexOf('!hasApproval');
  assert.ok(declarationIndex >= 0, 'Deklarasi hasApproval harus ada.');
  assert.ok(firstGuardIndex > declarationIndex, 'hasApproval harus dideklarasikan sebelum dipakai oleh guard approval.');
});


test('tab Penawaran dan Garansi mengikuti menu aktif tanpa state lama tertahan', async () => {
  const screen = await read('src/screens/BusinessToolsScreen.jsx');
  assert.match(screen, /useEffect\(\(\) => setTab\(initialTab\), \[initialTab\]\)/);
});

test('Firestore mengizinkan kasir menjual serial secara aman dan permission profil v5.8 valid', async () => {
  const rules = await read('firestore.rules');
  for (const permission of ['quotations.view', 'quotations.manage', 'warranty.view']) assert.match(rules, new RegExp(permission.replace('.', '\\.')));
  assert.match(rules, /resource\.data\.status == 'IN_STOCK'/);
  assert.match(rules, /request\.resource\.data\.status == 'SOLD'/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\[[\s\S]*'saleId'[\s\S]*'warrantyEndsAt'/);
  assert.match(rules, /getAfter\([\s\S]*sales[\s\S]*createdBy == request\.auth\.uid/);
});

test('Purchase Order hanya dapat diterima saat ORDERED atau PARTIAL', async () => {
  const context = await read('src/store/PosContext.jsx');
  assert.match(context, /!\['ORDERED', 'PARTIAL'\]\.includes\(order\.status\)/);
  assert.match(context, /Purchase Order harus berstatus ORDERED atau PARTIAL sebelum penerimaan barang/);
});

test('QRIS preview memotong simbol QR saja dengan detector dan fallback lokal', async () => {
  const [assets, settings] = await Promise.all([read('src/utils/assetProcessing.js'), read('src/screens/DeviceSettingsScreens.jsx')]);
  assert.match(assets, /detectQrBounds/);
  assert.match(assets, /BarcodeDetector/);
  assert.match(assets, /BrowserQRCodeReader/);
  assert.match(assets, /cropStrategy/);
  assert.match(settings, /QRIS Adaptive v4 · QR-Only Preview/);
  assert.match(settings, /Preview fokus ke QR, bukan seluruh poster QRIS/);
});

test('Smart Restock dapat membuat Draft PO, workflow hemat artifact, dan QRIS Mode Kasir tidak ditambahkan', async () => {
  const [control, android, windows, allSource] = await Promise.all([
    read('src/screens/ControlCenterScreen.jsx'), read('.github/workflows/build-android.yml'), read('.github/workflows/build-windows.yml'),
    Promise.all(['src/App.jsx','src/screens/POSScreen.jsx','src/screens/DeviceSettingsScreens.jsx','src/screens/BusinessToolsScreen.jsx'].map(read)).then(parts => parts.join('\n'))
  ]);
  assert.match(control, /Buat Draft PO dari Smart Restock/);
  assert.match(control, /PO-SMART/);
  assert.match(android, /retention-days: 1/);
  assert.match(windows, /retention-days: 1/);
  assert.doesNotMatch(android, /retention-days: 30/);
  assert.doesNotMatch(windows, /retention-days: 30/);
  assert.doesNotMatch(allSource, /QRIS Mode Kasir/i);
});


test('Smart Restock membedakan barang benar-benar dipesan dan Draft PO agar saran tidak ganda', () => {
  const rows = buildSmartRestock({
    products: [{ id: 'P1', name: 'Lampu', stock: 0, minStock: 5, baseUnit: 'pcs', active: true, trackStock: true }],
    purchaseOrders: [
      { status: 'DRAFT', items: [{ productId: 'P1', baseQty: 3, receivedBaseQty: 0 }] },
      { status: 'ORDERED', items: [{ productId: 'P1', baseQty: 4, receivedBaseQty: 1 }] }
    ],
    now
  });
  assert.equal(rows[0].plannedDraft, 3);
  assert.equal(rows[0].incoming, 3);
  assert.equal(rows[0].suggestedQty, 4);
});

test('inventory aging memakai penjualan terakhir, bukan restok baru, dan menandai stok berlebih', () => {
  const rows = buildInventoryAging({
    products: [{ id: 'P1', name: 'Lampu Lama', stock: 100, minStock: 2, modalPrice: 10000, prices: { retail: 15000 }, active: true, trackStock: true, createdAt: '2026-01-01T00:00:00Z' }],
    sales: [{ id: 'S1', status: 'COMPLETED', createdAt: '2026-04-01T00:00:00Z', items: [{ productId: 'P1', baseQty: 1 }] }],
    stockMovements: [{ productId: 'P1', qtyChange: 100, createdAt: '2026-08-18T00:00:00Z' }],
    now
  });
  assert.equal(rows[0].bucket, '90+');
  assert.equal(rows[0].movementClass, 'dead');
  assert.equal(rows[0].excessStock, true);
  assert.equal(rows[0].clearanceSuggested, true);
});

test('PO Draft dapat diedit lalu ORDERED, tetapi PO PARTIAL menjaga item agar histori penerimaan konsisten', async () => {
  const [context, purchases] = await Promise.all([read('src/store/PosContext.jsx'), read('src/screens/PurchasesScreen.jsx')]);
  assert.match(context, /DRAFT: new Set\(\['DRAFT', 'ORDERED', 'CANCELLED'\]\)/);
  assert.match(context, /PO yang sudah diterima sebagian tidak boleh mengubah barang, jumlah, satuan, atau harga/);
  assert.match(purchases, /Edit Draft/);
  assert.match(purchases, /Tandai Dipesan/);
});

test('quotation kadaluarsa ditandai efektif dan tidak dapat dikonversi ke Open Bill', async () => {
  const [context, screen] = await Promise.all([read('src/store/PosContext.jsx'), read('src/screens/BusinessToolsScreen.jsx')]);
  assert.match(context, /Masa berlaku penawaran sudah berakhir/);
  assert.match(context, /status = 'EXPIRED'/);
  assert.match(screen, /effectiveQuoteStatus/);
  assert.match(screen, /\['CONVERTED', 'REJECTED', 'EXPIRED'\]\.includes\(effectiveStatus\)/);
});

test('serial dapat direkam saat penerimaan, ikut retur pemasok, dan ikut refund pelanggan', async () => {
  const [context, purchases, transactions] = await Promise.all([
    read('src/store/PosContext.jsx'), read('src/screens/PurchasesScreen.jsx'), read('src/screens/TransactionsScreen.jsx')
  ]);
  assert.match(context, /registerReceivedSerials/);
  assert.match(context, /Serial .* harus tepat/);
  assert.match(context, /lastPurchaseReturnId/);
  assert.match(context, /lastRefundId/);
  assert.match(context, /serial\.status = 'IN_STOCK'/);
  assert.match(context, /serial\.status = 'RETURNED'/);
  assert.match(purchases, /Nomor Serial Unit \(opsional\)/);
  assert.match(purchases, /Pilih serial yang kembali ke pemasok/);
  assert.match(transactions, /Serial yang dikembalikan/);
});

test('klaim garansi mencegah dua klaim aktif dan status REJECTED/RESOLVED mengembalikan lifecycle serial', async () => {
  const context = await read('src/store/PosContext.jsx');
  assert.match(context, /masih memiliki klaim aktif/);
  assert.match(context, /\['RESOLVED', 'REJECTED'\]\.includes/);
  assert.match(context, /hasActiveClaim \? 'WARRANTY'/);
});

test('Firestore mengizinkan lifecycle serial refund kasir hanya bila refund disetujui Manager\/Owner', async () => {
  const rules = await read('firestore.rules');
  assert.match(rules, /approvedRefundByCashier/);
  assert.match(rules, /request\.resource\.data\.status in \['IN_STOCK', 'RETURNED'\]/);
  assert.match(rules, /refund\.createdBy == request\.auth\.uid/);
  assert.match(rules, /refund\.approvedBy/);
  assert.match(rules, /lastRefundId/);
});

test('refund transaksi tempo mengurangi piutang sebelum payout dan membalik poin loyalitas secara proporsional', async () => {
  const [context, transactions] = await Promise.all([
    read('src/store/PosContext.jsx'), read('src/screens/TransactionsScreen.jsx')
  ]);
  assert.match(context, /saleReceivables/);
  assert.match(context, /refund\.receivableReduction/);
  assert.match(context, /refund\.payoutAmount/);
  assert.match(context, /pointsEarnedReversed/);
  assert.match(context, /pointsRedeemedRestored/);
  assert.match(context, /amount: money\(refund\.payoutAmount\)/);
  assert.match(transactions, /Potong piutang/);
  assert.match(transactions, /Dana kembali/);
});
