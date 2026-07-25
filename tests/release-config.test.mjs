import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('versi project konsisten pada package dan VERSION.txt', async () => {
  const packageJson = JSON.parse(await read('package.json'));
  const version = (await read('VERSION.txt')).trim();
  assert.equal(packageJson.version, '4.2.0');
  assert.equal(version, packageJson.version);
});

test('persiapan Android memasang kamera, biometrik, versionCode, dan signing release', async () => {
  const script = await read('scripts/prepare-android.mjs');
  assert.match(script, /android\.permission\.CAMERA/);
  assert.match(script, /android\.permission\.USE_BIOMETRIC/);
  assert.match(script, /androidx\.biometric:biometric/);
  assert.match(script, /versionCode/);
  assert.match(script, /versionName/);
  assert.match(script, /signing\.gradle/);
  assert.match(script, /registerPlugin\(BumiMakmurNativePlugin\.class\)/);
});

test('workflow Spark Free release wajib memakai key tetap dan memverifikasi signature', async () => {
  const workflow = await read('.github/workflows/build-android.yml');
  for (const secret of [
    'ANDROID_KEYSTORE_BASE64',
    'ANDROID_KEYSTORE_PASSWORD',
    'ANDROID_KEY_ALIAS',
    'ANDROID_KEY_PASSWORD'
  ]) assert.match(workflow, new RegExp(secret));
  assert.match(workflow, /assembleRelease/);
  assert.match(workflow, /bundleRelease/);
  assert.match(workflow, /apksigner/);
  assert.doesNotMatch(workflow, /assembleDebug/);
  assert.match(workflow, /Spark-Free-Hybrid/);
  assert.doesNotMatch(workflow, /VITE_FIREBASE_FUNCTIONS_REGION/);
});

test('workflow pembuat keystore menggunakan JKS agar password key konsisten', async () => {
  const workflow = await read('.github/workflows/generate-signing-key.yml');
  assert.match(workflow, /-storetype JKS/);
  assert.match(workflow, /retention-days: 1/);
});

test('kamera diminta saat startup dan biometrik tersedia di pengaturan', async () => {
  const app = await read('src/App.jsx');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  const login = await read('src/screens/LoginScreen.jsx');
  assert.match(app, /requestStartupCameraPermission/);
  assert.match(settings, /Minta izin kamera saat aplikasi dibuka/);
  assert.match(settings, /Aktifkan untuk Akun Ini/);
  assert.match(login, /Buka dengan Biometrik/);
});

test('service worker and login session checks are updated for v4.2', async () => {
  const sw = await read('public/sw.js');
  const context = await read('src/store/PosContext.jsx');
  assert.match(sw, /spark-free-v4\.2\.0/);
  assert.match(context, /Sesi Firebase pada perangkat ini sudah berakhir/);
  assert.match(context, /Sesi Firebase sudah berakhir.*Email & Password/);
});
