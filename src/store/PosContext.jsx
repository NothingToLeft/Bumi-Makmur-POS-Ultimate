import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { APP_VERSION, MAIN_BRANCH_ID, can, createSeedDb } from '../data/defaults.js';
import { generateId, safeJSONParse, downloadFile, localDateKey } from '../utils/helpers.js';
import { friendlyCloudError } from '../utils/cloudErrors.js';
import { normalizeLoginAppearance } from '../utils/loginAppearance.js';
import { auth, firebaseConfigured, DEFAULT_STORE_CODE, STORE_ID } from '../services/firebase.js';
import { bootstrapCloudStore, connectCloudAccount, connectEmployeeWithNamePin, deleteCloudEmployee, getCloudSessionProfile, signOutCloudAccount, upsertCloudEmployee } from '../services/cloudAuth.js';
import {
  applyOperationsToDb,
  buildDiffOperations,
  loadCloudDb,
  loadPublicLoginDirectory,
  loadPublicEmployeeDirectory,
  persistOperations,
  publishPublicLoginDirectory,
  publishPublicEmployeeDirectory,
  refreshOperationsAgainstCloud,
  replaceCloudDb,
  rebaseOperationsAgainstRemote,
  seedCloudDb,
  subscribeCloudDb
} from '../services/cloudStore.js';
import {
  cacheOfflineCredential,
  clearOfflineIdentity,
  enqueuePendingMutation,
  enqueuePendingMutations,
  getCachedOfflineProfile,
  getOfflineQueueStats,
  loadCachedDb,
  readPendingMutations,
  recoverPendingMutations,
  removeOfflineCredential,
  removePendingMutation,
  replacePendingMutation,
  saveCachedDb,
  verifyOfflinePin,
  verifyOfflineLogin
} from '../services/offlineStore.js';
import { normalizeEmployeeLoginName } from '../utils/employeeLogin.js';
import { dataUrlByteLength } from '../utils/assetProcessing.js';
import { normalizeDbShape } from '../utils/dbShape.js';
import { buildProductLifecycleSummary } from '../utils/productLifecycle.js';
import { normalizeConversionRows, sortCategories, sortProductsByName } from '../utils/productCatalog.js';
import { appendSyncDiagnostic, buildSyncDiagnosticsExport, buildSyncStatus, classifySyncError, summarizePendingMutations } from '../utils/syncDiagnostics.js';
import { validateBackupPayload } from '../utils/backupValidation.js';
import {
  baseUnitCost as calculateBaseUnitCost, conversionFactor, formatQuantity,
  normalizeQuantityStep, recommendedQuantityStep
} from '../utils/fractionalUnits.js';

