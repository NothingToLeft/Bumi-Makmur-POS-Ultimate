import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseProductTextLocally, findBestProductMatch } from '../src/utils/aiProductParsing.js';
import { buildClosingSummary } from '../src/utils/closingSummary.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('AI parser lokal mengenali contoh Cable Ties VISALUX dari label kemasan', () => {
  const result = parseProductTextLocally(`VISALUX®\nVKT25036B\nNYLON CABLE TIES\nSIZE : 3.6 X 250MM\nQTY : 100 Pcs\nMATERIAL: NYLON 66`, {
    barcode: '8991589615303',
    categories: ['Listrik', 'Material']
  });
  assert.equal(result.brand, 'VISALUX');
  assert.equal(result.model, 'VKT25036B');
  assert.equal(result.size, '3.6 × 250 mm');
  assert.equal(result.packQty, 100);
  assert.equal(result.packUnit, 'pack');
  assert.equal(result.baseUnit, 'pcs');
  assert.equal(result.barcode, '8991589615303');
  assert.match(result.productName, /Cable Ties VISALUX/i);
  assert.match(result.specifications, /100 pcs\/pack/i);
});

test('Smart Receiving memprioritaskan barcode termasuk barcode kemasan konversi', () => {
  const match = findBestProductMatch({ barcode: 'PACK100', productName: 'Cable Ties VISALUX' }, [
    { id: 'P1', name: 'Cable Ties VISALUX', active: true, barcode: 'PCS001', conversions: [{ unit: 'pack', factor: 100, barcode: 'PACK100' }] },
    { id: 'P2', name: 'Cable Ties Merek Lain', active: true, barcode: 'OTHER' }
  ]);
  assert.equal(match?.product?.id, 'P1');
  assert.equal(match?.reason, 'barcode');
  assert.equal(match?.score, 1);
});

test('closing v6 menghitung refund restock, HPP snapshot, void, dan pembayaran bersih', () => {
  const shift = { id: 'S1', branchId: 'B1', userName: 'Kasir', startAt: '2026-08-19T08:00:00.000Z', endAt: '2026-08-19T16:00:00.000Z', startingCash: 500000, expectedEndingCash: 517000, actualEndingCash: 517000, difference: 0 };
  const sales = [
    { id: 'INV1', branchId: 'B1', status: 'PARTIAL_REFUND', createdAt: '2026-08-19T10:00:00.000Z', total: 20000, payments: [{ name: 'Tunai', amount: 20000 }], items: [{ lineId: 'L1', productId: 'P1', qty: 100, baseQty: 100, costTotal: 15000 }] },
    { id: 'INV2', branchId: 'B1', status: 'VOIDED', createdAt: '2026-08-19T11:00:00.000Z', total: 5000, payments: [{ name: 'Tunai', amount: 5000 }], items: [{ lineId: 'L2', productId: 'P2', qty: 1, baseQty: 1, costTotal: 3000 }] }
  ];
  const refunds = [
    { id: 'R1', branchId: 'B1', saleId: 'INV1', type: 'PARTIAL', createdAt: '2026-08-19T12:00:00.000Z', amount: 3000, payoutAmount: 3000, method: 'Tunai', restock: true, items: [{ lineId: 'L1', productId: 'P1', qty: 10 }] },
    { id: 'V1', branchId: 'B1', saleId: 'INV2', type: 'VOID', createdAt: '2026-08-19T11:05:00.000Z', amount: 5000, payoutAmount: 5000, method: 'Tunai', restock: true, items: [{ lineId: 'L2', productId: 'P2', qty: 1 }] }
  ];
  const summary = buildClosingSummary({ shift, sales, refunds, branch: { id: 'B1', name: 'Bumi Makmur' } });
  assert.equal(summary.transactionCount, 1);
  assert.equal(summary.voidCount, 1);
  assert.equal(summary.refundCount, 1);
  assert.equal(summary.grossSales, 20000);
  assert.equal(summary.refundTotal, 3000);
  assert.equal(summary.netSales, 17000);
  assert.equal(summary.soldCost, 15000);
  assert.equal(summary.returnedCost, 1500);
  assert.equal(summary.estimatedCost, 13500);
  assert.equal(summary.grossProfit, 3500);
  assert.equal(summary.itemQty, 90);
  assert.equal(summary.payments.Tunai, 17000);
});

