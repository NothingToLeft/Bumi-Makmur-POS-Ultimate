const DEFAULT_TIME_FIELDS = ['updatedAt', 'createdAt', 'date', 'timestamp'];

export const COLLECTION_RECENCY_FIELDS = Object.freeze({
  sales: ['completedAt', 'createdAt', 'date'],
  heldSales: ['updatedAt', 'createdAt'],
  purchases: ['receivedAt', 'updatedAt', 'createdAt', 'date'],
  purchaseOrders: ['updatedAt', 'createdAt'],
  stockMovements: ['createdAt', 'date'],
  stockAdjustments: ['createdAt', 'date'],
  stockOpnames: ['updatedAt', 'createdAt'],
  stockTransfers: ['updatedAt', 'createdAt'],
  expenses: ['createdAt', 'date'],
  receivables: ['updatedAt', 'createdAt'],
  payables: ['updatedAt', 'createdAt'],
  refunds: ['createdAt', 'updatedAt'],
  shifts: ['endAt', 'startAt', 'createdAt'],
  cashMovements: ['createdAt', 'date'],
  onlineOrders: ['updatedAt', 'createdAt'],
  promotions: ['updatedAt', 'createdAt'],
  campaigns: ['updatedAt', 'createdAt'],
  feedback: ['createdAt'],
  branchPaymentProfiles: ['updatedAt', 'createdAt'],
  productPriceHistory: ['createdAt', 'updatedAt'],
  supplierPriceHistory: ['createdAt', 'updatedAt'],
  approvalRequests: ['resolvedAt', 'updatedAt', 'createdAt'],
  deviceSessions: ['lastSeenAt', 'updatedAt', 'createdAt'],
  quotations: ['updatedAt', 'createdAt'],
  serialNumbers: ['updatedAt', 'soldAt', 'createdAt'],
  warrantyClaims: ['updatedAt', 'createdAt'],
  auditLogs: ['createdAt', 'offlineCreatedAt']
});

function numericEpoch(value) {
  if (!Number.isFinite(value)) return 0;
  const absolute = Math.abs(value);
  if (absolute > 0 && absolute < 100_000_000_000) return Math.round(value * 1000);
  return Math.round(value);
}

export function toEpochMs(value) {
  if (value == null || value === '') return 0;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  if (typeof value === 'number') return numericEpoch(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return numericEpoch(Number(trimmed));
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'object') {
    try {
      if (typeof value.toMillis === 'function') return numericEpoch(Number(value.toMillis()));
      if (typeof value.toDate === 'function') return toEpochMs(value.toDate());
    } catch {
      // Fall through to serialized Firestore Timestamp shapes.
    }
    const seconds = Number(value.seconds ?? value._seconds);
    if (Number.isFinite(seconds)) {
      const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
      return Math.round((seconds * 1000) + (Number.isFinite(nanoseconds) ? nanoseconds / 1_000_000 : 0));
    }
  }
  return 0;
}

export function entityEpoch(row, fields = DEFAULT_TIME_FIELDS) {
  if (!row || typeof row !== 'object') return 0;
  for (const field of fields) {
    const value = toEpochMs(row[field]);
    if (value) return value;
  }
  return 0;
}

function stableId(row) {
  return String(row?.id ?? row?.code ?? row?.name ?? '');
}

export function compareNewest(first, second, fields = DEFAULT_TIME_FIELDS) {
  const byTime = entityEpoch(second, fields) - entityEpoch(first, fields);
  if (byTime) return byTime;
  return stableId(second).localeCompare(stableId(first), 'id', { numeric: true, sensitivity: 'base' });
}

export function compareOldest(first, second, fields = DEFAULT_TIME_FIELDS) {
  const byTime = entityEpoch(first, fields) - entityEpoch(second, fields);
  if (byTime) return byTime;
  return stableId(first).localeCompare(stableId(second), 'id', { numeric: true, sensitivity: 'base' });
}

export function sortNewest(rows, fields = DEFAULT_TIME_FIELDS) {
  return [...(Array.isArray(rows) ? rows : [])].sort((first, second) => compareNewest(first, second, fields));
}

export function sortOldest(rows, fields = DEFAULT_TIME_FIELDS) {
  return [...(Array.isArray(rows) ? rows : [])].sort((first, second) => compareOldest(first, second, fields));
}

export function sortCollectionNewest(collectionName, rows) {
  const fields = COLLECTION_RECENCY_FIELDS[collectionName];
  return fields ? sortNewest(rows, fields) : [...(Array.isArray(rows) ? rows : [])];
}

export function formatDateTimeId(value, options = {}) {
  const epoch = toEpochMs(value);
  if (!epoch) return options.fallback ?? '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: options.seconds === false ? undefined : '2-digit',
    ...options.format
  }).format(new Date(epoch));
}

export function formatDateId(value, options = {}) {
  const epoch = toEpochMs(value);
  if (!epoch) return options.fallback ?? '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: options.longMonth ? 'long' : 'short', year: 'numeric',
    ...options.format
  }).format(new Date(epoch));
}

export function formatTimeId(value, options = {}) {
  const epoch = toEpochMs(value);
  if (!epoch) return options.fallback ?? '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit', second: options.seconds ? '2-digit' : undefined,
    ...options.format
  }).format(new Date(epoch));
}

export function localDateKeyFromValue(value, fallback = '') {
  const epoch = toEpochMs(value);
  if (!epoch) return fallback;
  const date = new Date(epoch);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
