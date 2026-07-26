import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  auth,
  firestore,
  firebaseConfigured,
  PUBLIC_APP_URL,
  STORE_ID
} from './firebase.js';
import {
  CLOUD_ENTITY_COLLECTIONS,
  SETTINGS_KEYS,
  applyOperationsToDb,
  buildDiffOperations,
  cleanUndefined,
  rebaseOperationAgainstRemoteData,
  rebaseOperationsAgainstRemote,
  stableJson
} from './syncEngine.js';

export {
  CLOUD_ENTITY_COLLECTIONS,
  SETTINGS_KEYS,
  applyOperationsToDb,
  buildDiffOperations,
  cleanUndefined,
  rebaseOperationAgainstRemoteData,
  rebaseOperationsAgainstRemote,
  stableJson
};

const GLOBAL_COLLECTIONS = new Set(['printerProfiles', 'campaigns']);
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

function publicLoginRef(storeId = STORE_ID) {
  return doc(firestore, 'stores', storeId, 'public', 'login');
}

function operationRef(operation, storeId = STORE_ID) {
  return operation.collectionName === '__settings__'
    ? settingsRef(storeId)
    : doc(firestore, 'stores', storeId, operation.collectionName, String(operation.id));
}

function buildQuery(name, profile, storeId = STORE_ID) {
  if (!canLoadCollection(name, profile)) return null;
  const base = collectionRef(name, storeId);
  if (!profile || profile.role === 'owner' || GLOBAL_COLLECTIONS.has(name)) return base;
  if (!profile.branchId) return base;
  return query(base, where('branchId', '==', profile.branchId));
}


