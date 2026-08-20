import { normalizeConversionRows, sortCategories } from './productCatalog.js';
import { normalizeQuantityStep, recommendedQuantityStep } from './fractionalUnits.js';
import { normalizeBarcodeRows, productAllCodes } from './productBarcodes.js';

const text = value => String(value ?? '').trim();
const lower = value => text(value).toLocaleLowerCase('id-ID');
const number = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = text(value).replace(/\s/g, '').replace(/rp/gi, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const money = value => Math.max(0, Math.round(number(value)));
const qty = value => Math.max(0, Math.round(number(value) * 1000) / 1000);
const bool = value => ['ya', 'yes', 'true', '1', 'aktif'].includes(lower(value));

export const INVENTORY_IMPORT_HEADERS = [
  'Nama Produk', 'Kategori', 'SKU', 'Barcode', 'Barcode Pabrik', 'Barcode Internal', 'Barcode Tambahan', 'Satuan Dasar', 'Stok Awal', 'Stok Minimum', 'Rak',
  'Harga Modal', 'Harga Eceran', 'Harga Grosir', 'Harga Proyek', 'Jual Pecahan', 'Kelipatan Jual',
  'Konversi & Harga Kemasan', 'Produk Induk', 'Nama Varian', 'Barcode Bersama'
];

export const INVENTORY_IMPORT_SAMPLE_ROWS = [
  ['Kabel Ties 20 cm Hitam', 'Kabel & Aksesori', 'BM-KAB-TIE-020', '899100000001', '899100000001', 'BM-KAB-TIE-020', '', 'pcs', 500, 100, 'A-01', 300, 500, 450, 425, 'Tidak', 1, 'pack=100@45000|42000|40000', '', '', ''],
  ['Kabel NYM 2x2,5', 'Kabel & Aksesori', 'BM-KAB-NYM-225', '899100000002', '899100000002', 'BM-KAB-NYM-225', 'supplier:SUP-NYM-225@meter*1', 'meter', 100, 20, 'A-02', 3000, 3900, 3700, 3500, 'Ya', 0.5, 'roll=50@185000|180000|175000', '', '', ''],
  ['Philips LED 6W', 'Lampu & Penerangan', 'BM-PHI-LED-006', '8719514345981', '8719514345981', 'BM-PHI-LED-006', '', 'pcs', 12, 4, 'L-01', 28000, 35000, 33000, 32000, 'Tidak', 1, '', 'Philips LED', '6W', '899200000001'],
  ['Philips LED 10W', 'Lampu & Penerangan', 'BM-PHI-LED-010', '8719514345998', '8719514345998', 'BM-PHI-LED-010', '', 'pcs', 8, 4, 'L-01', 38000, 48000, 45000, 44000, 'Tidak', 1, '', 'Philips LED', '10W', '899200000001']
];

export function parseCsvText(source = '') {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = String(source).replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some(value => text(value))) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some(value => text(value))) rows.push(row);
  return rows;
}

export function rowsToObjects(rows = []) {
  if (!rows.length) return [];
  const headers = rows[0].map(text);
  return rows.slice(1).map((values, index) => ({
    __rowNumber: index + 2,
    ...Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? '']))
  }));
}

const aliases = {
  name: ['nama produk', 'nama barang', 'produk', 'nama'],
  category: ['kategori'], sku: ['sku', 'kode sku'], barcode: ['barcode', 'kode barcode'],
  factoryBarcode: ['barcode pabrik', 'ean', 'ean barcode'], internalBarcode: ['barcode internal', 'barcode stiker'], extraBarcodes: ['barcode tambahan', 'multi barcode'],
  baseUnit: ['satuan dasar', 'satuan'], stock: ['stok awal', 'stok'], minStock: ['stok minimum', 'minimum stok'], rack: ['rak', 'lokasi rak'],
  modalPrice: ['harga modal', 'modal'], retail: ['harga eceran', 'harga jual', 'eceran'], wholesale: ['harga grosir', 'grosir'], project: ['harga proyek', 'proyek'],
  fractional: ['jual pecahan', 'boleh pecahan'], quantityStep: ['kelipatan jual', 'langkah jual'], conversions: ['konversi & harga kemasan', 'konversi', 'kemasan'],
  parentName: ['produk induk', 'induk'], variantName: ['nama varian', 'varian'], sharedBarcode: ['barcode bersama', 'shared barcode']
};

function valueFor(row, keys) {
  const entries = Object.entries(row || {});
  for (const alias of keys) {
    const found = entries.find(([key]) => lower(key) === alias);
    if (found) return found[1];
  }
  return '';
}

