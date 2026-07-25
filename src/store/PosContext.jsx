import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { APP_VERSION, MAIN_BRANCH_ID, can, createSeedDb } from '../data/defaults.js';
import { generateId, safeJSONParse, downloadFile, localDateKey } from '../utils/helpers.js';
import { firebaseConfigured, DEFAULT_STORE_CODE, STORE_ID } from '../services/firebase.js';
import { createEmployeeAccount, getCloudSessionProfile, loginWithEmailPassword, signOutCloudAccount, updateEmployeeProfile } from '../services/cloudAuth.js';
import {
  applyOperationsToDb,
  buildDiffOperations,
  loadCloudDb,
  persistOperations,
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
  removePendingMutation,
  replacePendingMutation,
  saveCachedDb,
  verifyOfflinePin
} from '../services/offlineStore.js';

const PosContext = createContext(null);
const DEVICE_SETTINGS_KEY = 'bm_pos_device_security_v1';
const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const nowISO = () => new Date().toISOString();
const money = value => Math.max(0, Math.round(Number(value) || 0));
const quantity = value => Math.max(0, Math.round((Number(value) || 0) * 1000) / 1000);
const isConflictError = error => String(error?.code || '').includes('aborted') || /telah berubah|menggabungkan pembaruan/i.test(String(error?.message || ''));

