import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, root), 'utf8');

test('v6.4.0 keeps unified autosync aligned with the deployed v6.4.0 ruleset', () => {
  assert.match(read('src/data/defaults.js'), /APP_VERSION = '6\.5\.1'/);
  assert.match(read('src/utils/syncDiagnostics.js'), /FIRESTORE_RULESET_VERSION = '6\.4\.0'/);
  assert.match(read('firestore.rules'), /BUMI_MAKMUR_RULESET_VERSION=6\.4\.0/);
});

test('cashier mutation receipt idempotency preflight can GET but cannot LIST', () => {
  const rules = read('firestore.rules');
  const block = rules.match(/match \/stores\/\{storeId\}\/mutationReceipts\/\{mutationId\} \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.match(block, /allow get: if activeMember\(storeId\)/);
  assert.match(block, /allow list: if false/);
  assert.match(block, /request\.resource\.data\.userId == request\.auth\.uid/);
});

test('all seeded business arrays are explicitly covered by cloud sync', () => {
  const sync = read('src/services/syncEngine.js');
  const expected = [
    'branches','users','products','promotions','suppliers','customers','sales','heldSales','purchases','purchaseOrders',
    'stockMovements','stockAdjustments','stockOpnames','stockTransfers','productPriceHistory','supplierPriceHistory','quotations',
    'serialNumbers','warrantyClaims','approvalRequests','deviceSessions','branchPaymentProfiles','expenses','receivables','payables',
    'refunds','shifts','cashMovements','onlineOrders','printerProfiles','campaigns','feedback','auditLogs'
  ];
  for (const name of expected) assert.match(sync, new RegExp(`['\"]${name}['\"]`), `${name} must be cloud-synced`);
  for (const key of ['meta','configs','categories','units']) assert.match(sync, new RegExp(`['\"]${key}['\"]`), `${key} must be in cloud settings`);
});

test('AI cloud preferences exclude the Gemini API key', () => {
  const ai = read('src/services/aiProductAssistant.js');
  assert.match(ai, /AI_SYNCABLE_KEYS/);
  const declaration = ai.split('\n').find(line => line.includes('AI_SYNCABLE_KEYS = Object.freeze')) || '';
  assert.doesNotMatch(declaration, /apiKey/);
  assert.match(ai, /apiKey: current\.apiKey/);
});

test('cashier UI keeps cloud recovery quiet and automatic', () => {
  const app = read('src/App.jsx');
  assert.match(app, /kasir dapat tetap bekerja seperti biasa/);
  assert.match(app, /Sistem terus mencoba otomatis/);
});