export function parseConversions(value, baseUnit = 'pcs') {
  const rows = text(value).split(/[;\n]+/).map(item => item.trim()).filter(Boolean).map(item => {
    const [unitFactorBarcode, pricesRaw = ''] = item.split('@');
    const [unitFactor, barcodeRaw = ''] = unitFactorBarcode.split('#');
    const [unit, factorRaw] = unitFactor.split('=').map(part => part.trim());
    const prices = pricesRaw.split('|').map(money);
    return { unit, factor: qty(factorRaw), barcode: text(barcodeRaw), prices: { retail: prices[0] || 0, wholesale: prices[1] || prices[0] || 0, project: prices[2] || prices[1] || prices[0] || 0 } };
  });
  return normalizeConversionRows(rows, baseUnit);
}

export function parseExtraBarcodes(value, baseUnit = 'pcs') {
  const rows = text(value).split(/[;\n]+/).map(item => item.trim()).filter(Boolean).map((item, index) => {
    const [typeCode, unitFactor = ''] = item.split('@');
    const separator = typeCode.indexOf(':');
    const type = separator > 0 ? typeCode.slice(0, separator).trim().toLowerCase() : 'alternate';
    const code = separator > 0 ? typeCode.slice(separator + 1).trim() : typeCode.trim();
    const [unitRaw, factorRaw] = unitFactor.split('*').map(part => part.trim());
    return { id: `IMP-BC-${index + 1}`, type, code, unit: unitRaw || baseUnit, factor: qty(factorRaw) || 1 };
  });
  return normalizeBarcodeRows(rows, { baseUnit });
}

function autoSku(name, variantName = '', used = new Set()) {
  const chunks = `${name} ${variantName}`.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const brand = (chunks[0] || 'BAR').slice(0, 3);
  const type = (chunks[1] || chunks[0] || 'ANG').slice(0, 3);
  const numeric = chunks.find(item => /\d/.test(item));
  const suffix = numeric ? String(numeric.match(/[\d.,]+/)?.[0] || '').replace(/\D/g, '').padStart(3, '0').slice(-3) : String(Math.abs(hash(`${name}|${variantName}`)) % 1000).padStart(3, '0');
  let candidate = `BM-${brand}-${type}-${suffix}`;
  let count = 2;
  while (used.has(lower(candidate))) candidate = `BM-${brand}-${type}-${suffix}-${count++}`;
  used.add(lower(candidate));
  return candidate;
}

function hash(value) {
  let output = 0;
  for (const char of String(value)) output = ((output << 5) - output) + char.charCodeAt(0) | 0;
  return output;
}

export function normalizeInventoryImportRow(row, options = {}) {
  const name = text(valueFor(row, aliases.name));
  const category = text(valueFor(row, aliases.category)) || 'Lainnya';
  const baseUnit = lower(valueFor(row, aliases.baseUnit)) || 'pcs';
  const allowFractional = bool(valueFor(row, aliases.fractional));
  const quantityStep = normalizeQuantityStep(valueFor(row, aliases.quantityStep), allowFractional, recommendedQuantityStep(baseUnit, category));
  const parentName = text(valueFor(row, aliases.parentName));
  const variantName = text(valueFor(row, aliases.variantName));
  const usedSkus = options.usedSkus || new Set();
  const requestedSku = text(valueFor(row, aliases.sku)).toUpperCase();
  const sku = requestedSku || autoSku(parentName || name, variantName, usedSkus);
  usedSkus.add(lower(sku));
  const legacyBarcode = text(valueFor(row, aliases.barcode));
  const factoryBarcode = text(valueFor(row, aliases.factoryBarcode)) || legacyBarcode;
  const internalBarcode = text(valueFor(row, aliases.internalBarcode)) || sku;
  const barcode = factoryBarcode || internalBarcode;
  const barcodes = parseExtraBarcodes(valueFor(row, aliases.extraBarcodes), baseUnit);
  const sharedBarcode = text(valueFor(row, aliases.sharedBarcode));
  return {
    rowNumber: Number(row.__rowNumber || 0),
    name,
    category,
    sku,
    barcode,
    factoryBarcode,
    internalBarcode,
    barcodes,
    baseUnit,
    stock: qty(valueFor(row, aliases.stock)),
    minStock: qty(valueFor(row, aliases.minStock)),
    rack: text(valueFor(row, aliases.rack)) || '-',
    modalPrice: money(valueFor(row, aliases.modalPrice)),
    prices: {
      retail: money(valueFor(row, aliases.retail)),
      wholesale: money(valueFor(row, aliases.wholesale)) || money(valueFor(row, aliases.retail)),
      project: money(valueFor(row, aliases.project)) || money(valueFor(row, aliases.wholesale)) || money(valueFor(row, aliases.retail))
    },
    allowFractional,
    quantityStep,
    conversions: parseConversions(valueFor(row, aliases.conversions), baseUnit),
    parentName,
    variantName,
    sharedBarcode,
    variantMode: Boolean(parentName && variantName),
    active: true,
    available: true,
    trackStock: true
  };
}