const ACTION_PERMISSIONS = {
  SETTING_UPDATE: 'settings.manage', BRANCH_CREATE: 'branches.manage',
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

export function PosProvider({ children }) {
  const seedRef = useRef(createSeedDb());
  const [db, setDb] = useState(() => ({ ...seedRef.current, users: [], branches: [], products: [], suppliers: [], customers: [], promotions: [], sales: [], heldSales: [], purchases: [], stockMovements: [], stockAdjustments: [], stockOpnames: [], stockTransfers: [], expenses: [], receivables: [], payables: [], refunds: [], shifts: [], cashMovements: [], onlineOrders: [], printerProfiles: [], campaigns: [], feedback: [], auditLogs: [] }));
  const dbRef = useRef(db);
  const [currentUser, setCurrentUser] = useState(null);
  const currentUserRef = useRef(null);
  const [localReady, setLocalReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [cloudConfigured] = useState(firebaseConfigured);
  const [deviceSettings, setDeviceSettingsState] = useState(() => {
    const saved = safeJSONParse(localStorage.getItem(DEVICE_SETTINGS_KEY), {});
    return {
      biometricEnabled: false,
      biometricUserId: '',
      biometricAutoPrompt: true,
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
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [customerDisplay, setCustomerDisplay] = useState({ cart: [], total: 0, customerName: 'Umum', message: '' });
  const cloudUnsubscribeRef = useRef(null);
  const writeChainRef = useRef(Promise.resolve());

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
    localStorage.setItem(DEVICE_SETTINGS_KEY, JSON.stringify(deviceSettings));
    setPendingSyncCount(getOfflineQueueStats(deviceSettings.storeCode || DEFAULT_STORE_CODE).count);
  }, [deviceSettings]);

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

  const hydrateLocal = useCallback(async profile => {
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    await recoverPendingMutations(key);
    const cached = await loadCachedDb(key);
    if (!cached?.db) return false;
    let localDb = clone(cached.db);
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

  const flushPendingMutations = useCallback(profile => {
    const run = async () => {
      if (!profile || !navigator.onLine || !firebaseConfigured) return { synced: 0, pending: getOfflineQueueStats(storeCode).count };
      const queue = readPendingMutations(storeCode);
      if (!queue.length) return { synced: 0, pending: 0, conflicts: 0 };
      setCloudSaving(true);
      setLastSyncAttemptAt(nowISO());
      let synced = 0;
      let conflicts = 0;
      try {
        for (const queued of queue) {
          let mutation = clone(queued);
          let completed = false;
          for (let attempt = 0; attempt < 3 && !completed; attempt += 1) {
            try {
              await persistOperations(mutation.operations, profile.storeId || STORE_ID, {
                action: mutation.action,
                details: mutation.details,
                approvalToken: mutation.approvalToken || '',
                mutationId: mutation.id,
                offlineCreatedAt: mutation.createdAt,
                deviceId: deviceSettings.deviceId || '',
                userName: profile.name || '',
                userRole: profile.role || '',
                branchId: profile.branchId || ''
              });
              removePendingMutation(storeCode, mutation.id);
              synced += 1;
              completed = true;
            } catch (error) {
              if (!isConflictError(error) || attempt >= 2) throw error;
              const remoteDb = await loadCloudDb(seedRef.current, profile, profile.storeId || STORE_ID);
              const operations = rebaseOperationsAgainstRemote(mutation.operations, remoteDb);
              conflicts += 1;
              if (!operations.length) {
                removePendingMutation(storeCode, mutation.id);
                completed = true;
                synced += 1;
              } else {
                mutation = { ...mutation, operations, rebasedAt: nowISO(), rebaseCount: Number(mutation.rebaseCount || 0) + 1 };
                replacePendingMutation(storeCode, mutation);
              }
            }
          }
        }
        setSyncConflictCount(previous => previous + conflicts);
        setPendingSyncCount(getOfflineQueueStats(storeCode).count);
        setCloudError('');
        return { synced, pending: getOfflineQueueStats(storeCode).count, conflicts };
      } catch (error) {
        console.error('Sinkronisasi antrean offline gagal.', error);
        setPendingSyncCount(getOfflineQueueStats(storeCode).count);
        setCloudError(error?.message || 'Pembaruan lokal belum berhasil dikirim ke Firebase. Aplikasi tetap dapat digunakan.');
        throw error;
      } finally {
        setCloudSaving(false);
      }
    };
    writeChainRef.current = writeChainRef.current.then(run, run);
    return writeChainRef.current;
  }, [deviceSettings.deviceId, storeCode]);

  const overlayPendingOnRemote = useCallback(baseDb => {
    let merged = clone(baseDb);
    for (const mutation of readPendingMutations(storeCode)) {
      const rebased = rebaseOperationsAgainstRemote(mutation.operations, merged);
      merged = applyOperationsToDb(merged, rebased);
    }
    return merged;
  }, [storeCode]);

  const startCloudSubscription = useCallback(async profile => {
    if (!profile) return;
    const hasLocal = localReady || await hydrateLocal(profile);
    if (!navigator.onLine || !firebaseConfigured) {
      setCloudReady(false);
      setLocalReady(hasLocal);
      return;
    }
    setCloudLoading(!hasLocal);
    setCloudError('');
    cloudUnsubscribeRef.current?.();
    try {
      try {
        await flushPendingMutations(profile);
      } catch (syncError) {
        console.warn('Antrean belum seluruhnya tersinkron; realtime tetap dilanjutkan.', syncError);
      }
      let loaded = await loadCloudDb(seedRef.current, profile, profile.storeId || STORE_ID);
      if (profile.role === 'owner' && loaded.meta?.cloudInitialized !== true) {
        const initial = clone(seedRef.current);
        initial.users = loaded.users?.length ? loaded.users : [profile];
        initial.branches = loaded.branches?.length ? loaded.branches : initial.branches;
        initial.configs = {
          ...initial.configs,
          activeBranchId: profile.branchId || initial.branches[0]?.id || MAIN_BRANCH_ID
        };
        await seedCloudDb(initial, profile.storeId || STORE_ID, {
          userName: profile.name,
          userRole: profile.role,
          branchId: profile.branchId || MAIN_BRANCH_ID,
          deviceId: deviceSettings.deviceId || '',
          baseDb: loaded
        });
        loaded = await loadCloudDb(seedRef.current, profile, profile.storeId || STORE_ID);
      }
      const localView = overlayPendingOnRemote(loaded);
      dbRef.current = localView;
      setDb(localView);
      setLocalReady(true);
      setCloudReady(true);
      await saveCachedDb(storeCode, localView, profile);
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
          setPendingSyncCount(getOfflineQueueStats(storeCode).count);
          void saveCachedDb(storeCode, merged, profile).catch(error => console.warn('Snapshot realtime gagal disimpan lokal.', error));
        },
        error => {
          console.error('Realtime Firestore gagal.', error);
          setCloudError(error?.message || 'Realtime cloud terputus; data lokal tetap aktif.');
          setCloudReady(false);
          setCloudLoading(false);
        },
        profile.storeId || STORE_ID
      );
    } catch (error) {
      console.error('Cloud load/sync failed.', error);
      setCloudError(error?.message || 'Cloud belum dapat dijangkau; aplikasi memakai data lokal.');
      setCloudReady(false);
      if (!hasLocal) setLocalReady(false);
    } finally {
      setCloudLoading(false);
    }
  }, [flushPendingMutations, hydrateLocal, localReady, overlayPendingOnRemote, storeCode]);

  useEffect(() => {
    if (currentUser) void startCloudSubscription(currentUser);
  }, [currentUser, online, startCloudSubscription]);

  useEffect(() => {
    if (!currentUser || !online || !firebaseConfigured) return undefined;
    const retrySync = () => {
      if (document.visibilityState === 'hidden') return;
      void flushPendingMutations(currentUser)
        .then(() => {
          if (!cloudReady) return startCloudSubscription(currentUser);
          return null;
        })
        .catch(error => console.warn('Retry sinkronisasi otomatis belum berhasil.', error));
    };
    const onVisible = () => { if (document.visibilityState === 'visible') retrySync(); };
    const timer = window.setInterval(retrySync, 30000);
    window.addEventListener('focus', retrySync);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', retrySync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUser, online, cloudReady, flushPendingMutations, startCloudSubscription]);

  const branchId = (
    currentUser?.role === 'owner'
      ? deviceSettings.activeBranchId
      : currentUser?.branchId
  ) || db.configs.activeBranchId || MAIN_BRANCH_ID;
  const branch = db.branches.find(item => item.id === branchId) || db.branches[0];

  useEffect(() => {
    if (!currentUser || !db.branches.length) return;
    const allowedBranchId = currentUser.role === 'owner'
      ? (db.branches.some(item => item.id === branchId) ? branchId : db.branches[0].id)
      : currentUser.branchId;
    if (allowedBranchId && deviceSettings.activeBranchId !== allowedBranchId) {
      setDeviceSettingsState(previous => ({ ...previous, activeBranchId: allowedBranchId }));
    }
  }, [currentUser, db.branches, branchId, deviceSettings.activeBranchId]);

  const commit = useCallback((action, details, mutator, options = {}) => {
    if (!currentUserRef.current) throw new Error('Sesi pengguna belum aktif.');
    const requiredPermission = ACTION_PERMISSIONS[action];
    if (!requiredPermission || !can(currentUserRef.current, requiredPermission)) {
      throw new Error(`Hak akses ${requiredPermission || action} tidak tersedia untuk akun ini.`);
    }
    const before = clone(dbRef.current);
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

  const login = useCallback(async pin => {
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    const profile = await verifyOfflinePin(key, pin).catch(() => null);
    if (!profile) {
      return {
        success: false,
        message: 'PIN belum terhubung pada perangkat ini. Gunakan Email & Password untuk login pertama atau ganti akun.'
      };
    }
    const hydrated = await hydrateLocal(profile);
    if (!hydrated && !navigator.onLine) {
      return {
        success: false,
        message: 'Data offline belum tersedia. Sambungkan internet dan login sekali dengan Email & Password.'
      };
    }
    let resolvedProfile = profile;
    if (navigator.onLine && firebaseConfigured) {
      try {
        const cloudProfile = await getCloudSessionProfile(STORE_ID);
        if (!cloudProfile || cloudProfile.id !== profile.id) {
          return {
            success: false,
            message: 'Sesi Firebase pada perangkat ini sudah berakhir. Login kembali memakai Email & Password agar sinkronisasi aktif.'
          };
        }
        resolvedProfile = cloudProfile;
      } catch (error) {
        console.warn('Profil cloud belum dapat diverifikasi; aplikasi tetap membuka cache lokal.', error);
        setCloudError('Firebase belum dapat dijangkau. Aplikasi dibuka dari cache lokal dan akan mencoba sinkron kembali.');
      }
    }
    setCurrentUser(resolvedProfile);
    return { success: true, user: resolvedProfile, mode: navigator.onLine ? 'pin-online' : 'pin-offline' };
  }, [deviceSettings.storeCode, hydrateLocal]);

  const loginWithEmail = useCallback(async ({ email, password, pin }) => {
    if (!navigator.onLine) throw new Error('Login pertama dengan Email & Password memerlukan internet.');
    if (!firebaseConfigured) throw new Error('Konfigurasi Firebase belum tersedia.');
    if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('Buat PIN perangkat 4 digit.');
    const profile = await loginWithEmailPassword(email, password, STORE_ID);
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    await cacheOfflineCredential(key, pin, profile);
    setDeviceSettingsState(previous => ({ ...previous, hasLinkedAccount: true, linkedEmail: String(email || '').trim().toLowerCase() }));
    await hydrateLocal(profile).catch(() => false);
    setCurrentUser(profile);
    setCloudError('');
    return { success: true, user: profile, mode: 'email-password' };
  }, [deviceSettings.storeCode, hydrateLocal]);

  const loginWithBiometric = useCallback(async userId => {
    const key = deviceSettings.storeCode || DEFAULT_STORE_CODE;
    let profile = await getCachedOfflineProfile(key, userId);
    if (navigator.onLine && firebaseConfigured) {
      try {
        const cloudProfile = await getCloudSessionProfile(STORE_ID);
        if (cloudProfile && cloudProfile.id === userId) profile = cloudProfile;
      } catch (error) {
        console.warn('Sesi Firebase biometrik belum dapat diperbarui; memakai profil lokal.', error);
      }
    }
    if (!profile) return { success: false, message: 'Sesi biometrik belum tersedia. Login sekali dengan Email & Password dan PIN.' };
    const hydrated = await hydrateLocal(profile);
    if (!hydrated && !navigator.onLine) return { success: false, message: 'Data offline belum tersedia pada perangkat ini.' };
    if (navigator.onLine && firebaseConfigured) {
      try {
        const cloudProfile = await getCloudSessionProfile(STORE_ID);
        if (!cloudProfile || cloudProfile.id !== profile.id) {
          return { success: false, message: 'Sesi Firebase sudah berakhir. Login kembali dengan Email & Password sebelum memakai biometrik.' };
        }
        profile = cloudProfile;
      } catch (error) {
        console.warn('Verifikasi sesi biometrik ke Firebase gagal; memakai profil cache lokal.', error);
        setCloudError('Firebase belum dapat dijangkau. Mode cache lokal aktif.');
      }
    }
    setCurrentUser(profile);
    return { success: true, user: profile, mode: navigator.onLine ? 'biometric-online' : 'biometric-offline' };
  }, [deviceSettings.storeCode, hydrateLocal]);

  const updateDeviceSettings = useCallback(patch => {
    setDeviceSettingsState(previous => ({ ...previous, ...patch }));
  }, []);

  const logout = () => {
    cloudUnsubscribeRef.current?.();
    cloudUnsubscribeRef.current = null;
    setCurrentUser(null);
    setCloudReady(false);
  };

  const signOutAccount = async () => {
    const pending = getOfflineQueueStats(storeCode).count;
    if (pending > 0) throw new Error(`Masih ada ${pending} pembaruan offline yang belum tersinkron. Sambungkan internet sebelum keluar penuh.`);
    logout();
    await Promise.all([signOutCloudAccount(), clearOfflineIdentity(storeCode)]);
    setDeviceSettingsState(previous => ({ ...previous, hasLinkedAccount: false, linkedEmail: '', biometricEnabled: false, biometricUserId: '' }));
  };

  const hasPermission = permission => can(currentUser, permission);

  const setConfig = (patch) => {
    if (!can(currentUserRef.current, 'settings.manage')) throw new Error('Anda tidak memiliki izin mengubah pengaturan toko.');
    return commit('SETTING_UPDATE', Object.keys(patch).join(', '), next => {
    next.configs = { ...next.configs, ...patch };
    return next.configs;
    });
  };

  const setActiveBranch = id => {
    if (currentUser?.role !== 'owner') return;
    if (!db.branches.some(item => item.id === id)) return;
    setDeviceSettingsState(previous => ({ ...previous, activeBranchId: id }));
  };

  const addBranch = data => commit('BRANCH_CREATE', data.name, next => {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Nama cabang wajib diisi.');
    if (next.branches.some(item => item.active !== false && String(item.name || '').trim().toLowerCase() === name.toLowerCase())) throw new Error(`Cabang ${name} sudah terdaftar.`);
    const item = { id: generateId('BR'), name, address: String(data.address || '').trim(), phone: String(data.phone || '').trim(), status: 'Online', active: true };
    next.branches.push(item);
    const general = { id: generateId('CUS'), branchId: item.id, name: 'Umum (Non-Member)', phone: '-', email: '', type: 'Reguler', priceTier: 'retail', creditLimit: 0, points: 0, address: '', project: '', notes: '', active: true };
    next.customers.push(general);
    return item;
  });

  const saveProduct = data => commit(data.id ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', data.name, next => {
    const productName = String(data.name || '').trim();
    if (!productName) throw new Error('Nama produk wajib diisi.');
    const existing = next.products.find(product => product.id === data.id);
    const targetBranchId = data.branchId || branchId;
    const sku = String(data.sku || generateId('SKU')).trim();
    const barcode = String(data.barcode || '').trim();
    const duplicateSku = next.products.find(product => product.id !== data.id && product.branchId === targetBranchId && product.active !== false && String(product.sku || '').toLowerCase() === sku.toLowerCase());
    if (duplicateSku) throw new Error(`SKU ${sku} sudah dipakai oleh produk ${duplicateSku.name}.`);
    if (barcode) {
      const duplicateBarcode = next.products.find(product => product.id !== data.id && product.branchId === targetBranchId && product.active !== false && String(product.barcode || '') === barcode);
      if (duplicateBarcode) throw new Error(`Barcode ${barcode} sudah dipakai oleh produk ${duplicateBarcode.name}.`);
    }
    const item = {
      id: data.id || generateId('PRD'), branchId: targetBranchId,
      name: productName, category: data.category || 'Lainnya', sku,
      barcode, baseUnit: data.baseUnit || 'pcs', stock: existing?.stock ?? quantity(data.stock),
      minStock: quantity(data.minStock || 0), rack: data.rack || '-', modalPrice: money(data.modalPrice),
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
      variants: data.variants || [], conversions: data.conversions || [], bundleItems: data.bundleItems || [],
      favorite: Boolean(data.favorite), available: data.available !== false, active: data.active !== false,
      trackStock: data.trackStock !== false, updatedAt: nowISO()
    };
    if (existing) next.products = next.products.map(product => product.id === item.id ? item : product);
    else next.products.unshift(item);
    return item;
  });

  const archiveProduct = id => commit('PRODUCT_ARCHIVE', id, next => {
    const item = next.products.find(product => product.id === id);
    if (item) item.active = false;
    return item;
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
    if (!currentUser || currentUser.role !== 'owner') throw new Error('Hanya Owner yang boleh mengelola akun karyawan.');
    if (!navigator.onLine) throw new Error('Pembuatan atau perubahan akun karyawan memerlukan internet.');
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Nama karyawan wajib diisi.');
    if (data.id === currentUser.id && (data.role !== 'owner' || data.active === false)) {
      throw new Error('Akun Owner yang sedang digunakan tidak dapat diturunkan role atau dinonaktifkan.');
    }
    if (!data.id && !['manager', 'kasir'].includes(data.role)) {
      throw new Error('Akun baru hanya dapat dibuat sebagai Manager atau Kasir.');
    }
    const payload = {
      ...data,
      name,
      branchId: data.branchId || branchId,
      storeId: currentUser.storeId || STORE_ID,
      permissions: Array.isArray(data.permissions) ? data.permissions : []
    };
    const profile = data.id
      ? await updateEmployeeProfile(payload, currentUser.storeId || STORE_ID)
      : await createEmployeeAccount(payload, currentUser.storeId || STORE_ID);

    if (/^\d{4}$/.test(String(data.pin || ''))) {
      await cacheOfflineCredential(storeCode, String(data.pin), profile);
    }

    setDb(previous => {
      const exists = previous.users.some(user => user.id === profile.id);
      const users = exists
        ? previous.users.map(user => user.id === profile.id ? profile : user)
        : [profile, ...previous.users];
      const next = { ...previous, users };
      dbRef.current = next;
      void saveLocalSnapshot(next, currentUser);
      return next;
    });
    return profile;
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

  const resolveProductStockRows = (next, cartItem) => {
    const product = next.products.find(row => row.id === cartItem.productId && row.branchId === branchId);
    if (!product && String(cartItem.productId || '').startsWith('CUSTOM-')) return [];
    if (!product) throw new Error(`Produk ${cartItem.name} tidak ditemukan.`);
    if (product.bundleItems?.length) {
      return product.bundleItems.map(component => {
        const componentProduct = next.products.find(row => row.id === component.productId && row.branchId === branchId);
        if (!componentProduct) throw new Error(`Komponen paket ${component.productId} tidak ditemukan.`);
        return { product: componentProduct, qty: component.qty * cartItem.qty, sourceName: product.name };
      });
    }
    return [{ product, qty: cartItem.baseQty ?? cartItem.qty, sourceName: product.name }];
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
    const activePromo = (payload.appliedPromos || []).map(item => next.promotions.find(promo => promo.id === item.id && promo.active !== false)).find(Boolean);
    let safePromoDiscount = 0;
    if (activePromo) {
      const today = localDateKey();
      const validDate = (!activePromo.startDate || activePromo.startDate <= today) && (!activePromo.endDate || activePromo.endDate >= today);
      const eligibleBase = activePromo.productId
        ? normalizedItems.filter(item => item.productId === activePromo.productId).reduce((sum, item) => sum + item.price * item.qty - item.itemDiscount, 0)
        : activePromo.category
          ? normalizedItems.filter(item => item.category === activePromo.category).reduce((sum, item) => sum + item.price * item.qty - item.itemDiscount, 0)
          : recalculatedSubtotal;
      if (validDate && recalculatedSubtotal >= money(activePromo.minPurchase)) {
        safePromoDiscount = activePromo.type === 'percent' ? Math.round(eligibleBase * Math.max(0, Number(activePromo.value || 0)) / 100) : money(activePromo.value);
        if (money(activePromo.maxDiscount) > 0) safePromoDiscount = Math.min(safePromoDiscount, money(activePromo.maxDiscount));
      }
    }
    safePromoDiscount = Math.min(Math.max(0, recalculatedSubtotal - safeGlobalDiscount), safePromoDiscount);
    const safePointsRedeemed = money(payload.pointsRedeemed);
    const safeLoyaltyDiscount = Math.min(
      Math.max(0, recalculatedSubtotal - safeGlobalDiscount - safePromoDiscount),
      safePointsRedeemed * money(next.configs.pointValue)
    );
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
      if (row.product.trackStock !== false && row.product.stock < row.qty) throw new Error(`Stok ${row.product.name} tidak cukup. Tersedia ${row.product.stock}, dibutuhkan ${row.qty}.`);
    }
    const saleId = payload.id || generateId('INV');
    for (const row of stockRows) {
      if (row.product.trackStock !== false) row.product.stock -= row.qty;
      next.stockMovements.unshift({
        id: generateId('MOV'), branchId: branchId, productId: row.product.id, productName: row.product.name,
        type: 'SALE', qtyChange: -row.qty, refId: saleId, note: [...row.sourceNames].join(', '), createdAt: nowISO(), userId: currentUser.id
      });
    }
    const sale = {
      ...payload, items: normalizedItems, id: saleId, branchId: branchId, createdAt: nowISO(), status: 'COMPLETED',
      globalDiscount: safeGlobalDiscount, promoDiscount: safePromoDiscount, loyaltyDiscount: safeLoyaltyDiscount,
      subtotal: recalculatedSubtotal, tax: safeTax, service: safeService, rounding: recalculatedTotal - rawTotal,
      total: recalculatedTotal, change: overpayment, pointsRedeemed: safePointsRedeemed,
      refundedTotal: 0, syncStatus: navigator.onLine ? 'QUEUED' : 'OFFLINE_QUEUED', createdBy: currentUser.id
    };
    next.sales.unshift(sale);
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
    if (!profile || profile.active === false || !['owner', 'manager'].includes(profile.role)) {
      return null;
    }
    return {
      success: true,
      purpose,
      user: profile,
      approvalToken: `LOCAL-${profile.id}-${Date.now()}`
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
      if (Number(refundItem.qty || 0) <= 0 || Number(refundItem.qty) > remaining) throw new Error(`Jumlah refund ${original.name} melebihi sisa yang dapat direfund (${remaining}).`);
    }
    const itemNetTotal = sale.items.reduce((sum, item) => sum + money(item.netUnitPrice ?? item.price) * Number(item.qty || 0), 0);
    const saleAllocationRatio = itemNetTotal > 0 ? money(sale.total) / itemNetTotal : 0;
    const calculatedRefund = payload.items.reduce((sum, refundItem) => {
      const original = sale.items.find(item => item.lineId === refundItem.lineId || item.productId === refundItem.productId);
      if (!original) return sum;
      const base = money(original.netUnitPrice ?? original.price) * Number(refundItem.qty || 0);
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
          const rows = resolveProductStockRows(next, { ...original, qty: refundItem.qty, baseQty: (original.baseQty / original.qty) * refundItem.qty });
          for (const row of rows) {
            if (row.product.trackStock !== false) row.product.stock += row.qty;
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
      const qty = Number(item.qty);
      const price = money(item.price);
      const itemDiscount = money(item.discount);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Jumlah ${item.name || 'barang'} harus lebih dari 0.`);
      if (itemDiscount > qty * price) throw new Error(`Diskon ${item.name || 'barang'} melebihi subtotal item.`);
      return { ...item, qty, price, discount: itemDiscount };
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
        product.stock += Number(item.qty);
        product.modalPrice = money(item.price);
        next.stockMovements.unshift({ id: generateId('MOV'), branchId: purchase.branchId, productId: product.id, productName: product.name, type: 'PURCHASE', qtyChange: Number(item.qty), refId: purchase.id, note: purchase.invoiceNo, createdAt: nowISO(), userId: currentUser.id });
      }
      purchase.inventoryApplied = true;
      if (balance > 0) next.payables.unshift({ id: generateId('PAY'), branchId: purchase.branchId, purchaseId: purchase.id, supplierId: purchase.supplierId, supplierName: purchase.supplierName, total: balance, paid: 0, balance, dueDate: purchase.dueDate, status: 'OPEN', payments: [], createdAt: nowISO() });
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
    for (const item of payload.items) {
      const original = purchase.items.find(row => row.id === item.id || row.productId === item.productId);
      if (!original) throw new Error(`Item ${item.name || item.productId} tidak ditemukan pada pembelian.`);
      const alreadyReturned = (purchase.returns || []).reduce((sum, purchaseReturn) => sum + purchaseReturn.items.filter(row => row.id === original.id || row.productId === original.productId).reduce((itemSum, row) => itemSum + Number(row.qty || 0), 0), 0);
      const remaining = Math.max(0, Number(original.qty || 0) - alreadyReturned);
      if (Number(item.qty || 0) <= 0 || Number(item.qty) > remaining) throw new Error(`Jumlah retur ${original.name} melebihi sisa yang dapat diretur (${remaining}).`);
      const product = next.products.find(row => row.id === item.productId && row.branchId === purchase.branchId);
      const returnQty = quantity(item.qty);
      if (!product || product.stock < returnQty) throw new Error(`Stok ${item.name} tidak cukup untuk retur.`);
      product.stock -= returnQty;
      total += Math.round(returnQty * money(original.price) * purchaseAllocationRatio);
      next.stockMovements.unshift({ id: generateId('MOV'), branchId: purchase.branchId, productId: product.id, productName: product.name, type: 'PURCHASE_RETURN', qtyChange: -returnQty, refId: purchase.id, note: payload.reason, createdAt: nowISO(), userId: currentUser.id });
    }
    purchase.returns = [...(purchase.returns || []), { id: generateId('PRET'), items: payload.items, total, reason: payload.reason, createdAt: nowISO() }];
    const payable = next.payables.find(item => item.purchaseId === purchase.id && item.status === 'OPEN');
    if (payable) { payable.balance = Math.max(0, payable.balance - total); payable.total = Math.max(payable.paid, payable.total - total); if (payable.balance === 0) payable.status = 'PAID'; }
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
    const change = Number(data.qtyChange) || 0;
    if (change === 0) throw new Error('Perubahan stok tidak boleh 0.');
    if (product.stock + change < 0) throw new Error('Stok tidak boleh negatif.');
    product.stock += change;
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
      const actual = Number(count.actual);
      if (!Number.isFinite(actual) || actual < 0) throw new Error(`Stok fisik ${product.name} tidak valid.`);
      const difference = actual - product.stock;
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
    const transferQty = quantity(qty);
    if (transferQty <= 0) throw new Error('Jumlah transfer harus lebih dari 0.');
    if (!destinationBranchId || destinationBranchId === branchId) throw new Error('Pilih cabang tujuan yang berbeda.');
    const source = next.products.find(item => item.id === productId && item.branchId === branchId);
    if (!source || source.stock < transferQty) throw new Error('Stok sumber tidak cukup.');
    let destination = next.products.find(item => item.sku === source.sku && item.branchId === destinationBranchId);
    if (!destination) {
      destination = { ...clone(source), id: generateId('PRD'), branchId: destinationBranchId, stock: 0 };
      next.products.push(destination);
    }
    source.stock -= transferQty; destination.stock += transferQty;
    const transfer = { id: generateId('TRF'), sourceBranchId: source.branchId, destinationBranchId, productId: source.id, productName: source.name, qty: transferQty, notes: notes || '', status: 'RECEIVED', createdAt: nowISO(), userId: currentUser.id };
    next.stockTransfers.unshift(transfer);
    next.stockMovements.unshift({ id: generateId('MOV'), branchId: source.branchId, productId: source.id, productName: source.name, type: 'TRANSFER_OUT', qtyChange: -transferQty, refId: transfer.id, note: destinationBranchId, createdAt: transfer.createdAt, userId: currentUser.id });
    next.stockMovements.unshift({ id: generateId('MOV'), branchId: destinationBranchId, productId: destination.id, productName: destination.name, type: 'TRANSFER_IN', qtyChange: transferQty, refId: transfer.id, note: source.branchId, createdAt: transfer.createdAt, userId: currentUser.id });
    return transfer;
  });

  const saveOnlineOrder = data => commit(data.id ? 'ORDER_UPDATE' : 'ORDER_CREATE', data.channel, next => {
    const channel = String(data.channel || '').trim();
    if (!channel) throw new Error('Sumber/channel pesanan wajib diisi.');
    const item = { ...data, id: data.id || generateId('ORD'), branchId: data.branchId || branchId, channel, createdAt: data.createdAt || nowISO(), status: data.status || 'NEW' };
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
    const snapshot = { ...db, meta: { ...db.meta, exportedAt: nowISO(), version: APP_VERSION } };
    downloadFile(`Bumi-Makmur-POS-backup-${localDateKey()}.json`, JSON.stringify(snapshot, null, 2));
    const next = { ...dbRef.current, meta: { ...dbRef.current.meta, lastBackupAt: nowISO() } };
    dbRef.current = next;
    setDb(next);
    void saveLocalSnapshot(next, currentUserRef.current);
  };

  const importBackup = async file => {
    if (currentUser?.role !== 'owner') throw new Error('Hanya Owner yang boleh memulihkan backup cloud.');
    if (!navigator.onLine) throw new Error('Restore database memerlukan koneksi internet.');
    if (getOfflineQueueStats(storeCode).count > 0) throw new Error('Sinkronkan seluruh pembaruan offline sebelum melakukan restore.');
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed?.meta || !Array.isArray(parsed.products) || !Array.isArray(parsed.sales)) throw new Error('File backup tidak valid.');
    const restored = { ...parsed, meta: { ...parsed.meta, version: APP_VERSION, restoredAt: nowISO(), updatedAt: nowISO() } };
    setCloudSaving(true);
    try {
      await replaceCloudDb(dbRef.current, restored, currentUser.storeId || STORE_ID, { userName: currentUser.name, userRole: currentUser.role, branchId, deviceId: deviceSettings.deviceId || '' });
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
    await startCloudSubscription(currentUser);
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
    await replaceCloudDb(dbRef.current, seed, currentUser.storeId || STORE_ID, { action: 'CLOUD_RESET', userName: currentUser.name, userRole: currentUser.role, branchId, deviceId: deviceSettings.deviceId || '' });
    dbRef.current = seed;
    setDb(seed);
    setLocalReady(true);
    setCloudReady(true);
    await saveCachedDb(storeCode, seed, currentUser);
  };

  const scoped = useMemo(() => ({
    products: db.products.filter(item => item.branchId === branchId),
    promotions: (db.promotions || []).filter(item => item.branchId === branchId),
    suppliers: db.suppliers.filter(item => item.branchId === branchId),
    customers: db.customers.filter(item => item.branchId === branchId),
    sales: db.sales.filter(item => item.branchId === branchId),
    heldSales: db.heldSales.filter(item => item.branchId === branchId),
    purchases: db.purchases.filter(item => item.branchId === branchId),
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
    feedback: db.feedback.filter(item => item.branchId === branchId)
  }), [db, branchId]);

  const value = {
    db, scoped, currentUser, online, cloudConfigured, localReady, dataReady: localReady || cloudReady,
    cloudReady, cloudLoading, cloudSaving, cloudError, pendingSyncCount, syncConflictCount, lastSyncAttemptAt,
    branchId, branch, customerDisplay, setCustomerDisplay,
    deviceSettings, updateDeviceSettings, login, loginWithEmail, loginWithBiometric, logout, signOutAccount,
    hasPermission, setConfig, setActiveBranch, addBranch, saveProduct, archiveProduct, toggleProduct,
    savePromotion, saveSupplier, saveCustomer, saveEmployee, findOpenShift, startShift, endShift, addCashMovement,
    holdSale, deleteHeldSale, completeSale, refundSale, authorizeManagerPin,
    savePurchase, returnPurchase, payReceivable, payPayable, addExpense, adjustStock, stockOpname, transferStock,
    saveOnlineOrder, convertOrderToBill, savePrinterProfile, saveCampaign, saveFeedback, redeemPoints,
    exportBackup, importBackup, syncNow, resetDemo
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) throw new Error('usePos harus dipakai di dalam PosProvider.');
  return context;
};
