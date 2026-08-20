import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildVariantGroupDraft } from '../src/utils/variantProducts.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v5.8.1 mempertahankan markup per varian ketika grup produk dibuka ulang', () => {
  const draft = buildVariantGroupDraft([
    {
      id: 'P-BLACK', name: 'Cable Ties VISALUX 3.6 x 250 mm Hitam', parentName: 'Cable Ties VISALUX',
      variantGroupId: 'VG-CAB-TIES', variantName: '3.6 x 250 mm Hitam', sku: 'BM-CAB-BLK', stock: 500,
      modalPrice: 150, prices: { retail: 300, wholesale: 250, project: 225 },
      markups: { retail: 100, wholesale: 66.67, project: 50 }
    },
    {
      id: 'P-WHITE', name: 'Cable Ties VISALUX 3.6 x 250 mm Putih', parentName: 'Cable Ties VISALUX',
      variantGroupId: 'VG-CAB-TIES', variantName: '3.6 x 250 mm Putih', sku: 'BM-CAB-WHT', stock: 200,
      modalPrice: 160, prices: { retail: 320, wholesale: 270, project: 240 },
      markups: { retail: 100, wholesale: 68.75, project: 50 }
    }
  ]);

  assert.equal(draft.variantRows.length, 2);
  const black = draft.variantRows.find(row => row.id === 'P-BLACK');
  const white = draft.variantRows.find(row => row.id === 'P-WHITE');
  assert.deepEqual(black.markups, { retail: 100, wholesale: 66.67, project: 50 });
  assert.deepEqual(white.markups, { retail: 100, wholesale: 68.75, project: 50 });
});

test('NumberInput memiliki draft lokal sehingga nilai angka dapat diketik, dikosongkan, dan memakai koma desimal', async () => {
  const ui = await read('src/components/ui.jsx');
  assert.match(ui, /export function NumberInput/);
  assert.match(ui, /const \[draft, setDraft\] = React\.useState/);
  assert.match(ui, /if \(!focused\) setDraft/);
  assert.match(ui, /replace\(',', '\.'\)/);
  assert.match(ui, /if \(allowEmpty\) onValueChange\?\.\(''\)/);
  assert.match(ui, /type="text"[\s\S]*inputMode=\{inputMode\}/);
});

test('Markup varian tidak lagi diturunkan langsung dari harga saat sedang diketik', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  assert.match(products, /markups:\s*\{[\s\S]*retail:/);
  assert.match(products, /value=\{row\.markups\?\.retail \?\? ''\}/);
  assert.match(products, /markups:\s*\{ \.\.\.row\.markups, retail: nextMarkup \}/);
  assert.match(products, /PRICE_TIERS\.map\(tier => \[/);
  assert.match(products, /markups:\s*Object\.fromEntries/);
  assert.doesNotMatch(products, /value=\{calculateMarkupPercent\(row\.modalPrice, row\.prices\.retail\) \|\| ''\}/);
});

test('input angka operasional utama distandarkan ke NumberInput, bukan input number browser mentah', async () => {
  const files = [
    'src/screens/ProductsScreen.jsx',
    'src/screens/POSScreen.jsx',
    'src/screens/PurchasesScreen.jsx',
    'src/screens/OrdersScreen.jsx',
    'src/screens/TransactionsScreen.jsx',
    'src/screens/BusinessToolsScreen.jsx',
    'src/screens/DeviceSettingsScreens.jsx',
    'src/components/BulkBarcodeLabelsModal.jsx'
  ];
  for (const file of files) {
    const source = await read(file);
    assert.match(source, /NumberInput/, `${file} harus menggunakan NumberInput`);
    assert.doesNotMatch(source, /type="number"/, `${file} tidak boleh menyisakan input number browser mentah`);
  }
});



test('Produk Induk + Varian boleh dimulai dari satu SKU dan tidak memaksakan preset LED', async () => {
  const products = await read('src/screens/ProductsScreen.jsx');
  assert.match(products, /return \[createVariantRow\(form\.name, 'Varian 1', products\)\]/);
  assert.match(products, /variantRows\.length < 1/);
  assert.match(products, /disabled=\{variantRows\.length <= 1\}/);
  assert.match(products, /Boleh mulai dari satu varian/);
  assert.doesNotMatch(products, /Produk varian minimal memiliki dua varian/);
});

test('hotfix v5.8.1 tetap tercatat setelah upgrade v6', async () => {
  const [defaults, sw, settings, pkg] = await Promise.all([
    read('src/data/defaults.js'), read('public/sw.js'), read('src/screens/DeviceSettingsScreens.jsx'), read('package.json')
  ]);
  assert.match(defaults, /APP_VERSION\s*=\s*'6\.3\.0'/);
  assert.match(sw, /freesync-v6\.3\.0/);
  assert.match(settings, /Numeric Input & Variant Pricing Stability v5\.8\.1/);
  assert.equal(JSON.parse(pkg).version, '6.3.0');
});
