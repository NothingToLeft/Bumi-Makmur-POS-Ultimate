import { productAllCodes } from './productBarcodes.js';

const normalize = value => String(value ?? '').trim();
const normalizeCode = value => normalize(value).toUpperCase();

const COMMON_WORDS = new Set(['BULB', 'LAMPU', 'LIGHT', 'SERIES', 'TYPE', 'MODEL', 'THE', 'DAN', 'UNTUK']);

export const isVariantChild = product => Boolean(product?.variantGroupId && product?.variantName);

export function variantParentName(product) {
  return normalize(product?.parentName) || normalize(product?.name).replace(new RegExp(`\\s+${normalize(product?.variantName)}$`, 'i'), '').trim();
}

export function displayProductName(product) {
  if (!product) return '';
  if (isVariantChild(product)) return `${variantParentName(product)} ${normalize(product.variantName)}`.trim();
  return normalize(product.name);
}

export function sellableProducts(products = []) {
  return products.filter(product => product && product.active !== false && product.available !== false && product.productType !== 'parent');
}

function parentToken(name = '') {
  const words = normalizeCode(name)
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => !COMMON_WORDS.has(word));
  if (!words.length) return 'PRD';
  const first = words[0].slice(0, 3);
  const second = words[1] ? words[1].slice(0, 4) : '';
  return [first, second].filter(Boolean).join('-');
}

function variantToken(name = '') {
  const upper = normalizeCode(name);
  const numeric = upper.match(/\d+(?:[.,]\d+)?/);
  const words = upper.replace(/[^A-Z0-9]+/g, ' ').split(/\s+/).filter(Boolean);
  if (numeric) {
    const number = Math.round(Number(numeric[0].replace(',', '.')) * 10) / 10;
    const integer = Number.isInteger(number) ? String(number).padStart(3, '0') : String(number).replace('.', 'P');
    const suffixWord = words.find(word => !word.includes(numeric[0].replace(',', '.')) && !/^W(ATT)?$/.test(word));
    return suffixWord ? `${integer}-${suffixWord.slice(0, 3)}` : integer;
  }
  return words.slice(0, 2).map(word => word.slice(0, 4)).join('-') || 'VAR';
}

export function generateVariantSku(parentName, variantName, usedCodes = []) {
  const base = `BM-${parentToken(parentName)}-${variantToken(variantName)}`.replace(/-+/g, '-');
  const used = new Set(usedCodes.map(normalizeCode));
  if (!used.has(normalizeCode(base))) return base;
  let counter = 2;
  while (used.has(normalizeCode(`${base}-${counter}`))) counter += 1;
  return `${base}-${counter}`;
}

export function generateVariantGroupId(parentName = '') {
  const suffix = Date.now().toString(36).toUpperCase();
  return `VG-${parentToken(parentName)}-${suffix}`;
}

export function groupVariantProducts(products = []) {
  const output = [];
  const grouped = new Map();
  for (const product of products) {
    if (!isVariantChild(product)) {
      output.push(product);
      continue;
    }
    const key = product.variantGroupId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(product);
  }
  for (const [variantGroupId, children] of grouped) {
    const activeChildren = children.filter(child => child.active !== false);
    const representative = activeChildren[0] || children[0];
    const imageOwner = activeChildren.find(child => child?.groupPosImage) || children.find(child => child?.groupPosImage) || representative;
    const prices = activeChildren.map(child => Number(child.prices?.retail || 0));
    output.push({
      id: `GROUP-${variantGroupId}`,
      isVariantGroup: true,
      variantGroupId,
      name: variantParentName(representative),
      parentName: variantParentName(representative),
      sharedBarcode: normalize(representative?.sharedBarcode),
      posImage: imageOwner?.groupPosImage || null,
      category: representative?.category || 'Lainnya',
      baseUnit: representative?.baseUnit || 'pcs',
      rack: [...new Set(activeChildren.map(child => child.rack).filter(Boolean))].join(', ') || '-',
      stock: activeChildren.reduce((sum, child) => sum + Number(child.stock || 0), 0),
      minStock: activeChildren.reduce((sum, child) => sum + Number(child.minStock || 0), 0),
      prices: { retail: prices.length ? Math.min(...prices) : 0 },
      priceMax: prices.length ? Math.max(...prices) : 0,
      active: activeChildren.length > 0,
      available: activeChildren.some(child => child.available !== false),
      favorite: activeChildren.some(child => child.favorite),
      children: children.slice().sort((a, b) => normalize(a.variantName).localeCompare(normalize(b.variantName), 'id'))
    });
  }
  return output;
}

export function buildVariantGroupDraft(children = []) {
  const ordered = children.slice().sort((a, b) => normalize(a.variantName).localeCompare(normalize(b.variantName), 'id'));
  const first = ordered[0] || {};
  const imageOwner = ordered.find(child => child?.groupPosImage) || first;
  return {
    ...first,
    id: first.id || '',
    isVariantGroupDraft: true,
    variantMode: true,
    variantGroupId: first.variantGroupId || generateVariantGroupId(first.parentName || first.name),
    name: variantParentName(first),
    sharedBarcode: first.sharedBarcode || '',
    posImage: imageOwner.groupPosImage || null,
    barcode: '',
    sku: '',
    stock: 0,
    minStock: 0,
    modalPrice: 0,
    prices: { retail: 0, wholesale: 0, project: 0 },
    variantRows: ordered.map(child => ({
      id: child.id,
      variantName: child.variantName || '',
      sku: child.sku || '',
      factoryBarcode: child.factoryBarcode || '',
      internalBarcode: child.internalBarcode || child.barcode || child.sku || '',
      barcodes: Array.isArray(child.barcodes) ? child.barcodes.map(row => ({ ...row })) : [],
      posImage: child.posImage || null,
      stock: Number(child.stock || 0),
      minStock: Number(child.minStock || 0),
      rack: child.rack || '-',
      modalPrice: Number(child.modalPrice || 0),
      prices: { retail: Number(child.prices?.retail || 0), wholesale: Number(child.prices?.wholesale || 0), project: Number(child.prices?.project || 0) },
      markups: {
        retail: Number(child.markups?.retail ?? 0),
        wholesale: Number(child.markups?.wholesale ?? 0),
        project: Number(child.markups?.project ?? 0)
      },
      active: child.active !== false,
      available: child.available !== false,
      favorite: Boolean(child.favorite),
      existing: true
    }))
  };
}

export function codeCollision(products = [], { code = '', branchId = '', ignoreIds = [], variantGroupId = '', shared = false } = {}) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const ignored = new Set(ignoreIds);
  return products.find(product => {
    if (!product || ignored.has(product.id) || product.active === false) return false;
    if (branchId && product.branchId !== branchId) return false;
    const directCodes = productAllCodes(product, { includeShared: false }).map(normalizeCode).filter(Boolean);
    if (directCodes.includes(normalized)) return true;
    if (normalizeCode(product.sharedBarcode) !== normalized) return false;
    // Satu shared barcode memang boleh dipakai oleh sibling pada group varian yang sama.
    return !shared || !variantGroupId || product.variantGroupId !== variantGroupId;
  }) || null;
}
