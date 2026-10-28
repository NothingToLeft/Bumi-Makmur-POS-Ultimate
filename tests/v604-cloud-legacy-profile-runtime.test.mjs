import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const deviceSettings = fs.readFileSync(new URL('../src/screens/DeviceSettingsScreens.jsx', import.meta.url), 'utf8');
const defaults = fs.readFileSync(new URL('../src/data/defaults.js', import.meta.url), 'utf8');

test('v6.1.0 imports CloudUpload used by Cloud & Backup runtime', () => {
  const importLine = deviceSettings.split('\n').find(line => line.includes("from 'lucide-react'")) || '';
  assert.match(importLine, /\bCloudUpload\b/);
  assert.match(deviceSettings, /<CloudUpload\b/);
});

test('v6.4.1 Firestore keeps explicitly disabled profiles blocked but accepts legacy missing active field', () => {
  assert.match(rules, /BUMI_MAKMUR_RULESET_VERSION=6\.4\.0/);
  assert.match(rules, /!\('active' in profile\(storeId\)\)/);
  assert.match(rules, /profile\(storeId\)\.active == true/);
});

test('v6.1.0 keeps cashier shift writes identity and branch scoped', () => {
  const shifts = rules.slice(rules.indexOf('match /stores/{storeId}/shifts/{id}'), rules.indexOf('match /stores/{storeId}/cashMovements/{id}'));
  assert.match(shifts, /request\.resource\.data\.userId == request\.auth\.uid/);
  assert.match(shifts, /incomingBranchAllowed\(storeId\)/);
  assert.match(shifts, /cashier\(storeId\)/);
});

test('app version is 6.5.0', () => {
  assert.match(defaults, /APP_VERSION = '6\.5\.0'/);
});
