import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ReleaseNotesSettings v6.0.3 menutup tuple groups dengan benar', async () => {
  const source = await read('src/screens/DeviceSettingsScreens.jsx');
  assert.match(source, /\['Cloud & Customer Display Stability v6\.0\.3',\[[\s\S]*?fitur v6\.0\.2 tetap dipertahankan\.'\]\],/);
});

test('runtime build diseragamkan ke Node 24 untuk Cloudflare, Android, dan Windows', async () => {
  const [nodeVersion, androidWorkflow, windowsWorkflow] = await Promise.all([
    read('.node-version'),
    read('.github/workflows/build-android.yml'),
    read('.github/workflows/build-windows.yml'),
  ]);
  assert.equal(nodeVersion.trim(), '24');
  assert.match(androidWorkflow, /node-version:\s*24/);
  assert.match(windowsWorkflow, /node-version:\s*24/);
});

test('audit statis memvalidasi syntax JSX dengan esbuild setelah dependency terpasang', async () => {
  const audit = await read('scripts/audit-project.mjs');
  assert.match(audit, /await import\('esbuild'\)/);
  assert.match(audit, /loader = file\.endsWith\('\.jsx'\) \? 'jsx' : 'js'/);
  assert.match(audit, /esbuild syntax error/);
});

test('Cloudflare npm run build menjalankan static audit sebagai prebuild gate', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.scripts.prebuild, 'npm run audit:static');
  assert.equal(pkg.scripts.build, 'vite build');
});

