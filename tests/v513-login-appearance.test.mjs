import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_LOGIN_APPEARANCE, normalizeLoginAppearance, renderLoginTemplate } from '../src/utils/loginAppearance.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('normalisasi tampilan login memberi fallback aman dan membatasi teks', () => {
  const normalized = normalizeLoginAppearance({ chooserTitle: '', headerText: 'A'.repeat(120) });
  assert.equal(normalized.chooserTitle, DEFAULT_LOGIN_APPEARANCE.chooserTitle);
  assert.equal(normalized.headerText.length, 80);
  assert.equal(normalizeLoginAppearance({ headerText: '' }).headerText, '');
});

test('template subheader login mendukung cabang, brand, dan versi', () => {
  const text = renderLoginTemplate('{business} · {branch} · v{version}', {
    business: 'Bumi Makmur', branch: 'Bumi Makmur Utama', version: '5.1.3'
  });
  assert.equal(text, 'Bumi Makmur · Bumi Makmur Utama · v5.1.3');
});

test('Owner memiliki panel khusus untuk mengatur seluruh tulisan halaman login', async () => {
  const [settings, login, context, cloud] = await Promise.all([
    read('src/screens/DeviceSettingsScreens.jsx'),
    read('src/screens/LoginScreen.jsx'),
    read('src/store/PosContext.jsx'),
    read('src/services/cloudStore.js')
  ]);
  assert.match(settings, /Tampilan Halaman Login/);
  assert.match(settings, /Judul Besar Login/);
  assert.match(settings, /Teks di Bawah Header/);
  assert.match(settings, /Preview Langsung/);
  assert.match(settings, /Kembalikan Teks Standar/);
  assert.match(login, /appearance\.chooserTitle/);
  assert.match(login, /renderLoginTemplate/);
  assert.match(context, /saveLoginAppearance/);
  assert.match(cloud, /loginAppearance: normalizeLoginAppearance/);
});
