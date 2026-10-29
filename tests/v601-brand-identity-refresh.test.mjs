import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url));
const text = async path => (await read(path)).toString('utf8');

const PNG_MAGIC = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

test('v6.1.0 memakai logo resmi Bumi Makmur 2 pada aset global', async () => {
  const [pkg, version, logoSvg, iconSvg, defaults, app, login, sw] = await Promise.all([
    text('package.json'), text('VERSION.txt'), text('public/logo-bm.svg'), text('public/icon.svg'),
    text('src/data/defaults.js'), text('src/App.jsx'), text('src/screens/LoginScreen.jsx'), text('public/sw.js')
  ]);
  assert.equal(JSON.parse(pkg).version, '6.5.1');
  assert.equal(version.trim(), '6.5.1');
  assert.match(logoSvg, /Bumi Makmur 2/);
  assert.match(logoSvg, /data:image\/png;base64/);
  assert.match(iconSvg, /data:image\/png;base64/);
  assert.match(defaults, /receiptLogo: '\/logo-bm\.svg'/);
  assert.match(app, /src="\/logo-bm\.svg"/);
  assert.match(login, /src="\/logo-bm\.svg"/);
  assert.match(sw, /freesync-v6\.5\.1/);
});

test('aset launcher, maskable, splash, master, dan Windows icon tersedia', async () => {
  const pngFiles = [
    'public/branding/bumi-makmur-2-master.png',
    'public/icons/logo-bm-1024.png',
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/maskable-512.png',
    'public/icons/splash-portrait.png',
    'public/icons/splash-landscape.png',
    'public/icons/logo-bm-wordmark.png'
  ];
  for (const path of pngFiles) {
    const data = await read(path);
    assert.ok(data.subarray(0, 8).equals(PNG_MAGIC), `${path} harus PNG valid`);
    assert.ok(data.length > 1000, `${path} terlalu kecil / kosong`);
  }
  const ico = await read('build/icon.ico');
  assert.equal(ico[0], 0);
  assert.equal(ico[1], 0);
  assert.equal(ico[2], 1);
  assert.equal(ico[3], 0);
  assert.ok((await stat(new URL('../build/icon.ico', import.meta.url))).size > 10_000);
});

test('prepare Android tetap mengambil aset launcher dan splash global terbaru', async () => {
  const android = await text('scripts/prepare-android.mjs');
  assert.match(android, /publicIconDir/);
  assert.match(android, /icon-192\.png/);
  assert.match(android, /splash-portrait\.png/);
  assert.match(android, /splash-landscape\.png/);
});
