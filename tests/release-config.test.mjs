import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('versi project konsisten pada package dan VERSION.txt', async () => {
  const packageJson = JSON.parse(await read('package.json'));
  const version = (await read('VERSION.txt')).trim();
  assert.equal(packageJson.version, '5.3.0');
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
  assert.match(script, /ic_launcher_foreground\.png/);
  assert.match(script, /splash\.png/);
});

test('workflow mendukung test, web PWA, Android release, dan gabungan', async () => {
  const workflow = await read('.github/workflows/build-android.yml');
  for (const mode of ['test-only', 'web-only', 'android-release', 'web-and-android']) assert.match(workflow, new RegExp(mode));
  for (const secret of ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD']) {
    assert.match(workflow, new RegExp(secret));
  }
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /Compile web source in test-only mode/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /assembleRelease/);
  assert.match(workflow, /bundleRelease/);
  assert.match(workflow, /apksigner/);
  assert.doesNotMatch(workflow, /assembleDebug/);
});

test('workflow Firebase hanya deploy rules dan indexes Spark', async () => {
  const workflow = await read('.github/workflows/deploy-firebase.yml');
  assert.match(workflow, /firestore:rules,firestore:indexes/);
  assert.match(workflow, /firebase-tools@14/);
  assert.doesNotMatch(workflow, /storage|functions|hosting/);
  assert.match(workflow, /google-github-actions\/auth@v3/);
  assert.match(workflow, /actions\/setup-node@v6/);
});

test('workflow pembuat keystore menggunakan JKS dan action Node 24 terbaru', async () => {
  const workflow = await read('.github/workflows/generate-signing-key.yml');
  assert.match(workflow, /-storetype JKS/);
  assert.match(workflow, /retention-days: 1/);
  assert.match(workflow, /actions\/setup-java@v5/);
  assert.match(workflow, /actions\/upload-artifact@v6/);
});

test('kamera diminta saat startup dan biometrik tersedia di pengaturan', async () => {
  const app = await read('src/App.jsx');
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  const login = await read('src/screens/LoginScreen.jsx');
  assert.match(app, /requestStartupCameraPermission/);
  assert.match(settings, /Minta izin kamera saat aplikasi dibuka/);
  assert.match(settings, /Aktifkan untuk Akun Ini/);
  assert.match(login, /Masuk dengan Sidik Jari \/ Face ID/);
});