test('v6 menyimpan Gemini key lokal, menyediakan fallback OCR, dan tidak menambah layanan Firebase berbayar', async () => {
  const [ai, runtime, settings, android, native, rules, pkg, sw] = await Promise.all([
    read('src/services/aiProductAssistant.js'), read('src/services/geminiRuntime.js'), Promise.all([read('src/screens/DeviceSettingsScreens.jsx'), read('src/components/AiConnectionManager.jsx')]).then(parts=>parts.join('\n')), read('scripts/prepare-android.mjs'),
    read('src/services/nativeDevice.js'), read('firestore.rules'), read('package.json'), read('public/sw.js')
  ]);
  assert.match(ai, /localStorage\.setItem\(SETTINGS_KEY/);
  assert.match(runtime, /x-goog-api-key/);
  assert.match(ai, /responseSchema/);
  assert.match(settings, /AI & Otomasi/);
  assert.match(settings, /API key tidak masuk Firestore/);
  assert.match(android, /com\.google\.mlkit:text-recognition:16\.0\.1/);
  assert.match(android, /whatsapp-opened/);
  assert.match(native, /preferWhatsApp/);
  assert.doesNotMatch(rules, /match \/aiKeys\//);
  assert.equal(JSON.parse(pkg).version, '6.5.1');
  assert.match(sw, /freesync-v6\.5\.1/);
});

test('v6 UI menyediakan Foto Produk AI, Smart Receiving, dan closing PDF WhatsApp', async () => {
  const [products, purchases, shift, context, modal] = await Promise.all([
    read('src/screens/ProductsScreen.jsx'), read('src/screens/PurchasesScreen.jsx'), read('src/screens/ShiftFinanceScreens.jsx'), read('src/store/PosContext.jsx'), read('src/components/AIProductCaptureModal.jsx')
  ]);
  assert.match(products, /Foto Produk AI/);
  assert.match(purchases, /Smart Receiving v6/);
  assert.match(purchases, /Foto Barang Masuk/);
  assert.match(shift, /Kirim PDF ke WhatsApp/);
  assert.match(shift, /downloadClosingPdf/);
  assert.match(context, /costTotal = Math\.round/);
  assert.match(context, /closingSummary = buildClosingSummary/);
  assert.match(modal, /Kemungkinan produk sudah ada/);
  assert.match(modal, /Harga dan stok tidak pernah ditebak AI/);
});

test('AI capture tidak mengasumsikan stok awal dan image optimizer punya fallback browser', async () => {
  const [modal, ai] = await Promise.all([
    read('src/components/AIProductCaptureModal.jsx'),
    read('src/services/aiProductAssistant.js')
  ]);
  assert.match(modal, /const \[initialPacks, setInitialPacks\] = useState\(0\)/);
  assert.match(modal, /analysisRequestRef/);
  assert.match(modal, /previewBlobRef/);
  assert.match(ai, /typeof createImageBitmap === 'function'/);
  assert.match(ai, /URL\.createObjectURL\(file\)/);
  assert.match(ai, /URL\.revokeObjectURL\(objectUrl\)/);
});

test('Smart Receiving memakai packQty hasil analisis terbaru saat menentukan konversi', async () => {
  const modal = await read('src/components/AIProductCaptureModal.jsx');
  assert.match(modal, /Number\(response\.result\.packQty \|\| 0\) > 1/);
  assert.doesNotMatch(modal, /\(packQty > 1 \? \(found\.product\.conversions/);
  assert.match(modal, /setProductId\(found\?\.product\?\.id \|\| ''\)/);
  assert.match(modal, /!found\?\.product && mode === 'receive'\) setReceivePrice\(''\)/);
});
