import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('halaman login memisahkan Owner dan Karyawan secara tegas', async () => {
  const login = await read('src/screens/LoginScreen.jsx');
  const context = await read('src/store/PosContext.jsx');
  const appearance = await read('src/utils/loginAppearance.js');
  assert.match(login, /appearance\.ownerTitle/);
  assert.match(login, /appearance\.employeeTitle/);
  assert.match(appearance, /Login Owner/);
  assert.match(appearance, /Login Karyawan/);
  assert.match(login, /Toko \/ Cabang/);
  assert.match(login, /Nama Login Karyawan/);
  assert.match(login, /Biometrik tidak akan muncul otomatis/);
  assert.match(login, /expectedRole: 'owner'/);
  assert.match(login, /expectedRole: 'employee'/);
  assert.match(context, /PIN tersebut milik karyawan/);
  assert.match(context, /PIN tersebut milik Owner/);
});

test('akun karyawan dikelola dari Pengaturan dan dibuat lewat Auth sekunder', async () => {
  const settings = await read('src/screens/DeviceSettingsScreens.jsx');
  const admin = await read('src/screens/AdminScreens.jsx');
  const auth = await read('src/services/cloudAuth.js');
  assert.match(settings, /EmployeeManagementPanel/);
  assert.match(settings, /\['employees','Karyawan'\]/);
  assert.match(admin, /Karyawan & Hak Akses/);
  assert.match(admin, /Karyawan Baru/);
  assert.match(admin, /Hapus Permanen/);
  assert.match(admin, /Store Manager dapat membuat dan mengelola Kasir/);
  assert.match(auth, /initializeApp\(firebaseConfig, secondaryName\)/);
  assert.match(auth, /createUserWithEmailAndPassword\(secondaryAuth/);
  assert.doesNotMatch(auth, /firebase\/functions|httpsCallable/);
});

test('komponen pencarian memiliki ikon, padding, tombol hapus, dan dipakai konsisten di kasir', async () => {
  const ui = await read('src/components/ui.jsx');
  const css = await read('src/index.css');
  const pos = await read('src/screens/POSScreen.jsx');
  const products = await read('src/screens/ProductsScreen.jsx');
  assert.match(ui, /className="search-field-icon"/);
  assert.match(ui, /field-input search-field-input/);
  assert.match(ui, /className="search-field-clear"/);
  assert.match(ui, /onKeyDown=\{onKeyDown\}/);
  assert.match(css, /padding-left:\s*3\.1rem\s*!important/);
  assert.match(css, /padding-right:\s*3rem\s*!important/);
  assert.match(css, /field-input-trailing[^{]*\{[^}]*padding-right:\s*2\.75rem\s*!important/s);
  assert.match(pos, /<SearchBox/);
  assert.doesNotMatch(pos, /className="pl-10"/);
  assert.match(products, /className="field-input-trailing"/);
});

test('error Firebase diterjemahkan dan listener tidak dibuka dengan sesi Auth yang salah', async () => {
  const errors = await read('src/utils/cloudErrors.js');
  const context = await read('src/store/PosContext.jsx');
  const app = await read('src/App.jsx');
  assert.match(errors, /permission-denied/);
  assert.match(errors, /Akses cloud ditolak/);
  assert.match(context, /auth\.currentUser\.uid !== profile\.id/);
  assert.match(context, /friendlyCloudError/);
  assert.doesNotMatch(app, /bg-red-600[^\n]*Missing or insufficient permissions/);
});

test('Firestore mengizinkan bootstrap pertama dan profil sendiri tanpa membuka daftar publik', async () => {
  const rules = await read('firestore.rules');
  assert.match(rules, /match \/stores\/\{storeId\}\/system\/bootstrap/);
  assert.match(rules, /allow get: if signedIn\(\)/);
  assert.match(rules, /allow list: if false/);
  assert.match(rules, /uid == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.role in \['manager', 'kasir'\]/);
});
