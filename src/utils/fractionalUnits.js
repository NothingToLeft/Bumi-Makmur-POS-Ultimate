const roundQuantity = value => Math.round((Number(value) || 0) * 1000) / 1000;

export function normalizeQuantityStep(value, allowFractional = false) {
  if (!allowFractional) return 1;
  const step = Number(value);
  if (!Number.isFinite(step) || step <= 0) return 0.1;
  return Math.min(1, Math.max(0.001, roundQuantity(step)));
}

export function normalizeQuantity(value, { allowFractional = true, step = 0.001, min = 0 } = {}) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return min;
  const safeStep = normalizeQuantityStep(step, allowFractional);
  const snapped = allowFractional ? Math.round(raw / safeStep) * safeStep : Math.round(raw);
  return Math.max(min, roundQuantity(snapped));
}

export function formatQuantity(value, maximumFractionDigits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(number);
}

export function findConversion(product, unit) {
  if (!product || !unit || unit === product.baseUnit) return null;
  return (product.conversions || []).find(item => item.unit === unit) || null;
}

export function conversionFactor(product, unit) {
  const conversion = findConversion(product, unit);
  const factor = conversion ? Number(conversion.factor) : 1;
  return Number.isFinite(factor) && factor > 0 ? factor : 1;
}

export function toBaseQuantity(product, quantity, unit = product?.baseUnit) {
  return roundQuantity(Number(quantity || 0) * conversionFactor(product, unit));
}

export function priceForUnit(baseUnitPrice, factor = 1) {
  return Math.max(0, Math.round((Number(baseUnitPrice) || 0) * (Number(factor) || 1)));
}

export function baseUnitCost(unitPrice, factor = 1) {
  const safeFactor = Number(factor);
  if (!Number.isFinite(safeFactor) || safeFactor <= 0) return Math.max(0, Math.round(Number(unitPrice) || 0));
  return Math.max(0, Math.round((Number(unitPrice) || 0) / safeFactor));
}

export function fractionalSaleLabel(product) {
  if (!product?.allowFractional) return '';
  const step = normalizeQuantityStep(product.quantityStep, true);
  return `Bisa dijual pecahan mulai ${formatQuantity(step)} ${product.baseUnit}`;
}
