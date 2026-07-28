import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('form Pembelian dan Restok tidak memakai grid lima kolom yang meluber ke Ringkasan', async () => {
  const source = await read('src/screens/PurchasesScreen.jsx');
  const css = await read('src/index.css');

  assert.match(source, /xl:grid-cols-\[minmax\(0,2fr\)_minmax\(300px,1fr\)\]/);
  assert.match(source, /xl:grid-cols-12/);
  assert.match(source, /xl:col-span-6 w-full min-w-0 whitespace-normal/);
  assert.doesNotMatch(source, /2xl:grid-cols-\[minmax\(220px,1fr\)_140px_110px_160px_auto\]/);
  assert.match(source, /purchase-summary-column/);
  assert.match(css, /\.purchase-entry-grid > \* \{ min-width: 0; max-width: 100%; \}/);
  assert.match(css, /\.purchase-summary-column \{ min-width: 0; max-width: 100%; \}/);
});
