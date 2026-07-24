import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import {
  firestore,
  firebaseConfigured,
  functions,
  PUBLIC_APP_URL,
  storage,
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

const GLOBAL_COLLECTIONS = new Set(['branches', 'users', 'printerProfiles', 'campaigns', 'auditLogs']);
const CASHIER_COLLECTIONS = new Set([
  'branches', 'products', 'promotions', 'customers', 'sales', 'heldSales',
  'stockMovements', 'receivables', 'refunds', 'shifts', 'cashMovements',
  'onlineOrders', 'printerProfiles', 'campaigns'
]);
const MANAGER_COLLECTIONS = new Set(CLOUD_ENTITY_COLLECTIONS);
const clone = value => value == null
  ? value
  : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

function canLoadCollection(name, profile) {
  if (!profile || profile.role === 'owner') return true;
  if (profile.role === 'manager') return MANAGER_COLLECTIONS.has(name);
  return CASHIER_COLLECTIONS.has(name);
}

function requireCloud() {
  if (!firebaseConfigured || !firestore) throw new Error('Firebase belum dikonfigurasi.');
}

function collectionRef(name, storeId = STORE_ID) {
  return collection(firestore, 'stores', storeId, name);
}

function settingsRef(storeId = STORE_ID) {
  return doc(firestore, 'stores', storeId, 'system', 'settings');
}

function buildQuery(name, profile, storeId = STORE_ID) {
  if (!canLoadCollection(name, profile)) return null;
  const base = collectionRef(name, storeId);
  if (!profile || profile.role === 'owner' || GLOBAL_COLLECTIONS.has(name)) return base;
  if (!profile.branchId) return base;
  return query(base, where('branchId', '==', profile.branchId));
}

export async function loadCloudDb(seed, profile, storeId = STORE_ID) {
  requireCloud();
  const settingsSnapshot = await getDocFromServer(settingsRef(storeId));
  const result = clone(seed);
  if (settingsSnapshot.exists()) {
    const settings = settingsSnapshot.data();
    for (const key of SETTINGS_KEYS) if (settings[key] !== undefined) result[key] = settings[key];
  }
  const rows = await Promise.all(
    CLOUD_ENTITY_COLLECTIONS.map(async name => {
      const targetQuery = buildQuery(name, profile, storeId);
      if (!targetQuery) return [name, []];
      const snapshot = await getDocsFromServer(targetQuery);
      return [name, snapshot.docs.map(item => ({ id: item.id, ...item.data() }))];
    })
  );
  for (const [name, items] of rows) result[name] = items;
  return result;
}

export function subscribeCloudDb(seed, profile, onChange, onError, storeId = STORE_ID) {
  requireCloud();
  let state = clone(seed);
  const emit = () => onChange(clone(state));
  const unsubscribers = [];

  unsubscribers.push(onSnapshot(settingsRef(storeId), snapshot => {
    if (snapshot.exists()) {
      const settings = snapshot.data();
      for (const key of SETTINGS_KEYS) if (settings[key] !== undefined) state[key] = settings[key];
      emit();
    }
  }, onError));

  for (const name of CLOUD_ENTITY_COLLECTIONS) {
    const targetQuery = buildQuery(name, profile, storeId);
    if (!targetQuery) continue;
    unsubscribers.push(onSnapshot(targetQuery, snapshot => {
      state = { ...state, [name]: snapshot.docs.map(item => ({ id: item.id, ...item.data() })) };
      emit();
    }, onError));
  }
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

async function commitOperationsOwner(operations, action = 'OWNER_DATA_REPLACE') {
  if (!functions) throw new Error('Cloud Functions belum dikonfigurasi.');
  const callable = httpsCallable(functions, 'applyOwnerDataBatch');
  for (let index = 0; index < operations.length; index += 250) {
    const response = await callable({ action, operations: operations.slice(index, index + 250) });
    if (!response.data?.success) throw new Error('Batch data Owner gagal diterapkan.');
  }
}

export async function persistOperations(operations, storeId = STORE_ID, context = {}) {
  requireCloud();
  if (!operations?.length) return 0;
  if (context.direct === true) {
    await commitOperationsOwner(operations, context.action || 'OWNER_DATA_REPLACE');
    return operations.length;
  }
  if (!functions) throw new Error('Cloud Functions belum dikonfigurasi.');
  if (operations.length > 240) throw new Error('Perubahan terlalu besar untuk satu transaksi cloud. Pecah operasi menjadi beberapa langkah.');
  const callable = httpsCallable(functions, 'commitStoreMutation');
  const response = await callable({
    action: String(context.action || 'UNKNOWN'),
    details: String(context.details || '').slice(0, 500),
    approvalToken: String(context.approvalToken || ''),
    mutationId: String(context.mutationId || ''),
    offlineCreatedAt: String(context.offlineCreatedAt || ''),
    deviceId: String(context.deviceId || ''),
    operations
  });
  return Number(response.data?.count || operations.length);
}

export async function persistDbDiff(before, after, storeId = STORE_ID, context = {}) {
  return persistOperations(buildDiffOperations(before, after), storeId, context);
}

export async function seedCloudDb(seed, storeId = STORE_ID) {
  requireCloud();
  const empty = Object.fromEntries(CLOUD_ENTITY_COLLECTIONS.map(name => [name, []]));
  await persistDbDiff(
    { ...empty, meta: {}, configs: {}, categories: [], units: [] },
    seed,
    storeId,
    { direct: true, action: 'CLOUD_SEED' }
  );
}

export async function replaceCloudDb(current, replacement, storeId = STORE_ID) {
  requireCloud();
  await persistDbDiff(current, replacement, storeId, { direct: true, action: 'CLOUD_RESTORE' });
}

export async function uploadStoreAsset(file, kind, storeId = STORE_ID) {
  if (!storage) throw new Error('Firebase Storage belum dikonfigurasi.');
  if (!file) throw new Error('File belum dipilih.');
  const safeName = String(file.name || 'asset').replace(/[^a-zA-Z0-9._-]/g, '-');
  const target = ref(storage, `stores/${storeId}/assets/${kind}/${Date.now()}-${safeName}`);
  await uploadBytes(target, file, { contentType: file.type || 'application/octet-stream' });
  return getDownloadURL(target);
}

export async function createOnlineReceipt(sale) {
  if (!functions) throw new Error('Cloud Functions belum dikonfigurasi.');
  const callable = httpsCallable(functions, 'createPublicReceipt');
  const response = await callable({ saleId: sale?.id, sale, appUrl: PUBLIC_APP_URL });
  return response.data;
}

export async function fetchPublicReceipt(token) {
  requireCloud();
  const snapshot = await getDoc(doc(firestore, 'publicReceipts', String(token || '')));
  if (!snapshot.exists()) throw new Error('Nota online tidak ditemukan atau sudah kedaluwarsa.');
  const data = snapshot.data();
  const expiryDate = data.expiresAt?.toDate ? data.expiresAt.toDate() : (data.expiresAt ? new Date(data.expiresAt) : null);
  if (data.active === false || (expiryDate && expiryDate.getTime() < Date.now())) throw new Error('Nota online sudah tidak aktif.');
  return data;
}
