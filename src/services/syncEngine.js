export const CLOUD_ENTITY_COLLECTIONS = [
  'branches', 'users', 'products', 'promotions', 'suppliers', 'customers',
  'sales', 'heldSales', 'purchases', 'purchaseOrders', 'stockMovements', 'stockAdjustments',
  'stockOpnames', 'stockTransfers', 'expenses', 'receivables', 'payables',
  'refunds', 'shifts', 'cashMovements', 'onlineOrders', 'printerProfiles',
  'campaigns', 'feedback', 'branchPaymentProfiles', 'productPriceHistory', 'supplierPriceHistory', 'approvalRequests', 'deviceSessions',
  'quotations', 'serialNumbers', 'warrantyClaims', 'auditLogs'
];

export const SETTINGS_KEYS = ['meta', 'configs', 'categories', 'units'];

const clone = value => value == null
  ? value
  : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

export function cleanUndefined(value) {
  if (Array.isArray(value)) return value.map(cleanUndefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanUndefined(item)])
    );
  }
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter(key => value[key] !== undefined)
        .map(key => [key, canonicalize(value[key])])
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(cleanUndefined(value)));
}

const stableEqual = (first, second) => stableJson(first) === stableJson(second);

function withoutId(value) {
  if (!value) return null;
  const { id, ...rest } = value;
  return cleanUndefined(rest);
}

export function buildDiffOperations(before, after) {
  const operations = [];
  const beforeSettings = cleanUndefined(Object.fromEntries(SETTINGS_KEYS.map(key => [key, before[key]])));
  const afterSettings = cleanUndefined(Object.fromEntries(SETTINGS_KEYS.map(key => [key, after[key]])));
  if (!stableEqual(beforeSettings, afterSettings)) {
    operations.push({
      collectionName: '__settings__', id: 'settings', type: 'set',
      beforeData: beforeSettings, afterData: afterSettings
    });
  }

  for (const name of CLOUD_ENTITY_COLLECTIONS) {
    if (name === 'users' || name === 'auditLogs') continue;
    const previousRows = new Map((before[name] || []).map(item => [String(item.id), item]));
    const nextRows = new Map((after[name] || []).map(item => [String(item.id), item]));
    for (const [id, row] of nextRows) {
      const previous = previousRows.get(id);
      if (!previousRows.has(id) || !stableEqual(previous, row)) {
        operations.push({
          collectionName: name, id, type: 'set',
          beforeData: previous ? withoutId(previous) : null,
          afterData: withoutId(row)
        });
      }
    }
    for (const [id, row] of previousRows) {
      if (!nextRows.has(id)) {
        operations.push({
          collectionName: name, id, type: 'delete',
          beforeData: withoutId(row), afterData: null
        });
      }
    }
  }
  return operations;
}

