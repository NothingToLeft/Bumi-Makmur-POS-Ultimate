import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Cloudflare Pages SPA redirect dan security headers tersedia', async () => {
  const redirects = await read('public/_redirects');
  const headers = await read('public/_headers');
  assert.match(redirects, /\/\* \/index\.html 200/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Cache-Control: no-cache, no-store/);
  assert.match(headers, /\/assets\/\*/);
});

test('manifest PWA mendukung Windows, Android, shortcuts, dan window controls overlay', async () => {
  const manifest = JSON.parse(await read('public/manifest.webmanifest'));
  assert.equal(manifest.name, 'Bumi Makmur POS');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.display_override.includes('window-controls-overlay'));
  assert.ok(manifest.shortcuts.some(item => item.url.includes('screen=pos')));
  assert.ok(manifest.icons.some(item => item.purpose === 'maskable'));
});

test('shortcut PWA dibaca aplikasi dan public receipt route aman untuk SPA hosting', async () => {
  const app = await read('src/App.jsx');
  assert.match(app, /URLSearchParams\(window\.location\.search\)\.get\('screen'\)/);
  assert.match(app, /window\.location\.pathname\.match/);
  assert.match(app, /receipt/);
  await access(new URL('../src/screens/PublicReceiptScreen.jsx', import.meta.url));
});

test('environment tidak lagi meminta Storage atau Functions', async () => {
  const env = await read('.env.example');
  const pkg = JSON.parse(await read('package.json'));
  assert.doesNotMatch(env, /STORAGE_BUCKET|FUNCTIONS_REGION/);
  assert.match(env, /VITE_PUBLIC_APP_URL=https:\/\/bumi-makmur\.my\.id/);
  assert.doesNotMatch(pkg.scripts['firebase:deploy'], /storage|functions|hosting/);
});
