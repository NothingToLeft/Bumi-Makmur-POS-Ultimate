import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v5.1 menyediakan installer Windows EXE dan MSI dengan Electron terisolasi', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const main = await read('electron/main.cjs');
  const preload = await read('electron/preload.cjs');
  const workflow = await read('.github/workflows/build-windows.yml');
  assert.equal(pkg.version, '5.2.2');
  assert.equal(pkg.main, 'electron/main.cjs');
  assert.ok(pkg.devDependencies.electron);
  assert.ok(pkg.devDependencies['electron-builder']);
  assert.deepEqual(pkg.build.win.target.map(item => item.target), ['nsis', 'msi']);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /sandbox:\s*true/);
  assert.match(main, /setWindowOpenHandler/);
  assert.match(main, /registerSchemesAsPrivileged/);
  assert.match(main, /protocol\.handle\(APP_SCHEME/);
  assert.match(main, /setPermissionRequestHandler/);
  assert.match(preload, /contextBridge\.exposeInMainWorld\('bmDesktop'/);
  assert.match(workflow, /windows-release/);
  assert.match(workflow, /desktop:dist/);
  assert.match(pkg.scripts['desktop:dist'], /--publish never/);
  assert.match(pkg.scripts['desktop:dist:nsis'], /--publish never/);
  assert.match(pkg.scripts['desktop:dist:msi'], /--publish never/);
  assert.match(workflow, /VITE_FIREBASE_PROJECT_ID/);
  assert.match(workflow, /\.env\.production/);
  assert.match(workflow, /release\/windows\/\*\.exe/);
  assert.match(workflow, /release\/windows\/\*\.msi/);
});

test('nama toko dapat diubah Owner dan diterapkan lintas login, shell, nota, QRIS default, dan layar pelanggan', async () => {
  const context = await read('src/store/PosContext.jsx');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  const app = await read('src/App.jsx');
  const login = await read('src/screens/LoginScreen.jsx');
  const customerDisplay = await read('src/screens/DesktopCustomerDisplayScreen.jsx');
  assert.match(context, /saveStoreIdentity/);
  assert.match(context, /companyName/);
  assert.match(context, /qrisMerchantName/);
  assert.match(context, /receiptWhatsappNote/);
  assert.match(context, /publishPublicLoginDirectory/);
  assert.match(settings, /Identitas Cabang Aktif/);
  assert.match(settings, /Simpan Identitas Cabang/);
  assert.match(app, /db\.configs\.companyName/);
  assert.match(login, /loginDirectory\?\.businessName/);
  assert.match(customerDisplay, /companyName/);
});

test('input produk baru mendukung kamera dan scanner USB Bluetooth tanpa mengetik barcode', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  assert.match(products, /Scan Barcode Barang Baru/);
  assert.match(products, /BarcodeDetector/);
  assert.match(products, /requestCameraPermission/);
  assert.match(products, /Scanner USB\/Bluetooth/);
  assert.match(products, /Barcode ini sudah dipakai barang lain/);
  assert.match(products, /placeholder="Scan tanpa mengetik nomor"/);
});

test('kasir desktop memiliki shortcut dan layar pelanggan kedua', async () => {
  const pos = await read('src/screens/POSScreen.jsx');
  const context = await read('src/store/PosContext.jsx');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  assert.match(pos, /event\.key === 'F2'/);
  assert.match(pos, /event\.key === 'F4'/);
  assert.match(pos, /event\.key === 'F8'/);
  assert.match(pos, /event\.key === 'F9'/);
  assert.match(context, /BroadcastChannel/);
  assert.match(settings, /Buka Layar 2/);
});


test('installer Windows dan Android dipublikasikan otomatis ke GitHub Releases', async () => {
  const windowsWorkflow = await read('.github/workflows/build-windows.yml');
  const androidWorkflow = await read('.github/workflows/build-android.yml');
  for (const workflow of [windowsWorkflow, androidWorkflow]) {
    assert.match(workflow, /contents:\s*write/);
    assert.match(workflow, /gh release create/);
    assert.match(workflow, /gh release upload/);
    assert.match(workflow, /--clobber/);
    assert.match(workflow, /github\.token/);
  }
  assert.match(windowsWorkflow, /release\/windows\/\*\.exe/);
  assert.match(windowsWorkflow, /release\/windows\/\*\.msi/);
  assert.match(androidWorkflow, /release\/android\/\*\.apk/);
  assert.match(androidWorkflow, /release\/android\/\*\.aab/);
});
