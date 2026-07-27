const clone = value => value == null
  ? value
  : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

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
  return next;
}
