import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  scanTextForPotentialSecrets,
  validateRuntimeEnvFile,
} from '../scripts/secret-scan-utils.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const FIREBASE_WEB_KEY = `AIza${'A'.repeat(35)}`;
const OTHER_GOOGLE_KEY = `AIza${'B'.repeat(35)}`;

test('v6.4.1 allows only Firebase Web API key in runtime .env.production without weakening secret scan', () => {
  const runtimeEnv = [
    `VITE_FIREBASE_API_KEY=${FIREBASE_WEB_KEY}`,
    'VITE_FIREBASE_AUTH_DOMAIN=demo.firebaseapp.com',
    'VITE_FIREBASE_PROJECT_ID=demo',
    'VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890',
    'VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef',
    'VITE_FIREBASE_STORE_ID=bumi-makmur',
    'VITE_FIREBASE_STORE_CODE=BUMIMAKMUR02',
    'VITE_PUBLIC_APP_URL=https://example.pages.dev',
  ].join('\n');

  assert.deepEqual(validateRuntimeEnvFile('.env.production', runtimeEnv), []);
  assert.deepEqual(validateRuntimeEnvFile('.env', runtimeEnv.replace(FIREBASE_WEB_KEY, `\"${FIREBASE_WEB_KEY}\"`)), []);
  assert.deepEqual(scanTextForPotentialSecrets('.env', runtimeEnv.replace(FIREBASE_WEB_KEY, `\"${FIREBASE_WEB_KEY}\"`)), []);
  assert.deepEqual(scanTextForPotentialSecrets('.env.production', runtimeEnv), []);

  assert.match(
    scanTextForPotentialSecrets('src/leak.js', `export const key = '${FIREBASE_WEB_KEY}';`).join(' '),
    /Google API key/i,
  );
  assert.match(
    scanTextForPotentialSecrets('.env.production', `${runtimeEnv}\nGEMINI_API_KEY=${OTHER_GOOGLE_KEY}`).join(' '),
    /GEMINI_API_KEY|tidak diizinkan|Google API key/i,
  );
  assert.match(
    scanTextForPotentialSecrets('.env.production', `${runtimeEnv}\nPRIVATE_TOKEN=abc`).join(' '),
    /PRIVATE_TOKEN.*tidak diizinkan/i,
  );
});

test('v6.4.1 GitHub release workflows no longer write .env.production and inject Firebase config only into build step', async () => {
  const [androidWorkflow, windowsWorkflow] = await Promise.all([
    read('.github/workflows/build-android.yml'),
    read('.github/workflows/build-windows.yml'),
  ]);

  assert.doesNotMatch(androidWorkflow, /cat\s*>\s*\.env\.production/);
  assert.doesNotMatch(windowsWorkflow, /Set-Content[^\n]*\.env\.production/i);
  assert.match(androidWorkflow, /name: Build web and PC PWA[\s\S]*VITE_FIREBASE_API_KEY:\s*\$\{\{ secrets\.VITE_FIREBASE_API_KEY \}\}/);
  assert.match(windowsWorkflow, /name: Build Windows EXE and MSI without implicit publishing[\s\S]*VITE_FIREBASE_API_KEY:\s*\$\{\{ secrets\.VITE_FIREBASE_API_KEY \}\}/);
});

test('v6.4.1 static audit uses structured secret scanner', async () => {
  const audit = await read('scripts/audit-project.mjs');
  assert.match(audit, /scanTextForPotentialSecrets/);
  assert.doesNotMatch(audit, /const secretPatterns\s*=/);
});
