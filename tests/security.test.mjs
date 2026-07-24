import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinCredential, verifyPinCredential } from '../src/services/security.js';

test('PIN PBKDF2 dapat dibuat dan diverifikasi', async () => {
  const credential = await createPinCredential('1608', '', 1000);
  assert.equal(await verifyPinCredential('1608', credential), true);
  assert.equal(await verifyPinCredential('1234', credential), false);
  assert.equal(credential.pinAlgorithm, 'PBKDF2-SHA256');
});

test('PIN wajib empat digit', async () => {
  await assert.rejects(() => createPinCredential('12'), /4 digit/);
});
