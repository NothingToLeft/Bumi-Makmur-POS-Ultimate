const CACHE_DB_NAME = 'bumi-makmur-pos-hybrid-cache';
const CACHE_DB_VERSION = 1;
const CACHE_STORE = 'cache';
const QUEUE_PREFIX = 'bm_pos_pending_mutations_v1:';
const QUEUE_BACKUP_PREFIX = 'bm_pos_pending_backup_v1:';
const MAX_QUEUE_ITEMS = 2500;
const OFFLINE_CREDENTIAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const databaseWriteChains = new Map();

const normalizeStoreKey = value => String(value || 'BUMIMAKMUR')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9_-]/g, '') || 'BUMIMAKMUR';

const clone = value => value == null
  ? value
  : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

function openCacheDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB tidak dapat dibuka.'));
  });
}

async function cacheGet(key) {
  const database = await openCacheDb();
  if (!database) return null;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(CACHE_STORE, 'readonly');
    const request = transaction.objectStore(CACHE_STORE).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error || new Error('Cache lokal tidak dapat dibaca.'));
    transaction.oncomplete = () => database.close();
  });
}

async function cachePut(key, value) {
  const database = await openCacheDb();
  if (!database) return false;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(CACHE_STORE, 'readwrite');
    transaction.objectStore(CACHE_STORE).put(clone(value), key);
    transaction.oncomplete = () => { database.close(); resolve(true); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error('Cache lokal tidak dapat disimpan.')); };
  });
}

async function cacheDelete(key) {
  const database = await openCacheDb();
  if (!database) return false;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(CACHE_STORE, 'readwrite');
    transaction.objectStore(CACHE_STORE).delete(key);
    transaction.oncomplete = () => { database.close(); resolve(true); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error('Cache lokal tidak dapat dihapus.')); };
  });
}

function queueStorageKey(storeCode) {
  return `${QUEUE_PREFIX}${normalizeStoreKey(storeCode)}`;
}

function queueBackupKey(storeCode) {
  return `${QUEUE_BACKUP_PREFIX}${normalizeStoreKey(storeCode)}`;
}

export function readPendingMutations(storeCode) {
  try {
    const raw = localStorage.getItem(queueStorageKey(storeCode));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(item => item?.id && Array.isArray(item.operations)) : [];
  } catch (error) {
    console.warn('Antrean sinkronisasi lokal rusak. Memakai backup terakhir.', error);
    try {
      const backup = localStorage.getItem(queueBackupKey(storeCode));
      const parsed = backup ? JSON.parse(backup) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

function writePendingMutations(storeCode, rows) {
  const normalized = Array.isArray(rows) ? rows.slice(0, MAX_QUEUE_ITEMS) : [];
  const serialized = JSON.stringify(normalized);
  const current = localStorage.getItem(queueStorageKey(storeCode));
  if (current) localStorage.setItem(queueBackupKey(storeCode), current);
  localStorage.setItem(queueStorageKey(storeCode), serialized);
  void cachePut(`queue:${normalizeStoreKey(storeCode)}`, normalized).catch(error => {
    console.warn('Mirror antrean IndexedDB gagal disimpan.', error);
  });
  return normalized;
}

export function enqueuePendingMutation(storeCode, mutation) {
  const queue = readPendingMutations(storeCode);
  if (queue.some(item => item.id === mutation.id)) return queue.length;
  if (queue.length >= MAX_QUEUE_ITEMS) {
    throw new Error('Antrean offline sudah terlalu besar. Sambungkan internet dan sinkronkan sebelum menambah transaksi baru.');
  }
  queue.push(clone(mutation));
  writePendingMutations(storeCode, queue);
  return queue.length;
}


export function enqueuePendingMutations(storeCode, mutations) {
  const queue = readPendingMutations(storeCode);
  const existingIds = new Set(queue.map(item => item.id));
  const additions = (Array.isArray(mutations) ? mutations : [])
    .filter(item => item?.id && Array.isArray(item.operations) && !existingIds.has(item.id))
    .map(clone);
  if (queue.length + additions.length > MAX_QUEUE_ITEMS) {
    throw new Error('Antrean offline sudah terlalu besar. Sambungkan internet dan sinkronkan sebelum menambah transaksi baru.');
  }
  const next = [...queue, ...additions];
  writePendingMutations(storeCode, next);
  return next.length;
}

export function replacePendingMutation(storeCode, mutation) {
  const queue = readPendingMutations(storeCode);
  const index = queue.findIndex(item => item.id === mutation.id);
  if (index >= 0) queue[index] = clone(mutation);
  else queue.push(clone(mutation));
  writePendingMutations(storeCode, queue);
  return queue.length;
}

export function removePendingMutation(storeCode, mutationId) {
  const queue = readPendingMutations(storeCode).filter(item => item.id !== mutationId);
  writePendingMutations(storeCode, queue);
  return queue.length;
}

export function clearPendingMutations(storeCode) {
  localStorage.removeItem(queueBackupKey(storeCode));
  writePendingMutations(storeCode, []);
}

export async function recoverPendingMutations(storeCode) {
  const storageKey = queueStorageKey(storeCode);
  const raw = localStorage.getItem(storageKey);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(item => item?.id && Array.isArray(item.operations));
    } catch (error) {
      console.warn('Antrean utama rusak; mencoba mirror IndexedDB.', error);
    }
  }
  try {
    const mirrored = await cacheGet(`queue:${normalizeStoreKey(storeCode)}`);
    if (Array.isArray(mirrored)) {
      writePendingMutations(storeCode, mirrored);
      return mirrored;
    }
  } catch (error) {
    console.warn('Antrean IndexedDB gagal dipulihkan.', error);
  }
  writePendingMutations(storeCode, []);
  return [];
}

export async function saveCachedDb(storeCode, db, profile = null) {
  const key = normalizeStoreKey(storeCode);
  const payload = {
    db: clone(db),
    profile: profile ? clone(profile) : null,
    appliedMutationIds: readPendingMutations(storeCode).map(item => item.id),
    savedAt: new Date().toISOString(),
    schemaVersion: 2
  };
  const previous = databaseWriteChains.get(key) || Promise.resolve();
  const current = previous.then(
    () => cachePut(`database:${key}`, payload),
    () => cachePut(`database:${key}`, payload)
  );
  databaseWriteChains.set(key, current);
  try {
    await current;
  } finally {
    if (databaseWriteChains.get(key) === current) databaseWriteChains.delete(key);
  }
  return payload;
}

export async function loadCachedDb(storeCode) {
  const key = normalizeStoreKey(storeCode);
  const payload = await cacheGet(`database:${key}`);
  return payload?.db ? clone(payload) : null;
}

function randomHex(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, item => item.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const clean = String(hex || '').replace(/[^0-9a-f]/gi, '');
  const result = new Uint8Array(Math.floor(clean.length / 2));
  for (let index = 0; index < result.length; index += 1) result[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  return result;
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), item => item.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin, saltHex, iterations = 180000) {
  if (!crypto?.subtle) throw new Error('Perangkat tidak mendukung penyimpanan PIN offline yang aman.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: hexToBytes(saltHex),
    iterations
  }, key, 256);
  return bytesToHex(bits);
}

