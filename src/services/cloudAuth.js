import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import {
  auth,
  authPersistenceReady,
  firebaseConfigured,
  functions,
  STORE_ID,
  DEFAULT_STORE_CODE
} from './firebase.js';

function requireFirebase() {
  if (!firebaseConfigured || !auth || !functions) {
    throw new Error('Firebase belum dikonfigurasi. Isi file .env terlebih dahulu.');
  }
}

function normalizeCode(value) {
  return String(value || DEFAULT_STORE_CODE).trim().toUpperCase().replace(/\s+/g, '');
}

export async function loginWithCloudPin(pin, storeCode = DEFAULT_STORE_CODE, device = {}) {
  requireFirebase();
  await authPersistenceReady;
  const callable = httpsCallable(functions, 'loginWithPin');
  const response = await callable({
    storeCode: normalizeCode(storeCode),
    pin: String(pin || ''),
    device
  });
  const { customToken, profile } = response.data || {};
  if (!customToken || !profile) throw new Error('Respons login cloud tidak lengkap.');
  await signInWithCustomToken(auth, customToken);
  return profile;
}

export async function verifyCloudManagerPin(pin, purpose = 'GENERAL') {
  requireFirebase();
  const callable = httpsCallable(functions, 'verifyManagerPin');
  const response = await callable({ pin: String(pin || ''), purpose: String(purpose || 'GENERAL') });
  return response.data || { success: false };
}

export async function upsertCloudEmployee(data) {
  requireFirebase();
  const callable = httpsCallable(functions, 'upsertEmployee');
  const response = await callable({ ...data, storeId: STORE_ID });
  return response.data?.profile;
}

export async function bootstrapCloudStore(payload) {
  requireFirebase();
  await authPersistenceReady;
  const callable = httpsCallable(functions, 'bootstrapStore');
  const response = await callable({
    ...payload,
    storeId: payload.storeId || STORE_ID,
    storeCode: normalizeCode(payload.storeCode)
  });
  const { customToken, profile, requiresSeed } = response.data || {};
  if (!customToken || !profile) throw new Error('Bootstrap cloud gagal menghasilkan sesi Owner.');
  await signInWithCustomToken(auth, customToken);
  return { profile, requiresSeed: Boolean(requiresSeed) };
}

export async function getCloudSessionProfile() {
  requireFirebase();
  await authPersistenceReady;
  const current = auth.currentUser;
  if (!current) return null;
  const token = await current.getIdTokenResult(true);
  if (!token.claims?.storeId) return null;
  return {
    id: current.uid,
    uid: current.uid,
    name: token.claims.name || current.displayName || 'Pengguna',
    role: token.claims.role || 'kasir',
    branchId: token.claims.branchId || '',
    storeId: token.claims.storeId,
    active: true
  };
}

export function observeCloudAuth(callback) {
  if (!firebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signOutCloudAccount() {
  if (!auth) return;
  await signOut(auth);
}