export function buildInventoryImportPlan(rawRows = [], { products = [], categories = [], branchId = '', mode = 'upsert' } = {}) {
  const branchProducts = products.filter(item => item.branchId === branchId);
  const existingBySku = new Map(branchProducts.map(item => [lower(item.sku), item]));
  const existingByDirectCode = new Map();
  const existingBySharedCode = new Map();
  for (const item of branchProducts) {
    for (const code of productAllCodes(item, { includeShared: false }).map(lower).filter(Boolean)) {
      if (!existingByDirectCode.has(code)) existingByDirectCode.set(code, item);
    }
    const sharedCode = lower(item.sharedBarcode);
    if (sharedCode) {
      if (!existingBySharedCode.has(sharedCode)) existingBySharedCode.set(sharedCode, []);
      existingBySharedCode.get(sharedCode).push(item);
    }
  }
  const usedSkus = new Set(products.map(item => lower(item.sku)).filter(Boolean));
  const importSkus = new Map();
  const importDirectCodes = new Map();
  const importSharedCodes = new Map();
  const rows = [];
  const errors = [];
  const warnings = [];
  const categorySet = new Set(categories.map(lower));
  rawRows.forEach((raw, index) => {
    const item = normalizeInventoryImportRow({ __rowNumber: raw.__rowNumber || index + 2, ...raw }, { usedSkus });
    const rowErrors = [];
    const rowWarnings = [];
    if (!item.name) rowErrors.push('Nama produk wajib diisi.');
    if (!item.sku) rowErrors.push('SKU tidak dapat dibuat.');
    if (item.prices.retail <= 0) rowWarnings.push('Harga eceran masih 0.');
    if (item.modalPrice > item.prices.retail && item.prices.retail > 0) rowWarnings.push('Harga modal lebih tinggi daripada harga eceran.');
    if (item.stock < 0 || item.minStock < 0) rowErrors.push('Stok tidak boleh negatif.');
    if (item.allowFractional && item.quantityStep >= 1) rowWarnings.push('Barang pecahan memakai langkah 1; periksa kembali kelipatan jual.');
    const skuKey = lower(item.sku);
    const barcodeKey = lower(item.barcode);
    if (importSkus.has(skuKey)) rowErrors.push(`SKU sama dengan baris ${importSkus.get(skuKey)}.`); else importSkus.set(skuKey, item.rowNumber);
    const directCodes = [item.sku, item.factoryBarcode, item.internalBarcode, ...(item.barcodes || []).map(row => row.code), ...(item.conversions || []).map(row => row.barcode)].map(lower).filter(Boolean);
    for (const code of new Set(directCodes)) {
      const previous = importDirectCodes.get(code);
      if (previous && previous.rowNumber !== item.rowNumber) rowErrors.push(`Kode/barcode sama dengan baris ${previous.rowNumber}.`);
      const sharedPrevious = importSharedCodes.get(code);
      if (sharedPrevious) rowErrors.push(`Kode/barcode ${code} sama dengan Barcode Bersama pada baris ${sharedPrevious.rowNumber}; hasil scan akan ambigu.`);
      if (!previous) importDirectCodes.set(code, { rowNumber: item.rowNumber });
    }
    const sharedKey = lower(item.sharedBarcode);
    if (sharedKey) {
      const sharedGroup = lower(item.parentName || item.name);
      const directPrevious = importDirectCodes.get(sharedKey);
      if (directPrevious) rowErrors.push(`Barcode Bersama ${item.sharedBarcode} sama dengan kode langsung pada baris ${directPrevious.rowNumber}; hasil scan akan ambigu.`);
      const previous = importSharedCodes.get(sharedKey);
      if (previous && previous.sharedGroup !== sharedGroup) rowErrors.push(`Barcode bersama sama dengan baris ${previous.rowNumber} tetapi produk induknya berbeda.`);
      else if (!previous) importSharedCodes.set(sharedKey, { rowNumber: item.rowNumber, sharedGroup });
    }

    const skuMatch = existingBySku.get(skuKey) || null;
    const directMatches = [...new Set(directCodes.map(code => existingByDirectCode.get(code)?.id).filter(Boolean))]
      .map(id => branchProducts.find(product => product.id === id))
      .filter(Boolean);
    if (directMatches.length > 1) rowErrors.push('Kode pada baris ini menunjuk ke lebih dari satu produk yang sudah ada. Periksa SKU/barcode sebelum import.');
    const directMatch = directMatches[0] || null;
    if (skuMatch && directMatch && skuMatch.id !== directMatch.id) rowErrors.push(`SKU menunjuk ke ${skuMatch.name}, tetapi barcode menunjuk ke ${directMatch.name}.`);
    const matched = skuMatch || directMatch || null;

    for (const code of new Set(directCodes)) {
      const sharedOwners = existingBySharedCode.get(code) || [];
      if (sharedOwners.some(owner => owner.id !== matched?.id)) {
        const owner = sharedOwners.find(candidate => candidate.id !== matched?.id) || sharedOwners[0];
        rowErrors.push(`Kode/barcode ${code} sudah dipakai sebagai Barcode Bersama oleh ${owner?.parentName || owner?.name || 'produk lain'}; hasil scan akan ambigu.`);
      }
    }
    if (sharedKey) {
      const directOwner = existingByDirectCode.get(sharedKey);
      if (directOwner && directOwner.id !== matched?.id) rowErrors.push(`Barcode Bersama ${item.sharedBarcode} sudah dipakai langsung oleh ${directOwner.name}; gunakan barcode lain.`);
      const sharedOwners = existingBySharedCode.get(sharedKey) || [];
      const desiredGroup = lower(item.parentName || item.name);
      const foreignSharedOwner = sharedOwners.find(owner => lower(owner.parentName || owner.name) !== desiredGroup);
      if (foreignSharedOwner) rowErrors.push(`Barcode Bersama ${item.sharedBarcode} sudah dipakai oleh produk induk ${foreignSharedOwner.parentName || foreignSharedOwner.name}.`);
    }
    if (mode === 'create-only' && matched) rowErrors.push('Produk sudah ada; mode hanya membuat produk baru.');
    const action = matched ? 'update' : 'create';
    if (!categorySet.has(lower(item.category))) rowWarnings.push(`Kategori baru “${item.category}” akan dibuat otomatis.`);
    const output = { ...item, id: matched?.id || '', branchId, action, existing: matched, errors: rowErrors, warnings: rowWarnings, valid: rowErrors.length === 0 };
    rows.push(output);
    rowErrors.forEach(message => errors.push({ rowNumber: item.rowNumber, message }));
    rowWarnings.forEach(message => warnings.push({ rowNumber: item.rowNumber, message }));
  });
  return {
    rows,
    validRows: rows.filter(row => row.valid),
    errors,
    warnings,
    categoriesToCreate: sortCategories([...new Set(rows.filter(row => row.valid && !categorySet.has(lower(row.category))).map(row => row.category))]),
    createCount: rows.filter(row => row.valid && row.action === 'create').length,
    updateCount: rows.filter(row => row.valid && row.action === 'update').length
  };
}

export async function parseInventoryFile(file) {
  const name = lower(file?.name);
  if (!file) throw new Error('Pilih file terlebih dahulu.');
  if (name.endsWith('.csv') || name.endsWith('.txt')) return rowsToObjects(parseCsvText(await file.text()));
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('Workbook tidak memiliki sheet yang dapat dibaca.');
    return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }).map((row, index) => ({ __rowNumber: index + 2, ...row }));
  }
  throw new Error('Format file harus CSV, XLSX, atau XLS.');
}

export function buildInventoryTemplateCsv() {
  const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return `\uFEFF${[INVENTORY_IMPORT_HEADERS, ...INVENTORY_IMPORT_SAMPLE_ROWS].map(row => row.map(csvCell).join(',')).join('\n')}\n`;
}

export async function buildInventoryTemplateWorkbook() {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([INVENTORY_IMPORT_HEADERS, ...INVENTORY_IMPORT_SAMPLE_ROWS]);
  sheet['!cols'] = INVENTORY_IMPORT_HEADERS.map((header, index) => ({ wch: Math.max(14, header.length + 3, index === 0 ? 28 : 0) }));
  XLSX.utils.book_append_sheet(workbook, sheet, 'Produk dan Stok');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