const PosContext = createContext(null);
const DEVICE_SETTINGS_KEY = 'bm_pos_device_security_v1';
const LOGIN_DIRECTORY_KEY = 'bm_pos_public_login_directory_v1';
const LOGIN_EMPLOYEES_KEY = 'bm_pos_public_employee_directory_v1';
const CUSTOMER_DISPLAY_KEY = 'bm_pos_customer_display_v1';
const CUSTOMER_DISPLAY_CHANNEL = 'bm-pos-customer-display';
const SYNC_DIAGNOSTICS_KEY = 'bm_pos_sync_diagnostics_v1';
const SYNC_SUCCESS_KEY = 'bm_pos_last_sync_success_v1';
const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const nowISO = () => new Date().toISOString();
const money = value => Math.max(0, Math.round(Number(value) || 0));
const quantity = value => Math.max(0, Math.round((Number(value) || 0) * 1000) / 1000);
const signedQuantity = value => Math.round((Number(value) || 0) * 1000) / 1000;
const isStepAligned = (value, step) => Math.abs(Number(value) / Number(step) - Math.round(Number(value) / Number(step))) < 0.000001;
const validateBaseQuantity = (product, value, label = 'Jumlah') => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} ${product?.name || 'barang'} tidak valid.`);
  const step = normalizeQuantityStep(product?.quantityStep, product?.allowFractional === true, recommendedQuantityStep(product?.baseUnit, product?.category));
  if (!isStepAligned(number, step)) throw new Error(`${label} ${product?.name || 'barang'} harus kelipatan ${formatQuantity(step)} ${product?.baseUnit || 'satuan'}.`);
  return signedQuantity(number);
};
const isConflictError = error => String(error?.code || '').includes('aborted') || /telah berubah|menggabungkan pembaruan/i.test(String(error?.message || ''));
const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
const withTimeout = (promise, timeoutMs, message = 'Permintaan melewati batas waktu.') => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error(message)), timeoutMs); })
  ]).finally(() => window.clearTimeout(timer));
};
const hexToBytes = hex => new Uint8Array(String(hex || '').match(/.{1,2}/g)?.map(value => Number.parseInt(value, 16)) || []);
const bytesToHex = bytes => Array.from(new Uint8Array(bytes)).map(value => value.toString(16).padStart(2, '0')).join('');
const verifySeedUserPin = async (user, pin) => {
  if (!user?.pinHash || !user?.pinSalt || !crypto?.subtle) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(user.pinSalt), iterations: Number(user.pinIterations || 120000) }, key, 256);
  return bytesToHex(bits) === user.pinHash;
};


const priceSnapshot = product => ({
  modalPrice: money(product?.modalPrice),
  retail: money(product?.prices?.retail),
  wholesale: money(product?.prices?.wholesale),
  project: money(product?.prices?.project),
  conversions: normalizeConversionRows(product?.conversions || [], product?.baseUnit || 'pcs').map(row => ({ unit: row.unit, factor: row.factor, prices: row.prices }))
});
const priceSnapshotEqual = (first, second) => JSON.stringify(priceSnapshot(first)) === JSON.stringify(priceSnapshot(second));
const appendProductPriceHistory = (next, beforeProduct, afterProduct, reason = 'Perubahan harga', userId = '') => {
  if (!afterProduct || (beforeProduct && priceSnapshotEqual(beforeProduct, afterProduct))) return null;
  if (!Array.isArray(next.productPriceHistory)) next.productPriceHistory = [];
  const item = {
    id: generateId('PRICE'), branchId: afterProduct.branchId, productId: afterProduct.id, productName: afterProduct.name,
    before: beforeProduct ? priceSnapshot(beforeProduct) : null, after: priceSnapshot(afterProduct),
    reason: String(reason || 'Perubahan harga').slice(0, 160), createdAt: nowISO(), userId: String(userId || '')
  };
  next.productPriceHistory.unshift(item);
  return item;
};

const ACTION_PERMISSIONS = {
  SETTING_UPDATE: 'settings.manage', BRANCH_CREATE: 'branches.manage', BRANCH_UPDATE: 'branches.manage', BRANCH_DELETE: 'branches.manage', BRANCH_RESTORE: 'branches.manage', BRANCH_PAYMENT_UPDATE: 'payments.manage',
  PRODUCT_CREATE: 'products.manage', PRODUCT_UPDATE: 'products.manage', INVENTORY_IMPORT: 'inventory.import', PRODUCT_ARCHIVE: 'products.manage', PRODUCT_RESTORE: 'products.manage', PRODUCT_TOGGLE: 'products.manage', PRODUCT_DELETE: 'products.delete',
  CATEGORY_CREATE: 'categories.manage', CATEGORY_UPDATE: 'categories.manage', CATEGORY_DELETE: 'categories.manage',
  PROMOTION_CREATE: 'promotions.manage', PROMOTION_UPDATE: 'promotions.manage',
  SUPPLIER_CREATE: 'suppliers.manage', SUPPLIER_UPDATE: 'suppliers.manage',
  CUSTOMER_CREATE: 'customers.manage', CUSTOMER_UPDATE: 'customers.manage', LOYALTY_REDEEM: 'customers.manage',
  SHIFT_START: 'shifts.manage', SHIFT_END: 'shifts.manage', CASH_MOVEMENT: 'shifts.manage',
  BILL_HOLD: 'pos.use', BILL_DELETE: 'pos.use', SALE_COMPLETE: 'pos.use',
  SALE_REFUND: 'transactions.refund', SALE_VOID: 'transactions.void',
  PURCHASE_CREATE: 'purchases.manage', PURCHASE_UPDATE: 'purchases.manage', PURCHASE_RETURN: 'purchases.manage', PURCHASE_ORDER_CREATE: 'purchases.manage', PURCHASE_ORDER_UPDATE: 'purchases.manage',
  RECEIVABLE_PAYMENT: 'finance.manage', PAYABLE_PAYMENT: 'finance.manage', EXPENSE_CREATE: 'finance.manage',
  STOCK_ADJUST: 'inventory.manage', STOCK_RESET: 'inventory.manage', STOCK_OPNAME: 'inventory.manage', STOCK_TRANSFER: 'inventory.manage',
  ORDER_CREATE: 'orders.manage', ORDER_UPDATE: 'orders.manage', ORDER_TO_BILL: 'orders.manage',
  PRINTER_CREATE: 'devices.manage', PRINTER_UPDATE: 'devices.manage',
  CAMPAIGN_CREATE: 'display.manage', CAMPAIGN_UPDATE: 'display.manage', FEEDBACK_CREATE: 'display.view'
};

export function PosProvider({ children }) {
  const seedRef = useRef(createSeedDb());
  const [db, setDb] = useState(() => ({ ...seedRef.current, users: [], branches: [], products: [], suppliers: [], customers: [], promotions: [], sales: [], heldSales: [], purchases: [], purchaseOrders: [], stockMovements: [], stockAdjustments: [], stockOpnames: [], stockTransfers: [], branchPaymentProfiles: [], productPriceHistory: [], approvalRequests: [], deviceSessions: [], expenses: [], receivables: [], payables: [], refunds: [], shifts: [], cashMovements: [], onlineOrders: [], printerProfiles: [], campaigns: [], feedback: [], auditLogs: [] }));
  const dbRef = useRef(db);
  const [currentUser, setCurrentUser] = useState(null);
  const currentUserRef = useRef(null);
  const [localReady, setLocalReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [initializingApp, setInitializingApp] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [cloudConfigured] = useState(firebaseConfigured);
  const [deviceSettings, setDeviceSettingsState] = useState(() => {
    const saved = safeJSONParse(localStorage.getItem(DEVICE_SETTINGS_KEY), {});
    return {
      biometricEnabled: false,
      biometricUserId: '',
      biometricAutoPrompt: false,
      storeCode: DEFAULT_STORE_CODE,
      activeBranchId: '',
      deviceId: saved.deviceId || generateId('DEVICE'),
      ...saved
    };
  });
  const storeCode = deviceSettings.storeCode || DEFAULT_STORE_CODE;
  const [pendingSyncCount, setPendingSyncCount] = useState(() => getOfflineQueueStats(storeCode).count);
  const [syncConflictCount, setSyncConflictCount] = useState(0);
  const [lastSyncAttemptAt, setLastSyncAttemptAt] = useState(null);
  const [lastSyncSuccessAt, setLastSyncSuccessAt] = useState(() => localStorage.getItem(SYNC_SUCCESS_KEY) || '');
  const [syncDiagnostics, setSyncDiagnostics] = useState(() => safeJSONParse(localStorage.getItem(SYNC_DIAGNOSTICS_KEY), []));
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [customerDisplay, setCustomerDisplay] = useState({ cart: [], total: 0, customerName: 'Umum', message: '' });
  const [loginDirectory, setLoginDirectory] = useState(() => {
    const cached = safeJSONParse(localStorage.getItem(LOGIN_DIRECTORY_KEY), {});
    return {
      storeId: STORE_ID,
      businessName: 'BUMI MAKMUR',
      branches: [],
      ...cached,
      loginAppearance: normalizeLoginAppearance(cached?.loginAppearance)
    };
  });
  const [loginDirectoryLoading, setLoginDirectoryLoading] = useState(false);
  const [loginEmployeesByBranch, setLoginEmployeesByBranch] = useState(() => safeJSONParse(localStorage.getItem(LOGIN_EMPLOYEES_KEY), {}));
  const [loginEmployeesLoading, setLoginEmployeesLoading] = useState(false);
  const cloudUnsubscribeRef = useRef(null);
  const writeChainRef = useRef(Promise.resolve());
  const localReadyRef = useRef(false);
  const cloudReadyRef = useRef(false);
  const cloudStartRef = useRef(null);
  const syncRunRef = useRef(null);
  const activeSubscriptionKeyRef = useRef('');
  const initialLoadFinishedRef = useRef(false);
  const employeeDirectoryPublishSignatureRef = useRef('');

  const recordSyncDiagnostic = useCallback((errorOrEntry, context = {}) => {
    const entry = errorOrEntry?.category && errorOrEntry?.at
      ? errorOrEntry
      : classifySyncError(errorOrEntry, { ...context, deviceId: deviceSettings.deviceId, branchId: context.branchId || currentUserRef.current?.branchId || '' });
    setSyncDiagnostics(previous => {
      const next = appendSyncDiagnostic(previous, entry);
      localStorage.setItem(SYNC_DIAGNOSTICS_KEY, JSON.stringify(next));
      return next;
    });
    return entry;
  }, [deviceSettings.deviceId]);

  const markSyncSuccess = useCallback(() => {
    const value = nowISO();
    setLastSyncSuccessAt(value);
    setCloudError('');
    localStorage.setItem(SYNC_SUCCESS_KEY, value);
    return value;
  }, []);

  useEffect(() => {
    const onOnline = () => { setOnline(true); setCloudError(''); };
    const onOffline = () => { setOnline(false); setCloudError(''); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const activeBranchId = currentUserRef.current?.role === 'owner'
      ? (deviceSettings.activeBranchId || db.configs.activeBranchId || MAIN_BRANCH_ID)
      : (currentUserRef.current?.branchId || MAIN_BRANCH_ID);
    const activeBranch = db.branches.find(item => item.id === activeBranchId);
    const activeCampaign = db.campaigns.find(item => item.active !== false);
    const snapshot = {
      ...customerDisplay,
      companyName: activeBranch?.name || db.configs.companyName || 'BUMI MAKMUR',
      branchName: db.configs.companyName || '',
      message: customerDisplay.message || activeCampaign?.message || '',
      online,
      updatedAt: nowISO()
    };
    try {
      localStorage.setItem(CUSTOMER_DISPLAY_KEY, JSON.stringify(snapshot));
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
        channel.postMessage(snapshot);
        channel.close();
      }
    } catch (error) {
      console.warn('Layar pelanggan tidak dapat diperbarui pada perangkat ini.', error);
    }
  }, [customerDisplay, db.configs.companyName, db.configs.activeBranchId, db.branches, db.campaigns, deviceSettings.activeBranchId, online]);

  useEffect(() => {
    localStorage.setItem(DEVICE_SETTINGS_KEY, JSON.stringify(deviceSettings));
    setPendingSyncCount(getOfflineQueueStats(deviceSettings.storeCode || DEFAULT_STORE_CODE).count);
  }, [deviceSettings]);

  useEffect(() => {
    localReadyRef.current = localReady;
  }, [localReady]);

  useEffect(() => {
    cloudReadyRef.current = cloudReady;
  }, [cloudReady]);

  useEffect(() => {
    dbRef.current = db;
    document.documentElement.classList.toggle('dark', Boolean(db.configs.darkMode));
  }, [db]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => () => { cloudUnsubscribeRef.current?.(); }, []);

  const saveLocalSnapshot = useCallback(async (nextDb, profile = currentUserRef.current) => {
    try {
      await saveCachedDb(deviceSettings.storeCode || DEFAULT_STORE_CODE, nextDb, profile);
    } catch (error) {
      console.error('Cache lokal gagal disimpan.', error);
      setCloudError('Penyimpanan lokal perangkat bermasalah. Segera ekspor backup JSON.');
    }
  }, [deviceSettings.storeCode]);

  const refreshLoginDirectory = useCallback(async () => {
    const fallbackBranches = (dbRef.current?.branches || []).filter(item => item?.id && item.active !== false).map(item => ({ id: item.id, name: item.name || item.id, active: true }));
    if (!firebaseConfigured || !navigator.onLine) {
      if (fallbackBranches.length) {
        const fallback = { storeId: STORE_ID, businessName: dbRef.current?.configs?.companyName || 'BUMI MAKMUR', loginAppearance: normalizeLoginAppearance(dbRef.current?.configs?.loginAppearance), branches: fallbackBranches };
        setLoginDirectory(fallback);
        localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(fallback));
      }
      return loginDirectory;
    }
    setLoginDirectoryLoading(true);
    try {
      const directory = await loadPublicLoginDirectory(STORE_ID);
      if (directory?.branches?.length) {
        setLoginDirectory(directory);
        localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(directory));
        return directory;
      }
      if (fallbackBranches.length) {
        const fallback = { storeId: STORE_ID, businessName: dbRef.current?.configs?.companyName || 'BUMI MAKMUR', loginAppearance: normalizeLoginAppearance(dbRef.current?.configs?.loginAppearance), branches: fallbackBranches };
        setLoginDirectory(fallback);
        localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(fallback));
        return fallback;
      }
      return loginDirectory;
    } catch (error) {
      console.warn('Daftar cabang login belum dapat dimuat.', error);
      return loginDirectory;
    } finally {
      setLoginDirectoryLoading(false);
    }
  }, [loginDirectory]);

  useEffect(() => {
    void refreshLoginDirectory();
  }, [online]);

  const refreshLoginEmployees = useCallback(async targetBranchId => {
    const branchKey = String(targetBranchId || '');
    if (!branchKey) return [];
    const fallback = (dbRef.current?.users || [])
      .filter(item => item?.branchId === branchKey && item.active !== false && ['manager', 'kasir'].includes(item.role) && item.loginName)
      .map(item => ({ loginName: String(item.loginName), name: String(item.name || item.loginName), role: item.role, branchId: branchKey, active: true }))
      .sort((first, second) => first.name.localeCompare(second.name, 'id'));
    if (!firebaseConfigured || !navigator.onLine) {
      if (fallback.length) {
        setLoginEmployeesByBranch(previous => {
          const next = { ...previous, [branchKey]: fallback };
          localStorage.setItem(LOGIN_EMPLOYEES_KEY, JSON.stringify(next));
          return next;
        });
        return fallback;
      }
      return loginEmployeesByBranch[branchKey] || [];
    }
    setLoginEmployeesLoading(true);
    try {
      const rows = await loadPublicEmployeeDirectory(branchKey, STORE_ID);
      const nextRows = rows.length ? rows : fallback;
      setLoginEmployeesByBranch(previous => {
        const next = { ...previous, [branchKey]: nextRows };
        localStorage.setItem(LOGIN_EMPLOYEES_KEY, JSON.stringify(next));
        return next;
      });
      return nextRows;
    } catch (error) {
      console.warn('Daftar karyawan login belum dapat dimuat.', error);
      return loginEmployeesByBranch[branchKey] || fallback;
    } finally {
      setLoginEmployeesLoading(false);
    }
  }, [loginEmployeesByBranch]);

  const publishEmployeeLoginList = useCallback(async (nextDb, targetBranchId, profile = currentUserRef.current) => {
    if (!navigator.onLine || !profile || !auth?.currentUser || auth.currentUser.uid !== profile.id) return [];
    const rows = await publishPublicEmployeeDirectory(nextDb, targetBranchId, profile.storeId || STORE_ID);
    setLoginEmployeesByBranch(previous => {
      const next = { ...previous, [targetBranchId]: rows };
      localStorage.setItem(LOGIN_EMPLOYEES_KEY, JSON.stringify(next));
      return next;
    });
    return rows;
  }, []);


  // Migrasi otomatis: setelah Owner/Manager berhasil login, publikasi daftar nama aman
  // untuk setiap cabang yang menjadi kewenangannya. Ini membuat akun lama langsung
  // muncul pada dropdown login tanpa harus diedit dan disimpan ulang satu per satu.
  useEffect(() => {
    const profile = currentUserRef.current;
    if (!online || !cloudReady || !profile || !auth?.currentUser || auth.currentUser.uid !== profile.id) return;
    if (!['owner', 'manager'].includes(profile.role)) return;
    const targetBranches = profile.role === 'owner'
      ? (db.branches || []).map(item => item.id)
      : [profile.branchId].filter(Boolean);
    const signature = JSON.stringify({
      userId: profile.id,
      branches: targetBranches,
      employees: (db.users || [])
        .filter(item => targetBranches.includes(item.branchId) && ['manager', 'kasir'].includes(item.role))
        .map(item => [item.id, item.branchId, item.loginName, item.name, item.role, item.active !== false])
        .sort((first, second) => String(first[0]).localeCompare(String(second[0])))
    });
    if (!targetBranches.length || employeeDirectoryPublishSignatureRef.current === signature) return;
    employeeDirectoryPublishSignatureRef.current = signature;
    void Promise.all(targetBranches.map(targetBranchId => publishEmployeeLoginList(dbRef.current, targetBranchId, profile)))
      .catch(error => {
        employeeDirectoryPublishSignatureRef.current = '';
        console.warn('Daftar pilihan karyawan belum dapat dipublikasikan otomatis.', error);
      });
  }, [online, cloudReady, currentUser?.id, currentUser?.role, db.users, db.branches, publishEmployeeLoginList]);

  const hydrateLocal = useCallback(async profile => {
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    await recoverPendingMutations(key);
    const cached = await loadCachedDb(key);
    if (!cached?.db) return false;
    let localDb = normalizeDbShape(cached.db, seedRef.current, APP_VERSION);
    const alreadyApplied = new Set(cached.appliedMutationIds || []);
    for (const mutation of readPendingMutations(key)) {
      if (!alreadyApplied.has(mutation.id)) localDb = applyOperationsToDb(localDb, mutation.operations);
    }
    dbRef.current = localDb;
    setDb(localDb);
    setLocalReady(true);
    setPendingSyncCount(getOfflineQueueStats(key).count);
    if (profile) await saveCachedDb(key, localDb, profile);
    return true;
  }, [deviceSettings.storeCode]);

  const activateLocalSeed = useCallback(async pin => {
    const seed = clone(seedRef.current);
    const user = await Promise.all((seed.users || []).map(async candidate => ({ candidate, valid: await verifySeedUserPin(candidate, pin) })))
      .then(rows => rows.find(row => row.valid)?.candidate || null);
    if (!user) return null;
    const profile = { ...user, storeId: STORE_ID, storeCode: deviceSettings.storeCode || DEFAULT_STORE_CODE, source: 'local-seed' };
    dbRef.current = seed;
    setDb(seed);
    setLocalReady(true);
    await saveCachedDb(profile.storeCode, seed, profile);
    await cacheOfflineCredential(profile.storeCode, pin, profile);
    return profile;
  }, [deviceSettings.storeCode]);

  const flushPendingMutations = useCallback(profile => {
    const run = async () => {
      if (!profile || !navigator.onLine || !firebaseConfigured) return { synced: 0, pending: getOfflineQueueStats(storeCode).count, conflicts: 0 };
      if (!auth?.currentUser || auth.currentUser.uid !== profile.id) {
        throw new Error('Sesi Firebase tidak cocok dengan pengguna aktif. Hubungkan ulang akun cloud sebelum sinkronisasi.');
      }
      const queue = readPendingMutations(storeCode);
      if (!queue.length) return { synced: 0, pending: 0, conflicts: 0 };
      setCloudSaving(true);
      setLastSyncAttemptAt(nowISO());
      let synced = 0;
      let conflicts = 0;
      let deferredConflict = false;
      try {
        for (const queued of queue) {
          let mutation = clone(queued);
          let completed = false;
          let mutationConflicted = false;
          for (let attempt = 0; attempt < 6 && !completed; attempt += 1) {
            try {
              await persistOperations(mutation.operations, profile.storeId || STORE_ID, {
                action: mutation.action,
                details: mutation.details,
                approvalToken: mutation.approvalToken || '',
                mutationId: mutation.id,
                offlineCreatedAt: mutation.createdAt,
                deviceId: deviceSettings.deviceId || '',
                branchId: mutation.branchId || profile.branchId || '',
                userId: mutation.userId || profile.id || '',
                userName: mutation.userName || profile.name || '',
                userRole: mutation.userRole || profile.role || ''
              });
              removePendingMutation(storeCode, mutation.id);
              synced += 1;
              completed = true;
            } catch (error) {
              if (!isConflictError(error)) throw error;
              if (!mutationConflicted) {
                mutationConflicted = true;
                conflicts += 1;
                const firstOperation = mutation.operations?.[0] || {};
                recordSyncDiagnostic(error, {
                  mutationId: mutation.id, mutationAction: mutation.action,
                  collection: firstOperation.collectionName, entityId: firstOperation.id,
                  branchId: mutation.branchId || profile.branchId || ''
                });
              }
              const operations = await refreshOperationsAgainstCloud(mutation.operations, profile.storeId || STORE_ID);
              if (!operations.length) {
                removePendingMutation(storeCode, mutation.id);
                synced += 1;
                completed = true;
                break;
              }
              mutation = {
                ...mutation,
                operations,
                rebasedAt: nowISO(),
                rebaseCount: Number(mutation.rebaseCount || 0) + 1
              };
              replacePendingMutation(storeCode, mutation);
              if (attempt >= 5) {
                deferredConflict = true;
                break;
              }
              await wait(100 + (attempt * 140) + Math.round(Math.random() * 120));
            }
          }
          if (deferredConflict) break;
        }
        setSyncConflictCount(previous => previous + conflicts);
        const pending = getOfflineQueueStats(storeCode).count;
        setPendingSyncCount(pending);
        if (pending === 0) markSyncSuccess();
        // Konflik lintas perangkat bukan error pengguna. Antrean tetap aman dan akan dicoba lagi di latar belakang.
        setCloudError('');
        return { synced, pending, conflicts, deferredConflict };
      } catch (error) {
        console.error('Sinkronisasi antrean offline gagal.', error);
        setPendingSyncCount(getOfflineQueueStats(storeCode).count);
        const queued = readPendingMutations(storeCode)[0];
        const operation = queued?.operations?.[0] || {};
        const diagnostic = recordSyncDiagnostic(error, {
          mutationId: queued?.id, mutationAction: queued?.action,
          collection: operation.collectionName, entityId: operation.id,
          branchId: queued?.branchId || profile?.branchId || ''
        });
        if (!isConflictError(error) && diagnostic.permanent) {
          setCloudError(friendlyCloudError(error, 'Pembaruan lokal belum berhasil dikirim. Aplikasi tetap dapat digunakan.'));
        }
        throw error;
      } finally {
        setCloudSaving(false);
      }
    };
    writeChainRef.current = writeChainRef.current.then(run, run);
    return writeChainRef.current;
  }, [deviceSettings.deviceId, markSyncSuccess, recordSyncDiagnostic, storeCode]);

  const overlayPendingOnRemote = useCallback(baseDb => {
    let merged = clone(baseDb);
    for (const mutation of readPendingMutations(storeCode)) {
      const rebased = rebaseOperationsAgainstRemote(mutation.operations, merged);
      merged = applyOperationsToDb(merged, rebased);
    }
    return merged;
  }, [storeCode]);

  const startCloudSubscription = useCallback(async (profile, { initial = false, force = false } = {}) => {
    if (!profile) return false;
    const subscriptionKey = `${profile.storeId || STORE_ID}:${profile.id || ''}:${storeCode}`;
    if (!force && cloudReadyRef.current && activeSubscriptionKeyRef.current === subscriptionKey) return true;
    if (cloudStartRef.current) return cloudStartRef.current;

    const run = async () => {
      const hasLocal = localReadyRef.current || await hydrateLocal(profile);
      if (!navigator.onLine || !firebaseConfigured) {
        setCloudReady(false);
        if (hasLocal) setLocalReady(true);
        if (initial) setInitializingApp(false);
        return false;
      }

      // Jangan pernah membuka listener Firestore menggunakan sesi Auth akun lain atau akun lokal demo.
      // Ini mencegah error mentah “Missing or insufficient permissions” memenuhi seluruh layar.
      if (!auth?.currentUser || auth.currentUser.uid !== profile.id) {
        setCloudReady(false);
        setCloudLoading(false);
        setCloudError('Sinkronisasi cloud belum aktif untuk akun ini. Keluar lalu masuk melalui Login Owner atau Login Karyawan untuk menghubungkan perangkat.');
        if (initial) setInitializingApp(false);
        return false;
      }

      if (initial && !hasLocal && !initialLoadFinishedRef.current) setInitializingApp(true);
      setCloudLoading(true);
      setCloudError('');
      cloudUnsubscribeRef.current?.();
      cloudUnsubscribeRef.current = null;
      try {
        try {
          await flushPendingMutations(profile);
        } catch (syncError) {
          console.warn('Antrean belum seluruhnya tersinkron; realtime tetap dilanjutkan.', syncError);
        }
        const loaded = await withTimeout(
          loadCloudDb(hasLocal ? dbRef.current : seedRef.current, profile, profile.storeId || STORE_ID, {
            onCollectionError: (error, context = {}) => {
              recordSyncDiagnostic(error, {
                mutationAction: 'COLLECTION_BOOTSTRAP',
                collection: context.collectionName,
                branchId: profile.branchId || ''
              });
            }
          }),
          10000,
          'Firebase terlalu lama merespons. Data lokal tetap digunakan.'
        );
        const localView = overlayPendingOnRemote(loaded);
        dbRef.current = localView;
        setDb(localView);
        setLocalReady(true);
        setCloudReady(true);
        markSyncSuccess();
        activeSubscriptionKeyRef.current = subscriptionKey;
        await saveCachedDb(storeCode, localView, profile);
        if (profile.role === 'owner') {
          void publishPublicLoginDirectory(localView, profile.storeId || STORE_ID)
            .then(directory => {
              const nextDirectory = { ...directory, storeCode: profile.storeCode || storeCode };
              setLoginDirectory(nextDirectory);
              localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(nextDirectory));
            })
            .catch(error => console.warn('Daftar cabang login belum dapat diperbarui.', error));
        }
        cloudUnsubscribeRef.current = subscribeCloudDb(
          loaded,
          profile,
          remoteDb => {
            const merged = overlayPendingOnRemote(remoteDb);
            dbRef.current = merged;
            setDb(merged);
            setLocalReady(true);
            setCloudReady(true);
            setCloudLoading(false);
            if (getOfflineQueueStats(storeCode).count === 0) markSyncSuccess();
            setPendingSyncCount(getOfflineQueueStats(storeCode).count);
            void saveCachedDb(storeCode, merged, profile).catch(error => console.warn('Snapshot realtime gagal disimpan lokal.', error));
          },
          (error, context = {}) => {
            console.error('Realtime Firestore gagal.', error);
            const diagnostic = recordSyncDiagnostic(error, {
              mutationAction: 'REALTIME_LISTENER',
              collection: context.collectionName,
              branchId: profile.branchId || ''
            });
            if (context.optional) {
              setCloudReady(true);
              setCloudLoading(false);
              return;
            }
            if (diagnostic.permanent) setCloudError(friendlyCloudError(error, 'Realtime cloud terputus; data lokal tetap aktif.'));
            setCloudReady(false);
            setCloudLoading(false);
          },
          profile.storeId || STORE_ID
        );
        return true;
      } catch (error) {
        console.error('Cloud load/sync failed.', error);
        const diagnostic = recordSyncDiagnostic(error, { mutationAction: 'CLOUD_BOOTSTRAP', branchId: profile.branchId || '' });
        if (diagnostic.permanent) setCloudError(friendlyCloudError(error, 'Cloud belum dapat dijangkau; aplikasi memakai data lokal.'));
        setCloudReady(false);
        return false;
      } finally {
        initialLoadFinishedRef.current = true;
        setInitializingApp(false);
        setCloudLoading(false);
      }
    };

    cloudStartRef.current = run().finally(() => { cloudStartRef.current = null; });
    return cloudStartRef.current;
  }, [flushPendingMutations, hydrateLocal, markSyncSuccess, overlayPendingOnRemote, recordSyncDiagnostic, storeCode]);

  useEffect(() => {
    if (!currentUser) return undefined;
    let cancelled = false;
    const initial = !initialLoadFinishedRef.current;
    const timer = window.setTimeout(() => {
      if (!cancelled) void startCloudSubscription(currentUser, { initial });
    }, 80);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [currentUser?.id, online, storeCode, startCloudSubscription]);

  useEffect(() => {
    if (!currentUser || !online || !firebaseConfigured) return undefined;
    let cancelled = false;
    let retryTimer = null;
    let attempt = 0;

    const runBackgroundSync = async () => {
      if (cancelled || document.visibilityState === 'hidden' || syncRunRef.current) return;
      const task = (async () => {
        try {
          await flushPendingMutations(currentUser);
          if (!cloudReadyRef.current) await startCloudSubscription(currentUser, { initial: false, force: true });
          attempt = 0;
        } catch (error) {
          attempt += 1;
          console.warn('Sinkronisasi latar belakang belum berhasil.', error);
        } finally {
          syncRunRef.current = null;
          if (!cancelled) {
            const delay = attempt > 0 ? Math.min(300000, 15000 * (2 ** Math.min(attempt, 4))) : 60000;
            retryTimer = window.setTimeout(runBackgroundSync, delay);
          }
        }
      })();
      syncRunRef.current = task;
      await task;
    };

    const onFocus = () => { if (document.visibilityState === 'visible') void runBackgroundSync(); };
    retryTimer = window.setTimeout(runBackgroundSync, 1200);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [currentUser?.id, online, flushPendingMutations, startCloudSubscription]);

  const requestedBranchId = (
    currentUser?.role === 'owner'
      ? deviceSettings.activeBranchId
      : currentUser?.branchId
  ) || db.configs.activeBranchId || MAIN_BRANCH_ID;
  const activeBranches = db.branches.filter(item => item.active !== false);
  const branch = activeBranches.find(item => item.id === requestedBranchId) || activeBranches[0] || db.branches[0];
  const branchId = branch?.id || requestedBranchId;

  useEffect(() => {
    if (!currentUser || !db.branches.length) return;
    const fallbackBranch = db.branches.find(item => item.active !== false) || db.branches[0];
    const allowedBranchId = currentUser.role === 'owner'
      ? (db.branches.some(item => item.id === requestedBranchId && item.active !== false) ? requestedBranchId : fallbackBranch?.id)
      : currentUser.branchId;
    if (allowedBranchId && deviceSettings.activeBranchId !== allowedBranchId) {
      setDeviceSettingsState(previous => ({ ...previous, activeBranchId: allowedBranchId }));
    }
  }, [currentUser, db.branches, requestedBranchId, deviceSettings.activeBranchId]);

  const commit = useCallback((action, details, mutator, options = {}) => {
    if (!currentUserRef.current) throw new Error('Sesi pengguna belum aktif.');
    const requiredPermission = ACTION_PERMISSIONS[action];
    if (!requiredPermission || !can(currentUserRef.current, requiredPermission)) {
      throw new Error(`Hak akses ${requiredPermission || action} tidak tersedia untuk akun ini.`);
    }
    const before = normalizeDbShape(dbRef.current, seedRef.current, APP_VERSION);
    const next = clone(before);
    const result = mutator(next);
    const operations = buildDiffOperations(before, next);
    if (!operations.length) return result;
    const mutationBaseId = generateId('SYNC');
    const createdAt = nowISO();
    const operationChunks = [];
    for (let index = 0; index < operations.length; index += 200) operationChunks.push(operations.slice(index, index + 200));
    const mutations = operationChunks.map((chunk, index) => ({
      id: operationChunks.length === 1 ? mutationBaseId : `${mutationBaseId}-${String(index + 1).padStart(3, '0')}`,
      parentMutationId: mutationBaseId,
      chunkIndex: index,
      chunkCount: operationChunks.length,
      storeCode,
      storeId: currentUserRef.current.storeId || STORE_ID,
      userId: currentUserRef.current.id,
      userName: currentUserRef.current.name,
      userRole: currentUserRef.current.role,
      branchId: currentUserRef.current.role === 'owner' ? (deviceSettings.activeBranchId || dbRef.current.configs.activeBranchId || MAIN_BRANCH_ID) : (currentUserRef.current.branchId || MAIN_BRANCH_ID),
      action,
      details: String(details || '').slice(0, 500),
      approvalToken: options.approvalToken || '',
      createdAt,
      operations: chunk
    }));
    const count = mutations.length === 1
      ? enqueuePendingMutation(storeCode, mutations[0])
      : enqueuePendingMutations(storeCode, mutations);
    dbRef.current = next;
    setDb(next);
    setLocalReady(true);
    setPendingSyncCount(count);
    void saveLocalSnapshot(next, currentUserRef.current);
    if (navigator.onLine && firebaseConfigured) {
      void flushPendingMutations(currentUserRef.current).catch(() => {});
    }
    return result;
  }, [flushPendingMutations, saveLocalSnapshot, storeCode]);

  const login = useCallback(async (pin, expectedRole = 'any', options = {}) => {
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    const selectedBranchId = String(options.branchId || '');
    const offlineLogin = await verifyOfflineLogin(key, pin, {
      expectedRole,
      branchId: expectedRole === 'employee' ? selectedBranchId : ''
    }).catch(() => null);
    let profile = offlineLogin?.profile || null;

    if (!profile && !firebaseConfigured) {
      profile = await activateLocalSeed(pin);
    }

    if (!profile) {
      return {
        success: false,
        message: firebaseConfigured
          ? 'PIN Owner belum tersimpan pada perangkat ini. Masuk sekali menggunakan email Owner.'
          : 'PIN tidak dikenali.'
      };
    }

    if (expectedRole === 'owner' && profile.role !== 'owner') {
      return { success: false, message: 'PIN tersebut milik karyawan. Gunakan halaman Login Karyawan.' };
    }
    if (expectedRole === 'employee' && profile.role === 'owner') {
      return { success: false, message: 'PIN tersebut milik Owner. Gunakan halaman Login Owner.' };
    }
    if (expectedRole === 'employee' && selectedBranchId && profile.branchId !== selectedBranchId) {
      return { success: false, message: 'Akun karyawan tersebut tidak terdaftar pada cabang yang dipilih.' };
    }

    const hydrated = await hydrateLocal(profile);
    if (!hydrated && !navigator.onLine) {
      return { success: false, message: 'Data offline belum tersedia. Sambungkan internet untuk mengambil database toko terlebih dahulu.' };
    }

    if (navigator.onLine && firebaseConfigured) {
      try {
        if (offlineLogin?.cloudCredential) {
          const cloudProfile = await connectCloudAccount({ ...offlineLogin.cloudCredential, expectedRole });
          if (cloudProfile?.id !== profile.id) throw new Error('Kredensial cloud tidak cocok dengan profil PIN.');
          profile = { ...profile, ...cloudProfile };
        } else {
          const cloudProfile = await getCloudSessionProfile();
          if (cloudProfile?.id === profile.id) profile = { ...profile, ...cloudProfile };
          else setCloudError('Akun perangkat belum terhubung ke sesi cloud yang sesuai. Data lokal tetap dapat digunakan.');
        }
      } catch (error) {
        console.warn('Login cloud otomatis belum berhasil; mode lokal tetap dilanjutkan.', error);
        try { await signOutCloudAccount(); } catch {}
        setCloudError('Cloud belum terhubung untuk akun ini. Data tetap aman di perangkat dan akan sinkron setelah akun dihubungkan ulang.');
      }
    }

    const activeBranchId = profile.role === 'owner'
      ? (selectedBranchId || deviceSettings.activeBranchId || profile.branchId || MAIN_BRANCH_ID)
      : profile.branchId;
    setDeviceSettingsState(previous => ({ ...previous, activeBranchId }));
    setInitializingApp(!hydrated);
    setCurrentUser(profile);
    return { success: true, user: profile, mode: navigator.onLine ? 'hybrid' : 'offline' };
  }, [activateLocalSeed, deviceSettings.activeBranchId, deviceSettings.storeCode, hydrateLocal]);

  const loginEmployee = useCallback(async ({ loginName, name, pin, branchId }) => {
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    const normalizedLoginName = normalizeEmployeeLoginName(loginName || name);
    if (!branchId) return { success: false, message: 'Pilih toko/cabang terlebih dahulu.' };
    if (!normalizedLoginName) return { success: false, message: 'Masukkan nama login karyawan.' };
    if (!/^\d{4}$/.test(String(pin || ''))) return { success: false, message: 'PIN karyawan harus tepat 4 digit.' };

    let profile;
    let mode = navigator.onLine ? 'cloud' : 'offline';
    if (navigator.onLine && firebaseConfigured) {
      try {
        const result = await connectEmployeeWithNamePin({ loginName: normalizedLoginName, pin, branchId });
        profile = result.profile;
        await cacheOfflineCredential(key, pin, profile, result.cloudCredential);
        setCloudError('');
      } catch (error) {
        return { success: false, message: friendlyCloudError(error, error?.message || 'Login karyawan belum berhasil.') };
      }
    } else {
      const offlineLogin = await verifyOfflineLogin(key, pin, {
        expectedRole: 'employee',
        loginName: normalizedLoginName,
        branchId
      }).catch(() => null);
      profile = offlineLogin?.profile || null;
      if (!profile) return { success: false, message: 'Akun ini belum pernah login di perangkat saat online. Sambungkan internet terlebih dahulu.' };
    }

    if (!profile || profile.role === 'owner' || profile.active === false || profile.branchId !== branchId) {
      return { success: false, message: 'Cabang, nama, atau PIN karyawan tidak cocok.' };
    }
    const hydrated = await hydrateLocal(profile);
    if (!hydrated && !navigator.onLine) {
      return { success: false, message: 'Data offline belum tersedia pada perangkat ini.' };
    }
    setDeviceSettingsState(previous => ({ ...previous, activeBranchId: profile.branchId }));
    setInitializingApp(!hydrated);
    setCurrentUser(profile);
    return { success: true, user: profile, mode };
  }, [deviceSettings.storeCode, hydrateLocal]);

  const connectAccount = useCallback(async ({ email, password, pin, branchId }) => {
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    if (!navigator.onLine) throw new Error('Login Owner dengan email memerlukan koneksi internet.');
    if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('PIN Owner harus 4 digit.');
    const profile = await connectCloudAccount({ email, password, expectedRole: 'owner' });
    setCloudError('');
    await cacheOfflineCredential(key, pin, profile, { email, password });
    const hydrated = await hydrateLocal(profile);
    const activeBranchId = branchId || deviceSettings.activeBranchId || profile.branchId || MAIN_BRANCH_ID;
    setDeviceSettingsState(previous => ({ ...previous, activeBranchId }));
    setInitializingApp(!hydrated);
    setCurrentUser(profile);
    return { success: true, user: profile, mode: 'cloud-paired' };
  }, [deviceSettings.activeBranchId, deviceSettings.storeCode, hydrateLocal]);

  const loginWithBiometric = useCallback(async (userId, expectedRole = 'any', options = {}) => {
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    const selectedBranchId = String(options.branchId || '');
    let profile = null;
    if (navigator.onLine && firebaseConfigured) {
      try {
        const cloudProfile = await getCloudSessionProfile();
        if (cloudProfile && cloudProfile.id === userId) profile = cloudProfile;
      } catch (error) {
        console.warn('Sesi biometrik cloud tidak tersedia; mencoba cache lokal.', error);
      }
    }
    if (!profile) profile = await getCachedOfflineProfile(key, userId);
    if (!profile) return { success: false, message: 'Sesi biometrik belum tersimpan. Masuk sekali menggunakan PIN.' };
    if (expectedRole === 'owner' && profile.role !== 'owner') return { success: false, message: 'Biometrik ini terhubung ke akun karyawan.' };
    if (expectedRole === 'employee' && profile.role === 'owner') return { success: false, message: 'Biometrik ini terhubung ke akun Owner.' };
    if (expectedRole === 'employee' && selectedBranchId && profile.branchId !== selectedBranchId) {
      return { success: false, message: 'Biometrik ini terhubung ke cabang lain.' };
    }
    const hydrated = await hydrateLocal(profile);
    if (!hydrated) return { success: false, message: 'Data offline belum tersedia pada perangkat ini.' };
    const activeBranchId = profile.role === 'owner'
      ? (selectedBranchId || deviceSettings.activeBranchId || profile.branchId || MAIN_BRANCH_ID)
      : profile.branchId;
    setDeviceSettingsState(previous => ({ ...previous, activeBranchId }));
    setInitializingApp(false);
    setCurrentUser(profile);
    return { success: true, user: profile, mode: navigator.onLine ? 'online' : 'offline' };
  }, [deviceSettings.activeBranchId, deviceSettings.storeCode, hydrateLocal]);

  const updateDeviceSettings = useCallback(patch => {
    setDeviceSettingsState(previous => ({ ...previous, ...patch }));
  }, []);

  const clearCloudError = useCallback(() => setCloudError(''), []);

  const logout = () => {
    cloudUnsubscribeRef.current?.();
    cloudUnsubscribeRef.current = null;
    setCurrentUser(null);
    setCloudReady(false);
    setCloudLoading(false);
    setInitializingApp(false);
    setCloudError('');
    activeSubscriptionKeyRef.current = '';
    initialLoadFinishedRef.current = false;
  };

  const signOutAccount = async () => {
    const pending = getOfflineQueueStats(storeCode).count;
    if (pending > 0) throw new Error(`Masih ada ${pending} pembaruan offline yang belum tersinkron. Sambungkan internet sebelum keluar penuh.`);
    logout();
    await Promise.all([signOutCloudAccount(), clearOfflineIdentity(storeCode)]);
  };

  const bootstrapStore = async payload => {
    if (!navigator.onLine) throw new Error('Setup toko pertama memerlukan koneksi internet.');
    const result = await bootstrapCloudStore(payload);
    if (result.requiresSeed) {
      const cloudSeed = clone(seedRef.current);
      cloudSeed.users = [result.profile];
      cloudSeed.shifts = [];
      cloudSeed.cashMovements = [];
      cloudSeed.auditLogs = [];
      cloudSeed.configs = {
        ...cloudSeed.configs,
        companyName: String(payload.businessName || cloudSeed.configs.companyName || 'BUMI MAKMUR').trim(),
        activeBranchId: MAIN_BRANCH_ID
      };
      cloudSeed.branches = (cloudSeed.branches || []).map((item, index) => index === 0 ? {
        ...item,
        id: MAIN_BRANCH_ID,
        name: String(payload.branchName || item.name || 'Bumi Makmur Pusat').trim(),
        address: String(payload.branchAddress || item.address || '').trim(),
        phone: String(payload.branchPhone || item.phone || '').trim()
      } : item);
      await seedCloudDb(cloudSeed, result.profile.storeId || STORE_ID);
      await saveCachedDb(payload.storeCode || storeCode, cloudSeed, result.profile);
      const directory = await publishPublicLoginDirectory(cloudSeed, result.profile.storeId || STORE_ID);
      const nextDirectory = { ...directory, storeCode: payload.storeCode || result.profile.storeCode || storeCode };
      setLoginDirectory(nextDirectory);
      localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(nextDirectory));
    }
    setDeviceSettingsState(previous => ({ ...previous, storeCode: payload.storeCode || previous.storeCode }));
    await cacheOfflineCredential(payload.storeCode || storeCode, payload.ownerPin, result.profile, { email: payload.ownerEmail, password: payload.ownerPassword });
    setInitializingApp(false);
    setCloudError('');
    setCurrentUser(result.profile);
    return result;
  };

  const hasPermission = permission => can(currentUser, permission);

  const setConfig = (patch) => {
    if (!can(currentUserRef.current, 'settings.manage')) throw new Error('Anda tidak memiliki izin mengubah pengaturan toko.');
    return commit('SETTING_UPDATE', Object.keys(patch).join(', '), next => {
    next.configs = { ...next.configs, ...patch };
    return next.configs;
    });
  };


  const saveStoreIdentity = async payload => {
    if (currentUserRef.current?.role !== 'owner') throw new Error('Hanya Owner yang dapat mengganti identitas toko.');
    const companyName = String(payload?.companyName || '').trim();
    if (companyName.length < 2) throw new Error('Nama toko minimal 2 karakter.');
    if (companyName.length > 80) throw new Error('Nama toko maksimal 80 karakter.');
    const previousName = String(dbRef.current?.configs?.companyName || 'BUMI MAKMUR').trim();
    const result = commit('SETTING_UPDATE', `Identitas toko: ${companyName}`, next => {
      const previousWhatsappNote = String(next.configs?.receiptWhatsappNote || '');
      const previousGlobalMerchant = String(next.configs?.qrisMerchantName || '').trim();
      const globalMerchantFollowsName = !previousGlobalMerchant || previousGlobalMerchant.toLowerCase() === previousName.toLowerCase();
      const escapedPreviousName = previousName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const currentLoginAppearance = normalizeLoginAppearance(next.configs?.loginAppearance);
      const loginHeaderFollowsBrand = !currentLoginAppearance.headerText || currentLoginAppearance.headerText.toLowerCase() === previousName.toLowerCase();
      next.configs = {
        ...next.configs,
        companyName,
        address: String(payload?.address || '').trim(),
        phone: String(payload?.phone || '').trim(),
        loginAppearance: {
          ...currentLoginAppearance,
          headerText: loginHeaderFollowsBrand && currentLoginAppearance.headerText ? companyName : currentLoginAppearance.headerText
        },
        qrisMerchantName: globalMerchantFollowsName ? companyName : next.configs.qrisMerchantName,
        receiptWhatsappNote: previousName && previousWhatsappNote.toLowerCase().includes(previousName.toLowerCase())
          ? previousWhatsappNote.replace(new RegExp(escapedPreviousName, 'gi'), companyName)
          : previousWhatsappNote
      };
      next.branchPaymentProfiles = (next.branchPaymentProfiles || []).map(profile => {
        const merchantName = String(profile.merchantName || '').trim();
        const followsStoreName = !merchantName || merchantName.toLowerCase() === previousName.toLowerCase();
        return followsStoreName ? { ...profile, merchantName: companyName, updatedAt: nowISO(), updatedBy: currentUserRef.current.id } : profile;
      });
      return next.configs;
    });

    if (navigator.onLine && auth?.currentUser?.uid === currentUserRef.current.id) {
      try {
        const directory = await publishPublicLoginDirectory(dbRef.current, currentUserRef.current.storeId || STORE_ID);
        const nextDirectory = { ...directory, storeCode: currentUserRef.current.storeCode || storeCode };
        setLoginDirectory(nextDirectory);
        localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(nextDirectory));
      } catch (error) {
        console.warn('Nama toko sudah tersimpan, tetapi judul pada layar login menunggu sinkronisasi.', error);
      }
    }
    return result;
  };

  const saveLoginAppearance = async payload => {
    if (currentUserRef.current?.role !== 'owner') throw new Error('Hanya Owner yang dapat mengatur tampilan halaman login.');
    const loginAppearance = normalizeLoginAppearance(payload);
    const result = commit('SETTING_UPDATE', 'Tampilan halaman login', next => {
      next.configs = { ...next.configs, loginAppearance };
      return loginAppearance;
    });

    if (navigator.onLine && auth?.currentUser?.uid === currentUserRef.current.id) {
      try {
        const directory = await publishPublicLoginDirectory(dbRef.current, currentUserRef.current.storeId || STORE_ID);
        const nextDirectory = { ...directory, storeCode: currentUserRef.current.storeCode || storeCode };
        setLoginDirectory(nextDirectory);
        localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(nextDirectory));
      } catch (error) {
        console.warn('Tampilan login sudah tersimpan, tetapi publikasi ke perangkat lain menunggu sinkronisasi.', error);
      }
    }
    return result;
  };

  const setActiveBranch = id => {
    if (currentUser?.role !== 'owner') return;
    if (!db.branches.some(item => item.id === id && item.active !== false)) return;
    setDeviceSettingsState(previous => ({ ...previous, activeBranchId: id }));
  };

  const addBranch = data => {
    const item = commit('BRANCH_CREATE', data.name, next => {
      const name = String(data.name || '').trim();
      if (!name) throw new Error('Nama cabang wajib diisi.');
      if (next.branches.some(row => row.active !== false && String(row.name || '').trim().toLowerCase() === name.toLowerCase())) throw new Error(`Cabang ${name} sudah terdaftar.`);
      const created = { id: generateId('BR'), name, address: String(data.address || '').trim(), phone: String(data.phone || '').trim(), status: 'Online', active: true };
      next.branches.push(created);
      const general = { id: generateId('CUS'), branchId: created.id, name: 'Umum (Non-Member)', phone: '-', email: '', type: 'Reguler', priceTier: 'retail', creditLimit: 0, points: 0, address: '', project: '', notes: '', active: true };
      next.customers.push(general);
      next.branchPaymentProfiles.push({ id: created.id, branchId: created.id, merchantName: next.configs.companyName || 'BUMI MAKMUR', qrisImage: '', qrisInstruction: 'Scan QR lalu tunjukkan bukti pembayaran kepada kasir.', qrisAssetMeta: null, enabled: true, updatedAt: nowISO(), updatedBy: currentUserRef.current.id });
      return created;
    });
    if (navigator.onLine && currentUserRef.current?.role === 'owner' && auth?.currentUser?.uid === currentUserRef.current.id) {
      void publishPublicLoginDirectory(dbRef.current, currentUserRef.current.storeId || STORE_ID)
        .then(directory => {
          const nextDirectory = { ...directory, storeCode: currentUserRef.current?.storeCode || storeCode };
          setLoginDirectory(nextDirectory);
          localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(nextDirectory));
        })
        .catch(error => console.warn('Cabang sudah disimpan, tetapi daftar cabang login menunggu sinkronisasi.', error));
    }
    return item;
  };


  const updateBranch = data => {
    const activeUser = currentUserRef.current;
    if (activeUser?.role !== 'owner') throw new Error('Hanya Owner yang dapat mengubah identitas cabang.');
    const branchIdToUpdate = String(data?.id || '').trim();
    const name = String(data?.name || '').trim();
    if (!branchIdToUpdate) throw new Error('ID cabang tidak ditemukan.');
    if (!name) throw new Error('Nama cabang wajib diisi.');
    if (name.length > 80) throw new Error('Nama cabang maksimal 80 karakter.');
    const item = commit('BRANCH_UPDATE', name, next => {
      const index = next.branches.findIndex(row => row.id === branchIdToUpdate);
      if (index < 0) throw new Error('Cabang tidak ditemukan.');
      const duplicate = next.branches.find(row => row.id !== branchIdToUpdate && row.active !== false && String(row.name || '').trim().toLowerCase() === name.toLowerCase());
      if (duplicate) throw new Error(`Nama cabang ${name} sudah digunakan.`);
      const updated = {
        ...next.branches[index],
        name,
        address: String(data?.address || '').trim(),
        phone: String(data?.phone || '').trim(),
        updatedAt: nowISO(),
        updatedBy: activeUser.id
      };
      next.branches[index] = updated;
      return updated;
    });
    if (navigator.onLine && auth?.currentUser?.uid === activeUser.id) {
      void publishPublicLoginDirectory(dbRef.current, activeUser.storeId || STORE_ID)
        .then(directory => {
          const nextDirectory = { ...directory, storeCode: activeUser.storeCode || storeCode };
          setLoginDirectory(nextDirectory);
          localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(nextDirectory));
        })
        .catch(error => console.warn('Identitas cabang tersimpan, tetapi daftar cabang login menunggu sinkronisasi.', error));
    }
    return item;
  };

  const deleteBranch = branchIdToDelete => {
    const activeUser = currentUserRef.current;
    if (activeUser?.role !== 'owner') throw new Error('Hanya Owner yang dapat menghapus atau mengarsipkan cabang.');
    const id = String(branchIdToDelete || '').trim();
    const target = dbRef.current.branches.find(item => item.id === id);
    if (!target) throw new Error('Cabang tidak ditemukan.');
    const otherActive = dbRef.current.branches.filter(item => item.id !== id && item.active !== false);
    if (!otherActive.length) throw new Error('Minimal satu cabang aktif harus tetap tersedia.');

    const result = commit('BRANCH_DELETE', target.name, next => {
      const branch = next.branches.find(item => item.id === id);
      if (!branch) throw new Error('Cabang tidak ditemukan.');
      const references = [
        ...(next.products || []).filter(item => item.branchId === id),
        ...(next.suppliers || []).filter(item => item.branchId === id),
        ...(next.customers || []).filter(item => item.branchId === id && !/^Umum \(Non-Member\)$/i.test(String(item.name || ''))),
        ...(next.sales || []).filter(item => item.branchId === id),
        ...(next.heldSales || []).filter(item => item.branchId === id),
        ...(next.purchases || []).filter(item => item.branchId === id),
        ...(next.stockMovements || []).filter(item => item.branchId === id),
        ...(next.stockAdjustments || []).filter(item => item.branchId === id),
        ...(next.stockOpnames || []).filter(item => item.branchId === id),
        ...(next.stockTransfers || []).filter(item => item.sourceBranchId === id || item.destinationBranchId === id),
        ...(next.expenses || []).filter(item => item.branchId === id),
        ...(next.receivables || []).filter(item => item.branchId === id),
        ...(next.payables || []).filter(item => item.branchId === id),
        ...(next.refunds || []).filter(item => item.branchId === id),
        ...(next.shifts || []).filter(item => item.branchId === id),
        ...(next.cashMovements || []).filter(item => item.branchId === id),
        ...(next.onlineOrders || []).filter(item => item.branchId === id),
        ...(next.feedback || []).filter(item => item.branchId === id),
        ...(next.users || []).filter(item => item.role !== 'owner' && item.branchId === id)
      ];
      const hasHistory = references.length > 0;
      if (hasHistory) {
        if (branch.active === false) throw new Error('Cabang yang memiliki riwayat transaksi tidak dapat dihapus permanen. Riwayatnya tetap disimpan untuk laporan dan audit.');
        branch.active = false;
        branch.status = 'Archived';
        branch.archivedAt = nowISO();
        branch.archivedBy = activeUser.id;
        for (const user of next.users || []) {
          if (user.role !== 'owner' && user.branchId === id) user.active = false;
        }
        return { mode: 'archived', branch: { ...branch }, references: references.length };
      }

      next.branches = next.branches.filter(item => item.id !== id);
      next.customers = (next.customers || []).filter(item => item.branchId !== id);
      next.branchPaymentProfiles = (next.branchPaymentProfiles || []).filter(item => item.branchId !== id);
      next.users = (next.users || []).filter(item => item.role === 'owner' || item.branchId !== id);
      return { mode: 'deleted', branch: { ...branch }, references: 0 };
    });

    if (deviceSettings.activeBranchId === id) {
      setDeviceSettingsState(previous => ({ ...previous, activeBranchId: otherActive[0].id }));
    }
    if (navigator.onLine && auth?.currentUser?.uid === activeUser.id) {
      void publishPublicLoginDirectory(dbRef.current, activeUser.storeId || STORE_ID)
        .then(directory => {
          const nextDirectory = { ...directory, storeCode: activeUser.storeCode || storeCode };
          setLoginDirectory(nextDirectory);
          localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(nextDirectory));
        })
        .catch(error => console.warn('Perubahan cabang tersimpan, tetapi daftar login menunggu sinkronisasi.', error));
    }
    return result;
  };

  const restoreBranch = branchIdToRestore => {
    const activeUser = currentUserRef.current;
    if (activeUser?.role !== 'owner') throw new Error('Hanya Owner yang dapat memulihkan cabang.');
    const id = String(branchIdToRestore || '').trim();
    const result = commit('BRANCH_RESTORE', id, next => {
      const branch = next.branches.find(item => item.id === id);
      if (!branch) throw new Error('Cabang tidak ditemukan.');
      branch.active = true;
      branch.status = 'Online';
      branch.restoredAt = nowISO();
      branch.restoredBy = activeUser.id;
      return { ...branch };
    });
    if (navigator.onLine && auth?.currentUser?.uid === activeUser.id) {
      void publishPublicLoginDirectory(dbRef.current, activeUser.storeId || STORE_ID)
        .then(directory => {
          const nextDirectory = { ...directory, storeCode: activeUser.storeCode || storeCode };
          setLoginDirectory(nextDirectory);
          localStorage.setItem(LOGIN_DIRECTORY_KEY, JSON.stringify(nextDirectory));
        })
        .catch(error => console.warn('Cabang dipulihkan, tetapi daftar login menunggu sinkronisasi.', error));
    }
    return result;
  };

  const saveCategory = payload => commit(payload?.originalName ? 'CATEGORY_UPDATE' : 'CATEGORY_CREATE', payload?.name, next => {
    const name = String(payload?.name || '').trim();
    const originalName = String(payload?.originalName || '').trim();
    if (name.length < 2) throw new Error('Nama kategori minimal 2 karakter.');
    if (name.length > 60) throw new Error('Nama kategori maksimal 60 karakter.');
    const duplicate = (next.categories || []).find(category => String(category).trim().toLowerCase() === name.toLowerCase() && String(category).trim().toLowerCase() !== originalName.toLowerCase());
    if (duplicate) throw new Error(`Kategori ${name} sudah tersedia.`);
    if (originalName) {
      if (!(next.categories || []).some(category => String(category).trim().toLowerCase() === originalName.toLowerCase())) throw new Error('Kategori lama tidak ditemukan.');
      next.categories = (next.categories || []).map(category => String(category).trim().toLowerCase() === originalName.toLowerCase() ? name : category);
      next.products = (next.products || []).map(product => String(product.category || '').trim().toLowerCase() === originalName.toLowerCase() ? { ...product, category: name, updatedAt: nowISO() } : product);
    } else {
      next.categories = [...(next.categories || []), name];
    }
    next.categories = sortCategories(next.categories);
    return name;
  });

  const deleteCategory = (name, replacement = '') => commit('CATEGORY_DELETE', name, next => {
    const target = String(name || '').trim();
    const replacementName = String(replacement || '').trim();
    if (!target) throw new Error('Kategori tidak valid.');
    const affected = (next.products || []).filter(product => product.active !== false && String(product.category || '').trim().toLowerCase() === target.toLowerCase());
    if (affected.length && !replacementName) throw new Error(`Kategori ${target} masih dipakai ${affected.length} barang. Pilih kategori pengganti terlebih dahulu.`);
    if (replacementName && replacementName.toLowerCase() === target.toLowerCase()) throw new Error('Kategori pengganti harus berbeda dari kategori yang dihapus.');
    if (replacementName && !(next.categories || []).some(category => String(category).trim().toLowerCase() === replacementName.toLowerCase())) throw new Error('Kategori pengganti tidak ditemukan.');
    if (replacementName) next.products = (next.products || []).map(product => String(product.category || '').trim().toLowerCase() === target.toLowerCase() ? { ...product, category: replacementName, updatedAt: nowISO() } : product);
    next.categories = sortCategories((next.categories || []).filter(category => String(category).trim().toLowerCase() !== target.toLowerCase()));
    return { name: target, replacement: replacementName, affected: affected.length };
  });

  const importInventoryRows = (rows, options = {}) => commit('INVENTORY_IMPORT', `${rows?.length || 0} baris`, next => {
    const validRows = (rows || []).filter(row => row?.valid !== false);
    if (!validRows.length) throw new Error('Tidak ada baris valid untuk diimpor.');
    const targetBranchId = options.branchId || branchId;
    const stockMode = options.stockMode === 'add' ? 'add' : 'replace';
    const createdCategories = [];
    for (const row of validRows) {
      const category = String(row.category || 'Lainnya').trim();
      if (!(next.categories || []).some(item => String(item).trim().toLowerCase() === category.toLowerCase())) {
        next.categories.push(category);
        createdCategories.push(category);
      }
    }
    next.categories = sortCategories(next.categories || []);

    const results = [];
    for (const row of validRows) {
      const existing = next.products.find(item => item.branchId === targetBranchId && (
        (row.id && item.id === row.id) ||
        (row.sku && String(item.sku || '').trim().toLowerCase() === String(row.sku).trim().toLowerCase()) ||
        (row.barcode && String(item.barcode || '').trim().toLowerCase() === String(row.barcode).trim().toLowerCase())
      ));
      const profile = { name: row.name, baseUnit: row.baseUnit || 'pcs', allowFractional: row.allowFractional === true, quantityStep: row.quantityStep };
      const importedStock = validateBaseQuantity(profile, row.stock || 0, 'Stok impor');
      const previousStock = Number(existing?.stock || 0);
      const nextStock = stockMode === 'add' && existing ? quantity(previousStock + importedStock) : quantity(importedStock);
      const minimumStock = validateBaseQuantity(profile, row.minStock || 0, 'Stok minimum');
      const parentName = String(row.parentName || '').trim();
      const variantName = String(row.variantName || '').trim();
      let variantGroupId = existing?.variantGroupId || '';
      if (parentName && variantName && !variantGroupId) {
        const sibling = next.products.find(item => item.branchId === targetBranchId && item.productType === 'variant' && String(item.parentName || '').trim().toLowerCase() === parentName.toLowerCase());
        variantGroupId = sibling?.variantGroupId || generateId('VGRP');
      }
      const item = {
        ...(existing || {}),
        id: existing?.id || row.id || generateId('PRD'), branchId: targetBranchId,
        name: String(row.name || '').trim(), category: String(row.category || 'Lainnya').trim(),
        sku: String(row.sku || '').trim().toUpperCase(), barcode: String(row.barcode || '').trim(),
        baseUnit: row.baseUnit || 'pcs', stock: nextStock, minStock: quantity(minimumStock), rack: row.rack || '-',
        modalPrice: money(row.modalPrice), initialModalPrice: existing?.initialModalPrice ?? money(row.modalPrice),
        prices: { retail: money(row.prices?.retail), wholesale: money(row.prices?.wholesale ?? row.prices?.retail), project: money(row.prices?.project ?? row.prices?.retail) },
        markups: existing?.markups || { retail: 0, wholesale: 0, project: 0 },
        conversions: normalizeConversionRows(row.conversions || [], row.baseUnit || 'pcs'),
        allowFractional: row.allowFractional === true,
        quantityStep: normalizeQuantityStep(row.quantityStep, row.allowFractional === true, recommendedQuantityStep(row.baseUnit, row.category)),
        variants: [], bundleItems: existing?.bundleItems || [], favorite: Boolean(existing?.favorite),
        available: row.available !== false, active: row.active !== false, trackStock: row.trackStock !== false,
        parentName: parentName || undefined, variantName: variantName || undefined,
        variantGroupId: variantGroupId || undefined, productType: parentName && variantName ? 'variant' : (existing?.productType || undefined),
        sharedBarcode: String(row.sharedBarcode || existing?.sharedBarcode || '').trim(),
        updatedAt: nowISO(), importedAt: nowISO(), importedBy: currentUserRef.current.id
      };
      appendProductPriceHistory(next, existing, item, existing ? 'Impor pembaruan produk' : 'Impor produk baru', currentUserRef.current?.id);
      if (existing) next.products = next.products.map(product => product.id === existing.id ? item : product);
      else next.products.unshift(item);
      const stockDelta = quantity(nextStock - previousStock);
      if (item.trackStock !== false && Math.abs(stockDelta) > 0.000001) {
        next.stockMovements.unshift({
          id: generateId('MOV'), branchId: targetBranchId, productId: item.id, productName: item.name,
          type: existing ? 'IMPORT_STOCK' : 'INITIAL_STOCK', qtyChange: stockDelta, refId: `IMPORT-${item.id}`,
          note: stockMode === 'add' ? 'Impor stok — ditambahkan ke stok sebelumnya' : 'Impor stok — mengganti jumlah stok sistem',
          createdAt: nowISO(), userId: currentUserRef.current.id
        });
      }
      results.push({ id: item.id, name: item.name, action: existing ? 'update' : 'create', stockDelta });
    }
    next.products = sortProductsByName(next.products);
    return { rows: results, created: results.filter(item => item.action === 'create').length, updated: results.filter(item => item.action === 'update').length, categories: createdCategories };
  });

  const saveProduct = data => commit(data.id ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', data.name, next => {
    if (data.variantMode === true) {
      const parentName = String(data.parentName || data.name || '').trim();
      if (!parentName) throw new Error('Nama produk induk wajib diisi.');
      const targetBranchId = data.branchId || branchId;
      const variantGroupId = String(data.variantGroupId || generateId('VGRP')).trim();
      const sharedBarcode = String(data.sharedBarcode || '').trim();
      const rows = Array.isArray(data.variantRows) ? data.variantRows : [];
      if (rows.length < 2) throw new Error('Produk varian minimal memiliki dua varian.');
      const deletedIds = new Set(data.deletedVariantIds || []);
      const groupExistingIds = new Set(next.products.filter(product => product.variantGroupId === variantGroupId).map(product => product.id));
      const ignoreIds = new Set([...groupExistingIds, ...rows.map(row => row.id).filter(Boolean)]);
      const normalized = value => String(value || '').trim().toLowerCase();
      const externalCollision = code => next.products.find(product => {
        if (!product || product.active === false || product.branchId !== targetBranchId || ignoreIds.has(product.id)) return false;
        const target = normalized(code);
        return target && [product.sku, product.barcode, product.sharedBarcode].some(value => normalized(value) === target);
      });
      if (sharedBarcode) {
        const collision = externalCollision(sharedBarcode);
        if (collision) throw new Error(`Barcode kemasan ${sharedBarcode} sudah dipakai oleh ${collision.name}.`);
      }
      const seenNames = new Set();
      const seenSkus = new Set();
      const seenInternalBarcodes = new Set();
      const seenCodes = new Map();
      const allowFractional = data.allowFractional === true;
      const quantityStep = normalizeQuantityStep(data.quantityStep, allowFractional, recommendedQuantityStep(data.baseUnit, data.category));
      const conversions = normalizeConversionRows(data.conversions || [], data.baseUnit || 'pcs');
      const saved = [];
      for (const row of rows) {
        const variantName = String(row.variantName || '').trim();
        const sku = String(row.sku || '').trim().toUpperCase();
        const internalBarcode = String(row.internalBarcode || row.barcode || sku).trim().toUpperCase();
        if (!variantName) throw new Error('Semua nama varian wajib diisi.');
        if (!sku) throw new Error(`SKU varian ${variantName} wajib diisi.`);
        if (!internalBarcode) throw new Error(`Barcode internal varian ${variantName} wajib diisi.`);
        if (sharedBarcode && normalized(sharedBarcode) === normalized(internalBarcode)) throw new Error(`Barcode internal ${variantName} harus berbeda dari barcode kemasan bersama agar pemindaian tidak ambigu.`);
        if (seenNames.has(normalized(variantName))) throw new Error(`Nama varian ${variantName} digunakan lebih dari sekali.`);
        if (seenSkus.has(normalized(sku))) throw new Error(`SKU ${sku} digunakan lebih dari sekali.`);
        if (seenInternalBarcodes.has(normalized(internalBarcode))) throw new Error(`Barcode internal ${internalBarcode} digunakan lebih dari sekali.`);
        for (const code of new Set([normalized(sku), normalized(internalBarcode)])) {
          const owner = seenCodes.get(code);
          if (owner && owner !== variantName) throw new Error(`Kode ${code.toUpperCase()} sudah dipakai oleh varian ${owner}.`);
          seenCodes.set(code, variantName);
        }
        const skuCollision = externalCollision(sku);
        if (skuCollision) throw new Error(`SKU ${sku} sudah dipakai oleh ${skuCollision.name}.`);
        const barcodeCollision = externalCollision(internalBarcode);
        if (barcodeCollision) throw new Error(`Barcode internal ${internalBarcode} sudah dipakai oleh ${barcodeCollision.name}.`);
        seenNames.add(normalized(variantName)); seenSkus.add(normalized(sku)); seenInternalBarcodes.add(normalized(internalBarcode));

        const existing = next.products.find(product => product.id === row.id);
        const productName = `${parentName} ${variantName}`.trim();
        const quantityProfile = { name: productName, baseUnit: data.baseUnit || 'pcs', allowFractional, quantityStep };
        const initialStock = existing?.stock ?? validateBaseQuantity(quantityProfile, row.stock || 0, 'Stok awal');
        const minimumStock = validateBaseQuantity(quantityProfile, row.minStock || 0, 'Stok minimum');
        if (initialStock < 0 || minimumStock < 0) throw new Error(`Stok ${variantName} tidak boleh negatif.`);
        const item = {
          id: row.id || generateId('PRD'), branchId: targetBranchId,
          name: productName, parentName, variantName, variantGroupId, productType: 'variant', sharedBarcode,
          category: data.category || 'Lainnya', sku, barcode: internalBarcode,
          baseUnit: data.baseUnit || 'pcs', stock: quantity(initialStock), minStock: quantity(minimumStock),
          rack: row.rack || '-', modalPrice: money(row.modalPrice), initialModalPrice: existing?.initialModalPrice ?? money(row.modalPrice),
          prices: {
            retail: money(row.prices?.retail), wholesale: money(row.prices?.wholesale ?? row.prices?.retail), project: money(row.prices?.project ?? row.prices?.retail)
          },
          markups: {
            retail: Math.max(0, Number(row.markups?.retail || 0)), wholesale: Math.max(0, Number(row.markups?.wholesale || 0)), project: Math.max(0, Number(row.markups?.project || 0))
          },
          variants: [], conversions, allowFractional, quantityStep, bundleItems: [],
          favorite: Boolean(row.favorite), available: row.available !== false, active: row.active !== false,
          trackStock: data.trackStock !== false, updatedAt: nowISO()
        };
        appendProductPriceHistory(next, existing, item, existing ? 'Edit produk varian' : 'Produk varian baru', currentUserRef.current?.id);
        if (existing) next.products = next.products.map(product => product.id === item.id ? item : product);
        else {
          next.products.unshift(item);
          if (item.trackStock !== false && item.stock > 0) next.stockMovements.unshift({
            id: generateId('MOV'), branchId: item.branchId, productId: item.id, productName: item.name,
            type: 'INITIAL_STOCK', qtyChange: item.stock, refId: item.id,
            note: `Stok awal varian ${variantName}`, createdAt: nowISO(), userId: currentUser.id
          });
        }
        saved.push(item);
      }
      if (deletedIds.size) next.products = next.products.map(product => deletedIds.has(product.id) ? { ...product, active: false, available: false, updatedAt: nowISO() } : product);
      return { id: `GROUP-${variantGroupId}`, variantGroupId, name: parentName, sharedBarcode, children: saved };
    }
    const productName = String(data.name || '').trim();
    if (!productName) throw new Error('Nama produk wajib diisi.');
    const existing = next.products.find(product => product.id === data.id);
    const targetBranchId = data.branchId || branchId;
    const sku = String(data.sku || generateId('SKU')).trim();
    const barcode = String(data.barcode || '').trim();
    const normalizedCode = value => String(value || '').trim().toLowerCase();
    const duplicateSku = next.products.find(product => product.id !== data.id && product.branchId === targetBranchId && product.active !== false && [product.sku, product.barcode, product.sharedBarcode].some(value => normalizedCode(value) === normalizedCode(sku)));
    if (duplicateSku) throw new Error(`SKU ${sku} sudah dipakai sebagai kode produk ${duplicateSku.name}.`);
    if (barcode) {
      const duplicateBarcode = next.products.find(product => product.id !== data.id && product.branchId === targetBranchId && product.active !== false && [product.barcode, product.sku, product.sharedBarcode].some(value => normalizedCode(value) === normalizedCode(barcode)));
      if (duplicateBarcode) throw new Error(`Barcode ${barcode} sudah dipakai oleh produk ${duplicateBarcode.name}.`);
    }
    const allowFractional = data.allowFractional === true;
    const quantityStep = normalizeQuantityStep(data.quantityStep, allowFractional, recommendedQuantityStep(data.baseUnit, data.category));
    const quantityProfile = { name: productName, baseUnit: data.baseUnit || 'pcs', allowFractional, quantityStep };
    const initialStock = existing?.stock ?? validateBaseQuantity(quantityProfile, data.stock || 0, 'Stok awal');
    const minimumStock = validateBaseQuantity(quantityProfile, data.minStock || 0, 'Stok minimum');
    if (initialStock < 0 || minimumStock < 0) throw new Error('Stok awal dan stok minimum tidak boleh negatif.');
    const item = {
      id: data.id || generateId('PRD'), branchId: targetBranchId,
      name: productName, category: data.category || 'Lainnya', sku,
      barcode, baseUnit: data.baseUnit || 'pcs', stock: quantity(initialStock),
      minStock: quantity(minimumStock), rack: data.rack || '-', modalPrice: money(data.modalPrice),
      initialModalPrice: existing?.initialModalPrice ?? money(data.modalPrice),
      prices: {
        retail: money(data.prices?.retail ?? data.price),
        wholesale: money(data.prices?.wholesale ?? data.wholesalePrice ?? data.price),
        project: money(data.prices?.project ?? data.projectPrice ?? data.price)
      },
      markups: {
        retail: Math.max(0, Number(data.markups?.retail || 0)),
        wholesale: Math.max(0, Number(data.markups?.wholesale || 0)),
        project: Math.max(0, Number(data.markups?.project || 0))
      },
      variants: data.variants || [],
      conversions: normalizeConversionRows(data.conversions || [], data.baseUnit || 'pcs'),
      allowFractional, quantityStep, bundleItems: data.bundleItems || [],
      favorite: Boolean(data.favorite), available: data.available !== false, active: data.active !== false,
      trackStock: data.trackStock !== false, updatedAt: nowISO()
    };
    appendProductPriceHistory(next, existing, item, existing ? 'Edit produk' : 'Produk baru', currentUserRef.current?.id);
    if (existing) next.products = next.products.map(product => product.id === item.id ? item : product);
    else {
      next.products.unshift(item);
      if (item.trackStock !== false && item.stock > 0) {
        next.stockMovements.unshift({
          id: generateId('MOV'), branchId: item.branchId, productId: item.id, productName: item.name,
          type: 'INITIAL_STOCK', qtyChange: item.stock, refId: item.id,
          note: 'Stok awal saat barang dibuat', createdAt: nowISO(), userId: currentUser.id
        });
      }
    }
    return item;
  });

  const archiveProduct = id => commit('PRODUCT_ARCHIVE', id, next => {
    const item = next.products.find(product => product.id === id);
    if (item) {
      item.active = false;
      item.available = false;
      item.updatedAt = nowISO();
    }
    return item;
  });

  const restoreProduct = id => commit('PRODUCT_RESTORE', id, next => {
    const item = next.products.find(product => product.id === id);
    if (item) {
      item.active = true;
      item.available = true;
      item.updatedAt = nowISO();
    }
    return item;
  });

  const deleteProduct = productIds => commit('PRODUCT_DELETE', Array.isArray(productIds) ? productIds.join(',') : productIds, next => {
    const ids = new Set((Array.isArray(productIds) ? productIds : [productIds]).filter(Boolean).map(String));
    const summary = buildProductLifecycleSummary(next, [...ids]);
    if (!summary.products.length) throw new Error('Produk tidak ditemukan.');
    if (currentUserRef.current?.role === 'manager' && summary.products.some(product => product.branchId !== currentUserRef.current.branchId)) {
      throw new Error('Store Manager hanya dapat mengelola produk pada cabangnya sendiri.');
    }
    if (summary.stock > 0) throw new Error('Produk masih memiliki stok. Kosongkan stok terlebih dahulu atau gunakan Arsipkan.');
    if (summary.historyCount > 0) throw new Error('Produk sudah memiliki riwayat operasional. Demi keamanan laporan, produk hanya dapat diarsipkan.');
    next.products = next.products.filter(product => !ids.has(String(product.id)));
    return { mode: 'deleted', ids: [...ids], count: summary.products.length };
  });

  const zeroProductStock = (productIds, reason = 'Stok dikosongkan dari pengelolaan produk') => commit('STOCK_RESET', Array.isArray(productIds) ? productIds.join(',') : productIds, next => {
    const ids = new Set((Array.isArray(productIds) ? productIds : [productIds]).filter(Boolean).map(String));
    const affected = [];
    for (const product of next.products) {
      if (!ids.has(String(product.id))) continue;
      if (currentUserRef.current?.role === 'manager' && product.branchId !== currentUserRef.current.branchId) {
        throw new Error('Store Manager hanya dapat mengosongkan stok pada cabangnya sendiri.');
      }
      const previousStock = Number(product.stock || 0);
      if (Math.abs(previousStock) < 0.000001) continue;
      const change = signedQuantity(-previousStock);
      product.stock = 0;
      product.updatedAt = nowISO();
      const adjustment = {
        id: generateId('ADJ'), branchId: product.branchId, productId: product.id, productName: product.name,
        qtyChange: change, reason: String(reason || 'Stok dikosongkan').slice(0, 180), createdAt: nowISO(), userId: currentUserRef.current.id
      };
      next.stockAdjustments.unshift(adjustment);
      next.stockMovements.unshift({
        id: generateId('MOV'), branchId: product.branchId, productId: product.id, productName: product.name,
        type: 'STOCK_RESET', qtyChange: change, refId: adjustment.id, note: adjustment.reason,
        createdAt: adjustment.createdAt, userId: currentUserRef.current.id
      });
      affected.push({ id: product.id, name: product.name, previousStock, change });
    }
    if (!affected.length) throw new Error('Stok produk sudah 0.');
    return { mode: 'stock-reset', affected };
  });

  const toggleProduct = (id, field) => commit('PRODUCT_TOGGLE', `${id}:${field}`, next => {
    const item = next.products.find(product => product.id === id);
    if (item) item[field] = !item[field];
    return item;
  });

  const savePromotion = data => commit(data.id ? 'PROMOTION_UPDATE' : 'PROMOTION_CREATE', data.name, next => {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Nama promo wajib diisi.');
    if (data.startDate && data.endDate && data.startDate > data.endDate) throw new Error('Tanggal akhir promo tidak boleh sebelum tanggal mulai.');
    const item = {
      id: data.id || generateId('PROMO'), branchId: data.branchId || branchId,
      name, type: data.type || 'percent', value: money(data.value), minPurchase: money(data.minPurchase),
      maxDiscount: money(data.maxDiscount), category: data.category || '', productId: data.productId || '',
      active: data.active !== false, startDate: data.startDate || '', endDate: data.endDate || ''
    };
    const index = next.promotions.findIndex(row => row.id === item.id);
    if (index >= 0) next.promotions[index] = item; else next.promotions.unshift(item);
    return item;
  });

  const saveSupplier = data => commit(data.id ? 'SUPPLIER_UPDATE' : 'SUPPLIER_CREATE', data.name, next => {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Nama pemasok wajib diisi.');
    const targetBranchId = data.branchId || branchId;
    const duplicate = next.suppliers.find(item => item.id !== data.id && item.branchId === targetBranchId && item.active !== false && String(item.name || '').trim().toLowerCase() === name.toLowerCase());
    if (duplicate) throw new Error(`Pemasok ${name} sudah terdaftar.`);
    const item = { ...data, id: data.id || generateId('SUP'), branchId: targetBranchId, name, active: data.active !== false };
    const index = next.suppliers.findIndex(row => row.id === item.id);
    if (index >= 0) next.suppliers[index] = item; else next.suppliers.unshift(item);
    return item;
  });

  const saveCustomer = data => commit(data.id ? 'CUSTOMER_UPDATE' : 'CUSTOMER_CREATE', data.name, next => {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Nama pelanggan wajib diisi.');
    const existing = next.customers.find(customer => customer.id === data.id);
    const isCashier = currentUserRef.current?.role === 'kasir';
    const item = {
      id: data.id || generateId('CUS'), branchId: existing?.branchId || data.branchId || branchId,
      name, phone: data.phone || '-', email: data.email || '', type: data.type || 'Reguler',
      priceTier: isCashier ? (existing?.priceTier || 'retail') : (data.priceTier || 'retail'),
      creditLimit: isCashier ? money(existing?.creditLimit) : money(data.creditLimit),
      points: existing?.points ?? 0,
      address: data.address || '', project: data.project || '', notes: data.notes || '',
      active: isCashier ? (existing?.active !== false) : data.active !== false
    };
    const index = next.customers.findIndex(row => row.id === item.id);
    if (index >= 0) next.customers[index] = item; else next.customers.unshift(item);
    return item;
  });

  const saveEmployee = async data => {
    if (!currentUser) throw new Error('Sesi pengguna belum aktif.');
    if (!can(currentUser, 'employees.manage')) throw new Error('Akun ini tidak memiliki izin mengelola karyawan.');
    if (!navigator.onLine) throw new Error('Pembuatan atau perubahan akun karyawan memerlukan internet.');
    if (!auth?.currentUser || auth.currentUser.uid !== currentUser.id) {
      throw new Error('Sesi cloud belum cocok dengan pengguna aktif. Keluar lalu login kembali sebelum mengelola karyawan.');
    }
    try {
      const profile = await upsertCloudEmployee({
        ...data,
        role: currentUser.role === 'manager' ? 'kasir' : (data.role === 'manager' ? 'manager' : 'kasir'),
        branchId: currentUser.role === 'manager' ? currentUser.branchId : (data.branchId || branchId)
      });
      if (profile) {
        let nextDb = dbRef.current;
        setDb(previous => {
          let users = previous.users.filter(user => user.id !== profile.replacesUserId);
          const exists = users.some(user => user.id === profile.id);
          users = exists
            ? users.map(user => user.id === profile.id ? profile : user)
            : [profile, ...users];
          const next = { ...previous, users };
          nextDb = next;
          dbRef.current = next;
          void saveLocalSnapshot(next, currentUser);
          return next;
        });
        await publishEmployeeLoginList(nextDb, profile.branchId, currentUser).catch(error => {
          console.warn('Akun tersimpan, tetapi daftar pilihan login menunggu sinkronisasi.', error);
        });
        if (profile.replacesUserId) await removeOfflineCredential(storeCode, profile.replacesUserId).catch(() => {});
        setCloudError('');
      }
      return profile;
    } catch (error) {
      const message = friendlyCloudError(error, 'Akun karyawan belum berhasil disimpan. Periksa sesi pengguna dan koneksi Firebase.');
      setCloudError(message);
      throw new Error(message);
    }
  };

  const deleteEmployee = async ({ id, pin = '' }) => {
    if (!currentUser) throw new Error('Sesi pengguna belum aktif.');
    if (!can(currentUser, 'employees.manage')) throw new Error('Akun ini tidak memiliki izin menghapus karyawan.');
    if (!navigator.onLine) throw new Error('Penghapusan akun karyawan memerlukan internet.');
    if (!auth?.currentUser || auth.currentUser.uid !== currentUser.id) {
      throw new Error('Sesi cloud belum cocok dengan pengguna aktif. Login kembali sebelum menghapus karyawan.');
    }
    try {
      const result = await deleteCloudEmployee({ id, pin });
      const removed = dbRef.current.users.find(user => user.id === id);
      let nextDb = dbRef.current;
      setDb(previous => {
        const next = { ...previous, users: previous.users.filter(user => user.id !== id) };
        nextDb = next;
        dbRef.current = next;
        void saveLocalSnapshot(next, currentUser);
        return next;
      });
      if (removed?.branchId) await publishEmployeeLoginList(nextDb, removed.branchId, currentUser).catch(error => {
        console.warn('Karyawan dihapus, tetapi daftar pilihan login menunggu sinkronisasi.', error);
      });
      await removeOfflineCredential(storeCode, id).catch(() => {});
      setCloudError('');
      return result;
    } catch (error) {
      const message = friendlyCloudError(error, 'Akun karyawan belum berhasil dihapus.');
      setCloudError(message);
      throw new Error(message);
    }
  };

  const findOpenShift = (targetBranchId = branchId) => db.shifts.find(item => item.branchId === targetBranchId && item.status === 'OPEN');

  const startShift = ({ startingCash, notes }) => commit('SHIFT_START', String(startingCash), next => {
    if (next.shifts.some(item => item.branchId === branchId && item.status === 'OPEN')) throw new Error('Masih ada shift aktif.');
    const shift = {
      id: generateId('SHIFT'), branchId: branchId, userId: currentUser.id, userName: currentUser.name,
      startAt: nowISO(), endAt: null, startingCash: money(startingCash), actualEndingCash: null,
      expectedEndingCash: null, difference: null, status: 'OPEN', notes: notes || ''
    };
    next.shifts.unshift(shift);
    next.cashMovements.unshift({ id: generateId('CASH'), branchId: shift.branchId, shiftId: shift.id, type: 'START', amount: shift.startingCash, note: 'Modal awal', createdAt: shift.startAt, userId: currentUser.id });
    return shift;
  });

  const addCashMovement = ({ type, amount, note }) => commit('CASH_MOVEMENT', `${type}:${amount}`, next => {
    const shift = next.shifts.find(item => item.branchId === branchId && item.status === 'OPEN');
    if (!shift) throw new Error('Tidak ada shift aktif.');
    const safeAmount = money(amount);
    if (safeAmount <= 0) throw new Error('Nominal kas harus lebih dari Rp 0.');
    const item = { id: generateId('CASH'), branchId: shift.branchId, shiftId: shift.id, type, amount: safeAmount, note: note || '', createdAt: nowISO(), userId: currentUser.id };
    next.cashMovements.unshift(item);
    return item;
  });

  const endShift = ({ actualEndingCash, notes }) => commit('SHIFT_END', String(actualEndingCash), next => {
    const shift = next.shifts.find(item => item.branchId === branchId && item.status === 'OPEN');
    if (!shift) throw new Error('Tidak ada shift aktif.');
    const movements = next.cashMovements.filter(item => item.shiftId === shift.id);
    const expected = movements.reduce((sum, item) => {
      if (['START', 'SALE', 'CASH_IN', 'RECEIVABLE_PAYMENT'].includes(item.type)) return sum + item.amount;
      if (['EXPENSE', 'PURCHASE', 'REFUND', 'CASH_OUT'].includes(item.type)) return sum - item.amount;
      return sum;
    }, 0);
    shift.endAt = nowISO(); shift.actualEndingCash = money(actualEndingCash); shift.expectedEndingCash = expected;
    shift.difference = shift.actualEndingCash - expected; shift.status = 'CLOSED'; shift.endNotes = notes || '';
    return shift;
  });

  const resolveProductStockRows = (next, cartItem, targetBranchId = branchId) => {
    const product = next.products.find(row => row.id === cartItem.productId && row.branchId === targetBranchId);
    if (!product && String(cartItem.productId || '').startsWith('CUSTOM-')) return [];
    if (!product) throw new Error(`Produk ${cartItem.name} tidak ditemukan.`);
    if (product.bundleItems?.length) {
      return product.bundleItems.map(component => {
        const componentProduct = next.products.find(row => row.id === component.productId && row.branchId === targetBranchId);
        if (!componentProduct) throw new Error(`Komponen paket ${component.productId} tidak ditemukan.`);
        return { product: componentProduct, qty: component.qty * cartItem.qty, sourceName: product.name };
      });
    }
    return [{ product, qty: cartItem.baseQty ?? cartItem.qty, sourceName: product.name }];
  };

  const recalculateProductModalPrice = (next, productId, targetBranchId) => {
    const product = next.products.find(row => row.id === productId && row.branchId === targetBranchId);
    if (!product) return;
    const candidates = (next.purchases || [])
      .filter(purchase => purchase.branchId === targetBranchId && purchase.status === 'RECEIVED' && purchase.inventoryApplied)
      .flatMap(purchase => (purchase.items || [])
        .filter(item => item.productId === productId)
        .map(item => {
          const returned = (purchase.returns || []).reduce((sum, purchaseReturn) => sum + (purchaseReturn.items || [])
            .filter(row => row.id === item.id || row.productId === item.productId)
            .reduce((itemSum, row) => itemSum + Number(row.qty || 0), 0), 0);
          const factor = Math.max(0.001, Number(item.factor || 1));
          return {
            price: money(item.baseUnitCost ?? calculateBaseUnitCost(item.price, factor)),
            remaining: Math.max(0, Number(item.qty || 0) - returned),
            date: new Date(purchase.updatedAt || purchase.createdAt || 0).getTime() || 0
          };
        }))
      .filter(candidate => candidate.remaining > 0)
      .sort((first, second) => second.date - first.date);
    const beforePrice = clone(product);
    product.modalPrice = candidates[0]?.price ?? money(product.initialModalPrice);
    product.updatedAt = nowISO();
    appendProductPriceHistory(next, beforePrice, product, 'Perhitungan HPP dari pembelian/retur', currentUserRef.current?.id);
  };

  const holdSale = payload => commit('BILL_HOLD', payload.name || 'Open Bill', next => {
    const item = { id: payload.id || generateId('BILL'), branchId: branchId, createdAt: nowISO(), updatedAt: nowISO(), ...payload };
    const index = next.heldSales.findIndex(row => row.id === item.id);
    if (index >= 0) next.heldSales[index] = item; else next.heldSales.unshift(item);
    return item;
  });

  const deleteHeldSale = id => commit('BILL_DELETE', id, next => {
    next.heldSales = next.heldSales.filter(row => row.id !== id);
    return { id };
  });

  const completeSale = payload => commit('SALE_COMPLETE', payload.total, next => {
    if (!payload.items?.length) throw new Error('Keranjang kosong.');
    if (payload.items.some(item => Number(item.qty || 0) <= 0 || money(item.price) < 0)) throw new Error('Jumlah atau harga item transaksi tidak valid.');
    if (payload.id && next.sales.some(sale => sale.id === payload.id)) throw new Error('Transaksi ini sudah tersimpan. Hindari menekan tombol bayar dua kali.');
    const activeShift = next.shifts.find(item => item.branchId === branchId && item.status === 'OPEN');
    const cashTotal = (payload.payments || []).filter(payment => payment.type === 'cash').reduce((sum, payment) => sum + money(payment.amount), 0);
    if (next.configs.requireShiftForCash && cashTotal > 0 && !activeShift) throw new Error('Mulai shift sebelum menerima pembayaran tunai.');
    const creditTotal = (payload.payments || []).filter(payment => payment.type === 'credit').reduce((sum, payment) => sum + money(payment.amount), 0);
    const creditCustomer = next.customers.find(item => item.id === payload.customerId);
    if (creditTotal > 0) {
      if (!creditCustomer || creditCustomer.name === 'Umum (Non-Member)') throw new Error('Pembayaran tempo wajib memilih pelanggan terdaftar.');
      const currentBalance = next.receivables.filter(item => item.customerId === creditCustomer.id && item.status === 'OPEN').reduce((sum, item) => sum + money(item.balance), 0);
      if (money(creditCustomer.creditLimit) > 0 && currentBalance + creditTotal > money(creditCustomer.creditLimit)) {
        throw new Error(`Batas kredit pelanggan terlampaui. Sisa limit Rp ${(money(creditCustomer.creditLimit) - currentBalance).toLocaleString('id-ID')}.`);
      }
    }

    const normalizedItems = payload.items.map(item => {
      const qty = Number(item.qty || 0);
      const price = money(item.price);
      const itemDiscount = money(item.itemDiscount);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Jumlah ${item.name || 'item'} tidak valid.`);
      if (itemDiscount > price * qty) throw new Error(`Diskon item ${item.name || 'item'} melebihi subtotal.`);
      return { ...item, qty, price, itemDiscount, netUnitPrice: Math.max(0, price - itemDiscount / qty) };
    });
    const recalculatedSubtotal = Math.round(normalizedItems.reduce((sum, item) => sum + item.price * item.qty - item.itemDiscount, 0));
    const safeGlobalDiscount = Math.min(recalculatedSubtotal, money(payload.globalDiscount));
    const safePromoDiscount = 0;
    const safePointsRedeemed = money(payload.pointsRedeemed);
    const safeLoyaltyDiscount = Math.min(
      Math.max(0, recalculatedSubtotal - safeGlobalDiscount - safePromoDiscount),
      safePointsRedeemed * money(next.configs.pointValue)
    );
    const totalItemDiscount = normalizedItems.reduce((sum, item) => sum + money(item.itemDiscount), 0);
    const approvalDiscount = totalItemDiscount + safeGlobalDiscount;
    const approvalDiscountPercent = recalculatedSubtotal > 0 ? (approvalDiscount / recalculatedSubtotal) * 100 : 0;
    const approvalLimit = currentUser.role === 'kasir'
      ? Number(next.configs.cashierMaxDiscountPercent ?? 5)
      : Number(next.configs.managerMaxDiscountPercent ?? 20);
    if (currentUser.role !== 'owner' && approvalDiscountPercent > approvalLimit && (!payload.approvedBy || !payload.approvalToken)) {
      throw new Error(`Diskon ${approvalDiscountPercent.toFixed(1)}% melebihi batas ${approvalLimit}%. Minta persetujuan Owner atau Store Manager.`);
    }
    const afterDiscount = Math.max(0, recalculatedSubtotal - safeGlobalDiscount - safePromoDiscount - safeLoyaltyDiscount);
    const safeTax = next.configs.taxEnabled ? Math.round(afterDiscount * Math.max(0, Number(next.configs.taxRate || 0)) / 100) : 0;
    const safeService = next.configs.serviceEnabled ? Math.round(afterDiscount * Math.max(0, Number(next.configs.serviceRate || 0)) / 100) : 0;
    const rawTotal = afterDiscount + safeTax + safeService;
    const roundingStep = money(next.configs.roundingStep);
    const recalculatedTotal = roundingStep > 0 ? Math.round(rawTotal / roundingStep) * roundingStep : Math.round(rawTotal);

    const paymentTotal = (payload.payments || []).reduce((sum, payment) => sum + money(payment.amount), 0);
    if (paymentTotal < recalculatedTotal) throw new Error('Jumlah pembayaran belum mencukupi total tagihan.');
    const creditPayments = (payload.payments || []).filter(payment => payment.type === 'credit' && money(payment.amount) > 0);
    if (creditPayments.some(payment => !payment.dueDate)) throw new Error('Pembayaran tempo wajib memiliki tanggal jatuh tempo.');
    const overpayment = paymentTotal - recalculatedTotal;
    if (overpayment > cashTotal) throw new Error('Pembayaran non-tunai tidak boleh melebihi total tagihan. Kelebihan hanya boleh berasal dari pembayaran tunai sebagai kembalian.');

    const rawStockRows = normalizedItems.flatMap(item => resolveProductStockRows(next, item));
    const stockMap = new Map();
    for (const row of rawStockRows) {
      const previous = stockMap.get(row.product.id);
      if (previous) {
        previous.qty += Number(row.qty || 0);
        previous.sourceNames.add(row.sourceName);
      } else {
        stockMap.set(row.product.id, { product: row.product, qty: Number(row.qty || 0), sourceNames: new Set([row.sourceName]) });
      }
    }
    const stockRows = [...stockMap.values()];
    for (const row of stockRows) {
      row.qty = validateBaseQuantity(row.product, row.qty, 'Jumlah penjualan');
      if (row.product.trackStock !== false && row.product.stock < row.qty) throw new Error(`Stok ${row.product.name} tidak cukup. Tersedia ${row.product.stock}, dibutuhkan ${row.qty}.`);
    }
    const saleId = payload.id || generateId('INV');
    for (const row of stockRows) {
      if (row.product.trackStock !== false) row.product.stock = quantity(row.product.stock - row.qty);
      next.stockMovements.unshift({
        id: generateId('MOV'), branchId: branchId, productId: row.product.id, productName: row.product.name,
        type: 'SALE', qtyChange: -row.qty, refId: saleId, note: [...row.sourceNames].join(', '), createdAt: nowISO(), userId: currentUser.id
      });
    }
    const sale = {
      ...payload, items: normalizedItems, id: saleId, branchId: branchId, branchName: next.branches.find(item=>item.id===branchId)?.name || '', branchAddress: next.branches.find(item=>item.id===branchId)?.address || '', branchPhone: next.branches.find(item=>item.id===branchId)?.phone || '', createdAt: nowISO(), status: 'COMPLETED',
      globalDiscount: safeGlobalDiscount, promoDiscount: safePromoDiscount, loyaltyDiscount: safeLoyaltyDiscount,
      subtotal: recalculatedSubtotal, tax: safeTax, service: safeService, rounding: recalculatedTotal - rawTotal,
      total: recalculatedTotal, change: overpayment, pointsRedeemed: safePointsRedeemed,
      refundedTotal: 0, syncStatus: navigator.onLine ? 'QUEUED' : 'OFFLINE_QUEUED', createdBy: currentUser.id
    };
    next.sales.unshift(sale);
    if (payload.approvedBy && payload.approvalToken) {
      next.approvalRequests.unshift({
        id: generateId('APR'), branchId: sale.branchId, type: 'SALE_DISCOUNT', status: 'APPROVED',
        referenceId: sale.id, amount: approvalDiscount, percent: Math.round(approvalDiscountPercent * 100) / 100,
        requestedBy: currentUser.id, requestedByName: currentUser.name,
        approvedBy: payload.approvedBy, approvedByName: payload.approvedByName || '',
        approvalToken: payload.approvalToken, createdAt: sale.createdAt, resolvedAt: sale.createdAt
      });
      sale.approvedBy = payload.approvedBy;
      sale.approvedByName = payload.approvedByName || '';
    }
    if (payload.heldSaleId) next.heldSales = next.heldSales.filter(row => row.id !== payload.heldSaleId);

    const cashApplied = Math.max(0, cashTotal - overpayment);
    if (cashApplied > 0 && activeShift) {
      next.cashMovements.unshift({ id: generateId('CASH'), branchId: sale.branchId, shiftId: activeShift.id, type: 'SALE', amount: cashApplied, note: sale.id, createdAt: sale.createdAt, userId: currentUser.id });
    }
    for (const payment of payload.payments || []) {
      if (payment.type === 'credit' && money(payment.amount) > 0) {
        next.receivables.unshift({
          id: generateId('REC'), branchId: sale.branchId, saleId: sale.id, customerId: sale.customerId,
          customerName: sale.customerName, total: money(payment.amount), paid: 0, balance: money(payment.amount),
          dueDate: payment.dueDate || '', status: 'OPEN', payments: [], createdAt: sale.createdAt
        });
      }
    }
    const customer = next.customers.find(item => item.id === payload.customerId);
    if (customer && next.configs.loyaltyEnabled && customer.name !== 'Umum (Non-Member)') {
      const redeemed = safePointsRedeemed;
      if (redeemed > money(customer.points)) throw new Error('Poin yang ditukar melebihi saldo poin pelanggan.');
      const earned = Math.floor(recalculatedTotal / Math.max(1, money(next.configs.pointRate)));
      customer.points = money(customer.points) - redeemed + earned;
      sale.pointsEarned = earned;
    }
    return sale;
  });

  const authorizeManagerPin = async (pin, purpose = 'GENERAL') => {
    const profile = await verifyOfflinePin(storeCode, pin).catch(() => null);
    if (!profile || !['owner', 'manager'].includes(profile.role) || profile.active === false) {
      throw new Error('PIN Manager/Owner tidak valid pada perangkat ini. Hubungkan akun Manager/Owner sekali pada perangkat agar approval tersedia.');
    }
    return {
      success: true,
      purpose,
      user: profile,
      approvalToken: `LOCAL-${generateId('APPROVAL')}`
    };
  };

  const refundSale = async payload => {
    if (!payload.items?.length) throw new Error('Pilih minimal satu item untuk refund.');
    if (!String(payload.reason || '').trim()) throw new Error('Alasan refund wajib diisi.');
    const sale = db.sales.find(item => item.id === payload.saleId);
    if (!sale) throw new Error('Transaksi tidak ditemukan.');
    if (['REFUNDED', 'VOIDED'].includes(sale.status)) throw new Error('Transaksi ini sudah selesai direfund/dibatalkan.');
    const previousRefunds = db.refunds.filter(item => item.saleId === sale.id);
    if (payload.voidAll && previousRefunds.length > 0) throw new Error('Transaksi yang sudah memiliki refund sebagian tidak dapat di-void penuh.');
    for (const refundItem of payload.items) {
      const original = sale.items.find(item => item.lineId === refundItem.lineId || item.productId === refundItem.productId);
      if (!original) throw new Error(`Item ${refundItem.name || refundItem.productId} tidak ditemukan pada transaksi.`);
      const alreadyRefunded = previousRefunds.reduce((sum, refund) => sum + refund.items.filter(item => item.lineId === original.lineId || item.productId === original.productId).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0);
      const remaining = Math.max(0, Number(original.qty || 0) - alreadyRefunded);
      const refundQty = Number(refundItem.qty || 0);
      const refundStep = Math.max(0.001, Number(original.quantityStep || 1));
      if (refundQty <= 0 || refundQty > remaining) throw new Error(`Jumlah refund ${original.name} melebihi sisa yang dapat direfund (${remaining}).`);
      if (!isStepAligned(refundQty, refundStep)) throw new Error(`Jumlah refund ${original.name} harus kelipatan ${formatQuantity(refundStep)} ${original.unit || 'satuan'}.`);
    }
    const itemNetTotal = sale.items.reduce((sum, item) => sum + Math.max(0, Number(item.netUnitPrice ?? item.price) || 0) * Number(item.qty || 0), 0);
    const saleAllocationRatio = itemNetTotal > 0 ? money(sale.total) / itemNetTotal : 0;
    const calculatedRefund = payload.items.reduce((sum, refundItem) => {
      const original = sale.items.find(item => item.lineId === refundItem.lineId || item.productId === refundItem.productId);
      if (!original) return sum;
      const base = Math.max(0, Number(original.netUnitPrice ?? original.price) || 0) * Number(refundItem.qty || 0);
      return sum + Math.round(base * saleAllocationRatio);
    }, 0);
    const amount = Math.min(Math.max(0, money(sale.total) - money(sale.refundedTotal)), calculatedRefund);
    if (amount <= 0) throw new Error('Nilai refund tidak valid atau transaksi sudah direfund penuh.');
    if (currentUser.role === 'kasir' || amount >= money(db.configs.refundApprovalLimit)) {
      const approval = await authorizeManagerPin(payload.managerPin, payload.voidAll ? 'SALE_VOID' : 'SALE_REFUND');
      if (!approval) throw new Error('PIN Manager/Owner tidak valid.');
      payload.approvedBy = approval.user.id;
      payload.approvedByName = approval.user.name;
      payload.approvalToken = approval.approvalToken;
    }
    return commit(payload.voidAll ? 'SALE_VOID' : 'SALE_REFUND', `${payload.saleId}:${amount}`, next => {
      const target = next.sales.find(item => item.id === payload.saleId);
      const refund = {
        id: generateId(payload.voidAll ? 'VOID' : 'REF'), branchId: target.branchId, saleId: target.id,
        items: payload.items, amount, reason: payload.reason, restock: payload.restock,
        method: payload.method || 'Tunai', createdAt: nowISO(), createdBy: currentUser.id,
        approvedBy: payload.approvedBy || currentUser.id, approvedByName: payload.approvedByName || currentUser.name,
        type: payload.voidAll ? 'VOID' : (payload.items.length === target.items.length ? 'FULL' : 'PARTIAL')
      };
      next.refunds.unshift(refund);
      target.refundedTotal = money(target.refundedTotal) + amount;
      const allRefunds = [...next.refunds].filter(item => item.saleId === target.id);
      const fullyRefundedByQty = target.items.every(original => {
        const returnedQty = allRefunds.reduce((sum, refundRow) => sum + refundRow.items.filter(item => item.lineId === original.lineId || item.productId === original.productId).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0);
        return returnedQty >= Number(original.qty || 0);
      });
      if (payload.voidAll) target.status = 'VOIDED'; else if (fullyRefundedByQty) target.status = 'REFUNDED'; else target.status = 'PARTIAL_REFUND';
      if (payload.restock) {
        for (const refundItem of payload.items) {
          const original = target.items.find(item => item.lineId === refundItem.lineId || item.productId === refundItem.productId);
          if (!original) continue;
          const rows = resolveProductStockRows(next, { ...original, qty: refundItem.qty, baseQty: (original.baseQty / original.qty) * refundItem.qty }, target.branchId);
          for (const row of rows) {
            row.qty = validateBaseQuantity(row.product, row.qty, 'Jumlah restock refund');
            if (row.product.trackStock !== false) row.product.stock = quantity(row.product.stock + row.qty);
            next.stockMovements.unshift({ id: generateId('MOV'), branchId: target.branchId, productId: row.product.id, productName: row.product.name, type: payload.voidAll ? 'VOID' : 'REFUND', qtyChange: row.qty, refId: refund.id, note: payload.reason, createdAt: refund.createdAt, userId: currentUser.id });
          }
        }
      }
      const activeShift = next.shifts.find(item => item.branchId === target.branchId && item.status === 'OPEN');
      if (activeShift && refund.method === 'Tunai') next.cashMovements.unshift({ id: generateId('CASH'), branchId: target.branchId, shiftId: activeShift.id, type: 'REFUND', amount, note: refund.id, createdAt: refund.createdAt, userId: currentUser.id });
      return refund;
    }, { approvalToken: payload.approvalToken || '' });
  };

  const savePurchase = payload => commit(payload.id ? 'PURCHASE_UPDATE' : 'PURCHASE_CREATE', payload.invoiceNo || '', next => {
    const existing = next.purchases.find(item => item.id === payload.id);
    if (existing?.inventoryApplied) throw new Error('Pembelian yang sudah diterima tidak dapat diubah. Gunakan fitur retur atau pembayaran hutang.');

    const status = payload.status || 'DRAFT';
    if (!['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].includes(status)) throw new Error('Status pembelian tidak valid.');
    const invoiceNo = String(payload.invoiceNo || '').trim() || generateId('PO');
    const duplicateInvoice = next.purchases.find(item => item.id !== payload.id && item.branchId === branchId && String(item.invoiceNo || '').trim().toLowerCase() === invoiceNo.toLowerCase());
    if (duplicateInvoice) throw new Error(`Nomor faktur ${invoiceNo} sudah digunakan.`);
    if (status !== 'DRAFT' && !payload.supplierId) throw new Error('Pemasok wajib dipilih.');
    if (status !== 'DRAFT' && !payload.items?.length) throw new Error('Tambahkan minimal satu barang.');

    const items = (payload.items || []).map(item => {
      const product = next.products.find(row => row.id === item.productId && row.branchId === branchId);
      if (!product) throw new Error(`Produk ${item.name || item.productId} tidak ditemukan di cabang aktif.`);
      const qty = Number(item.qty);
      const unit = item.unit || product.baseUnit;
      const factor = quantity(item.factor || conversionFactor(product, unit));
      const price = money(item.price);
      const itemDiscount = money(item.discount);
      const baseQty = quantity(item.baseQty ?? qty * factor);
      const baseUnitCost = money(item.baseUnitCost ?? calculateBaseUnitCost(price, factor));
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Jumlah ${item.name || 'barang'} harus lebih dari 0.`);
      if (!Number.isFinite(factor) || factor <= 0 || baseQty <= 0) throw new Error(`Konversi satuan ${item.name || 'barang'} tidak valid.`);
      if (itemDiscount > qty * price) throw new Error(`Diskon ${item.name || 'barang'} melebihi subtotal item.`);
      return { ...item, qty: quantity(qty), unit, factor, baseQty, baseUnit: product.baseUnit, price, baseUnitCost, discount: itemDiscount };
    });
    const subtotal = items.reduce((sum, item) => sum + Math.max(0, item.qty * item.price - item.discount), 0);
    const additional = money(payload.additional);
    const discount = money(payload.discount);
    if (discount > subtotal + additional) throw new Error('Diskon faktur tidak boleh melebihi subtotal dan biaya tambahan.');
    const total = Math.max(0, subtotal + additional - discount);
    const paid = Math.min(total, money(payload.paid));
    const balance = total - paid;
    if (status === 'RECEIVED' && balance > 0 && !payload.dueDate) throw new Error('Tanggal jatuh tempo wajib diisi untuk pembelian yang belum lunas.');

    const purchase = {
      ...(existing || {}), ...payload, invoiceNo, status, items, subtotal, additional, discount, total, paid,
      id: payload.id || generateId('BUY'), branchId: branchId,
      createdAt: existing?.createdAt || nowISO(), updatedAt: nowISO(), inventoryApplied: false
    };
    if (purchase.status === 'RECEIVED') {
      for (const item of purchase.items) {
        const product = next.products.find(row => row.id === item.productId && row.branchId === purchase.branchId);
        if (!product) throw new Error(`Produk ${item.name || item.productId} tidak ditemukan di cabang aktif.`);
        item.previousModalPrice = product.modalPrice;
        product.stock = quantity(product.stock + Number(item.baseQty || item.qty));
        product.modalPrice = money(item.baseUnitCost ?? calculateBaseUnitCost(item.price, item.factor || 1));
        next.stockMovements.unshift({ id: generateId('MOV'), branchId: purchase.branchId, productId: product.id, productName: product.name, type: 'PURCHASE', qtyChange: Number(item.baseQty || item.qty), refId: purchase.id, note: `${purchase.invoiceNo} · ${item.qty} ${item.unit}`, createdAt: nowISO(), userId: currentUser.id });
      }
      purchase.inventoryApplied = true;
      if (balance > 0) next.payables.unshift({ id: generateId('PAY'), branchId: purchase.branchId, purchaseId: purchase.id, supplierId: purchase.supplierId, supplierName: purchase.supplierName, total, paid, balance, dueDate: purchase.dueDate, status: 'OPEN', payments: [], createdAt: nowISO(), updatedAt: nowISO() });
      const activeShift = next.shifts.find(item => item.branchId === purchase.branchId && item.status === 'OPEN');
      if (activeShift && purchase.paymentMethod === 'Tunai' && purchase.paid > 0) next.cashMovements.unshift({ id: generateId('CASH'), branchId: purchase.branchId, shiftId: activeShift.id, type: 'PURCHASE', amount: purchase.paid, note: purchase.id, createdAt: nowISO(), userId: currentUser.id });
    }
    const index = next.purchases.findIndex(row => row.id === purchase.id);
    if (index >= 0) next.purchases[index] = purchase; else next.purchases.unshift(purchase);
    return purchase;
  });

  const returnPurchase = payload => commit('PURCHASE_RETURN', payload.purchaseId, next => {
    if (!payload.items?.length) throw new Error('Pilih minimal satu barang untuk diretur.');
    if (!String(payload.reason || '').trim()) throw new Error('Alasan retur wajib diisi.');
    const purchase = next.purchases.find(item => item.id === payload.purchaseId);
    if (!purchase) throw new Error('Pembelian tidak ditemukan.');
    if (!purchase.inventoryApplied || purchase.status !== 'RECEIVED') throw new Error('Hanya pembelian yang sudah diterima yang dapat diretur.');
    let total = 0;
    const purchaseGross = purchase.items.reduce((sum, row) => sum + quantity(row.qty) * money(row.price), 0);
    const purchaseAllocationRatio = purchaseGross > 0 ? money(purchase.total) / purchaseGross : 0;
    const affectedProductIds = new Set();
    for (const item of payload.items) {
      const original = purchase.items.find(row => row.id === item.id || row.productId === item.productId);
      if (!original) throw new Error(`Item ${item.name || item.productId} tidak ditemukan pada pembelian.`);
      const alreadyReturned = (purchase.returns || []).reduce((sum, purchaseReturn) => sum + purchaseReturn.items.filter(row => row.id === original.id || row.productId === original.productId).reduce((itemSum, row) => itemSum + Number(row.qty || 0), 0), 0);
      const remaining = Math.max(0, Number(original.qty || 0) - alreadyReturned);
      if (Number(item.qty || 0) <= 0 || Number(item.qty) > remaining) throw new Error(`Jumlah retur ${original.name} melebihi sisa yang dapat diretur (${remaining}).`);
      const product = next.products.find(row => row.id === item.productId && row.branchId === purchase.branchId);
      if (!product) throw new Error(`Produk ${original.name || item.productId} tidak ditemukan di cabang pembelian.`);
      const returnQty = quantity(item.qty);
      const returnStep = Number(original.quantityStep || (original.unit === original.baseUnit ? normalizeQuantityStep(product?.quantityStep, product?.allowFractional === true) : 1));
      if (!isStepAligned(returnQty, returnStep)) throw new Error(`Jumlah retur ${original.name} harus mengikuti kelipatan ${formatQuantity(returnStep)} ${original.unit || ''}.`);
      const factor = quantity(original.factor || 1);
      const returnBaseQty = validateBaseQuantity(product, returnQty * factor, `Jumlah retur ${original.name}`);
      if (product.stock < returnBaseQty) throw new Error(`Stok ${item.name} tidak cukup untuk retur. Dibutuhkan ${returnBaseQty} ${product.baseUnit || 'satuan dasar'}.`);
      product.stock = quantity(product.stock - returnBaseQty);
      affectedProductIds.add(product.id);
      item.baseQty = returnBaseQty;
      item.unit = original.unit || product.baseUnit;
      item.factor = factor;
      total += Math.round(returnQty * money(original.price) * purchaseAllocationRatio);
      next.stockMovements.unshift({ id: generateId('MOV'), branchId: purchase.branchId, productId: product.id, productName: product.name, type: 'PURCHASE_RETURN', qtyChange: -returnBaseQty, refId: purchase.id, note: `${payload.reason} · ${returnQty} ${item.unit}`, createdAt: nowISO(), userId: currentUser.id });
    }
    purchase.returns = [...(purchase.returns || []), { id: generateId('PRET'), items: payload.items, total, reason: payload.reason, createdAt: nowISO() }];
    purchase.updatedAt = nowISO();
    affectedProductIds.forEach(productId => recalculateProductModalPrice(next, productId, purchase.branchId));
    const payable = next.payables.find(item => item.purchaseId === purchase.id && item.status === 'OPEN');
    if (payable) {
      payable.total = Math.max(payable.paid, money(payable.total) - total);
      payable.balance = Math.max(0, payable.total - money(payable.paid));
      payable.updatedAt = nowISO();
      if (payable.balance === 0) payable.status = 'PAID';
    }
    return { id: purchase.id, total };
  });

  const payReceivable = ({ id, amount, method = 'Tunai' }) => commit('RECEIVABLE_PAYMENT', `${id}:${amount}`, next => {
    const item = next.receivables.find(row => row.id === id);
    if (!item) throw new Error('Piutang tidak ditemukan.');
    if (money(amount) <= 0) throw new Error('Nominal pembayaran harus lebih dari Rp 0.');
    if (item.status !== 'OPEN' || money(item.balance) <= 0) throw new Error('Piutang ini sudah lunas.');
    const paid = Math.min(item.balance, money(amount));
    item.paid += paid; item.balance -= paid; item.payments.unshift({ id: generateId('RCP'), amount: paid, method, createdAt: nowISO(), userId: currentUser.id });
    if (item.balance <= 0) item.status = 'PAID';
    item.updatedAt = nowISO();
    const activeShift = next.shifts.find(row => row.branchId === item.branchId && row.status === 'OPEN');
    if (activeShift && method === 'Tunai') next.cashMovements.unshift({ id: generateId('CASH'), branchId: item.branchId, shiftId: activeShift.id, type: 'RECEIVABLE_PAYMENT', amount: paid, note: item.id, createdAt: nowISO(), userId: currentUser.id });
    return item;
  });

  const payPayable = ({ id, amount, method = 'Tunai' }) => commit('PAYABLE_PAYMENT', `${id}:${amount}`, next => {
    const item = next.payables.find(row => row.id === id);
    if (!item) throw new Error('Hutang tidak ditemukan.');
    if (money(amount) <= 0) throw new Error('Nominal pembayaran harus lebih dari Rp 0.');
    if (item.status !== 'OPEN' || money(item.balance) <= 0) throw new Error('Hutang ini sudah lunas.');
    const paid = Math.min(item.balance, money(amount));
    item.paid += paid; item.balance -= paid; item.payments.unshift({ id: generateId('PPY'), amount: paid, method, createdAt: nowISO(), userId: currentUser.id });
    if (item.balance <= 0) item.status = 'PAID';
    item.updatedAt = nowISO();
    const activeShift = next.shifts.find(row => row.branchId === item.branchId && row.status === 'OPEN');
    if (activeShift && method === 'Tunai') next.cashMovements.unshift({ id: generateId('CASH'), branchId: item.branchId, shiftId: activeShift.id, type: 'PURCHASE', amount: paid, note: item.id, createdAt: nowISO(), userId: currentUser.id });
    return item;
  });

  const addExpense = data => commit('EXPENSE_CREATE', data.note, next => {
    if (money(data.amount) <= 0) throw new Error('Nominal pengeluaran harus lebih dari Rp 0.');
    const item = { id: generateId('EXP'), branchId: branchId, category: data.category || 'Operasional', amount: money(data.amount), note: data.note || '', method: data.method || 'Tunai', createdAt: nowISO(), userId: currentUser.id };
    next.expenses.unshift(item);
    const activeShift = next.shifts.find(row => row.branchId === item.branchId && row.status === 'OPEN');
    if (activeShift && item.method === 'Tunai') next.cashMovements.unshift({ id: generateId('CASH'), branchId: item.branchId, shiftId: activeShift.id, type: 'EXPENSE', amount: item.amount, note: item.note, createdAt: item.createdAt, userId: currentUser.id });
    return item;
  });

  const adjustStock = data => commit('STOCK_ADJUST', data.reason, next => {
    const product = next.products.find(item => item.id === data.productId && item.branchId === branchId);
    if (!product) throw new Error('Produk tidak ditemukan.');
    const change = validateBaseQuantity(product, data.qtyChange, 'Perubahan stok');
    if (change === 0) throw new Error('Perubahan stok tidak boleh 0.');
    if (Number(product.stock || 0) + change < 0) throw new Error('Stok tidak boleh negatif.');
    product.stock = quantity(Number(product.stock || 0) + change);
    const adjustment = { id: generateId('ADJ'), branchId: product.branchId, productId: product.id, productName: product.name, qtyChange: change, reason: data.reason, createdAt: nowISO(), userId: currentUser.id };
    next.stockAdjustments.unshift(adjustment);
    next.stockMovements.unshift({ ...adjustment, type: 'ADJUSTMENT', refId: adjustment.id, note: data.reason });
    return adjustment;
  });

  const stockOpname = ({ counts, notes }) => commit('STOCK_OPNAME', notes, next => {
    if (!Array.isArray(counts) || counts.length === 0) throw new Error('Data stok opname masih kosong.');
    const opname = { id: generateId('OPN'), branchId: branchId, createdAt: nowISO(), userId: currentUser.id, notes: notes || '', items: [] };
    for (const count of counts) {
      const product = next.products.find(item => item.id === count.productId && item.branchId === branchId);
      if (!product) continue;
      const actual = validateBaseQuantity(product, count.actual, 'Stok fisik');
      if (actual < 0) throw new Error(`Stok fisik ${product.name} tidak valid.`);
      const difference = signedQuantity(actual - Number(product.stock || 0));
      opname.items.push({ productId: product.id, productName: product.name, system: product.stock, actual, difference });
      if (difference !== 0) {
        product.stock = actual;
        next.stockMovements.unshift({ id: generateId('MOV'), branchId: product.branchId, productId: product.id, productName: product.name, type: 'OPNAME', qtyChange: difference, refId: opname.id, note: notes, createdAt: opname.createdAt, userId: currentUser.id });
      }
    }
    next.stockOpnames.unshift(opname);
    return opname;
  });

  const transferStock = ({ productId, destinationBranchId, qty, notes }) => commit('STOCK_TRANSFER', `${productId}:${qty}`, next => {
    if (!destinationBranchId || destinationBranchId === branchId) throw new Error('Pilih cabang tujuan yang berbeda.');
    const source = next.products.find(item => item.id === productId && item.branchId === branchId);
    if (!source) throw new Error('Barang sumber tidak ditemukan.');
    const transferQty = validateBaseQuantity(source, qty, 'Jumlah transfer');
    if (transferQty <= 0) throw new Error('Jumlah transfer harus lebih dari 0.');
    if (Number(source.stock || 0) < transferQty) throw new Error('Stok sumber tidak cukup.');
    let destination = next.products.find(item => item.sku === source.sku && item.branchId === destinationBranchId);
    if (!destination) {
      destination = { ...clone(source), id: generateId('PRD'), branchId: destinationBranchId, stock: 0 };
      next.products.push(destination);
    }
    source.stock = quantity(Number(source.stock || 0) - transferQty); destination.stock = quantity(Number(destination.stock || 0) + transferQty);
    const transfer = { id: generateId('TRF'), sourceBranchId: source.branchId, destinationBranchId, productId: source.id, productName: source.name, qty: transferQty, notes: notes || '', status: 'RECEIVED', createdAt: nowISO(), userId: currentUser.id };
    next.stockTransfers.unshift(transfer);
    next.stockMovements.unshift({ id: generateId('MOV'), branchId: source.branchId, productId: source.id, productName: source.name, type: 'TRANSFER_OUT', qtyChange: -transferQty, refId: transfer.id, note: destinationBranchId, createdAt: transfer.createdAt, userId: currentUser.id });
    next.stockMovements.unshift({ id: generateId('MOV'), branchId: destinationBranchId, productId: destination.id, productName: destination.name, type: 'TRANSFER_IN', qtyChange: transferQty, refId: transfer.id, note: source.branchId, createdAt: transfer.createdAt, userId: currentUser.id });
    return transfer;
  });

  const saveOnlineOrder = data => commit(data.id ? 'ORDER_UPDATE' : 'ORDER_CREATE', data.channel, next => {
    const channel = String(data.channel || '').trim();
    if (!channel) throw new Error('Sumber/channel pesanan wajib diisi.');
    const targetBranchId = data.branchId || branchId;
    const items = (data.items || []).map(line => {
      const product = next.products.find(row => row.id === line.productId && row.branchId === targetBranchId);
      if (!product) throw new Error(`Produk ${line.name || line.productId} tidak ditemukan di cabang pesanan.`);
      const qty = quantity(line.qty);
      const unit = line.unit || product.baseUnit;
      const factor = quantity(line.factor || conversionFactor(product, unit));
      const baseQty = validateBaseQuantity(product, line.baseQty ?? qty * factor, `Jumlah ${product.name}`);
      const quantityStep = unit === product.baseUnit ? normalizeQuantityStep(product.quantityStep, product.allowFractional === true) : 1;
      if (qty <= 0 || factor <= 0 || !isStepAligned(qty, quantityStep)) throw new Error(`Jumlah ${product.name} harus mengikuti kelipatan ${formatQuantity(quantityStep)} ${unit}.`);
      const price = money(line.price);
      return { ...line, productId: product.id, name: product.name, qty, unit, factor, baseQty, baseUnit: product.baseUnit, quantityStep, allowFractional: quantityStep < 1, price, netUnitPrice: money(line.netUnitPrice ?? price), itemDiscount: 0 };
    });
    if (!data.id && !items.length) throw new Error('Tambahkan minimal satu barang ke pesanan.');
    const total = money(items.reduce((sum, line) => sum + line.qty * line.price, 0));
    const item = { ...data, items, total, id: data.id || generateId('ORD'), branchId: targetBranchId, channel, createdAt: data.createdAt || nowISO(), status: data.status || 'NEW' };
    const index = next.onlineOrders.findIndex(row => row.id === item.id);
    if (index >= 0) next.onlineOrders[index] = item; else next.onlineOrders.unshift(item);
    return item;
  });

  const convertOrderToBill = id => commit('ORDER_TO_BILL', id, next => {
    const order = next.onlineOrders.find(item => item.id === id);
    if (!order) throw new Error('Pesanan tidak ditemukan.');
    const bill = { id: generateId('BILL'), branchId: order.branchId, name: `${order.channel} ${order.id}`, customerId: order.customerId, customerName: order.customerName, items: order.items, saleType: order.saleType || 'retail', note: order.notes || '', createdAt: nowISO(), updatedAt: nowISO(), sourceOrderId: order.id };
    next.heldSales.unshift(bill); order.status = 'IN_POS';
    return bill;
  });


  const saveBranchPaymentProfile = data => commit('BRANCH_PAYMENT_UPDATE', String(data.branchId || branchId), next => {
    const targetBranchId = String(data.branchId || branchId || '').trim();
    if (!targetBranchId) throw new Error('Cabang profil pembayaran wajib dipilih.');
    if (currentUserRef.current?.role === 'manager' && targetBranchId !== currentUserRef.current.branchId) {
      throw new Error('Store Manager hanya dapat mengubah QRIS cabangnya sendiri.');
    }
    if (!next.branches.some(item => item.id === targetBranchId && item.active !== false)) throw new Error('Cabang tidak ditemukan atau sudah nonaktif.');
    const item = {
      id: targetBranchId,
      branchId: targetBranchId,
      merchantName: String(data.merchantName || next.configs.companyName || 'BUMI MAKMUR').trim(),
      qrisImage: String(data.qrisImage || ''),
      qrisInstruction: String(data.qrisInstruction || 'Scan QR lalu tunjukkan bukti pembayaran kepada kasir.').trim(),
      qrisAssetMeta: data.qrisAssetMeta || null,
      enabled: data.enabled !== false,
      updatedAt: nowISO(),
      updatedBy: currentUserRef.current.id
    };
    if (item.qrisImage && !item.qrisImage.startsWith('data:image/')) throw new Error('Data QRIS tidak valid. Unggah ulang gambar QRIS.');
    if (item.qrisImage && (item.qrisImage.length > 590_000 || dataUrlByteLength(item.qrisImage) > 420_000)) {
      throw new Error('QRIS lama masih terlalu besar untuk Firestore. Tekan Ganti QRIS agar sistem mengoptimalkannya sebelum disimpan.');
    }
    const index = next.branchPaymentProfiles.findIndex(row => row.branchId === targetBranchId || row.id === targetBranchId);
    if (index >= 0) next.branchPaymentProfiles[index] = item;
    else next.branchPaymentProfiles.unshift(item);
    return item;
  });

  const savePrinterProfile = data => {
    if (!can(currentUserRef.current, 'devices.manage')) throw new Error('Anda tidak memiliki izin mengubah profil printer.');
    return commit(data.id ? 'PRINTER_UPDATE' : 'PRINTER_CREATE', data.name, next => {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Nama profil printer wajib diisi.');
    const item = { ...data, id: data.id || generateId('PRN'), name, active: data.active !== false };
    if (item.active) next.printerProfiles.forEach(profile => { profile.active = false; });
    const index = next.printerProfiles.findIndex(row => row.id === item.id);
    if (index >= 0) next.printerProfiles[index] = item; else next.printerProfiles.unshift(item);
    return item;
    });
  };

  const saveCampaign = data => {
    if (!can(currentUserRef.current, 'display.manage')) throw new Error('Anda tidak memiliki izin mengubah kampanye layar pelanggan.');
    return commit(data.id ? 'CAMPAIGN_UPDATE' : 'CAMPAIGN_CREATE', data.title, next => {
    const title = String(data.title || '').trim();
    if (!title) throw new Error('Judul kampanye wajib diisi.');
    const item = { ...data, id: data.id || generateId('CMP'), title, active: data.active !== false };
    const index = next.campaigns.findIndex(row => row.id === item.id);
    if (index >= 0) next.campaigns[index] = item; else next.campaigns.unshift(item);
    return item;
    });
  };

  const saveFeedback = data => commit('FEEDBACK_CREATE', String(data.rating), next => {
    const rating = Number(data.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error('Rating harus antara 1 sampai 5.');
    const item = { ...data, id: generateId('FDB'), branchId: branchId, rating, createdAt: nowISO() };
    next.feedback.unshift(item);
    return item;
  });

  const redeemPoints = ({ customerId, points }) => commit('LOYALTY_REDEEM', `${customerId}:${points}`, next => {
    const safePoints = money(points);
    if (safePoints <= 0) throw new Error('Jumlah poin yang ditukar harus lebih dari 0.');
    const customer = next.customers.find(item => item.id === customerId);
    if (!customer || money(customer.points) < safePoints) throw new Error('Poin tidak cukup.');
    customer.points -= safePoints;
    return { id: customer.id, discount: safePoints * money(next.configs.pointValue) };
  });

  const exportBackup = () => {
    const snapshot = { ...db, meta: { ...db.meta, exportedAt: nowISO(), version: APP_VERSION, exportedBy: currentUserRef.current?.id || '', deviceId: deviceSettings.deviceId || '' } };
    downloadFile(`Bumi-Makmur-POS-backup-${localDateKey()}.json`, JSON.stringify(snapshot, null, 2));
    const next = { ...dbRef.current, meta: { ...dbRef.current.meta, lastBackupAt: nowISO() } };
    dbRef.current = next;
    setDb(next);
    void saveLocalSnapshot(next, currentUserRef.current);
  };

  const inspectBackup = async file => {
    if (!file) throw new Error('Pilih file backup terlebih dahulu.');
    let parsed;
    try { parsed = JSON.parse(await file.text()); }
    catch { throw new Error('File backup bukan JSON yang valid.'); }
    return { parsed, report: validateBackupPayload(parsed) };
  };

  const importBackup = async file => {
    if (currentUser?.role !== 'owner') throw new Error('Hanya Owner yang boleh memulihkan backup cloud.');
    if (!navigator.onLine) throw new Error('Restore database memerlukan koneksi internet.');
    if (getOfflineQueueStats(storeCode).count > 0) throw new Error('Sinkronkan seluruh pembaruan offline sebelum melakukan restore.');
    const text = await file.text();
    const parsed = JSON.parse(text);
    const validation = validateBackupPayload(parsed);
    if (!validation.valid) throw new Error(`File backup tidak valid: ${validation.errors.join(' ')}`);
    const restored = normalizeDbShape({
      ...parsed,
      meta: { ...parsed.meta, version: APP_VERSION, restoredAt: nowISO(), updatedAt: nowISO() }
    }, seedRef.current, APP_VERSION);
    setCloudSaving(true);
    try {
      await replaceCloudDb(dbRef.current, restored, currentUser.storeId || STORE_ID);
      dbRef.current = restored;
      setDb(restored);
      setLocalReady(true);
      setCloudReady(true);
      await saveCachedDb(storeCode, restored, currentUser);
    } finally {
      setCloudSaving(false);
    }
  };

  const syncNow = async () => {
    if (!currentUser) throw new Error('Sesi pengguna belum aktif.');
    if (!navigator.onLine) throw new Error(`Perangkat sedang offline. ${getOfflineQueueStats(storeCode).count} pembaruan tetap aman di perangkat.`);
    const result = await flushPendingMutations(currentUser);
    await startCloudSubscription(currentUser, { initial: false, force: true });
    return { id: 'HYBRID_SYNC', count: result.synced || 0, pending: result.pending || 0, conflicts: result.conflicts || 0 };
  };

  const resetDemo = async () => {
    if (currentUser?.role !== 'owner') throw new Error('Hanya Owner yang boleh mereset database.');
    if (!navigator.onLine) throw new Error('Reset database memerlukan koneksi internet.');
    if (getOfflineQueueStats(storeCode).count > 0) throw new Error('Sinkronkan seluruh pembaruan offline sebelum reset database.');
    const seed = createSeedDb();
    seed.users = db.users;
    seed.branches = db.branches.length ? db.branches : seed.branches;
    seed.shifts = [];
    seed.cashMovements = [];
    seed.auditLogs = [];
    seed.configs = { ...seed.configs, companyName: db.configs.companyName, activeBranchId: db.configs.activeBranchId || MAIN_BRANCH_ID };
    await replaceCloudDb(dbRef.current, seed, currentUser.storeId || STORE_ID);
    dbRef.current = seed;
    setDb(seed);
    setLocalReady(true);
    setCloudReady(true);
    await saveCachedDb(storeCode, seed, currentUser);
  };

  const scoped = useMemo(() => ({
    products: sortProductsByName(db.products.filter(item => item.branchId === branchId)),
    promotions: (db.promotions || []).filter(item => item.branchId === branchId),
    suppliers: db.suppliers.filter(item => item.branchId === branchId),
    customers: db.customers.filter(item => item.branchId === branchId),
    sales: db.sales.filter(item => item.branchId === branchId),
    heldSales: db.heldSales.filter(item => item.branchId === branchId),
    purchases: db.purchases.filter(item => item.branchId === branchId),
    purchaseOrders: (db.purchaseOrders || []).filter(item => item.branchId === branchId),
    movements: db.stockMovements.filter(item => item.branchId === branchId),
    adjustments: db.stockAdjustments.filter(item => item.branchId === branchId),
    opnames: db.stockOpnames.filter(item => item.branchId === branchId),
    transfers: db.stockTransfers.filter(item => item.sourceBranchId === branchId || item.destinationBranchId === branchId),
    expenses: db.expenses.filter(item => item.branchId === branchId),
    receivables: db.receivables.filter(item => item.branchId === branchId),
    payables: db.payables.filter(item => item.branchId === branchId),
    refunds: db.refunds.filter(item => item.branchId === branchId),
    shifts: db.shifts.filter(item => item.branchId === branchId),
    cashMovements: db.cashMovements.filter(item => item.branchId === branchId),
    orders: db.onlineOrders.filter(item => item.branchId === branchId),
    feedback: db.feedback.filter(item => item.branchId === branchId),
    paymentProfile: (db.branchPaymentProfiles || []).find(item => item.branchId === branchId) || null,
    priceHistory: (db.productPriceHistory || []).filter(item => item.branchId === branchId),
    approvalRequests: (db.approvalRequests || []).filter(item => item.branchId === branchId)
  }), [db, branchId]);

  const queueSummary = useMemo(() => summarizePendingMutations(readPendingMutations(storeCode)), [pendingSyncCount, storeCode]);
  const authMatched = !currentUser || !firebaseConfigured || Boolean(auth?.currentUser && auth.currentUser.uid === currentUser.id);
  const syncStatus = useMemo(() => buildSyncStatus({
    online, cloudReady, cloudSaving, pendingCount: pendingSyncCount, cloudError,
    authMatched, lastSuccessAt: lastSyncSuccessAt, lastAttemptAt: lastSyncAttemptAt
  }), [online, cloudReady, cloudSaving, pendingSyncCount, cloudError, authMatched, lastSyncSuccessAt, lastSyncAttemptAt]);
  const clearSyncDiagnostics = () => {
    setSyncDiagnostics([]);
    localStorage.removeItem(SYNC_DIAGNOSTICS_KEY);
  };
  const exportSyncDiagnostics = () => {
    const payload = buildSyncDiagnosticsExport({
      status: syncStatus, queue: queueSummary, diagnostics: syncDiagnostics,
      profile: currentUserRef.current, deviceId: deviceSettings.deviceId, appVersion: APP_VERSION
    });
    downloadFile(`Bumi-Makmur-POS-diagnostik-${localDateKey()}.json`, JSON.stringify(payload, null, 2));
    return payload;
  };

  const value = {
    db, scoped, currentUser, online, cloudConfigured, localReady, dataReady: localReady || cloudReady,
    cloudReady, cloudLoading, initializingApp, cloudSaving, cloudError, clearCloudError, pendingSyncCount, syncConflictCount, lastSyncAttemptAt, lastSyncSuccessAt, syncStatus, syncDiagnostics, queueSummary, clearSyncDiagnostics, exportSyncDiagnostics,
    branchId, branch, customerDisplay, setCustomerDisplay,
    deviceSettings, updateDeviceSettings, login, loginEmployee, connectAccount, loginWithBiometric, logout, signOutAccount, bootstrapStore,
    loginDirectory, loginDirectoryLoading, refreshLoginDirectory,
    loginEmployeesByBranch, loginEmployeesLoading, refreshLoginEmployees,
    hasPermission, setConfig, saveStoreIdentity, saveLoginAppearance, setActiveBranch, addBranch, updateBranch, deleteBranch, restoreBranch, saveCategory, deleteCategory, importInventoryRows, saveProduct, archiveProduct, restoreProduct, deleteProduct, zeroProductStock, toggleProduct,
    savePromotion, saveSupplier, saveCustomer, saveEmployee, deleteEmployee, findOpenShift, startShift, endShift, addCashMovement,
    holdSale, deleteHeldSale, completeSale, refundSale, authorizeManagerPin,
    savePurchase, returnPurchase, payReceivable, payPayable, addExpense, adjustStock, stockOpname, transferStock,
    saveOnlineOrder, convertOrderToBill, saveBranchPaymentProfile, savePrinterProfile, saveCampaign, saveFeedback, redeemPoints,
    exportBackup, inspectBackup, importBackup, syncNow, resetDemo
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) throw new Error('usePos harus dipakai di dalam PosProvider.');
  return context;
};
