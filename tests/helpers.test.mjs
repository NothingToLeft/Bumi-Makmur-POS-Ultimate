import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMarkupPercent, calculateMarkupPrice, clampMoney, dateInputToISO, formatMoneyInput, formatRp, generateId, localDateKey, parseMoneyInput, safeJSONParse } from '../src/utils/helpers.js';

test('formatRp memformat Rupiah tanpa desimal', () => {
  assert.match(formatRp(125000), /125\.000/);
});

test('generateId menghasilkan prefix dan nilai unik', () => {
  const first = generateId('TEST');
  const second = generateId('TEST');
  assert.ok(first.startsWith('TEST-'));
  assert.notEqual(first, second);
});

test('safeJSONParse memakai fallback saat data rusak', () => {
  assert.deepEqual(safeJSONParse('{rusak', { ok: true }, { silent: true }), { ok: true });
});

test('clampMoney membatasi angka negatif dan membulatkan', () => {
  assert.equal(clampMoney(-10), 0);
  assert.equal(clampMoney(10.7), 11);
});

test('tanggal lokal dan tanggal input valid', () => {
  assert.match(localDateKey(new Date(2026, 6, 24)), /^2026-07-24$/);
  assert.match(dateInputToISO('2026-07-24'), /^2026-07-24T/);
});


test('input Rupiah menghapus nol depan dan memberi pemisah ribuan', () => {
  assert.equal(parseMoneyInput('05.000'), 5000);
  assert.equal(parseMoneyInput('Rp 12.345'), 12345);
  assert.equal(formatMoneyInput(5000), '5.000');
  assert.equal(formatMoneyInput(0), '');
});

test('markup harga menghitung harga jual dan persentase', () => {
  assert.equal(calculateMarkupPrice(5000, 30), 6500);
  assert.equal(calculateMarkupPercent(5000, 6500), 30);
});
