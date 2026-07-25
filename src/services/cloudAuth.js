import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import {
  auth,
  authPersistenceReady,
  firebaseConfig,
  firebaseConfigured,
  firestore,
  STORE_ID,
  DEFAULT_STORE_CODE
} from './firebase.js';

function requireFirebase() {
  if (!firebaseConfigured || !auth || !firestore || !firebaseConfig) {
    throw new Error('Firebase belum dikonfigurasi. Lengkapi environment Firebase terlebih dahulu.');
  }
}

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const normalizeCode = value => String(value || DEFAULT_STORE_CODE).trim().toUpperCase().replace(/\s+/g, '');
const profileRef = uid => doc(firestore, 'stores', STORE_ID, 'users', uid);

function normalizeProfile(uid, data = {}) {
  return {
    id: uid,
    uid,
    storeId: STORE_ID,
    storeCode: data.storeCode || DEFAULT_STORE_CODE,
    name: data.name || 'Pengguna',
    email: data.email || '',
    role: data.role || 'kasir',
    branchId: data.branchId || '',
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    active: data.active !== false,
    source: 'firebase-auth'
  };
}

export async function connectCloudAccount({ email, password }) {
  requireFirebase();
  await authPersistenceReady;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !password) throw new Error('Email dan password cloud wajib diisi.');
  const credential = await signInWithEmailAndPassword(auth, cleanEmail, String(password));
  const snapshot = await getDoc(profileRef(credential.user.uid));
  if (!snapshot.exists()) {
    await signOut(auth);
    throw new Error('Akun Firebase ada, tetapi profil POS belum dibuat oleh Owner.');
  }
  const profile = normalizeProfile(credential.user.uid, snapshot.data());
  if (!profile.active) {
    await signOut(auth);
    throw new Error('Akun karyawan sedang dinonaktifkan.');
  }
  return profile;
}

export async function bootstrapCloudStore(payload) {
  requireFirebase();
  await authPersistenceReady;
  const email = normalizeEmail(payload.ownerEmail);
  const password = String(payload.ownerPassword || '');
  if (!email) throw new Error('Email Owner wajib diisi.');
  if (password.length < 6) throw new Error('Password Owner minimal 6 karakter.');

  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error?.code !== 'auth/email-already-in-use') throw error;
    credential = await signInWithEmailAndPassword(auth, email, password);
  }

  const uid = credential.user.uid;
  const bootstrapRef = doc(firestore, 'stores', STORE_ID, 'system', 'bootstrap');
  const ownerRef = profileRef(uid);
  const storeCode = normalizeCode(payload.storeCode);
  let requiresSeed = false;

  await runTransaction(firestore, async transaction => {
    const [bootstrapSnapshot, ownerSnapshot] = await Promise.all([
      transaction.get(bootstrapRef),
      transaction.get(ownerRef)
    ]);

    if (bootstrapSnapshot.exists() && !ownerSnapshot.exists()) {
      throw new Error('Toko cloud sudah memiliki Owner. Gunakan menu Hubungkan Akun Cloud.');
    }

    requiresSeed = !bootstrapSnapshot.exists();
    if (!bootstrapSnapshot.exists()) {
      transaction.set(bootstrapRef, {
        storeId: STORE_ID,
        storeCode,
        businessName: String(payload.businessName || 'BUMI MAKMUR').trim(),
        ownerUid: uid,
        createdAt: serverTimestamp(),
        architecture: 'spark-only-v4.3'
      });
    }

    transaction.set(ownerRef, {
      id: uid,
      uid,
      storeId: STORE_ID,
      storeCode,
      email,
      name: String(payload.ownerName || 'Bapak Owner').trim(),
      role: 'owner',
      branchId: 'BMP-001',
      permissions: ['*'],
      active: true,
      updatedAt: serverTimestamp(),
      createdAt: ownerSnapshot.exists() ? ownerSnapshot.data().createdAt || serverTimestamp() : serverTimestamp()
    }, { merge: true });
  });

  const snapshot = await getDoc(ownerRef);
  return { profile: normalizeProfile(uid, snapshot.data()), requiresSeed };
}

export async function getCloudSessionProfile() {
  requireFirebase();
  await authPersistenceReady;
  const current = auth.currentUser;
  if (!current) return null;
  const snapshot = await getDoc(profileRef(current.uid));
  if (!snapshot.exists()) return null;
  const profile = normalizeProfile(current.uid, snapshot.data());
  return profile.active ? profile : null;
}

export async function upsertCloudEmployee(data) {
  requireFirebase();
  await authPersistenceReady;
  const ownerProfile = await getCloudSessionProfile();
  if (!ownerProfile || ownerProfile.role !== 'owner') throw new Error('Hanya Owner yang dapat mengelola akun karyawan cloud.');

  if (data.id) {
    const ref = profileRef(data.id);
    await updateDoc(ref, {
      name: String(data.name || '').trim(),
      role: data.role || 'kasir',
      branchId: data.branchId || '',
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      active: data.active !== false,
      updatedAt: serverTimestamp()
    });
    const snapshot = await getDoc(ref);
    return normalizeProfile(data.id, snapshot.data());
  }

  const email = normalizeEmail(data.email);
  const temporaryPassword = String(data.temporaryPassword || '');
  if (!email) throw new Error('Email karyawan wajib diisi.');
  if (temporaryPassword.length < 6) throw new Error('Password sementara minimal 6 karakter.');

  const secondaryName = `employee-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser = null;
  let profileCreated = false;
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, temporaryPassword);
    createdUser = credential.user;
    await setDoc(profileRef(createdUser.uid), {
      id: createdUser.uid,
      uid: createdUser.uid,
      storeId: STORE_ID,
      storeCode: ownerProfile.storeCode || DEFAULT_STORE_CODE,
      email,
      name: String(data.name || '').trim(),
      role: data.role || 'kasir',
      branchId: data.branchId || '',
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      active: data.active !== false,
      createdBy: ownerProfile.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    profileCreated = true;
    return normalizeProfile(createdUser.uid, {
      ...data,
      email,
      storeCode: ownerProfile.storeCode || DEFAULT_STORE_CODE
    });
  } catch (error) {
    // Hindari akun Firebase Auth yatim jika penulisan profil Firestore gagal.
    if (createdUser && !profileCreated) {
      try { await deleteUser(createdUser); } catch (cleanupError) {
        console.warn('Akun Auth karyawan gagal dibersihkan setelah profil Firestore gagal dibuat.', cleanupError);
      }
    }
    throw error;
  } finally {
    try { await signOut(secondaryAuth); } catch {}
    await deleteApp(secondaryApp);
  }
}

export async function requestEmployeePasswordReset(email) {
  requireFirebase();
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) throw new Error('Email karyawan belum tersedia.');
  await sendPasswordResetEmail(auth, cleanEmail);
  return true;
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
