import { normalizeEmployeeLoginName } from '../utils/employeeLogin.js';

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

async function getDeviceSecret(storeKey) {
  let secret = await cacheGet(`device-secret:${storeKey}`);
  if (!secret) {
    secret = randomHex(32);
    await cachePut(`device-secret:${storeKey}`, secret);
  }
  return String(secret);
}

async function deriveCredentialKey(pin, saltHex, deviceSecretHex, iterations = 220000) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${String(pin)}:${deviceSecretHex}`),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptCloudCredential(storeKey, pin, credential) {
  if (!credential?.email || !credential?.password) return null;
  const deviceSecret = await getDeviceSecret(storeKey);
  const salt = randomHex(16);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 220000;
  const key = await deriveCredentialKey(pin, salt, deviceSecret, iterations);
  const plaintext = new TextEncoder().encode(JSON.stringify({
    email: String(credential.email).trim().toLowerCase(),
    password: String(credential.password)
  }));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { salt, iv: bytesToHex(iv), ciphertext: bytesToHex(encrypted), iterations };
}

async function decryptCloudCredential(storeKey, pin, encrypted) {
  if (!encrypted?.salt || !encrypted?.iv || !encrypted?.ciphertext) return null;
  try {
    const deviceSecret = await getDeviceSecret(storeKey);
    const key = await deriveCredentialKey(pin, encrypted.salt, deviceSecret, encrypted.iterations || 220000);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(encrypted.iv) },
      key,
      hexToBytes(encrypted.ciphertext)
    );
    const parsed = JSON.parse(new TextDecoder().decode(plaintext));
    return parsed?.email && parsed?.password ? parsed : null;
  } catch {
    return null;
  }
}

export async function cacheOfflineCredential(storeCode, pin, profile, cloudCredential = null) {
  if (!profile?.id || !/^\d{4}$/.test(String(pin || ''))) return false;
  const key = normalizeStoreKey(storeCode);
  const credentials = (await cacheGet(`credentials:${key}`)) || [];
  const salt = randomHex(16);
  const iterations = 180000;
  const pinHash = await hashPin(pin, salt, iterations);
  const encryptedCloudCredential = await encryptCloudCredential(key, pin, cloudCredential);
  const record = {
    id: profile.id,
    profile: clone(profile),
    pinHash,
    pinSalt: salt,
    pinIterations: iterations,
    cachedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OFFLINE_CREDENTIAL_TTL_MS).toISOString(),
    active: profile.active !== false,
    cloudCredential: encryptedCloudCredential
  };
  const next = credentials.filter(item => item.id !== profile.id);
  next.push(record);
  await cachePut(`credentials:${key}`, next);
  await cachePut(`last-profile:${key}`, clone(profile));
  return true;
}

// Pembatasan percobaan PIN. PIN 4 digit hanya punya 10.000 kombinasi, sehingga tanpa
// pembatasan PIN Owner/Manager (termasuk PIN persetujuan diskon) dapat ditebak lewat UI.
// Kunci jeda bersifat per perangkat+toko dan eskalatif; berhasil login mereset hitungan.
const PIN_LOCK_STEPS = [
  { failures: 10, lockMs: 5 * 60 * 1000 },
  { failures: 8, lockMs: 2 * 60 * 1000 },
  { failures: 5, lockMs: 30 * 1000 }
];

function pinGuardKey(storeKey) { return `pin-guard:${storeKey}`; }

function createPinLockedError(remainingMs) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const label = seconds >= 60 ? `${Math.ceil(seconds / 60)} menit` : `${seconds} detik`;
  const error = new Error(`Terlalu banyak PIN salah. Coba lagi dalam ${label}.`);
  error.code = 'PIN_LOCKED';
  error.retryAfterMs = remainingMs;
  return error;
}

async function assertPinNotLocked(storeKey) {
  const state = await cacheGet(pinGuardKey(storeKey)).catch(() => null);
  const remaining = Number(state?.lockedUntil || 0) - Date.now();
  if (remaining > 0) throw createPinLockedError(remaining);
}

async function recordPinFailure(storeKey) {
  const state = (await cacheGet(pinGuardKey(storeKey)).catch(() => null)) || {};
  const failures = Number(state.failures || 0) + 1;
  const step = PIN_LOCK_STEPS.find(item => failures >= item.failures);
  await cachePut(pinGuardKey(storeKey), {
    failures,
    lockedUntil: step ? Date.now() + step.lockMs : 0,
    updatedAt: new Date().toISOString()
  }).catch(() => false);
}

async function clearPinFailures(storeKey) {
  const state = await cacheGet(pinGuardKey(storeKey)).catch(() => null);
  if (state?.failures) await cacheDelete(pinGuardKey(storeKey)).catch(() => false);
}

export async function verifyOfflineLogin(storeCode, pin, options = {}) {
  if (!/^\d{4}$/.test(String(pin || ''))) return null;
  const key = normalizeStoreKey(storeCode);
  await assertPinNotLocked(key);
  const expectedRole = String(options.expectedRole || 'any');
  const expectedLoginName = normalizeEmployeeLoginName(options.loginName || '');
  const expectedBranchId = String(options.branchId || '');
  const credentials = (await cacheGet(`credentials:${key}`)) || [];
  let compared = false;
  for (const record of credentials) {
    if (!record?.active || !record?.profile?.id) continue;
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) continue;
    const profile = record.profile;
    if (expectedRole === 'owner' && profile.role !== 'owner') continue;
    if (expectedRole === 'employee' && profile.role === 'owner') continue;
    if (expectedLoginName) {
      const profileLoginName = normalizeEmployeeLoginName(profile.loginName || profile.name || '');
      if (profileLoginName !== expectedLoginName) continue;
    }
    if (expectedBranchId && profile.branchId !== expectedBranchId) continue;
    compared = true;
    const candidate = await hashPin(pin, record.pinSalt, record.pinIterations || 180000);
    if (candidate === record.pinHash) {
      await clearPinFailures(key);
      return {
        profile: clone(profile),
        cloudCredential: await decryptCloudCredential(key, pin, record.cloudCredential)
      };
    }
  }
  // Hanya PIN yang benar-benar dibandingkan dan tidak cocok yang dihitung sebagai percobaan gagal.
  if (compared) await recordPinFailure(key);
  return null;
}

export async function verifyOfflinePin(storeCode, pin, options = {}) {
  const result = await verifyOfflineLogin(storeCode, pin, options);
  return result?.profile || null;
}

// Diagnosa penyebab gagal login PIN. Tanpa ini, PIN yang salah dan perangkat yang
// belum pernah dienroll menampilkan pesan yang sama, sehingga Owner diarahkan
// mengulang login email padahal PIN-nya hanya salah ketik.
export async function getOfflineCredentialStatus(storeCode, options = {}) {
  const key = normalizeStoreKey(storeCode);
  const expectedRole = String(options.expectedRole || 'any');
  const credentials = (await cacheGet(`credentials:${key}`).catch(() => null)) || [];
  const now = Date.now();
  const relevant = credentials.filter(record => {
    if (!record?.profile?.id) return false;
    if (expectedRole === 'owner') return record.profile.role === 'owner';
    if (expectedRole === 'employee') return record.profile.role !== 'owner';
    return true;
  });
  const usable = relevant.filter(record => record.active !== false && (!record.expiresAt || new Date(record.expiresAt).getTime() >= now));
  const expiries = usable
    .map(record => new Date(record.expiresAt || 0).getTime())
    .filter(value => Number.isFinite(value) && value > 0);
  return {
    hasAnyCredential: credentials.length > 0,
    hasUsableCredential: usable.length > 0,
    relevantCount: relevant.length,
    expiredCount: relevant.length - usable.length,
    nearestExpiryAt: expiries.length ? new Date(Math.min(...expiries)).toISOString() : null
  };
}

// Perpanjang masa berlaku kredensial offline setiap login PIN berhasil.
// Tanpa ini perangkat yang dipakai harian tetap kehilangan PIN setelah 30 hari
// dan menampilkan pesan seolah PIN tidak pernah tersimpan.
export async function refreshOfflineCredential(storeCode, userId) {
  if (!userId) return false;
  const key = normalizeStoreKey(storeCode);
  const credentials = (await cacheGet(`credentials:${key}`).catch(() => null)) || [];
  const target = credentials.find(record => record?.id === userId);
  if (!target) return false;
  const next = credentials.map(record => record?.id === userId
    ? {
        ...record,
        expiresAt: new Date(Date.now() + OFFLINE_CREDENTIAL_TTL_MS).toISOString(),
        lastUsedAt: new Date().toISOString()
      }
    : record);
  await cachePut(`credentials:${key}`, next);
  return true;
}

export async function removeOfflineCredential(storeCode, userId) {
  const key = normalizeStoreKey(storeCode);
  const credentials = (await cacheGet(`credentials:${key}`)) || [];
  const next = credentials.filter(item => item?.id !== userId);
  await cachePut(`credentials:${key}`, next);
  const lastProfile = await cacheGet(`last-profile:${key}`);
  if (lastProfile?.id === userId) await cacheDelete(`last-profile:${key}`);
  return credentials.length !== next.length;
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

export function pendingMutationBelongsToUser(mutation, userId = '') {
  const ownerId = String(mutation?.userId || '').trim();
  const activeUserId = String(userId || '').trim();
  // Queue lama sebelum ownership metadata dianggap legacy dan boleh dicoba oleh
  // sesi aktif. Queue baru selalu membawa userId sehingga tidak dapat tertukar.
  return !ownerId || !activeUserId || ownerId === activeUserId;
}

export function getOfflineQueueOwnershipStats(storeCode, userId = '') {
  const rows = readPendingMutations(storeCode);
  const activeUserRows = userId ? rows.filter(item => pendingMutationBelongsToUser(item, userId)) : rows;
  const otherUserRows = userId ? rows.filter(item => !pendingMutationBelongsToUser(item, userId)) : [];
  const operationCount = list => list.reduce((sum, item) => sum + (Array.isArray(item?.operations) ? item.operations.length : 0), 0);
  return {
    totalCount: rows.length,
    currentUserCount: activeUserRows.length,
    otherUserCount: otherUserRows.length,
    totalOperations: operationCount(rows),
    currentUserOperations: operationCount(activeUserRows),
    otherUserOperations: operationCount(otherUserRows),
    otherUserIds: [...new Set(otherUserRows.map(item => String(item?.userId || '').trim()).filter(Boolean))],
    oldestAt: rows[0]?.createdAt || null,
    newestAt: rows.at(-1)?.createdAt || null
  };
}

export function getOfflineQueueStats(storeCode) {
  const ownership = getOfflineQueueOwnershipStats(storeCode);
  return {
    count: ownership.totalCount,
    oldestAt: ownership.oldestAt,
    newestAt: ownership.newestAt
  };
}

export { normalizeStoreKey };
