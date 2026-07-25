import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from 'firebase/auth';
import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { doc, getDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import {
  auth,
  authPersistenceReady,
  firebaseConfig,
  firebaseConfigured,
  firestore,
  STORE_ID
} from './firebase.js';

function requireFirebase() {
  if (!firebaseConfigured || !auth || !firestore) {
    throw new Error('Firebase belum dikonfigurasi. Isi environment Firebase terlebih dahulu.');
  }
}

function normalizeProfile(uid, data = {}) {
  return {
    id: uid,
    uid,
    name: String(data.name || 'Pengguna'),
    email: String(data.email || ''),
    role: String(data.role || 'kasir').toLowerCase(),
    branchId: String(data.branchId || ''),
    storeId: String(data.storeId || STORE_ID),
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    active: data.active !== false,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || '')
  };
}

async function readProfile(uid, storeId = STORE_ID, preferServer = true) {
  const target = doc(firestore, 'stores', storeId, 'users', uid);
  let snapshot = null;
  if (preferServer) {
    try {
      snapshot = await getDocFromServer(target);
    } catch {
      snapshot = await getDoc(target);
    }
  } else {
    snapshot = await getDoc(target);
  }
  if (!snapshot.exists()) throw new Error('Profil pengguna belum dibuat di Firestore. Hubungi Owner.');
  const profile = normalizeProfile(snapshot.id, snapshot.data());
  if (!profile.active) throw new Error('Akun ini sedang dinonaktifkan.');
  if (profile.storeId !== storeId) throw new Error('Akun tidak terdaftar pada toko ini.');
  return profile;
}

export async function loginWithEmailPassword(email, password, storeId = STORE_ID) {
  requireFirebase();
  await authPersistenceReady;
  const credential = await signInWithEmailAndPassword(
    auth,
    String(email || '').trim().toLowerCase(),
    String(password || '')
  );
  try {
    return await readProfile(credential.user.uid, storeId, true);
  } catch (error) {
    await signOut(auth).catch(() => {});
    throw error;
  }
}

export async function getCloudSessionProfile(storeId = STORE_ID) {
  requireFirebase();
  await authPersistenceReady;
  const current = auth.currentUser;
  if (!current) return null;
  return readProfile(current.uid, storeId, navigator.onLine);
}

export async function createEmployeeAccount(data, storeId = STORE_ID) {
  requireFirebase();
  const email = String(data.email || '').trim().toLowerCase();
  const password = String(data.password || '');
  if (!email) throw new Error('Email karyawan wajib diisi.');
  if (password.length < 8) throw new Error('Password awal karyawan minimal 8 karakter.');

  const appName = `employee-create-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser = null;
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    createdUser = credential.user;
    const profile = normalizeProfile(credential.user.uid, {
      ...data,
      email,
      storeId,
      active: data.active !== false
    });
    try {
      await setDoc(doc(firestore, 'stores', storeId, 'users', credential.user.uid), {
        uid: credential.user.uid,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        branchId: profile.branchId,
        storeId,
        permissions: profile.permissions,
        active: profile.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      await deleteUser(createdUser).catch(() => {});
      throw new Error(`Akun Firebase dibatalkan karena profil Firestore gagal dibuat: ${error?.message || error}`);
    }
    return profile;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}

export async function updateEmployeeProfile(data, storeId = STORE_ID) {
  requireFirebase();
  if (!data?.id) throw new Error('ID pengguna tidak tersedia.');
  const payload = {
    uid: data.id,
    name: String(data.name || '').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    role: String(data.role || 'kasir').toLowerCase(),
    branchId: String(data.branchId || ''),
    storeId,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    active: data.active !== false,
    updatedAt: new Date().toISOString()
  };
  await setDoc(doc(firestore, 'stores', storeId, 'users', data.id), payload, { merge: true });
  return normalizeProfile(data.id, payload);
}

export async function changeCurrentFirebasePassword(newPassword) {
  requireFirebase();
  if (!auth.currentUser) throw new Error('Sesi Firebase tidak aktif.');
  if (String(newPassword || '').length < 8) throw new Error('Password baru minimal 8 karakter.');
  await updatePassword(auth.currentUser, String(newPassword));
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
