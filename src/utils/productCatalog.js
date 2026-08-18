const collator = new Intl.Collator('id-ID', {
  numeric: true,
  sensitivity: 'base',
  ignorePunctuation: true
});

const text = value => String(value ?? '').trim();

export function compareProductNames(first, second) {
  const nameCompare = collator.compare(text(first?.name), text(second?.name));
  if (nameCompare !== 0) return nameCompare;
  const variantCompare = collator.compare(text(first?.variantName), text(second?.variantName));
  if (variantCompare !== 0) return variantCompare;
  const skuCompare = collator.compare(text(first?.sku), text(second?.sku));
  if (skuCompare !== 0) return skuCompare;
  return collator.compare(text(first?.id), text(second?.id));
}

export function sortProductsByName(products = []) {
  return [...products].sort(compareProductNames);
}

export function sortCategories(categories = []) {
  return [...new Set(categories.map(text).filter(Boolean))].sort((a, b) => collator.compare(a, b));
}

export function productSearchText(product = {}) {
  return [
    product.name,
    product.parentName,
    product.variantName,
    product.category,
    product.brand,
    product.specifications,
    product.sku,
    product.barcode,
    product.sharedBarcode,
    product.rack
  ].map(value => text(value).toLocaleLowerCase('id-ID')).join(' ');
}

export function normalizeConversionRows(rows = [], baseUnit = 'pcs') {
  const seen = new Set();
  return rows
    .map(row => {
      const unit = text(row?.unit).toLocaleLowerCase('id-ID');
      const factor = Number(row?.factor || 0);
      if (!unit || unit === text(baseUnit).toLocaleLowerCase('id-ID') || !Number.isFinite(factor) || factor <= 0 || seen.has(unit)) return null;
      seen.add(unit);
      const prices = row?.prices || {};
      return {
        ...row,
        unit,
        factor: Math.round(factor * 1000) / 1000,
        barcode: text(row?.barcode),
        prices: {
          retail: Math.max(0, Math.round(Number(prices.retail || row?.retailPrice || 0))),
          wholesale: Math.max(0, Math.round(Number(prices.wholesale || row?.wholesalePrice || 0))),
          project: Math.max(0, Math.round(Number(prices.project || row?.projectPrice || 0)))
        }
      };
    })
    .filter(Boolean)
    .sort((a, b) => collator.compare(a.unit, b.unit));
}
