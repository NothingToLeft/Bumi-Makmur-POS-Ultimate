import test from 'node:test';
import assert from 'node:assert/strict';
import { getAiConnections, saveAiConnection, deleteAiConnection, resolveConnectionKey } from '../src/services/aiConnections.js';
import { applyCloudAiPreferences, getAiDeviceSettings, pickSyncableAiSettings, saveAiDeviceSettings, analyzeProductWithGemini } from '../src/services/aiProductAssistant.js';
import { chatCompletionsUrl } from '../src/services/aiProvider.js';
import { buildInventoryTemplateWorkbook, parseInventoryFile } from '../src/utils/inventoryImport.js';
import { existingBillForOrder } from '../src/utils/orderWorkflow.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };

test('converting an order twice reuses its bill; closed, cancelled and empty orders cannot create bills', () => {
  const order = { id: 'order', branchId: 'branch', status: 'NEW', items: [{ productId: 'cable', qty: .5 }] };
  assert.equal(existingBillForOrder(order), null);
  const bill = { id: 'bill', branchId: 'branch', sourceOrderId: 'order' };
  assert.equal(existingBillForOrder({ ...order, status: 'IN_POS' }, [bill]), bill);
  for (const status of ['IN_POS', 'COMPLETED', 'CANCELLED']) assert.throws(() => existingBillForOrder({ ...order, status }), /sudah diproses/);
  assert.throws(() => existingBillForOrder({ ...order, items: [] }), /belum memiliki barang/);
  assert.throws(() => existingBillForOrder(null), /tidak ditemukan/);
});

test('multiple AI profiles retain isolated credentials through editing, cloud sync and deletion', () => {
  storage.clear();
  const gemini = saveAiConnection({ provider: 'gemini', model: 'gemini-test', apiKey: 'test-google' }, 'Google');
  const router = saveAiConnection({ provider: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: 'vision-test', apiKey: 'test-router' }, 'Router');
  assert.equal(getAiConnections().length, 2);
  saveAiDeviceSettings(gemini);
  let next = saveAiDeviceSettings({ provider: 'openai', baseUrl: router.baseUrl, model: router.model });
  assert.equal(next.apiKey, router.apiKey);
  next = applyCloudAiPreferences({ provider: 'custom', baseUrl: 'https://different.example', apiKey: 'cloud-injected' });
  assert.equal(next.apiKey, '');
  next = applyCloudAiPreferences(gemini);
  assert.equal(next.apiKey, gemini.apiKey);
  assert.equal(resolveConnectionKey(router, { ...router, baseUrl: 'https://openrouter.ai/api' }), router.apiKey);
  assert.equal(resolveConnectionKey(router, { ...router, baseUrl: 'https://other.example' }), '');
  assert.equal(JSON.stringify(pickSyncableAiSettings(router)).includes(router.apiKey), false);
  saveAiConnection({ ...router, apiKey: 'changed' }, 'Router renamed', router.id);
  assert.equal(getAiConnections().length, 2);
  assert.equal(getAiConnections().find(item => item.id === router.id).apiKey, 'changed');
  deleteAiConnection(router.id);
  assert.equal(getAiConnections().length, 1);
  assert.equal(getAiDeviceSettings().apiKey, gemini.apiKey);
});

test('connection profiles tolerate corrupt storage; unsafe endpoints rejected', () => {
  storage.set('bmpos-ai-connections-v1', '{}');
  assert.deepEqual(getAiConnections(), []);
  assert.throws(() => saveAiConnection({}, '  '), /nama provider/);
  for (const url of ['javascript:alert(1)', 'https://user:pass@host.example', 'https://host.example?key=x']) assert.throws(() => chatCompletionsUrl(url));
  assert.equal(chatCompletionsUrl('https://api.groq.com/openai/v1'), 'https://api.groq.com/openai/v1/chat/completions');
});

test('OpenAI-compatible product analysis includes schema and parses a real JSON response', async () => {
  const originalFetch = globalThis.fetch;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  let payload;
  globalThis.fetch = async (_, init) => {
    payload = JSON.parse(init.body);
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ productName: 'Kabel NYM', category: 'Listrik', baseUnit: 'meter', confidence: .9 }) } }] }) };
  };
  try {
    const result = await analyzeProductWithGemini({ dataUrl: 'data:image/jpeg;base64,eA==', categories: ['Listrik'], settings: { provider: 'openai', baseUrl: 'https://example.test', apiKey: 'test-only', model: 'vision-test' } });
    assert.match(payload.messages[0].content, /productName/);
    assert.match(payload.messages[0].content, /packQty/);
    assert.equal(payload.messages[1].content[1].type, 'image_url');
    assert.equal(result.productName, 'Kabel NYM');
    assert.equal(result.baseUnit, 'meter');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
  }
});

test('updated SheetJS exports a workbook that the existing importer can read', async () => {
  const buffer = await buildInventoryTemplateWorkbook();
  const records = await parseInventoryFile({ name: 'template.xlsx', size: buffer.byteLength, arrayBuffer: async () => buffer });
  assert.ok(records.length > 0);
  assert.ok(Object.keys(records[0]).length > 5);
});
