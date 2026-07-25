import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where
} from 'firebase/firestore';
import {
  auth,
  firestore,
  firebaseConfigured,
  firestorePersistenceReady,
  PUBLIC_APP_URL,
  STORE_ID
} from './firebase.js';
import {
  CLOUD_ENTITY_COLLECTIONS,
  SETTINGS_KEYS,
  applyOperationsToDb,
  buildDiffOperations,
  cleanUndefined,
  rebaseOperationsAgainstRemote,
  stableJson
} from './syncEngine.js';

export {
  CLOUD_ENTITY_COLLECTIONS,
  SETTINGS_KEYS,
  applyOperationsToDb,
  buildDiffOperations,
  cleanUndefined,
  rebaseOperationsAgainstRemote,
  stableJson
};

const GLOBAL_COLLECTIONS = new Set(['branches', 'printerProfiles', 'campaigns']);
const CASHIER_COLLECTIONS = new Set([
  'branches', 'products', 'promotions', 'customers', 'sales', 'heldSales',
  'stockMovements', 'receivables', 'refunds', 'shifts', 'cashMovements',
  'onlineOrders', 'printerProfiles', 'campaigns'
]);
const MANAGER_COLLECTIONS = new Set(CLOUD_ENTITY_COLLECTIONS);
const clone = value => value == null
  ? value
  : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

function normalizeCloudValue(value) {
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalizeCloudValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeCloudValue(item)]));
  }
  return value;
}

function canLoadCollection(name, profile) {
  if (!profile || profile.role === 'owner') return true;
  if (name === 'users') return profile.role === 'manager';
  if (profile.role === 'manager') return MANAGER_COLLECTIONS.has(name);
  return CASHIER_COLLECTIONS.has(name);
}

function requireCloud() {
  if (!firebaseConfigured || !firestore) throw new Error('Firebase belum dikonfigurasi.');
}

function collectionRef(name, storeId = STORE_ID) {
  return collection(firestore, 'stores', storeId, name);
}

function entityRef(name, id, storeId = STORE_ID) {
  if (name === '__settings__') return doc(firestore, 'stores', storeId, 'system', 'settings');
  return doc(firestore, 'stores', storeId, name, String(id));
}

function settingsRef(storeId = STORE_ID) {
  return doc(firestore, 'stores', storeId, 'system', 'settings');
}

function buildQuery(name, profile, storeId = STORE_ID) {
  if (!canLoadCollection(name, profile)) return null;
  const base = collectionRef(name, storeId);
  if (!profile || profile.role === 'owner' || GLOBAL_COLLECTIONS.has(name) || name === 'users') return base;
  if (!profile.branchId) return base;
  return query(base, where('branchId', '==', profile.branchId));
}

async function readDocPreferServer(reference) {
  try {
    return await getDocFromServer(reference);
  } catch {
    return getDoc(reference);
  }
}

async function readQueryPreferServer(reference) {
  try {
    return await getDocsFromServer(reference);
  } catch {
    return getDocs(reference);
  }
}

export async function loadCloudDb(seed, profile, storeId = STORE_ID) {
  requireCloud();
  await firestorePersistenceReady;
  const settingsSnapshot = await readDocPreferServer(settingsRef(storeId));
  const result = clone(seed);
  result.meta = { ...result.meta, cloudInitialized: settingsSnapshot.exists() };
  if (settingsSnapshot.exists()) {
    const settings = normalizeCloudValue(settingsSnapshot.data());
    for (const key of SETTINGS_KEYS) if (settings[key] !== undefined) result[key] = settings[key];
    result.meta = { ...result.meta, cloudInitialized: true };
  }

  const rows = await Promise.all(
    CLOUD_ENTITY_COLLECTIONS.map(async name => {
      if (name === 'users' && profile?.role === 'kasir') return [name, [clone(profile)]];
      const targetQuery = buildQuery(name, profile, storeId);
      if (!targetQuery) return [name, []];
      const snapshot = await readQueryPreferServer(targetQuery);
      return [name, snapshot.docs.map(item => ({ id: item.id, ...normalizeCloudValue(item.data()) }))];
    })
  );
  for (const [name, items] of rows) result[name] = items;
  if (!result.users.some(item => item.id === profile?.id) && profile) result.users.unshift(clone(profile));
  return result;
}

