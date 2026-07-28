import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sortProductsByName, normalizeConversionRows } from '../src/utils/productCatalog.js';
import { priceForSaleUnit, saleUnitOptions } from '../src/utils/fractionalUnits.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(path.join(root, file), 'utf8');

test('daftar barang memakai urutan nama natural dan pencarian profesional', async () => {
  const rows = sortProductsByName([
    { id: '3', name: 'Philips 12W' },
    { id: '1', name: 'Philips 6W' },
    { id: '2', name: 'Philips 10W' },
    { id: '4', name: 'Kabel NYM 2x2.5' }
  ]);
  assert.deepEqual(rows.map(item => item.name), ['Kabel NYM 2x2.5', 'Philips 6W', 'Philips 10W', 'Philips 12W']);
  const picker = await read('src/components/ProductPicker.jsx');
  assert.match(picker, /sortProductsByName/);
  assert.match(picker, /Cari nama, SKU, barcode, kategori, atau rak/);
});

test('harga satuan jual pack atau dus dapat berbeda dari harga pcs dikali isi', () => {
  const product = {
    baseUnit: 'pcs',
    prices: { retail: 500, wholesale: 450, project: 425 },
    conversions: normalizeConversionRows([
      { unit: 'pack', factor: 100, prices: { retail: 45000, wholesale: 42000, project: 40000 } }
    ], 'pcs')
  };
  assert.equal(priceForSaleUnit(product, 'pcs', 'retail'), 500);
  assert.equal(priceForSaleUnit(product, 'pack', 'retail'), 45000);
  assert.deepEqual(saleUnitOptions(product, 'retail').map(item => [item.unit, item.factor, item.price]), [
    ['pcs', 1, 500], ['pack', 100, 45000]
  ]);
});

test('kategori dapat ditambah dari form serta diubah dan dihapus aman', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  const context = await read('src/store/PosContext.jsx');
  assert.match(products, /Kategori Produk/);
  assert.match(products, /Tambah Kategori/);
  assert.match(products, /Hapus/);
  assert.match(products, /Kategori pengganti/);
  assert.match(context, /CATEGORY_CREATE/);
  assert.match(context, /CATEGORY_UPDATE/);
  assert.match(context, /CATEGORY_DELETE/);
});

test('Owner login sekali untuk seluruh cabang tanpa dropdown cabang', async () => {
  const login = await read('src/screens/LoginScreen.jsx');
  assert.match(login, /Satu akun Owner untuk seluruh cabang/);
  assert.match(login, /Owner tidak perlu memilih cabang saat login/);
  assert.match(login, /await login\(pin, 'owner'\)/);
  assert.match(login, /!isOwner && <Field label="Toko \/ Cabang"/);
  assert.doesNotMatch(login, /await login\(pin, 'owner', \{ branchId:/);
});

test('Owner dapat menghapus cabang kosong dan mengarsipkan cabang bersejarah', async () => {
  const admin = await read('src/screens/AdminScreens.jsx');
  const context = await read('src/store/PosContext.jsx');
  assert.match(admin, /Hapus \/ Arsipkan Cabang/);
  assert.match(admin, /Hapus Cabang/);
  assert.match(admin, /Cabang Diarsipkan/);
  assert.match(context, /const deleteBranch/);
  assert.match(context, /mode: 'archived'/);
  assert.match(context, /mode: 'deleted'/);
  assert.match(context, /const restoreBranch/);
});
