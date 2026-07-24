import crypto from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();
const auth = getAuth();
const REGION = 'asia-southeast2';
const PIN_PEPPER = defineSecret('PIN_PEPPER');
const BOOTSTRAP_SECRET = defineSecret('BOOTSTRAP_SECRET');

const normalizeCode = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
const normalizePin = value => String(value || '').replace(/\D/g, '').slice(0, 12);
const now = () => new Date().toISOString();

function assertPin(pin) {
  if (!/^\d{4,12}$/.test(pin)) throw new HttpsError('invalid-argument', 'PIN harus terdiri dari 4 sampai 12 digit.');
}

function pinLookup(pin, pepper) {
  return crypto.createHmac('sha256', pepper).update(pin).digest('hex');
}

function createPinHash(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPinHash(pin, encoded) {
  const [scheme, salt, expected] = String(encoded || '').split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  const actual = crypto.scryptSync(pin, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sesi Firebase tidak tersedia.');
  return request.auth;
}

function requireRole(request, roles) {
  const session = requireAuth(request);
  if (!roles.includes(session.token.role)) throw new HttpsError('permission-denied', 'Hak akses tidak mencukupi.');
  return session;
}

function profileFromDoc(uid, data) {
  return {
    id: uid,
    uid,
    name: data.name,
    role: data.role,
    branchId: data.branchId || '',
    storeId: data.storeId,
    permissions: data.permissions || [],
    active: data.active !== false
  };
}

async function mintSession(profile) {
  const claims = {
    storeId: profile.storeId,
    role: profile.role,
    branchId: profile.branchId || '',
    name: profile.name,
    permissions: Array.isArray(profile.permissions) ? profile.permissions.slice(0, 80) : []
  };
  await auth.setCustomUserClaims(profile.uid, claims);
  return auth.createCustomToken(profile.uid, claims);
}


const MUTABLE_COLLECTIONS = new Set([
  'branches', 'products', 'promotions', 'suppliers', 'customers', 'sales', 'heldSales',
  'purchases', 'stockMovements', 'stockAdjustments', 'stockOpnames', 'stockTransfers',
  'expenses', 'receivables', 'payables', 'refunds', 'shifts', 'cashMovements',
  'onlineOrders', 'printerProfiles', 'campaigns', 'feedback'
]);

const DEFAULT_ROLE_PERMISSIONS = {
  owner: ['*'],
  manager: [
    'dashboard.view', 'pos.use', 'transactions.view', 'transactions.refund', 'transactions.void',
    'products.view', 'products.manage', 'promotions.view', 'promotions.manage', 'inventory.view', 'inventory.manage',
    'purchases.view', 'purchases.manage', 'suppliers.view', 'suppliers.manage', 'customers.view', 'customers.manage',
    'shifts.view', 'shifts.manage', 'finance.view', 'finance.manage', 'reports.view', 'orders.view', 'orders.manage',
    'devices.view', 'devices.manage', 'display.view', 'display.manage', 'settings.view', 'settings.manage'
  ],
  kasir: [
    'pos.use', 'transactions.view', 'products.view', 'customers.view', 'customers.manage',
    'shifts.view', 'shifts.manage', 'openBills.view', 'orders.view', 'display.view'
  ]
};

const ACTION_PERMISSIONS = {
  SETTING_UPDATE: 'settings.manage',
  BRANCH_CREATE: 'branches.manage',
  PRODUCT_CREATE: 'products.manage', PRODUCT_UPDATE: 'products.manage', PRODUCT_ARCHIVE: 'products.manage', PRODUCT_TOGGLE: 'products.manage',
  PROMOTION_CREATE: 'promotions.manage', PROMOTION_UPDATE: 'promotions.manage',
  SUPPLIER_CREATE: 'suppliers.manage', SUPPLIER_UPDATE: 'suppliers.manage',
  CUSTOMER_CREATE: 'customers.manage', CUSTOMER_UPDATE: 'customers.manage', LOYALTY_REDEEM: 'customers.manage',
  SHIFT_START: 'shifts.manage', SHIFT_END: 'shifts.manage', CASH_MOVEMENT: 'shifts.manage',
  BILL_HOLD: 'pos.use', BILL_DELETE: 'pos.use', SALE_COMPLETE: 'pos.use',
  SALE_REFUND: 'transactions.refund', SALE_VOID: 'transactions.void',
  PURCHASE_CREATE: 'purchases.manage', PURCHASE_UPDATE: 'purchases.manage', PURCHASE_RETURN: 'purchases.manage',
  RECEIVABLE_PAYMENT: 'finance.manage', PAYABLE_PAYMENT: 'finance.manage', EXPENSE_CREATE: 'finance.manage',
  STOCK_ADJUST: 'inventory.manage', STOCK_OPNAME: 'inventory.manage', STOCK_TRANSFER: 'inventory.manage',
  ORDER_CREATE: 'orders.manage', ORDER_UPDATE: 'orders.manage', ORDER_TO_BILL: 'orders.manage',
  PRINTER_CREATE: 'devices.manage', PRINTER_UPDATE: 'devices.manage',
  CAMPAIGN_CREATE: 'display.manage', CAMPAIGN_UPDATE: 'display.manage', FEEDBACK_CREATE: 'display.view'
};

const ACTION_COLLECTIONS = {
  SETTING_UPDATE: ['__settings__'],
  BRANCH_CREATE: ['branches', 'customers'],
  PRODUCT_CREATE: ['products'], PRODUCT_UPDATE: ['products'], PRODUCT_ARCHIVE: ['products'], PRODUCT_TOGGLE: ['products'],
  PROMOTION_CREATE: ['promotions'], PROMOTION_UPDATE: ['promotions'],
  SUPPLIER_CREATE: ['suppliers'], SUPPLIER_UPDATE: ['suppliers'],
  CUSTOMER_CREATE: ['customers'], CUSTOMER_UPDATE: ['customers'], LOYALTY_REDEEM: ['customers'],
  SHIFT_START: ['shifts', 'cashMovements'], SHIFT_END: ['shifts'], CASH_MOVEMENT: ['cashMovements'],
  BILL_HOLD: ['heldSales'], BILL_DELETE: ['heldSales'],
  SALE_COMPLETE: ['sales', 'products', 'stockMovements', 'receivables', 'customers', 'cashMovements', 'heldSales'],
  SALE_REFUND: ['refunds', 'sales', 'products', 'stockMovements', 'cashMovements'],
  SALE_VOID: ['refunds', 'sales', 'products', 'stockMovements', 'cashMovements'],
  PURCHASE_CREATE: ['purchases', 'products', 'stockMovements', 'payables', 'cashMovements'],
  PURCHASE_UPDATE: ['purchases', 'products', 'stockMovements', 'payables', 'cashMovements'],
  PURCHASE_RETURN: ['purchases', 'products', 'stockMovements', 'payables'],
  RECEIVABLE_PAYMENT: ['receivables', 'cashMovements'], PAYABLE_PAYMENT: ['payables', 'cashMovements'],
  EXPENSE_CREATE: ['expenses', 'cashMovements'],
  STOCK_ADJUST: ['products', 'stockAdjustments', 'stockMovements'],
  STOCK_OPNAME: ['products', 'stockOpnames', 'stockMovements'],
  STOCK_TRANSFER: ['products', 'stockTransfers', 'stockMovements'],
  ORDER_CREATE: ['onlineOrders'], ORDER_UPDATE: ['onlineOrders'], ORDER_TO_BILL: ['onlineOrders', 'heldSales'],
  PRINTER_CREATE: ['printerProfiles'], PRINTER_UPDATE: ['printerProfiles'],
  CAMPAIGN_CREATE: ['campaigns'], CAMPAIGN_UPDATE: ['campaigns'], FEEDBACK_CREATE: ['feedback']
};

function hasSessionPermission(session, permission) {
  if (!permission) return false;
  if (session.token.role === 'owner') return true;
  const custom = Array.isArray(session.token.permissions) ? session.token.permissions : [];
  const permissions = custom.length ? custom : (DEFAULT_ROLE_PERMISSIONS[session.token.role] || []);
  return permissions.includes('*') || permissions.includes(permission);
}


function stableValue(value) {
  if (value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function changedTopLevelKeys(beforeData, afterData) {
  const before = beforeData || {};
  const after = afterData || {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(key => stableJson(before[key]) !== stableJson(after[key]));
}

function operationDocumentRef(storeId, operation) {
  if (operation.collectionName === '__settings__') return db.doc(`stores/${storeId}/system/settings`);
  return db.doc(`stores/${storeId}/${operation.collectionName}/${operation.id}`);
}

function validateBranchScope(session, operation, action = '', allOperations = []) {
  const role = session.token.role;
  if (role === 'owner') return;
  const collectionName = operation.collectionName;
  if (collectionName === '__settings__' || ['printerProfiles', 'campaigns'].includes(collectionName)) {
    if (role !== 'manager') throw new HttpsError('permission-denied', 'Kasir tidak boleh mengubah konfigurasi global.');
    return;
  }
  if (collectionName === 'branches') throw new HttpsError('permission-denied', 'Hanya Owner yang boleh mengubah cabang.');
  const data = operation.afterData || operation.beforeData || {};
  const branchId = String(session.token.branchId || '');

  if (action === 'STOCK_TRANSFER') {
    const transferOperation = allOperations.find(item => item.collectionName === 'stockTransfers');
    const transfer = transferOperation?.afterData || transferOperation?.beforeData || {};
    if (String(transfer.sourceBranchId || '') !== branchId || !String(transfer.destinationBranchId || '')) {
      throw new HttpsError('permission-denied', 'Transfer stok harus berasal dari cabang pengguna dan memiliki cabang tujuan.');
    }
    if (collectionName === 'stockTransfers') return;
    if (['products', 'stockMovements'].includes(collectionName)) {
      const allowedBranches = new Set([branchId, String(transfer.destinationBranchId)]);
      if (!allowedBranches.has(String(data.branchId || ''))) {
        throw new HttpsError('permission-denied', `Data ${collectionName} berada di luar cabang transfer.`);
      }
      return;
    }
  }

  if (collectionName === 'stockTransfers') {
    if (String(data.sourceBranchId || '') !== branchId) {
      throw new HttpsError('permission-denied', 'Transfer stok hanya boleh berasal dari cabang pengguna.');
    }
    return;
  }
  if (!data.branchId || String(data.branchId) !== branchId) {
    throw new HttpsError('permission-denied', `Data ${collectionName} berada di luar cabang pengguna.`);
  }
}

function validateOperationPermission(session, action, operation, allOperations = []) {
  const role = session.token.role;
  const name = operation.collectionName;
  if (name !== '__settings__' && !MUTABLE_COLLECTIONS.has(name)) {
    throw new HttpsError('permission-denied', `Koleksi ${name} tidak boleh diubah melalui transaksi umum.`);
  }
  if (!['set', 'delete'].includes(operation.type)) throw new HttpsError('invalid-argument', 'Jenis operasi cloud tidak valid.');
  if (!operation.id || String(operation.id).length > 180) throw new HttpsError('invalid-argument', 'ID dokumen tidak valid.');

  const allowedCollections = ACTION_COLLECTIONS[action] || [];
  if (!allowedCollections.includes(name)) {
    throw new HttpsError('permission-denied', `Aksi ${action} tidak diizinkan mengubah ${name}.`);
  }
  const requiredPermission = ACTION_PERMISSIONS[action];
  if (!requiredPermission || !hasSessionPermission(session, requiredPermission)) {
    throw new HttpsError('permission-denied', `Hak akses ${requiredPermission || action} tidak tersedia.`);
  }
  validateBranchScope(session, operation, action, allOperations);

  if (name === 'products' && ['SALE_COMPLETE', 'SALE_REFUND', 'SALE_VOID', 'STOCK_TRANSFER'].includes(action)) {
    const changed = changedTopLevelKeys(operation.beforeData, operation.afterData);
    if (operation.beforeData === null && action === 'STOCK_TRANSFER') {
      const after = operation.afterData || {};
      if (Number(after.stock || 0) <= 0) throw new HttpsError('permission-denied', 'Produk tujuan transfer baru harus memiliki stok positif.');
    } else {
      const forbidden = changed.filter(key => !['stock', 'updatedAt'].includes(key));
      if (forbidden.length) throw new HttpsError('permission-denied', `Aksi ${action} tidak boleh mengubah data produk: ${forbidden.join(', ')}.`);
    }
  }
  if (role === 'kasir' && name === 'customers') {
    const before = operation.beforeData || {};
    const after = operation.afterData || {};
    const changed = changedTopLevelKeys(before, after);
    const contactFields = ['name', 'phone', 'email', 'type', 'address', 'project', 'notes'];

    if (action === 'CUSTOMER_CREATE') {
      const allowedCreateFields = ['id', 'branchId', ...contactFields, 'priceTier', 'creditLimit', 'points', 'active'];
      const forbidden = changed.filter(key => !allowedCreateFields.includes(key));
      if (forbidden.length) throw new HttpsError('permission-denied', `Data pelanggan baru mengandung kolom terlarang: ${forbidden.join(', ')}.`);
      if (String(after.priceTier || 'retail') !== 'retail' || Number(after.creditLimit || 0) !== 0 || Number(after.points || 0) !== 0 || after.active === false) {
        throw new HttpsError('permission-denied', 'Kasir tidak boleh menentukan tingkat harga, batas kredit, poin, atau menonaktifkan pelanggan baru.');
      }
    } else if (action === 'CUSTOMER_UPDATE') {
      const forbidden = changed.filter(key => !contactFields.includes(key));
      if (forbidden.length) throw new HttpsError('permission-denied', `Kasir hanya boleh memperbarui data kontak pelanggan: ${forbidden.join(', ')}.`);
    } else if (action === 'LOYALTY_REDEEM') {
      const forbidden = changed.filter(key => !['points', 'updatedAt'].includes(key));
      if (forbidden.length || Number(after.points || 0) >= Number(before.points || 0) || Number(after.points || 0) < 0) {
        throw new HttpsError('permission-denied', 'Perubahan poin loyalty tidak valid.');
      }
    } else if (action === 'SALE_COMPLETE') {
      const forbidden = changed.filter(key => !['points', 'updatedAt'].includes(key));
      if (forbidden.length) throw new HttpsError('permission-denied', `Transaksi kasir tidak boleh mengubah data pelanggan: ${forbidden.join(', ')}.`);
      const saleOperation = allOperations.find(item => item.collectionName === 'sales' && item.afterData?.customerId === operation.id);
      if (!saleOperation) throw new HttpsError('permission-denied', 'Perubahan poin pelanggan tidak memiliki transaksi penjualan yang sesuai.');
      const sale = saleOperation.afterData || {};
      const expectedPoints = Math.max(0, Number(before.points || 0) - Number(sale.pointsRedeemed || 0) + Number(sale.pointsEarned || 0));
      if (Number(after.points || 0) !== expectedPoints) throw new HttpsError('permission-denied', 'Perhitungan poin pelanggan tidak sesuai transaksi.');
    }
  }
  if (operation.type === 'delete' && !(name === 'heldSales' && ['BILL_DELETE', 'SALE_COMPLETE'].includes(action))) {
    throw new HttpsError('permission-denied', 'Penghapusan permanen tidak diizinkan untuk aksi ini. Gunakan status arsip atau pembatalan.');
  }
}

function approvalRequired(session, action) {
  return session.token.role === 'kasir' && ['SALE_REFUND', 'SALE_VOID'].includes(action);
}


function sanitizeSaleForPublicReceipt(sale) {
  return {
    id: String(sale.id || ''),
    createdAt: sale.createdAt || now(),
    customerName: String(sale.customerName || 'Umum'),
    cashierName: String(sale.cashierName || ''),
    subtotal: Number(sale.subtotal || 0),
    globalDiscount: Number(sale.globalDiscount || 0),
    promoDiscount: Number(sale.promoDiscount || 0),
    loyaltyDiscount: Number(sale.loyaltyDiscount || 0),
    tax: Number(sale.tax || 0),
    service: Number(sale.service || 0),
    total: Number(sale.total || 0),
    change: Number(sale.change || 0),
    items: (sale.items || []).map(item => ({
      lineId: String(item.lineId || ''),
      name: String(item.name || 'Item'),
      qty: Number(item.qty || 0),
      unit: String(item.unit || 'item'),
      price: Number(item.price || 0),
      itemDiscount: Number(item.itemDiscount || 0),
      variantName: String(item.variantName || ''),
      modifiers: Array.isArray(item.modifiers) ? item.modifiers.map(modifier => ({ name: String(modifier.name || ''), price: Number(modifier.price || 0) })) : []
    })),
    payments: (sale.payments || []).map(payment => ({
      id: String(payment.id || ''),
      name: String(payment.name || payment.method || 'Pembayaran'),
      amount: Number(payment.amount || 0),
      reference: String(payment.reference || '')
    }))
  };
}

function sanitizeStoreForPublicReceipt(configs) {
  return {
    companyName: String(configs.companyName || 'BUMI MAKMUR'),
    address: String(configs.address || ''),
    phone: String(configs.phone || ''),
    receiptHeader: String(configs.receiptHeader || 'Nota Pembelian'),
    receiptFooter: String(configs.receiptFooter || ''),
    receiptMessage: String(configs.receiptMessage || ''),
    receiptShowLogo: configs.receiptShowLogo !== false,
    receiptLogo: String(configs.receiptLogo || '')
  };
}

export const bootstrapStore = onCall({ region: REGION, secrets: [PIN_PEPPER, BOOTSTRAP_SECRET] }, async request => {
  const data = request.data || {};
  const storeId = String(data.storeId || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const storeCode = normalizeCode(data.storeCode);
  const businessName = String(data.businessName || 'BUMI MAKMUR').trim();
  const ownerName = String(data.ownerName || 'Owner').trim();
  const ownerPin = normalizePin(data.ownerPin);
  assertPin(ownerPin);
  if (!storeId || !storeCode || !businessName || !ownerName) throw new HttpsError('invalid-argument', 'Data setup toko belum lengkap.');
  if (String(data.bootstrapSecret || '') !== BOOTSTRAP_SECRET.value()) throw new HttpsError('permission-denied', 'Bootstrap secret salah.');

  const storeRef = db.doc(`stores/${storeId}/system/settings`);
  const registryRef = db.doc(`storeCodes/${storeCode}`);

  const uid = `${storeId}-owner`;
  try {
    await auth.getUser(uid);
  } catch (error) {
    if (error.code === 'auth/user-not-found') await auth.createUser({ uid, displayName: ownerName, disabled: false });
    else throw error;
  }

  const profile = { uid, id: uid, name: ownerName, role: 'owner', branchId: 'BMP-001', storeId, permissions: [], active: true };
  const credential = {
    uid,
    storeId,
    role: 'owner',
    branchId: 'BMP-001',
    active: true,
    pinLookup: pinLookup(ownerPin, PIN_PEPPER.value()),
    pinHash: createPinHash(ownerPin),
    updatedAt: now()
  };

  await db.runTransaction(async transaction => {
    const [storeSnapshot, registrySnapshot] = await Promise.all([
      transaction.get(storeRef),
      transaction.get(registryRef)
    ]);
    if (storeSnapshot.exists || registrySnapshot.exists) {
      throw new HttpsError('already-exists', 'Kode toko atau database ini sudah pernah dibuat.');
    }
    const timestamp = now();
    transaction.set(registryRef, { storeId, storeCode, businessName, active: true, createdAt: timestamp });
    transaction.set(db.doc(`stores/${storeId}/users/${uid}`), profile);
    transaction.set(db.doc(`stores/${storeId}/privateCredentials/${uid}`), credential);
    transaction.set(storeRef, {
      meta: { version: '4.1.0', createdAt: timestamp, updatedAt: timestamp, hybridMode: true, cloudMode: true },
      configs: { companyName: businessName, activeBranchId: 'BMP-001' },
      categories: [],
      units: []
    });
  });

  const customToken = await mintSession(profile);
  return { customToken, profile, requiresSeed: true };
});

export const loginWithPin = onCall({ region: REGION, secrets: [PIN_PEPPER] }, async request => {
  const storeCode = normalizeCode(request.data?.storeCode);
  const pin = normalizePin(request.data?.pin);
  assertPin(pin);
  if (!storeCode) throw new HttpsError('invalid-argument', 'Kode toko wajib diisi.');

  const registry = await db.doc(`storeCodes/${storeCode}`).get();
  if (!registry.exists || registry.data().active === false) throw new HttpsError('not-found', 'Kode toko tidak ditemukan.');
  const storeId = registry.data().storeId;
  const lookup = pinLookup(pin, PIN_PEPPER.value());
  const credentialQuery = await db.collection(`stores/${storeId}/privateCredentials`).where('pinLookup', '==', lookup).where('active', '==', true).limit(2).get();
  if (credentialQuery.empty) throw new HttpsError('permission-denied', 'PIN tidak dikenali.');
  if (credentialQuery.size > 1) throw new HttpsError('failed-precondition', 'PIN terduplikasi. Hubungi Owner.');

  const credentialDoc = credentialQuery.docs[0];
  const credential = credentialDoc.data();
  if (!verifyPinHash(pin, credential.pinHash)) throw new HttpsError('permission-denied', 'PIN tidak dikenali.');
  const profileSnapshot = await db.doc(`stores/${storeId}/users/${credential.uid}`).get();
  if (!profileSnapshot.exists || profileSnapshot.data().active === false) throw new HttpsError('permission-denied', 'Akun dinonaktifkan.');
  const profile = profileFromDoc(credential.uid, profileSnapshot.data());
  const customToken = await mintSession(profile);

  await db.doc(`stores/${storeId}/devices/${crypto.randomUUID()}`).set({
    userId: profile.uid,
    userName: profile.name,
    branchId: profile.branchId,
    platform: String(request.data?.device?.platform || '').slice(0, 300),
    appVersion: String(request.data?.device?.appVersion || ''),
    lastLoginAt: FieldValue.serverTimestamp(),
    active: true
  });
  return { customToken, profile };
});

export const upsertEmployee = onCall({ region: REGION, secrets: [PIN_PEPPER] }, async request => {
  const session = requireRole(request, ['owner', 'manager']);
  const storeId = session.token.storeId;
  const callerRole = session.token.role;
  const data = request.data || {};
  const name = String(data.name || '').trim();
  const role = String(data.role || 'kasir');
  const branchId = String(data.branchId || session.token.branchId || '').trim();
  const pin = normalizePin(data.pin);
  if (!name || !['owner', 'manager', 'kasir'].includes(role)) throw new HttpsError('invalid-argument', 'Data karyawan tidak valid.');
  if (callerRole === 'manager' && role !== 'kasir') throw new HttpsError('permission-denied', 'Manager hanya dapat mengelola akun Kasir.');
  if (callerRole === 'manager' && branchId !== session.token.branchId) throw new HttpsError('permission-denied', 'Manager hanya dapat mengelola cabangnya sendiri.');

  const requestedPermissions = [...new Set((Array.isArray(data.permissions) ? data.permissions : []).map(item => String(item || '').trim()).filter(Boolean))];
  const maximumPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
  if (role === 'owner' && requestedPermissions.length) throw new HttpsError('invalid-argument', 'Owner memakai akses penuh dan tidak memerlukan permission override.');
  const forbiddenPermissions = requestedPermissions.filter(permission => !maximumPermissions.includes(permission));
  if (forbiddenPermissions.length) throw new HttpsError('permission-denied', `Permission tidak sesuai role ${role}: ${forbiddenPermissions.join(', ')}.`);

  const uid = String(data.id || data.uid || `${storeId}-${crypto.randomUUID()}`);
  const profileRef = db.doc(`stores/${storeId}/users/${uid}`);
  const credentialRef = db.doc(`stores/${storeId}/privateCredentials/${uid}`);
  const existing = await profileRef.get();
  if (!existing.exists && !pin) throw new HttpsError('invalid-argument', 'PIN wajib diisi untuk karyawan baru.');
  if (pin) assertPin(pin);

  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, { displayName: name, disabled: data.active === false });
  } catch (error) {
    if (error.code === 'auth/user-not-found') await auth.createUser({ uid, displayName: name, disabled: data.active === false });
    else throw error;
  }

  const profile = {
    id: uid,
    uid,
    storeId,
    name,
    role,
    branchId,
    permissions: requestedPermissions,
    active: data.active !== false,
    updatedAt: now()
  };
  const batch = db.batch();
  batch.set(profileRef, profile, { merge: true });
  if (pin) {
    const lookup = pinLookup(pin, PIN_PEPPER.value());
    const duplicate = await db.collection(`stores/${storeId}/privateCredentials`).where('pinLookup', '==', lookup).where('active', '==', true).limit(2).get();
    if (duplicate.docs.some(item => item.id !== uid)) throw new HttpsError('already-exists', 'PIN sudah digunakan karyawan lain.');
    batch.set(credentialRef, {
      uid, storeId, role, branchId, active: profile.active,
      pinLookup: lookup,
      pinHash: createPinHash(pin),
      updatedAt: now()
    }, { merge: true });
  } else {
    batch.set(credentialRef, { uid, storeId, role, branchId, active: profile.active, updatedAt: now() }, { merge: true });
  }
  await batch.commit();
  await mintSession(profile);
  return { profile };
});

export const verifyManagerPin = onCall({ region: REGION, secrets: [PIN_PEPPER] }, async request => {
  const session = requireAuth(request);
  const storeId = session.token.storeId;
  const pin = normalizePin(request.data?.pin);
  const purpose = String(request.data?.purpose || 'GENERAL').slice(0, 80);
  assertPin(pin);
  const lookup = pinLookup(pin, PIN_PEPPER.value());
  const result = await db.collection(`stores/${storeId}/privateCredentials`).where('pinLookup', '==', lookup).where('active', '==', true).limit(2).get();
  for (const item of result.docs) {
    const credential = item.data();
    if (!['owner', 'manager'].includes(credential.role)) continue;
    if (credential.role === 'manager' && String(credential.branchId || '') !== String(session.token.branchId || '')) continue;
    if (!verifyPinHash(pin, credential.pinHash)) continue;
    const profileSnapshot = await db.doc(`stores/${storeId}/users/${credential.uid}`).get();
    if (!profileSnapshot.exists || profileSnapshot.data().active === false) continue;
    const profile = profileFromDoc(credential.uid, profileSnapshot.data());
    const approvalToken = crypto.randomBytes(24).toString('base64url');
    await db.doc(`stores/${storeId}/approvals/${approvalToken}`).set({
      token: approvalToken,
      purpose,
      requestedBy: session.uid,
      branchId: session.token.branchId || '',
      approvedBy: profile.uid,
      approvedByName: profile.name,
      used: false,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
    return { success: true, user: profile, approvalToken };
  }
  return { success: false };
});

export const commitStoreMutation = onCall({ region: REGION }, async request => {
  const session = requireAuth(request);
  const storeId = session.token.storeId;
  const action = String(request.data?.action || '').trim().toUpperCase();
  const details = String(request.data?.details || '').slice(0, 500);
  const approvalToken = String(request.data?.approvalToken || '').trim();
  const mutationId = String(request.data?.mutationId || '').trim().slice(0, 180);
  const offlineCreatedAt = String(request.data?.offlineCreatedAt || '').trim().slice(0, 80);
  const deviceId = String(request.data?.deviceId || '').trim().slice(0, 180);
  const operations = Array.isArray(request.data?.operations) ? request.data.operations : [];
  if (!action) throw new HttpsError('invalid-argument', 'Nama aksi cloud wajib diisi.');
  if (!operations.length) return { count: 0, duplicate: false };
  if (operations.length > 240) throw new HttpsError('resource-exhausted', 'Terlalu banyak perubahan dalam satu transaksi.');

  for (const operation of operations) validateOperationPermission(session, action, operation, operations);

  const refs = operations.map(operation => operationDocumentRef(storeId, operation));
  const approvalRef = approvalRequired(session, action)
    ? db.doc(`stores/${storeId}/approvals/${approvalToken}`)
    : null;
  const mutationReceiptRef = mutationId
    ? db.doc(`stores/${storeId}/mutationReceipts/${mutationId}`)
    : null;
  const settingsRef = db.doc(`stores/${storeId}/system/settings`);
  const auditRef = db.doc(`stores/${storeId}/auditLogs/${crypto.randomUUID()}`);

  const transactionResult = await db.runTransaction(async transaction => {
    const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
    const [approvalSnapshot, mutationReceiptSnapshot] = await Promise.all([
      approvalRef ? transaction.get(approvalRef) : Promise.resolve(null),
      mutationReceiptRef ? transaction.get(mutationReceiptRef) : Promise.resolve(null)
    ]);

    if (mutationReceiptSnapshot?.exists) {
      const receipt = mutationReceiptSnapshot.data();
      if (receipt.userId !== session.uid) throw new HttpsError('permission-denied', 'ID sinkronisasi sudah digunakan perangkat lain.');
      return { duplicate: true, count: Number(receipt.operationCount || operations.length) };
    }

    if (approvalRef) {
      if (!approvalToken || !approvalSnapshot?.exists) throw new HttpsError('permission-denied', 'Approval Manager tidak tersedia.');
      const approval = approvalSnapshot.data();
      if (approval.used || approval.requestedBy !== session.uid || approval.branchId !== (session.token.branchId || '') || approval.purpose !== action || new Date(approval.expiresAt).getTime() < Date.now()) {
        throw new HttpsError('permission-denied', 'Approval Manager tidak valid atau sudah kedaluwarsa.');
      }
    }

    snapshots.forEach((snapshot, index) => {
      const expected = operations[index].beforeData ?? null;
      const actual = snapshot.exists ? snapshot.data() : null;
      if (stableJson(actual) !== stableJson(expected)) {
        throw new HttpsError('aborted', `Data ${operations[index].collectionName}/${operations[index].id} telah berubah di perangkat lain. Sinkronisasi akan mencoba menggabungkan pembaruan secara aman.`);
      }
    });

    const timestamp = now();
    operations.forEach((operation, index) => {
      const targetRef = refs[index];
      if (operation.type === 'delete') transaction.delete(targetRef);
      else {
        const nextData = stableValue(operation.afterData || {});
        if (operation.collectionName === '__settings__') {
          nextData.meta = { ...(nextData.meta || {}), version: '4.1.0', updatedAt: timestamp, lastSyncAt: timestamp, hybridMode: true, cloudMode: true };
        }
        transaction.set(targetRef, nextData, { merge: false });
      }
    });

    if (!operations.some(operation => operation.collectionName === '__settings__')) {
      transaction.update(settingsRef, {
        'meta.version': '4.1.0',
        'meta.updatedAt': timestamp,
        'meta.lastSyncAt': timestamp,
        'meta.hybridMode': true,
        'meta.cloudMode': true
      });
    }
    if (approvalRef) transaction.update(approvalRef, { used: true, usedAt: timestamp, action });
    if (mutationReceiptRef) {
      transaction.set(mutationReceiptRef, {
        id: mutationId,
        action,
        userId: session.uid,
        branchId: session.token.branchId || '',
        deviceId,
        offlineCreatedAt: offlineCreatedAt || null,
        operationCount: operations.length,
        appliedAt: timestamp
      });
    }
    const operationBranchId = operations.map(operation => operation.afterData || operation.beforeData || {})
      .map(data => data.branchId || data.sourceBranchId || '')
      .find(Boolean) || session.token.branchId || '';
    transaction.set(auditRef, {
      id: auditRef.id,
      action,
      details,
      branchId: operationBranchId,
      userId: session.uid,
      userName: session.token.name || 'Pengguna',
      role: session.token.role,
      operationCount: operations.length,
      mutationId: mutationId || null,
      offlineCreatedAt: offlineCreatedAt || null,
      deviceId: deviceId || null,
      createdAt: timestamp
    });
    return { duplicate: false, count: operations.length };
  });
  return transactionResult;
});

export const applyOwnerDataBatch = onCall({ region: REGION }, async request => {
  const session = requireRole(request, ['owner']);
  const storeId = session.token.storeId;
  const action = String(request.data?.action || 'OWNER_DATA_REPLACE').trim().toUpperCase().slice(0, 80);
  const operations = Array.isArray(request.data?.operations) ? request.data.operations : [];
  if (!operations.length) return { success: true, count: 0 };
  if (operations.length > 250) throw new HttpsError('resource-exhausted', 'Maksimal 250 perubahan per batch Owner.');

  const timestamp = now();
  const batch = db.batch();
  for (const operation of operations) {
    const name = String(operation.collectionName || '');
    if (name !== '__settings__' && !MUTABLE_COLLECTIONS.has(name)) {
      throw new HttpsError('permission-denied', `Koleksi ${name} tidak dapat dipulihkan melalui batch Owner.`);
    }
    if (!['set', 'delete'].includes(operation.type)) throw new HttpsError('invalid-argument', 'Jenis operasi batch tidak valid.');
    if (!operation.id || String(operation.id).length > 180) throw new HttpsError('invalid-argument', 'ID dokumen batch tidak valid.');
    const targetRef = operationDocumentRef(storeId, operation);
    if (operation.type === 'delete') batch.delete(targetRef);
    else {
      const data = stableValue(operation.afterData || {});
      if (name === '__settings__') {
        data.meta = { ...(data.meta || {}), version: '4.1.0', updatedAt: timestamp, lastSyncAt: timestamp, hybridMode: true, cloudMode: true };
      }
      batch.set(targetRef, data, { merge: false });
    }
  }
  const auditRef = db.doc(`stores/${storeId}/auditLogs/${crypto.randomUUID()}`);
  batch.set(auditRef, {
    id: auditRef.id,
    action,
    details: `${operations.length} dokumen diproses oleh batch Owner`,
    branchId: session.token.branchId || '',
    userId: session.uid,
    userName: session.token.name || 'Owner',
    role: session.token.role,
    operationCount: operations.length,
    createdAt: timestamp
  });
  await batch.commit();
  return { success: true, count: operations.length };
});

export const createPublicReceipt = onCall({ region: REGION }, async request => {
  const session = requireAuth(request);
  const storeId = session.token.storeId;
  const saleId = String(request.data?.saleId || '').trim();
  if (!saleId) throw new HttpsError('invalid-argument', 'Nomor transaksi wajib diisi.');
  const [saleSnapshot, settingsSnapshot] = await Promise.all([
    db.doc(`stores/${storeId}/sales/${saleId}`).get(),
    db.doc(`stores/${storeId}/system/settings`).get()
  ]);
  const suppliedSale = request.data?.sale;
  const sale = saleSnapshot.exists ? { id: saleSnapshot.id, ...saleSnapshot.data() } : suppliedSale;
  if (!sale || sale.id !== saleId || sale.branchId !== session.token.branchId && session.token.role !== 'owner') {
    throw new HttpsError('not-found', 'Transaksi tidak ditemukan atau belum tersimpan.');
  }
  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAtDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const expiresAt = expiresAtDate.toISOString();
  await db.doc(`publicReceipts/${token}`).set({
    token,
    storeId,
    saleId,
    sale: sanitizeSaleForPublicReceipt(sale),
    store: sanitizeStoreForPublicReceipt(settingsSnapshot.data()?.configs || {}),
    active: true,
    createdAt: now(),
    expiresAt: expiresAtDate
  });
  const requestedUrl = String(request.data?.appUrl || '').replace(/\/$/, '');
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
  const appUrl = requestedUrl || (projectId ? `https://${projectId}.web.app` : '');
  return { token, expiresAt, url: appUrl ? `${appUrl}/receipt/${token}` : `/receipt/${token}` };
});
