import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { operationRequiresRemotePrecondition } from '../src/services/syncEngine.js';
import { generateId } from '../src/utils/helpers.js';

const root = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, root), 'utf8');

test('create operations do not pre-read a missing Firestore target', () => {
  assert.equal(operationRequiresRemotePrecondition({ type: 'set', beforeData: null }), false);
  assert.equal(operationRequiresRemotePrecondition({ type: 'set', beforeData: undefined }), false);
  assert.equal(operationRequiresRemotePrecondition({ type: 'set', beforeData: { stock: 1 } }), true);
  assert.equal(operationRequiresRemotePrecondition({ type: 'delete', beforeData: { id: 'x' } }), true);
});

test('persistOperations preserves conflict reads for update/delete but skips CREATE preflight target reads', () => {
  const source = read('src/services/cloudStore.js');
  assert.match(source, /operationRequiresRemotePrecondition\(operation\)/);
  assert.match(source, /snapshots = new Array\(operations\.length\)\.fill\(null\)/);
  assert.match(source, /if \(!operationRequiresRemotePrecondition\(operation\)\) continue/);
  assert.match(source, /if \(!operationRequiresRemotePrecondition\(operation\)\) return/);
  assert.match(source, /transaction\.get\(receiptRef\)/);
  assert.match(source, /operationRequiresRemotePrecondition\(operation\)[\s\S]*getDocFromServer\(refs\[index\]\)/);
});

test('generated entity ids have strong entropy for create-without-pre-read writes', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => generateId('SHIFT')));
  assert.equal(ids.size, 1000);
  for (const id of ids) assert.match(id, /^SHIFT-[A-Z0-9-]{12,}$/);
});

test('variant business validation allows a real product to start with one variant', () => {
  const store = read('src/store/PosContext.jsx');
  const products = read('src/screens/ProductsScreen.jsx');
  assert.match(store, /rows\.length < 1/);
  assert.doesNotMatch(store, /rows\.length < 2/);
  assert.match(products, /variantRows\.length < 1/);
  assert.match(products, /Boleh mulai dari satu varian/);
});
