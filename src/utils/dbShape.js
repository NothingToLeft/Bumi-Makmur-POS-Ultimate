const clone = value => value == null
  ? value
  : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const roundQuantity = value => Math.round((Number(value) || 0) * 1000) / 1000;
const isFractionalNumber = value => Math.abs(Number(value || 0) - Math.round(Number(value || 0))) > 0.000001;

export function normalizeDbShape(input, seed, version = '') {
  const source = input && typeof input === 'object' ? input : {};
  const safeSeed = seed && typeof seed === 'object' ? seed : {};
  const next = {
    ...clone(safeSeed),
    ...clone(source),
    meta: { ...(safeSeed.meta || {}), ...(source.meta || {}), ...(version ? { version } : {}) },
    configs: {
      ...(safeSeed.configs || {}),
      ...(source.configs || {}),
      loginAppearance: {
        ...((safeSeed.configs || {}).loginAppearance || {}),
        ...((source.configs || {}).loginAppearance || {})
      }
    }
  };

  for (const [key, seedValue] of Object.entries(safeSeed)) {
    if (!Array.isArray(seedValue)) continue;
    if (Array.isArray(source[key])) next[key] = clone(source[key]);
    else next[key] = ['categories', 'units'].includes(key) ? clone(seedValue) : [];
  }

  next.products = (next.products || []).map(product => {
    const conversions = Array.isArray(product.conversions)
      ? product.conversions
        .filter(item => item?.unit && Number(item.factor) > 0)
        .map(item => ({ ...item, factor: roundQuantity(item.factor) }))
      : [];
    const fractionalConversionSteps = conversions
      .map(item => Number(item.factor))
      .filter(factor => factor > 0 && factor < 1);
    const inferredFractional = product.allowFractional === true
      || isFractionalNumber(product.stock)
      || isFractionalNumber(product.minStock)
      || fractionalConversionSteps.length > 0;
    const inferredStep = fractionalConversionSteps.length
      ? Math.min(...fractionalConversionSteps)
      : 0.1;
    const requestedStep = Number(product.quantityStep);
    const quantityStep = inferredFractional
      ? Math.min(1, Math.max(0.001, Number.isFinite(requestedStep) && requestedStep > 0 && requestedStep < 1 ? requestedStep : inferredStep))
      : 1;

    return {
      ...product,
      stock: roundQuantity(product.stock),
      minStock: roundQuantity(product.minStock),
      allowFractional: inferredFractional,
      quantityStep: roundQuantity(quantityStep),
      conversions
    };
  });
  return next;
}
