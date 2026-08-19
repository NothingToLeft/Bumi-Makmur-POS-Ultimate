import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  cameraDisplayLabel, cameraFacingKind, clampCameraZoom, nextCameraDevice, normalizeScannerCode, pickPreferredCamera
} from '../src/utils/cameraScanner.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Smart Scanner menormalisasi kode dan memilih kamera depan/belakang secara stabil', () => {
  const devices = [
    { deviceId: 'front-1', label: 'Front Camera' },
    { deviceId: 'back-1', label: 'Rear Camera' }
  ];
  assert.equal(normalizeScannerCode(' 899123\n'), '899123');
  assert.equal(cameraFacingKind(devices[0], 0, 2), 'user');
  assert.equal(cameraFacingKind(devices[1], 1, 2), 'environment');
  assert.match(cameraDisplayLabel(devices[1], 1, 2), /Belakang/);
  assert.equal(pickPreferredCamera(devices, { facingMode: 'environment' }).deviceId, 'back-1');
  assert.equal(pickPreferredCamera(devices, { preferredDeviceId: 'front-1', facingMode: 'environment' }).deviceId, 'front-1');
  assert.equal(nextCameraDevice(devices, 'front-1').deviceId, 'back-1');
});

test('zoom kamera dibatasi sesuai kapabilitas perangkat', () => {
  const caps = { zoom: { min: 1, max: 4, step: 0.5 } };
  assert.equal(clampCameraZoom(0.2, caps), 1);
  assert.equal(clampCameraZoom(2.2, caps), 2);
  assert.equal(clampCameraZoom(9, caps), 4);
});

test('v5.8 mempertahankan ZXing gratis sebagai scanner multi-format dengan kontrol kamera profesional', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const scanner = await read('src/components/BarcodeScannerModal.jsx');
  assert.equal(pkg.version, '5.8.1');
  assert.equal(pkg.dependencies['@zxing/browser'], '0.2.1');
  assert.match(scanner, /import\('@zxing\/browser'\)/);
  assert.match(scanner, /BrowserMultiFormatReader/);
  assert.match(scanner, /BrowserCodeReader\.listVideoInputDevices/);
  assert.match(scanner, /facingMode/);
  assert.match(scanner, /deviceId/);
  assert.match(scanner, /torch/);
  assert.match(scanner, /zoom/);
  assert.match(scanner, /Scan dari Foto/);
  assert.match(scanner, /Mode Scan Cepat/);
  assert.match(scanner, /Scanner USB \/ Bluetooth/);
});

test('scanner yang sama dipakai Kasir, input Produk, pemilih barang, dan Tes Scanner', async () => {
  const pos = await read('src/screens/POSScreen.jsx');
  const products = await read('src/screens/ProductsScreen.jsx');
  const picker = await read('src/components/ProductPicker.jsx');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  assert.match(pos, /BarcodeScannerModal/);
  assert.match(pos, /allowContinuous/);
  assert.match(products, /BarcodeScannerModal/);
  assert.doesNotMatch(products, /BarcodeDetector/);
  assert.match(picker, /Scan untuk Pilih Barang/);
  assert.match(picker, /findProductByCode/);
  assert.match(settings, /Tes Scanner Barcode/);
  assert.match(settings, /Kamera & Scanner Barcode/);
});
