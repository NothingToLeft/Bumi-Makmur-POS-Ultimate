const normalize = value => String(value ?? '').trim();
const normalizeKey = value => normalize(value).toLowerCase();

export const PRODUCT_BARCODE_TYPES = Object.freeze([
  { id: 'factory', label: 'Pabrik / EAN' },
  { id: 'internal', label: 'Internal / Stiker' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'package', label: 'Kemasan / Satuan Jual' },
  { id: 'alternate', label: 'Alternatif' }
]);

export function normalizeBarcodeRows(rows = [], { baseUnit = 'pcs' } = {}) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    const code = normalize(row?.code || row?.barcode);
    if (!code) return null;
    const key = normalizeKey(code);
    if (seen.has(key)) return null;
    seen.add(key);
    const factor = Math.max(0.000001, Number(row?.factor || 1));
    return {
      id: normalize(row?.id) || `BC-${index + 1}`,
      code,
      type: PRODUCT_BARCODE_TYPES.some(item => item.id === row?.type) ? row.type : 'alternate',
      unit: normalize(row?.unit) || baseUnit,
      factor,
      primary: Boolean(row?.primary),
      note: normalize(row?.note)
    };
  }).filter(Boolean);
}

export function productBarcodeEntries(product = {}) {
  const baseUnit = product.baseUnit || 'pcs';
  const output = [];
  const push = entry => {
    const code = normalize(entry?.code);
    if (!code) return;
    const key = normalizeKey(code);
    if (output.some(item => normalizeKey(item.code) === key)) return;
    output.push({ unit: baseUnit, factor: 1, ...entry, code });
  };

  push({ code: product.factoryBarcode, type: 'factory', source: 'factoryBarcode' });
  push({ code: product.internalBarcode, type: 'internal', source: 'internalBarcode' });
  push({ code: product.barcode, type: product.factoryBarcode ? 'factory' : 'legacy', source: 'barcode' });
  push({ code: product.sku, type: 'internal', source: 'sku' });

  for (const row of normalizeBarcodeRows(product.barcodes, { baseUnit })) {
    push({ ...row, source: 'barcodes' });
  }
  for (const row of product.conversions || []) {
    if (!row?.barcode) continue;
    push({ code: row.barcode, type: 'package', unit: row.unit || baseUnit, factor: Math.max(0.000001, Number(row.factor || 1)), source: 'conversion' });
  }
  for (const variant of product.variants || []) {
    if (!variant?.barcode) continue;
    push({ code: variant.barcode, type: 'legacy-variant', variant: variant.name || '', source: 'variant' });
  }
  return output;
}

export function productAllCodes(product = {}, { includeShared = true } = {}) {
  const values = productBarcodeEntries(product).map(item => item.code);
  if (includeShared && product.sharedBarcode) values.push(String(product.sharedBarcode).trim());
  return [...new Set(values.filter(Boolean).map(value => String(value).trim()))];
}

export function barcodeForPrint(product = {}, mode = 'internal') {
  const internal = normalize(product.internalBarcode) || normalize(product.sku);
  const factory = normalize(product.factoryBarcode) || (normalize(product.barcode) && normalize(product.barcode) !== internal ? normalize(product.barcode) : '');
  if (mode === 'factory') return factory || internal;
  if (mode === 'auto') return factory || internal || normalize(product.barcode);
  return internal || factory || normalize(product.barcode);
}

export function barcodeLabelForPrint(product = {}, mode = 'internal') {
  const code = barcodeForPrint(product, mode);
  if (!code) return 'Tanpa barcode';
  const internal = normalize(product.internalBarcode) || normalize(product.sku);
  const factory = normalize(product.factoryBarcode);
  if (factory && normalizeKey(code) === normalizeKey(factory)) return 'Barcode pabrik';
  if (internal && normalizeKey(code) === normalizeKey(internal)) return 'Barcode internal';
  return 'Barcode';
}

export function barcodeSearchText(product = {}) {
  return productAllCodes(product).join(' ');
}