export function subscribeCloudDb(seed, profile, onChange, onError, storeId = STORE_ID) {
  requireCloud();
  let state = clone(seed);
  const emit = () => onChange(clone(state));
  const unsubscribers = [];

  unsubscribers.push(onSnapshot(settingsRef(storeId), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.exists()) {
      const settings = normalizeCloudValue(snapshot.data());
      for (const key of SETTINGS_KEYS) if (settings[key] !== undefined) state[key] = settings[key];
      state.meta = { ...state.meta, cloudInitialized: true };
      emit();
    }
  }, onError));

  for (const name of CLOUD_ENTITY_COLLECTIONS) {
    if (name === 'users' && profile?.role === 'kasir') {
      state.users = [clone(profile)];
      continue;
    }
    const targetQuery = buildQuery(name, profile, storeId);
    if (!targetQuery) continue;
    unsubscribers.push(onSnapshot(targetQuery, { includeMetadataChanges: true }, snapshot => {
      state = {
        ...state,
        [name]: snapshot.docs.map(item => ({ id: item.id, ...normalizeCloudValue(item.data()) }))
      };
      if (name === 'users' && !state.users.some(item => item.id === profile?.id) && profile) state.users.unshift(clone(profile));
      emit();
    }, onError));
  }
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

function comparable(value) {
  return cleanUndefined(normalizeCloudValue(value || null));
}

function operationMatchesCurrent(operation, currentData) {
  const current = currentData == null ? null : comparable(currentData);
  if (operation.beforeData == null) return current == null || stableJson(current) === stableJson(comparable(operation.afterData));
  return stableJson(current) === stableJson(comparable(operation.beforeData));
}

async function persistChunk(operations, storeId, context, chunkIndex) {
  const currentUser = auth?.currentUser;
  if (!currentUser) throw new Error('Sesi Firebase tidak aktif. Masuk ulang dengan email dan password.');
  const mutationId = String(context.mutationId || `MUT-${Date.now()}`) + (chunkIndex ? `-${chunkIndex}` : '');
  const auditRef = doc(firestore, 'stores', storeId, 'auditLogs', mutationId);

  return runTransaction(firestore, async transaction => {
    const auditSnapshot = await transaction.get(auditRef);
    if (auditSnapshot.exists()) return 0;

    const snapshots = [];
    for (const operation of operations) {
      const reference = entityRef(operation.collectionName, operation.id, storeId);
      snapshots.push([operation, reference, await transaction.get(reference)]);
    }

    for (const [operation, reference, snapshot] of snapshots) {
      const currentData = snapshot.exists() ? snapshot.data() : null;
      if (!operationMatchesCurrent(operation, currentData)) {
        const conflict = new Error(`Data ${operation.collectionName}/${operation.id} telah berubah di perangkat lain.`);
        conflict.code = 'aborted';
        throw conflict;
      }
      if (operation.type === 'delete') transaction.delete(reference);
      else transaction.set(reference, cleanUndefined(operation.afterData || {}));
    }

    transaction.set(auditRef, {
      id: mutationId,
      action: String(context.action || 'UNKNOWN'),
      details: String(context.details || '').slice(0, 500),
      branchId: String(context.branchId || ''),
      userId: currentUser.uid,
      userName: String(context.userName || currentUser.email || 'Pengguna'),
      userRole: String(context.userRole || ''),
      deviceId: String(context.deviceId || ''),
      offlineCreatedAt: String(context.offlineCreatedAt || ''),
      createdAt: new Date().toISOString()
    });
    return operations.length;
  });
}

export async function persistOperations(operations, storeId = STORE_ID, context = {}) {
  requireCloud();
  await firestorePersistenceReady;
  if (!operations?.length) return 0;
  let count = 0;
  const chunkSize = 120;
  for (let index = 0; index < operations.length; index += chunkSize) {
    count += await persistChunk(operations.slice(index, index + chunkSize), storeId, context, Math.floor(index / chunkSize));
  }
  return count;
}

export async function persistDbDiff(before, after, storeId = STORE_ID, context = {}) {
  return persistOperations(buildDiffOperations(before, after), storeId, context);
}

