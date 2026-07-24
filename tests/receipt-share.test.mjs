import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceiptText, normalizeWhatsappNumber } from '../src/services/receiptShare.js';

test('normalisasi nomor WhatsApp Indonesia', () => {
  assert.equal(normalizeWhatsappNumber('0812-3456-7890', '62'), '6281234567890');
  assert.equal(normalizeWhatsappNumber('+62 812 3456 7890', '62'), '6281234567890');
});

test('nota digital memuat item, total, metode, dan pesan toko', () => {
  const sale = {
    id: 'INV-TEST', createdAt: '2026-07-24T10:00:00.000Z', customerName: 'Pak Budi',
    subtotal: 10000, globalDiscount: 1000, promoDiscount: 0, loyaltyDiscount: 0,
    tax: 0, service: 0, total: 9000, change: 1000,
    items: [{ name: 'Kabel', qty: 2, unit: 'meter', price: 5000, itemDiscount: 0 }],
    payments: [{ name: 'Tunai', amount: 10000 }]
  };
  const text = buildReceiptText(sale, { companyName: 'BUMI MAKMUR', receiptMessage: 'Terima kasih.' });
  assert.match(text, /BUMI MAKMUR/);
  assert.match(text, /Kabel/);
  assert.match(text, /TOTAL: Rp\s?9\.000/);
  assert.match(text, /Tunai: Rp\s?10\.000/);
  assert.match(text, /Terima kasih/);
});
