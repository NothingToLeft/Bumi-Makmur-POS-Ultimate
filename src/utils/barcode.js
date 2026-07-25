const normalize = value => String(value ?? '').trim().toLowerCase();

export function findProductByCode(products = [], rawCode = '') {
  const code = normalize(rawCode);
  if (!code) return null;

  for (const product of products) {
    if (!product || product.active === false || product.available === false) continue;

    if (normalize(product.barcode) === code || normalize(product.sku) === code) {
      return { product, options: {} };
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
          price: Number(product.prices?.retail ?? 0) * Number(conversion.factor || 1)
        }
      };
    }
  }

  return null;
}

export function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const tagName = String(target.tagName || '').toLowerCase();
  return Boolean(target.isContentEditable || ['input', 'textarea', 'select'].includes(tagName));
}