export async function seedCloudDb(seed, storeId = STORE_ID, context = {}) {
  requireCloud();
  const empty = Object.fromEntries(CLOUD_ENTITY_COLLECTIONS.map(name => [name, []]));
  const prepared = clone(seed);
  prepared.meta = {
    ...prepared.meta,
    cloudInitialized: true,
    cloudInitializedAt: new Date().toISOString()
  };
  const before = context.baseDb
    ? { ...context.baseDb, meta: {}, configs: {}, categories: [], units: [] }
    : { ...empty, meta: {}, configs: {}, categories: [], units: [] };
  const { baseDb: _baseDb, ...safeContext } = context;
  await persistDbDiff(
    before,
    prepared,
    storeId,
    { ...safeContext, action: 'CLOUD_SEED', mutationId: context.mutationId || `SEED-${Date.now()}` }
  );
}

export async function replaceCloudDb(current, replacement, storeId = STORE_ID, context = {}) {
  requireCloud();
  await persistDbDiff(current, replacement, storeId, {
    ...context,
    action: context.action || 'CLOUD_RESTORE',
    mutationId: context.mutationId || `RESTORE-${Date.now()}`
  });
}

function dataUrlSize(dataUrl) {
  return Math.ceil((String(dataUrl || '').length * 3) / 4);
}

export async function uploadStoreAsset(file, kind) {
  if (!file) throw new Error('File belum dipilih.');
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type || '')) throw new Error('Gunakan gambar PNG, JPG, atau WebP.');
  const maxDimension = kind === 'qris' ? 1200 : 720;
  const quality = kind === 'qris' ? 0.92 : 0.82;
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gambar gagal dibaca.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const item = new Image();
    item.onload = () => resolve(item);
    item.onerror = () => reject(new Error('Format gambar tidak dapat diproses.'));
    item.src = source;
  });
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL(kind === 'qris' ? 'image/png' : 'image/jpeg', quality);
  if (dataUrlSize(dataUrl) > 380 * 1024) throw new Error('Gambar masih terlalu besar. Gunakan gambar yang lebih kecil.');
  return dataUrl;
}

function sanitizeReceiptSale(sale) {
  return {
    id: sale.id,
    createdAt: sale.createdAt,
    customerName: sale.customerName || 'Umum',
    cashierName: sale.cashierName || '',
    items: (sale.items || []).map(item => ({
      name: item.name,
      qty: item.qty,
      unit: item.unit || item.baseUnit || 'pcs',
      price: item.price,
      itemDiscount: item.itemDiscount || 0,
      total: Math.round((Number(item.price) || 0) * (Number(item.qty) || 0) - (Number(item.itemDiscount) || 0))
    })),
    subtotal: sale.subtotal || 0,
    discount: sale.discount || sale.globalDiscount || 0,
    promoDiscount: sale.promoDiscount || 0,
    loyaltyDiscount: sale.loyaltyDiscount || 0,
    tax: sale.tax || 0,
    service: sale.service || 0,
    total: sale.total || 0,
    paid: sale.paid || 0,
    change: sale.change || 0,
    payments: (sale.payments || []).map(item => ({ name: item.name, type: item.type, amount: item.amount }))
  };
}

export async function createOnlineReceipt(sale, storeId = STORE_ID) {
  requireCloud();
  if (!auth?.currentUser) throw new Error('Sesi Firebase tidak aktif.');
  const token = `${String(sale?.id || 'SALE').replace(/[^A-Za-z0-9_-]/g, '')}-${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  const expiresAtDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const expiresAt = expiresAtDate.toISOString();
  await setDoc(doc(firestore, 'publicReceipts', token), {
    token,
    storeId,
    active: true,
    sale: sanitizeReceiptSale(sale || {}),
    createdAt: new Date(),
    expiresAt: expiresAtDate
  });
  const base = PUBLIC_APP_URL || window.location.origin;
  return { token, onlineReceiptUrl: `${base}/?receipt=${encodeURIComponent(token)}`, expiresAt };
}

export async function fetchPublicReceipt(token) {
  requireCloud();
  const snapshot = await getDoc(doc(firestore, 'publicReceipts', String(token || '')));
  if (!snapshot.exists()) throw new Error('Nota online tidak ditemukan atau sudah kedaluwarsa.');
  const data = normalizeCloudValue(snapshot.data());
  const expiryDate = data.expiresAt ? new Date(data.expiresAt) : null;
  if (data.active === false || (expiryDate && expiryDate.getTime() < Date.now())) throw new Error('Nota online sudah tidak aktif.');
  return data;
}