function rowFromDb(db, collectionName, id) {
  if (collectionName === '__settings__') {
    return cleanUndefined(Object.fromEntries(SETTINGS_KEYS.map(key => [key, db[key]])));
  }
  const row = (db[collectionName] || []).find(item => String(item.id) === String(id));
  return row ? withoutId(row) : null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

const DELTA_FIELDS = {
  products: new Set(['stock']),
  customers: new Set(['points']),
  receivables: new Set(['paid', 'balance']),
  payables: new Set(['paid', 'balance']),
  sales: new Set(['refundedTotal'])
};

const MERGE_BY_ID_ARRAY_FIELDS = {
  receivables: new Set(['payments']),
  payables: new Set(['payments']),
  purchases: new Set(['returns'])
};

function mergeArrayById(before, after, remote) {
  const previousRows = new Map((before || []).filter(item => item?.id != null).map(item => [String(item.id), item]));
  const localRows = new Map((after || []).filter(item => item?.id != null).map(item => [String(item.id), item]));
  const remoteRows = new Map((remote || []).filter(item => item?.id != null).map(item => [String(item.id), item]));

  for (const [id, previous] of previousRows) {
    if (!localRows.has(id)) remoteRows.delete(id);
    else if (!stableEqual(previous, localRows.get(id))) remoteRows.set(id, clone(localRows.get(id)));
  }
  const additions = [];
  for (const item of after || []) {
    if (item?.id == null) continue;
    const id = String(item.id);
    if (!previousRows.has(id)) {
      remoteRows.set(id, clone(item));
      additions.push(id);
    }
  }
  const addedSet = new Set(additions);
  return [
    ...additions.map(id => remoteRows.get(id)).filter(Boolean),
    ...(remote || []).filter(item => item?.id != null && remoteRows.has(String(item.id)) && !addedSet.has(String(item.id))).map(item => remoteRows.get(String(item.id))),
    ...[...remoteRows.entries()].filter(([id]) => !(remote || []).some(item => String(item?.id) === id) && !addedSet.has(id)).map(([, item]) => item)
  ];
}

function rebaseValue(before, after, remote, collectionName, path = '') {
  if (stableEqual(before, after)) return clone(remote);
  const deltaAllowed = DELTA_FIELDS[collectionName]?.has(path);
  const mergeArrayByIdAllowed = MERGE_BY_ID_ARRAY_FIELDS[collectionName]?.has(path);
  if (mergeArrayByIdAllowed && Array.isArray(before) && Array.isArray(after) && Array.isArray(remote)) {
    return mergeArrayById(before, after, remote);
  }

  if (
    deltaAllowed &&
    typeof before === 'number' && Number.isFinite(before) &&
    typeof after === 'number' && Number.isFinite(after) &&
    typeof remote === 'number' && Number.isFinite(remote)
  ) return remote + (after - before);

  if (isPlainObject(before) && isPlainObject(after) && isPlainObject(remote)) {
    const result = clone(remote);
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in after) && key in before) {
        delete result[key];
        continue;
      }
      if (!(key in before)) {
        result[key] = clone(after[key]);
        continue;
      }
      result[key] = rebaseValue(before[key], after[key], remote[key], collectionName, childPath);
    }
    return cleanUndefined(result);
  }
  return clone(after);
}

export function rebaseOperationAgainstRemoteData(operation, actual) {
  if (!operation) return null;
  if (operation.type === 'delete') {
    if (actual === null) return null;
    return { ...clone(operation), beforeData: clone(actual) };
  }
  if (actual === null) return { ...clone(operation), beforeData: null };
  if (operation.beforeData === null && stableEqual(actual, operation.afterData)) return null;
  const afterData = operation.beforeData === null
    ? { ...clone(actual), ...clone(operation.afterData) }
    : rebaseValue(operation.beforeData, operation.afterData, actual, operation.collectionName);
  if (stableEqual(actual, afterData)) return null;
  return { ...clone(operation), beforeData: clone(actual), afterData: cleanUndefined(afterData) };
}

export function rebaseOperationsAgainstRemote(operations, remoteDb) {
  const rebased = [];
  for (const operation of operations || []) {
    const actual = rowFromDb(remoteDb, operation.collectionName, operation.id);
    const next = rebaseOperationAgainstRemoteData(operation, actual);
    if (next) rebased.push(next);
  }
  return rebased;
}

export function applyOperationsToDb(inputDb, operations) {
  const next = clone(inputDb);
  for (const operation of operations || []) {
    if (operation.collectionName === '__settings__') {
      if (operation.type === 'set') {
        for (const key of SETTINGS_KEYS) if (operation.afterData?.[key] !== undefined) next[key] = clone(operation.afterData[key]);
      }
      continue;
    }
    if (!Array.isArray(next[operation.collectionName])) next[operation.collectionName] = [];
    const rows = next[operation.collectionName];
    const index = rows.findIndex(item => String(item.id) === String(operation.id));
    if (operation.type === 'delete') {
      if (index >= 0) rows.splice(index, 1);
      continue;
    }
    const row = { id: operation.id, ...clone(operation.afterData || {}) };
    if (index >= 0) rows[index] = row;
    else rows.unshift(row);
  }
  return next;
}
