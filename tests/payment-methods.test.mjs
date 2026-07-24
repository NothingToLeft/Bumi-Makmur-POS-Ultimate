import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../src/data/defaults.js', import.meta.url), 'utf8');

test('metode pembayaran digital utama tersedia', () => {
  for (const id of ['qris', 'shopeepay', 'ovo', 'gopay', 'dana']) {
    assert.match(source, new RegExp(`id: '${id}'[\\s\\S]{0,120}type: 'digital'[\\s\\S]{0,80}active: true`));
  }
});

test('pengaturan nota premium tersedia', () => {
  for (const key of ['whatsappReceiptEnabled', 'receiptShowLogo', 'receiptPaperWidth', 'receiptLogo', 'qrisImage']) {
    assert.match(source, new RegExp(`${key}:`));
  }
});
