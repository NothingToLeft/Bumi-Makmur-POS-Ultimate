import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildReceiptPrintHtml, buildReceiptText, getReceiptPaymentSummary } from '../src/services/receiptShare.js';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const cashSale = {
  id: 'INV-CASH-39000',
  createdAt: '2026-08-19T14:43:06.000Z',
  customerName: 'Umum',
  cashierName: 'Zainal',
  subtotal: 39000,
  globalDiscount: 0,
  promoDiscount: 0,
  loyaltyDiscount: 0,
  tax: 0,
  service: 0,
  total: 39000,
  items: [{ lineId: 'L1', name: 'Philip 6W', qty: 1, unit: 'pcs', price: 39000, itemDiscount: 0 }],
  payments: [{ id: 'P1', methodId: 'cash', type: 'cash', name: 'Tunai', amount: 50000 }]
};

test('total 39 ribu dibayar 50 ribu menghasilkan kembalian 11 ribu', () => {
  const summary = getReceiptPaymentSummary({ ...cashSale, change: 11000 });
  assert.equal(summary.cashReceived, 50000);
  assert.equal(summary.totalPaid, 50000);
  assert.equal(summary.change, 11000);
  assert.equal(summary.cashApplied, 39000);
  assert.equal(summary.hasChange, true);
});

test('transaksi lama tanpa field change tetap menghitung kembalian dari pembayaran tunai', () => {
  const summary = getReceiptPaymentSummary(cashSale);
  assert.equal(summary.change, 11000);
  assert.equal(summary.cashApplied, 39000);
});

test('kelebihan non tunai tidak dianggap sebagai kembalian oleh renderer nota', () => {
  const summary = getReceiptPaymentSummary({ ...cashSale, payments: [{ id: 'Q1', type: 'digital', name: 'QRIS', amount: 50000 }] });
  assert.equal(summary.cashReceived, 0);
  assert.equal(summary.change, 0);
});

test('split payment menghitung kembalian hanya terhadap transaksi yang memiliki tunai', () => {
  const summary = getReceiptPaymentSummary({
    ...cashSale,
    total: 100000,
    payments: [
      { id: 'C1', type: 'cash', name: 'Tunai', amount: 80000 },
      { id: 'Q1', type: 'digital', name: 'QRIS', amount: 30000 }
    ]
  });
  assert.equal(summary.totalPaid, 110000);
  assert.equal(summary.cashReceived, 80000);
  assert.equal(summary.change, 10000);
  assert.equal(summary.cashApplied, 70000);
});

test('nota teks dan thermal menampilkan tunai diterima serta kembalian secara eksplisit', () => {
  const sale = { ...cashSale, change: 11000 };
  const text = buildReceiptText(sale, { companyName: 'Bumi Makmur 2 Surabaya' });
  assert.match(text, /Tunai diterima: Rp\s?50\.000/);
  assert.match(text, /KEMBALIAN: Rp\s?11\.000/);

  const html = buildReceiptPrintHtml(sale, { companyName: 'Bumi Makmur 2 Surabaya', receiptShowPayment: true });
  assert.match(html, /Tunai diterima/);
  assert.match(html, /change-box/);
  assert.match(html, /Rp\s?11\.000/);
  assert.match(html, /Berikan kepada pelanggan/);
});

test('kembalian tetap dicetak walau rincian metode pembayaran disembunyikan', () => {
  const html = buildReceiptPrintHtml({ ...cashSale, change: 11000 }, { receiptShowPayment: false });
  assert.match(html, /change-box/);
  assert.match(html, /Rp\s?11\.000/);
  assert.doesNotMatch(html, /Tunai diterima/);
});

test('semua tampilan transaksi memakai payment summary yang sama dan print panjang tidak terpotong', async () => {
  const [pos, transactions, publicReceipt, receiptDocument, cloud, css, context] = await Promise.all([
    source('src/screens/POSScreen.jsx'),
    source('src/screens/TransactionsScreen.jsx'),
    source('src/screens/PublicReceiptScreen.jsx'),
    source('src/components/ReceiptDocument.jsx'),
    source('src/services/cloudStore.js'),
    source('src/index.css'),
    source('src/store/PosContext.jsx')
  ]);
  assert.match(pos, /ReceiptDocument/);
  assert.match(pos, /KEMBALIAN KE PELANGGAN/);
  assert.match(pos, /Wajib diserahkan sebelum transaksi ditutup/);
  assert.match(transactions, /getReceiptPaymentSummary/);
  assert.match(transactions, /KEMBALIAN/);
  assert.match(publicReceipt, /ReceiptDocument/);
  assert.match(receiptDocument, /getReceiptPaymentSummary/);
  assert.match(receiptDocument, /KEMBALIAN/);
  assert.match(receiptDocument, /Uang yang harus dikembalikan kepada pelanggan/);
  assert.match(receiptDocument, /Rincian Belanja/);
  assert.match(cloud, /receiptShowPayment/);
  assert.match(css, /receipt-modal-shell/);
  assert.match(css, /receipt-pro-change/);
  assert.match(css, /max-height:calc\(100dvh - 24px\)/);
  assert.match(context, /const cashApplied = Math\.max\(0, cashTotal - overpayment\)/);
});

test('nota profesional menggunakan layout responsif tanpa truncation pada identitas penting', async () => {
  const [component, css, settings] = await Promise.all([
    source('src/components/ReceiptDocument.jsx'), source('src/index.css'), source('src/screens/DeviceSettingsScreens.jsx')
  ]);
  assert.match(component, /overflow-wrap:anywhere|break-all/);
  assert.match(component, /receipt-pro-identifiers/);
  assert.match(component, /receipt-pro-grand/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) max-content/);
  assert.match(css, /@media \(max-width:480px\)/);
  assert.match(settings, /Preview Nota Profesional/);
  assert.match(settings, /ReceiptDocument/);
});

