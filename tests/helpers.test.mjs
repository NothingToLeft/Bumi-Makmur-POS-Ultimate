import test from 'node:test';
import assert from 'node:assert/strict';
import { clampMoney, dateInputToISO, formatRp, generateId, localDateKey, safeJSONParse } from '../src/utils/helpers.js';

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
  assert.deepEqual(safeJSONParse('{rusak', { ok: true }), { ok: true });
});

test('clampMoney membatasi angka negatif dan membulatkan', () => {
  assert.equal(clampMoney(-10), 0);
  assert.equal(clampMoney(10.7), 11);
});

test('tanggal lokal dan tanggal input valid', () => {
  assert.match(localDateKey(new Date(2026, 6, 24)), /^2026-07-24$/);
  assert.match(dateInputToISO('2026-07-24'), /^2026-07-24T/);
});
