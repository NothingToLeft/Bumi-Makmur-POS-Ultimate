const roundQuantity = value => Math.round((Number(value) || 0) * 1000) / 1000;

export const QUANTITY_STEP_PRESETS = Object.freeze([1, 0.5, 0.25, 0.2, 0.1, 0.05, 0.01, 0.001]);

export function recommendedQuantityStep(baseUnit = '', category = '') {
  const unit = String(baseUnit || '').trim().toLowerCase();
  const group = String(category || '').trim().toLowerCase();
  if (unit === 'meter' || unit === 'm' || group.includes('kabel')) return 0.5;
  if (unit === 'kg' || unit === 'liter') return 0.1;
  if (unit === 'cm') return 1;
  return 0.1;
}

export function normalizeQuantityStep(value, allowFractional = false, fallbackStep = 0.1) {
  if (!allowFractional) return 1;
  const fallback = Number(fallbackStep);
  const safeFallback = Number.isFinite(fallback) && fallback > 0 ? fallback : 0.1;
  const step = Number(value);
  if (!Number.isFinite(step) || step <= 0) return Math.min(1, Math.max(0.001, roundQuantity(safeFallback)));
  const rounded = Math.min(1, Math.max(0.001, roundQuantity(step)));
  const nearbyPreset = QUANTITY_STEP_PRESETS.find(preset => Math.abs(preset - rounded) <= 0.002);
  return nearbyPreset ?? rounded;
}

export function normalizeQuantity(value, { allowFractional = true, step = 0.001, min = 0 } = {}) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return min;
  const safeStep = normalizeQuantityStep(step, allowFractional);
  const snapped = allowFractional ? Math.round(raw / safeStep) * safeStep : Math.round(raw);
  return Math.max(min, roundQuantity(snapped));
}

export function normalizeSignedQuantity(value, { allowFractional = true, step = 0.001 } = {}) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw === 0) return 0;
  const sign = raw < 0 ? -1 : 1;
  return sign * normalizeQuantity(Math.abs(raw), { allowFractional, step, min: 0 });
}

export function isQuantityAligned(value, step = 1) {
  const safeStep = normalizeQuantityStep(step, Number(step) < 1);
  const ratio = Number(value) / safeStep;
  return Number.isFinite(ratio) && Math.abs(ratio - Math.round(ratio)) < 0.000001;
}

export function formatQuantity(value, maximumFractionDigits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(number);
}

export function quantityStepLabel(step, unit = '') {
  const safeStep = normalizeQuantityStep(step, Number(step) < 1);
  if (safeStep === 0.5) return `Setengah ${unit}`.trim();
  if (safeStep === 0.25) return `Seperempat ${unit}`.trim();
  return `Kelipatan ${formatQuantity(safeStep)} ${unit}`.trim();
}

export function quickQuantityOptions(step = 1) {
  const safeStep = normalizeQuantityStep(step, Number(step) < 1);
  if (safeStep === 0.5) return [0.5, 1, 1.5, 2, 2.5, 3.5];
  if (safeStep === 0.25) return [0.25, 0.5, 1, 1.5, 2, 2.5];
  if (safeStep === 0.1) return [0.5, 1, 1.5, 2, 2.5, 3.5];
  return [safeStep, safeStep * 2, safeStep * 5, safeStep * 10]
    .map(value => roundQuantity(value))
    .filter((value, index, values) => value > 0 && values.indexOf(value) === index);
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


export function priceForSaleUnit(product, unit = product?.baseUnit, tier = 'retail') {
  const basePrice = Math.max(0, Math.round(Number(product?.prices?.[tier] ?? product?.prices?.retail ?? 0)));
  if (!product || !unit || unit === product.baseUnit) return basePrice;
  const conversion = findConversion(product, unit);
  const explicit = Number(conversion?.prices?.[tier] ?? conversion?.prices?.retail ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  return priceForUnit(basePrice, conversionFactor(product, unit));
}

export function saleUnitOptions(product, tier = 'retail') {
  if (!product) return [];
  return [
    { unit: product.baseUnit, factor: 1, price: priceForSaleUnit(product, product.baseUnit, tier), explicitPrice: true },
    ...(product.conversions || []).filter(item => item?.unit && Number(item.factor) > 0).map(item => ({
      ...item,
      factor: conversionFactor(product, item.unit),
      price: priceForSaleUnit(product, item.unit, tier),
      explicitPrice: Number(item?.prices?.[tier] ?? item?.prices?.retail ?? 0) > 0
    }))
  ];
}

export function baseUnitCost(unitPrice, factor = 1) {
  const safeFactor = Number(factor);
  if (!Number.isFinite(safeFactor) || safeFactor <= 0) return Math.max(0, Math.round(Number(unitPrice) || 0));
  return Math.max(0, Math.round((Number(unitPrice) || 0) / safeFactor));
}

export function fractionalSaleLabel(product) {
  if (!product?.allowFractional) return '';
  const step = normalizeQuantityStep(product.quantityStep, true, recommendedQuantityStep(product.baseUnit, product.category));
  return `Dijual per ${formatQuantity(step)} ${product.baseUnit}`;
}