export async function loadPublicLoginDirectory(storeId = STORE_ID) {
  requireCloud();
  const snapshot = await getDocFromServer(publicLoginRef(storeId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() || {};
  return {
    storeId,
    storeCode: String(data.storeCode || ''),
    businessName: String(data.businessName || 'BUMI MAKMUR'),
    branches: Array.isArray(data.branches)
      ? data.branches.filter(item => item?.id && item?.active !== false).map(item => ({ id: String(item.id), name: String(item.name || item.id), active: true }))
      : []
  };
}

export async function publishPublicLoginDirectory(db, storeId = STORE_ID) {
  requireCloud();
  if (!auth?.currentUser) throw new Error('Sesi cloud belum tersedia untuk memperbarui daftar cabang login.');
  const branches = (db?.branches || [])
    .filter(item => item?.id && item.active !== false)
    .slice(0, 100)
    .map(item => ({ id: String(item.id), name: String(item.name || item.id), active: true }));
  await setDoc(publicLoginRef(storeId), {
    storeId,
    storeCode: String(db?.configs?.storeCode || ''),
    businessName: String(db?.configs?.companyName || 'BUMI MAKMUR'),
    branches,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return { storeId, businessName: String(db?.configs?.companyName || 'BUMI MAKMUR'), branches };
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
      if (name === 'branches' && profile && profile.role !== 'owner') {
        if (!profile.branchId) return [name, []];
        const branchSnapshot = await getDocFromServer(doc(firestore, 'stores', storeId, 'branches', profile.branchId));
        return [name, branchSnapshot.exists() ? [{ id: branchSnapshot.id, ...branchSnapshot.data() }] : []];
      }
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

  unsubscribers.push(onSnapshot(settingsRef(storeId), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    if (snapshot.exists()) {
      const settings = snapshot.data();
      for (const key of SETTINGS_KEYS) if (settings[key] !== undefined) state[key] = settings[key];
      emit();
    }
  }, onError));

  for (const name of CLOUD_ENTITY_COLLECTIONS) {
    if (name === 'branches' && profile && profile.role !== 'owner') {
      if (!profile.branchId) continue;
      const targetRef = doc(firestore, 'stores', storeId, 'branches', profile.branchId);
      unsubscribers.push(onSnapshot(targetRef, { includeMetadataChanges: true }, snapshot => {
        if (snapshot.metadata.hasPendingWrites) return;
        state = { ...state, branches: snapshot.exists() ? [{ id: snapshot.id, ...snapshot.data() }] : [] };
        emit();
      }, onError));
      continue;
    }
    const targetQuery = buildQuery(name, profile, storeId);
    if (!targetQuery) continue;
    unsubscribers.push(onSnapshot(targetQuery, { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      state = { ...state, [name]: snapshot.docs.map(item => ({ id: item.id, ...item.data() })) };
      emit();
    }, onError));
  }
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

function currentData(snapshot) {
  return snapshot.exists() ? cleanUndefined(snapshot.data()) : null;
}

function conflictMessage(operation) {
  const label = operation.collectionName === '__settings__' ? 'pengaturan' : `${operation.collectionName}/${operation.id}`;
  return `Data ${label} telah berubah di perangkat lain. Perubahan lokal akan digabungkan lalu dicoba kembali.`;
}


export async function refreshOperationsAgainstCloud(operations, storeId = STORE_ID) {
  requireCloud();
  if (!operations?.length) return [];
  const refs = operations.map(operation => operationRef(operation, storeId));
  const snapshots = await Promise.all(refs.map(ref => getDocFromServer(ref)));
  const refreshed = [];
  operations.forEach((operation, index) => {
    const next = rebaseOperationAgainstRemoteData(operation, currentData(snapshots[index]));
    if (next) refreshed.push(next);
  });
  return refreshed;
}

export async function persistOperations(operations, storeId = STORE_ID, context = {}) {
  requireCloud();
  if (!operations?.length) return 0;
  if (operations.length > 240) throw new Error('Perubahan terlalu besar. Sistem harus memecahnya menjadi beberapa antrean.');

  const mutationId = String(context.mutationId || `MUT-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const receiptRef = doc(firestore, 'stores', storeId, 'mutationReceipts', mutationId);
  const auditRef = doc(firestore, 'stores', storeId, 'auditLogs', mutationId);

  return runTransaction(firestore, async transaction => {
    const receiptSnapshot = await transaction.get(receiptRef);
    if (receiptSnapshot.exists()) return Number(receiptSnapshot.data()?.count || operations.length);

    const refs = operations.map(operation => operationRef(operation, storeId));
    const snapshots = [];
    for (const ref of refs) snapshots.push(await transaction.get(ref));

    if (context.direct !== true) {
      operations.forEach((operation, index) => {
        const remote = currentData(snapshots[index]);
        const expected = cleanUndefined(operation.beforeData ?? null);
        if (stableJson(remote) !== stableJson(expected)) {
          const error = new Error(conflictMessage(operation));
          error.code = 'aborted';
          throw error;
        }
      });
    }

    operations.forEach((operation, index) => {
      const targetRef = refs[index];
      if (operation.type === 'delete') transaction.delete(targetRef);
      else transaction.set(targetRef, cleanUndefined(operation.afterData || {}), { merge: false });
    });

    const createdAt = new Date().toISOString();
    transaction.set(auditRef, {
      id: mutationId,
      mutationId,
      action: String(context.action || 'UNKNOWN'),
      details: String(context.details || '').slice(0, 500),
      branchId: String(context.branchId || ''),
      userId: String(context.userId || ''),
      userName: String(context.userName || ''),
      userRole: String(context.userRole || ''),
      deviceId: String(context.deviceId || ''),
      offlineCreatedAt: String(context.offlineCreatedAt || ''),
      createdAt,
      count: operations.length
    });
    transaction.set(receiptRef, {
      id: mutationId,
      count: operations.length,
      action: String(context.action || 'UNKNOWN'),
      userId: String(context.userId || ''),
      createdAt
    });
    return operations.length;
  });
}

export async function persistDbDiff(before, after, storeId = STORE_ID, context = {}) {
  return persistOperations(buildDiffOperations(before, after), storeId, context);
}

async function applyDirectOperations(operations, storeId, action) {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = writeBatch(firestore);
    for (const operation of operations.slice(index, index + 400)) {
      const target = operationRef(operation, storeId);
      if (operation.type === 'delete') batch.delete(target);
      else batch.set(target, cleanUndefined(operation.afterData || {}), { merge: false });
    }
    const id = `${action}-${Date.now()}-${index}`;
    batch.set(doc(firestore, 'stores', storeId, 'auditLogs', id), {
      id,
      action,
      details: `${operations.length} operasi`,
      createdAt: new Date().toISOString(),
      userId: auth?.currentUser?.uid || '',
      userName: auth?.currentUser?.displayName || 'Owner',
      userRole: 'owner'
    });
    await batch.commit();
  }
}

export async function seedCloudDb(seed, storeId = STORE_ID) {
  requireCloud();
  const empty = Object.fromEntries(CLOUD_ENTITY_COLLECTIONS.map(name => [name, []]));
  const operations = buildDiffOperations(
    { ...empty, meta: {}, configs: {}, categories: [], units: [] },
    seed
  );
  await applyDirectOperations(operations, storeId, 'CLOUD_SEED');
}

export async function replaceCloudDb(current, replacement, storeId = STORE_ID) {
  requireCloud();
  await applyDirectOperations(buildDiffOperations(current, replacement), storeId, 'CLOUD_RESTORE');
}

function resizeImage(file, { maxDimension, quality, mimeType }) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File gambar tidak dapat dibaca.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { alpha: true });
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL(mimeType, quality));
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadStoreAsset(file, kind) {
  if (!file) throw new Error('File belum dipilih.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('File harus berupa gambar.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Gambar terlalu besar. Maksimal 12 MB sebelum kompresi.');
  const isQris = kind === 'qris';
  const dataUrl = await resizeImage(file, {
    maxDimension: isQris ? 1000 : 512,
    quality: isQris ? 0.9 : 0.82,
    mimeType: isQris ? 'image/png' : 'image/webp'
  });
  const maximumLength = isQris ? 450_000 : 180_000;
  if (dataUrl.length > maximumLength) throw new Error(`Gambar masih terlalu besar setelah dikompresi. Batas ${isQris ? 'QRIS' : 'logo'} adalah sekitar ${Math.round(maximumLength / 1000)} KB.`);
  return dataUrl;
}

function sanitizeReceiptSale(sale = {}) {
  return {
    id: String(sale.id || ''),
    branchId: String(sale.branchId || ''),
    createdAt: String(sale.createdAt || new Date().toISOString()),
    customerName: String(sale.customerName || 'Umum'),
    cashierName: String(sale.cashierName || sale.userName || ''),
    items: (sale.items || []).map(item => ({
      name: String(item.name || ''),
      qty: Number(item.qty || 0),
      unit: String(item.unit || 'item'),
      price: Number(item.price || 0),
      itemDiscount: Number(item.itemDiscount || 0)
    })),
    subtotal: Number(sale.subtotal || 0),
    globalDiscount: Number(sale.globalDiscount || 0),
    promoDiscount: Number(sale.promoDiscount || 0),
    loyaltyDiscount: Number(sale.loyaltyDiscount || 0),
    tax: Number(sale.tax || 0),
    service: Number(sale.service || 0),
    total: Number(sale.total || 0),
    change: Number(sale.change || 0),
    payments: (sale.payments || []).map(payment => ({
      id: String(payment.id || `${payment.type || 'pay'}-${Math.random().toString(36).slice(2, 8)}`),
      name: String(payment.name || payment.type || 'Pembayaran'),
      type: String(payment.type || ''),
      amount: Number(payment.amount || 0)
    }))
  };
}

export async function createOnlineReceipt(sale, storeId = STORE_ID) {
  requireCloud();
  const random = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const token = random.replace(/[^a-zA-Z0-9-]/g, '');
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const settingsSnapshot = await getDoc(settingsRef(storeId));
  const settingsDocument = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
  const settings = settingsDocument.configs || settingsDocument;
  const store = {
    companyName: String(settings.companyName || 'BUMI MAKMUR'),
    address: String(settings.address || ''),
    phone: String(settings.phone || ''),
    receiptHeader: String(settings.receiptHeader || 'Nota Pembelian'),
    receiptFooter: String(settings.receiptFooter || 'Terima kasih telah berbelanja.'),
    receiptMessage: String(settings.receiptMessage || ''),
    receiptLogo: String(settings.receiptLogo || '').slice(0, 180_000),
    receiptShowLogo: settings.receiptShowLogo !== false
  };
  const payload = {
    token,
    storeId,
    active: true,
    expiresAt,
    createdAt: Timestamp.now(),
    sale: sanitizeReceiptSale(sale),
    store
  };
  await setDoc(doc(firestore, 'publicReceipts', token), payload);
  const origin = PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return { token, url: `${origin}/receipt/${encodeURIComponent(token)}` };
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

export async function revokePublicReceipt(token) {
  requireCloud();
  await deleteDoc(doc(firestore, 'publicReceipts', String(token || '')));
}
