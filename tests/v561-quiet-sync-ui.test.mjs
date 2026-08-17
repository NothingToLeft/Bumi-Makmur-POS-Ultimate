import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('halaman cloud v5.7.0 ringkas tanpa panel status duplikat', async () => {
  const settings = await source('src/screens/DeviceSettingsScreens.jsx');
  assert.match(settings, /Detail teknis disembunyikan agar halaman tetap ringkas/);
  assert.match(settings, /<details className="group"/);
  assert.doesNotMatch(settings, /Status: \{syncStatus\?\.title/);
});

test('banner cloud global tidak berulang saat berada di Pengaturan', async () => {
  const app = await source('src/App.jsx');
  assert.match(app, /active!==\'settings\'&&cloudError/);
  assert.match(app, /Online · data lokal aktif · cloud perlu diperiksa/);
});
