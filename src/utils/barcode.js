import { priceForSaleUnit } from './fractionalUnits.js';
import { productBarcodeEntries } from './productBarcodes.js';

const normalize = value => String(value ?? '').trim().toLowerCase();

function directMatch(product, code) {
  const entry = productBarcodeEntries(product).find(item => normalize(item.code) === code);
  if (!entry) return null;

  if (entry.source === 'variant') {
    const variant = (product.variants || []).find(item => normalize(item?.barcode) === code);
    return {
      product,
      options: {
        variant: variant?.name || entry.variant || '',
        price: Number(product.prices?.retail ?? 0) + Number(variant?.priceDelta || 0)
      }
    };
  }

  if (entry.source === 'conversion') {
    return {
      product,
      options: {
        unit: entry.unit,
        price: priceForSaleUnit(product, entry.unit, 'retail')
      }
    };
  }

  const customUnit = entry.source === 'barcodes' && (String(entry.unit || product.baseUnit) !== String(product.baseUnit) || Number(entry.factor || 1) !== 1);
  return {
    product,
    options: customUnit ? {
      directCode: true,
      unit: entry.unit || product.baseUnit,
      factor: Math.max(0.000001, Number(entry.factor || 1)),
      barcodeType: entry.type
    } : {}
  };
}

export function findProductsByCode(products = [], rawCode = '') {
  const code = normalize(rawCode);
  if (!code) return [];
  const active = products.filter(product => product && product.active !== false && product.available !== false);

  const direct = active.map(product => directMatch(product, code)).filter(Boolean);
  if (direct.length) return direct;

  return active
    .filter(product => normalize(product.sharedBarcode) === code)
    .map(product => ({ product, options: { sharedBarcode: true, matchedBarcode: String(product.sharedBarcode || '') } }));
}

export function findProductByCode(products = [], rawCode = '') {
  const matches = findProductsByCode(products, rawCode);
  if (!matches.length) return null;
  if (matches.length === 1) return matches[0];
  return {
    product: null,
    options: {},
    matches,
    ambiguous: true,
    code: String(rawCode ?? '').trim()
  };
}

export function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const tagName = String(target.tagName || '').toLowerCase();
  return Boolean(target.isContentEditable || ['input', 'textarea', 'select'].includes(tagName));
}
