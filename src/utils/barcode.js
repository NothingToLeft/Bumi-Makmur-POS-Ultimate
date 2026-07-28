import { priceForSaleUnit } from './fractionalUnits.js';
const normalize = value => String(value ?? '').trim().toLowerCase();

function directMatch(product, code) {
  if (normalize(product.barcode) === code || normalize(product.sku) === code) {
    return { product, options: { directCode: true } };
  }

  const variant = (product.variants || []).find(item => normalize(item?.barcode) === code);
  if (variant) {
    return {
      product,
      options: {
        variant: variant.name || '',
        price: Number(product.prices?.retail ?? 0) + Number(variant.priceDelta || 0)
      }
    };
  }

  const conversion = (product.conversions || []).find(item => normalize(item?.barcode) === code);
  if (conversion) {
    return {
      product,
      options: {
        unit: conversion.unit,
        price: priceForSaleUnit(product, conversion.unit, 'retail')
      }
    };
  }

  return null;
}

export function findProductsByCode(products = [], rawCode = '') {
  const code = normalize(rawCode);
  if (!code) return [];
  const active = products.filter(product => product && product.active !== false && product.available !== false);

  const direct = active.map(product => directMatch(product, code)).filter(Boolean);
  if (direct.length) return direct;

  return active
    .filter(product => normalize(product.sharedBarcode) === code)
    .map(product => ({ product, options: { sharedBarcode: true } }));
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
