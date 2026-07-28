import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('nama cabang panjang pada sidebar desktop tidak lagi dipotong satu baris', async () => {
  const app = await read('src/App.jsx');
  const css = await read('src/index.css');

  assert.match(app, /sidebar-brand-copy/);
  assert.match(app, /sidebar-store-name/);
  assert.match(app, /storeName\.length>20\?'is-long'/);
  assert.doesNotMatch(app, /tracking-tight truncate/);
  assert.match(app, /lg:w-\[17\.5rem\] xl:w-72/);

  assert.match(css, /-webkit-line-clamp:\s*2/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /body\.is-electron \.sidebar-premium \{ width: 288px; \}/);
  assert.match(css, /\.sidebar-brand \{[\s\S]*min-height:\s*88px/);
});