export async function cacheOfflineCredential(storeCode, pin, profile) {
  if (!profile?.id || !/^\d{4}$/.test(String(pin || ''))) return false;
  const key = normalizeStoreKey(storeCode);
  const credentials = (await cacheGet(`credentials:${key}`)) || [];
  const salt = randomHex(16);
  const iterations = 180000;
  const pinHash = await hashPin(pin, salt, iterations);
  const record = {
    id: profile.id,
    profile: clone(profile),
    pinHash,
    pinSalt: salt,
    pinIterations: iterations,
    cachedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OFFLINE_CREDENTIAL_TTL_MS).toISOString(),
    active: profile.active !== false
  };
  const next = credentials.filter(item => item.id !== profile.id);
  next.push(record);
  await cachePut(`credentials:${key}`, next);
  await cachePut(`last-profile:${key}`, clone(profile));
  return true;
}

export async function verifyOfflinePin(storeCode, pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) return null;
  const key = normalizeStoreKey(storeCode);
  const credentials = (await cacheGet(`credentials:${key}`)) || [];
  for (const record of credentials) {
    if (!record?.active || !record?.profile?.id) continue;
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) continue;
    const candidate = await hashPin(pin, record.pinSalt, record.pinIterations || 180000);
    if (candidate === record.pinHash) return clone(record.profile);
  }
  return null;
}

export async function getCachedOfflineProfile(storeCode, userId = '') {
  const key = normalizeStoreKey(storeCode);
  if (!userId) return clone(await cacheGet(`last-profile:${key}`));
  const credentials = (await cacheGet(`credentials:${key}`)) || [];
  const record = credentials.find(item => item.id === userId && item.active && (!item.expiresAt || new Date(item.expiresAt).getTime() >= Date.now()));
  return clone(record?.profile || null);
}

export async function clearOfflineIdentity(storeCode) {
  const key = normalizeStoreKey(storeCode);
  await Promise.all([
    cacheDelete(`credentials:${key}`),
    cacheDelete(`last-profile:${key}`)
  ]);
}

export function getOfflineQueueStats(storeCode) {
  const rows = readPendingMutations(storeCode);
  return {
    count: rows.length,
    oldestAt: rows[0]?.createdAt || null,
    newestAt: rows.at(-1)?.createdAt || null
  };
}

export { normalizeStoreKey };
