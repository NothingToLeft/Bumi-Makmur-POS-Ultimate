import { normalizeQuantityStep, recommendedQuantityStep } from './fractionalUnits.js';
import { normalizeConversionRows, sortCategories, sortProductsByName } from './productCatalog.js';
import { COLLECTION_RECENCY_FIELDS, sortCollectionNewest } from './temporal.js';

const clone = value => value == null
  ? value
  : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const roundQuantity = value => Math.round((Number(value) || 0) * 1000) / 1000;
const isFractionalNumber = value => Math.abs(Number(value || 0) - Math.round(Number(value || 0))) > 0.000001;
const sortByName = rows => [...(rows || [])].sort((first, second) => String(first?.name || first?.id || '').localeCompare(String(second?.name || second?.id || ''), 'id', { numeric: true, sensitivity: 'base' }));
const sortCustomers = rows => [...(rows || [])].sort((first, second) => {
  const firstGeneral = first?.id === 'CUS-GENERAL' || /^umum(?:\s|\()/i.test(String(first?.name || '').trim());
  const secondGeneral = second?.id === 'CUS-GENERAL' || /^umum(?:\s|\()/i.test(String(second?.name || '').trim());
  if (firstGeneral !== secondGeneral) return firstGeneral ? -1 : 1;
  return String(first?.name || first?.id || '').localeCompare(String(second?.name || second?.id || ''), 'id', { numeric: true, sensitivity: 'base' });
});

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
    const conversions = normalizeConversionRows(product.conversions || [], product.baseUnit || 'pcs');
    const fractionalConversionSteps = conversions
      .map(item => Number(item.factor))
      .filter(factor => factor > 0 && factor < 1);
    const inferredFractional = product.allowFractional === true
      || isFractionalNumber(product.stock)
      || isFractionalNumber(product.minStock)
      || fractionalConversionSteps.length > 0;
    const inferredStep = fractionalConversionSteps.length
      ? Math.min(...fractionalConversionSteps)
      : recommendedQuantityStep(product.baseUnit, product.category);
    const requestedStep = Number(product.quantityStep);
    const quantityStep = inferredFractional
      ? normalizeQuantityStep(requestedStep, true, inferredStep)
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
  next.products = sortProductsByName(next.products);
  next.categories = sortCategories(next.categories || []);
  next.branches = sortByName(next.branches);
  next.users = sortByName(next.users);
  next.suppliers = sortByName(next.suppliers);
  next.customers = sortCustomers(next.customers);

  // Firestore does not guarantee collection iteration order unless an orderBy
  // clause is used. The POS must therefore never depend on insertion/snapshot
  // order for operational history. Normalize all timeline collections here so
  // Web, Android, Windows, offline cache, and realtime updates show the same
  // deterministic chronology. Individual screens may still apply a user-selected
  // order, but the default database shape is always newest-first.
  for (const collectionName of Object.keys(COLLECTION_RECENCY_FIELDS)) {
    if (Array.isArray(next[collectionName])) {
      next[collectionName] = sortCollectionNewest(collectionName, next[collectionName]);
    }
  }

  return next;
}
