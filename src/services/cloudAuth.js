import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  writeBatch
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
import {
  createEmployeeLoginAlias,
  deriveEmployeeAuthCredential,
  employeeDirectoryId,
  normalizeEmployeeLoginName
} from '../utils/employeeLogin.js';

function requireFirebase() {
  if (!firebaseConfigured || !auth || !firestore || !firebaseConfig) {
    throw new Error('Firebase belum dikonfigurasi. Lengkapi environment Firebase terlebih dahulu.');
  }
}

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const normalizeCode = value => String(value || DEFAULT_STORE_CODE).trim().toUpperCase().replace(/\s+/g, '');
const profileRef = (uid, storeId = STORE_ID) => doc(firestore, 'stores', storeId, 'users', uid);
const directoryRef = id => doc(firestore, 'employeeLoginDirectory', id);

async function directoryRefForLogin(loginName, branchId, storeId = STORE_ID) {
  return directoryRef(await employeeDirectoryId(storeId, branchId, loginName));
}

function normalizeProfile(uid, data = {}) {
  return {
    id: uid,
    uid,
    storeId: data.storeId || STORE_ID,
    storeCode: data.storeCode || DEFAULT_STORE_CODE,
    name: data.name || 'Pengguna',
    loginName: data.loginName || normalizeEmployeeLoginName(data.name || ''),
    loginAlias: data.loginAlias || '',
    authMode: data.authMode || (data.loginAlias ? 'name-pin-v2' : 'legacy-email'),
    email: data.email || '',
    role: data.role || 'kasir',
    branchId: data.branchId || '',
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    active: data.active !== false,
    source: 'firebase-auth'
  };
}

function assertActorCanManage(actor, target = {}) {
  if (!actor || !['owner', 'manager'].includes(actor.role)) {
    throw new Error('Hanya Owner atau Store Manager yang dapat mengelola karyawan.');
  }
  if (target.role === 'owner') throw new Error('Akun Owner tidak dapat dikelola dari menu karyawan.');
  if (actor.role === 'manager') {
    if (target.role && target.role !== 'kasir') throw new Error('Store Manager hanya dapat mengelola akun Kasir.');
    if (target.branchId && target.branchId !== actor.branchId) throw new Error('Store Manager hanya dapat mengelola karyawan pada cabangnya sendiri.');
  }
}

function employeeProfilePayload({ uid, actorProfile, data, loginAlias, createdAt = null }) {
  const name = String(data.name || '').trim();
  const loginName = normalizeEmployeeLoginName(data.loginName || name);
  const role = actorProfile.role === 'manager' ? 'kasir' : (data.role === 'manager' ? 'manager' : 'kasir');
  const branchId = actorProfile.role === 'manager' ? actorProfile.branchId : String(data.branchId || '');
  return {
    id: uid,
    uid,
    storeId: STORE_ID,
    storeCode: actorProfile.storeCode || DEFAULT_STORE_CODE,
    email: '',
    name,
    loginName,
    loginAlias,
    authMode: 'name-pin-v2',
    role,
    branchId,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    active: data.active !== false,
    createdBy: actorProfile.id,
    updatedBy: actorProfile.id,
    createdAt: createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

function directoryPayload({ uid, actorProfile, profileData }) {
  return {
    uid,
    storeId: STORE_ID,
    storeCode: actorProfile.storeCode || DEFAULT_STORE_CODE,
    branchId: profileData.branchId,
    loginName: profileData.loginName,
    loginAlias: profileData.loginAlias,
    role: profileData.role,
    active: profileData.active !== false,
    schemaVersion: 2,
    updatedAt: serverTimestamp()
  };
}

async function createSecondaryAuth(label) {
  const secondaryName = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryName);
  return { secondaryApp, secondaryAuth: getAuth(secondaryApp) };
}

async function closeSecondaryAuth(secondaryApp, secondaryAuth) {
  try { await signOut(secondaryAuth); } catch {}
  await deleteApp(secondaryApp);
}

export async function connectCloudAccount({ email, password, expectedRole = 'any' }) {
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
  if (expectedRole === 'owner' && profile.role !== 'owner') {
    await signOut(auth);
    throw new Error('Akun ini bukan akun Owner. Gunakan halaman Login Karyawan.');
  }
  if (expectedRole === 'employee' && profile.role === 'owner') {
    await signOut(auth);
    throw new Error('Akun Owner harus masuk melalui halaman Login Owner.');
  }
  if (!profile.active) {
    await signOut(auth);
    throw new Error('Akun ini sedang dinonaktifkan.');
  }
  return profile;
}

export async function connectEmployeeWithNamePin({ loginName = '', name = '', pin = '', branchId = '' } = {}) {
  requireFirebase();
  await authPersistenceReady;
  const normalizedLoginName = normalizeEmployeeLoginName(loginName || name);
  if (!normalizedLoginName) throw new Error('Nama login karyawan wajib diisi.');
  if (!branchId) throw new Error('Pilih toko/cabang terlebih dahulu.');
  if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('PIN karyawan harus tepat 4 digit.');

  const lookupRef = await directoryRefForLogin(normalizedLoginName, branchId, STORE_ID);
  const lookupSnapshot = await getDocFromServer(lookupRef);
  if (!lookupSnapshot.exists() || lookupSnapshot.data()?.active === false) {
    throw new Error('Cabang, nama, atau PIN karyawan tidak cocok.');
  }
  const lookup = lookupSnapshot.data();
  if (lookup.storeId !== STORE_ID || lookup.branchId !== branchId || !lookup.uid || !lookup.loginAlias) {
    throw new Error('Data login karyawan belum valid. Hubungi Owner atau Store Manager.');
  }

  const cloudCredential = await deriveEmployeeAuthCredential({
    storeId: STORE_ID,
    storeCode: lookup.storeCode || DEFAULT_STORE_CODE,
    branchId,
    loginAlias: lookup.loginAlias,
    pin
  });

  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, cloudCredential.email, cloudCredential.password);
  } catch (error) {
    if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(error?.code)) {
      throw new Error('Cabang, nama, atau PIN karyawan tidak cocok.');
    }
    throw error;
  }

  const snapshot = await getDoc(profileRef(credential.user.uid));
  if (!snapshot.exists()) {
    await signOut(auth);
    throw new Error('Akses karyawan sudah dihapus dari aplikasi.');
  }
  const profile = normalizeProfile(credential.user.uid, snapshot.data());
  if (
    profile.role === 'owner' || !profile.active || profile.branchId !== branchId ||
    profile.loginAlias !== lookup.loginAlias || profile.loginName !== normalizedLoginName
  ) {
    await signOut(auth);
    throw new Error(profile.active ? 'Profil login karyawan tidak cocok. Hubungi Owner atau Store Manager.' : 'Akun karyawan sedang dinonaktifkan.');
  }
  return { profile, cloudCredential };
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
      throw new Error('Toko cloud sudah memiliki Owner. Gunakan Login Owner dengan email.');
    }

    requiresSeed = !bootstrapSnapshot.exists();
    if (!bootstrapSnapshot.exists()) {
      transaction.set(bootstrapRef, {
        storeId: STORE_ID,
        storeCode,
        businessName: String(payload.businessName || 'BUMI MAKMUR').trim(),
        ownerUid: uid,
        createdAt: serverTimestamp(),
        architecture: 'spark-only-v4.5'
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

async function ensureUniqueLoginName(loginName, branchId, currentUid = '') {
  const ref = await directoryRefForLogin(loginName, branchId, STORE_ID);
  const snapshot = await getDocFromServer(ref);
  if (snapshot.exists() && snapshot.data()?.uid !== currentUid) {
    throw new Error('Nama login tersebut sudah dipakai pada cabang yang dipilih. Gunakan nama login lain.');
  }
  return ref;
}

async function createEmployeeIdentity(actorProfile, data, { replacesUser = null } = {}) {
  const name = String(data.name || '').trim();
  const loginName = normalizeEmployeeLoginName(data.loginName || name);
  const pin = String(data.pin || data.newPin || '');
  const branchId = actorProfile.role === 'manager' ? actorProfile.branchId : String(data.branchId || '');
  const role = actorProfile.role === 'manager' ? 'kasir' : (data.role === 'manager' ? 'manager' : 'kasir');
  assertActorCanManage(actorProfile, { role, branchId });
  if (!name) throw new Error('Nama lengkap karyawan wajib diisi.');
  if (!loginName) throw new Error('Nama login karyawan wajib diisi.');
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN karyawan harus tepat 4 digit.');
  if (!branchId) throw new Error('Cabang karyawan wajib dipilih.');

  const targetDirectoryRef = await ensureUniqueLoginName(loginName, branchId, replacesUser?.id || '');
  const loginAlias = createEmployeeLoginAlias();
  const cloudCredential = await deriveEmployeeAuthCredential({
    storeId: STORE_ID,
    storeCode: actorProfile.storeCode || DEFAULT_STORE_CODE,
    branchId,
    loginAlias,
    pin
  });
  const { secondaryApp, secondaryAuth } = await createSecondaryAuth('employee-create');
  let createdUser = null;
  let profileCreated = false;
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, cloudCredential.email, cloudCredential.password);
    createdUser = credential.user;
    const payload = employeeProfilePayload({ uid: createdUser.uid, actorProfile, data: { ...data, branchId, role, loginName }, loginAlias });
    const batch = writeBatch(firestore);
    batch.set(profileRef(createdUser.uid), payload);
    batch.set(targetDirectoryRef, directoryPayload({ uid: createdUser.uid, actorProfile, profileData: payload }));
    if (replacesUser?.id) {
      batch.delete(profileRef(replacesUser.id));
      if (replacesUser.loginAlias && String(replacesUser.authMode || '').startsWith('name-pin') && replacesUser.loginName && replacesUser.branchId) {
        const previousDirectoryRef = await directoryRefForLogin(replacesUser.loginName, replacesUser.branchId, STORE_ID);
        // Saat migrasi memakai nama + cabang yang sama, target dan direktori lama
        // adalah dokumen yang sama. Jangan menghapus dokumen yang baru saja diisi.
        if (previousDirectoryRef.path !== targetDirectoryRef.path) batch.delete(previousDirectoryRef);
      }
    }
    await batch.commit();
    profileCreated = true;
    return { ...normalizeProfile(createdUser.uid, payload), replacesUserId: replacesUser?.id || '', pinConfigured: true };
  } catch (error) {
    if (createdUser && !profileCreated) {
      try { await deleteUser(createdUser); } catch (cleanupError) {
        console.warn('Identitas Auth karyawan gagal dibersihkan setelah profil Firestore gagal dibuat.', cleanupError);
      }
    }
    throw error;
  } finally {
    await closeSecondaryAuth(secondaryApp, secondaryAuth);
  }
}

export async function upsertCloudEmployee(data) {
  requireFirebase();
  await authPersistenceReady;
  const actorProfile = await getCloudSessionProfile();
  assertActorCanManage(actorProfile, data);

  if (!data.id) return createEmployeeIdentity(actorProfile, data);
  if (data.id === actorProfile.id) throw new Error('Profil yang sedang digunakan tidak dapat diubah dari menu karyawan.');

  const existingRef = profileRef(data.id);
  const existingSnapshot = await getDocFromServer(existingRef);
  if (!existingSnapshot.exists()) throw new Error('Akun karyawan tidak ditemukan di cloud.');
  const existing = normalizeProfile(data.id, existingSnapshot.data());
  assertActorCanManage(actorProfile, existing);

  const targetRole = actorProfile.role === 'manager' ? 'kasir' : (data.role === 'manager' ? 'manager' : 'kasir');
  const targetBranchId = actorProfile.role === 'manager' ? actorProfile.branchId : String(data.branchId || existing.branchId || '');
  const targetLoginName = normalizeEmployeeLoginName(data.loginName || existing.loginName || data.name || existing.name);
  assertActorCanManage(actorProfile, { role: targetRole, branchId: targetBranchId });

  if (!existing.loginAlias || !String(existing.authMode).startsWith('name-pin')) {
    if (!/^\d{4}$/.test(String(data.newPin || data.pin || ''))) {
      throw new Error('Akun lama perlu PIN baru 4 digit agar dapat memakai login nama + PIN.');
    }
    return createEmployeeIdentity(actorProfile, {
      ...data,
      role: targetRole,
      branchId: targetBranchId,
      loginName: targetLoginName,
      pin: data.newPin || data.pin
    }, { replacesUser: existing });
  }

  const name = String(data.name || '').trim();
  if (!name) throw new Error('Nama lengkap karyawan wajib diisi.');
  if (!targetLoginName) throw new Error('Nama login karyawan wajib diisi.');
  if (!targetBranchId) throw new Error('Cabang karyawan wajib dipilih.');

  const newDirectoryRef = await ensureUniqueLoginName(targetLoginName, targetBranchId, existing.id);
  const oldDirectoryRef = await directoryRefForLogin(existing.loginName || existing.name, existing.branchId, STORE_ID);

  if (data.newPin) {
    if (!/^\d{4}$/.test(String(data.currentPin || ''))) throw new Error('Masukkan PIN karyawan saat ini untuk mengganti PIN.');
    if (!/^\d{4}$/.test(String(data.newPin || ''))) throw new Error('PIN baru harus tepat 4 digit.');
    const oldCredential = await deriveEmployeeAuthCredential({
      storeId: STORE_ID,
      storeCode: existing.storeCode || actorProfile.storeCode || DEFAULT_STORE_CODE,
      branchId: existing.branchId,
      loginAlias: existing.loginAlias,
      pin: data.currentPin
    });
    const newCredential = await deriveEmployeeAuthCredential({
      storeId: STORE_ID,
      storeCode: existing.storeCode || actorProfile.storeCode || DEFAULT_STORE_CODE,
      branchId: targetBranchId,
      loginAlias: existing.loginAlias,
      pin: data.newPin
    });
    const { secondaryApp, secondaryAuth } = await createSecondaryAuth('employee-pin');
    try {
      const credential = await signInWithEmailAndPassword(secondaryAuth, oldCredential.email, oldCredential.password);
      await updatePassword(credential.user, newCredential.password);
    } catch (error) {
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(error?.code)) {
        throw new Error('PIN karyawan saat ini tidak cocok.');
      }
      throw error;
    } finally {
      await closeSecondaryAuth(secondaryApp, secondaryAuth);
    }
  }

  const payload = employeeProfilePayload({
    uid: existing.id,
    actorProfile,
    data: { ...data, role: targetRole, branchId: targetBranchId, loginName: targetLoginName },
    loginAlias: existing.loginAlias,
    createdAt: existingSnapshot.data().createdAt || serverTimestamp()
  });
  const batch = writeBatch(firestore);
  batch.set(existingRef, payload, { merge: true });
  batch.set(newDirectoryRef, directoryPayload({ uid: existing.id, actorProfile, profileData: payload }));
  if (existing.branchId !== targetBranchId || existing.loginName !== targetLoginName) batch.delete(oldDirectoryRef);
  await batch.commit();
  return { ...normalizeProfile(existing.id, payload), replacesUserId: '', pinConfigured: Boolean(data.newPin) };
}

export async function deleteCloudEmployee({ id, pin = '' }) {
  requireFirebase();
  await authPersistenceReady;
  const actorProfile = await getCloudSessionProfile();
  if (!actorProfile || !['owner', 'manager'].includes(actorProfile.role)) throw new Error('Hanya Owner atau Store Manager yang dapat menghapus karyawan.');
  if (!id || id === actorProfile.id) throw new Error('Akun yang sedang digunakan tidak dapat dihapus.');

  const ref = profileRef(id);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) return { id, authDeleted: false, alreadyDeleted: true };
  const employee = normalizeProfile(id, snapshot.data());
  assertActorCanManage(actorProfile, employee);

  let secondaryApp = null;
  let secondaryAuth = null;
  let authUser = null;
  let authDeleted = false;
  let authCleanupWarning = '';

  if (employee.loginAlias && /^\d{4}$/.test(String(pin || ''))) {
    const credential = await deriveEmployeeAuthCredential({
      storeId: STORE_ID,
      storeCode: employee.storeCode || actorProfile.storeCode || DEFAULT_STORE_CODE,
      branchId: employee.branchId,
      loginAlias: employee.loginAlias,
      pin
    });
    const secondary = await createSecondaryAuth('employee-delete');
    secondaryApp = secondary.secondaryApp;
    secondaryAuth = secondary.secondaryAuth;
    try {
      const signedIn = await signInWithEmailAndPassword(secondaryAuth, credential.email, credential.password);
      authUser = signedIn.user;
    } catch (error) {
      authCleanupWarning = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(error?.code)
        ? 'PIN tidak cocok; akses aplikasi tetap dicabut, sedangkan identitas Firebase lama diisolasi.'
        : 'Akses aplikasi dicabut, tetapi identitas Firebase lama belum dapat diverifikasi.';
    }
  } else if (employee.loginAlias) {
    authCleanupWarning = 'Akses aplikasi dicabut. Identitas Firebase lama diisolasi karena PIN tidak dimasukkan.';
  }

  try {
    // Cabut akses Firestore dan direktori login lebih dahulu. Dengan urutan ini,
    // kegagalan penghapusan identitas Auth tidak pernah mengembalikan akses POS.
    const batch = writeBatch(firestore);
    batch.delete(ref);
    if (employee.loginAlias && String(employee.authMode || '').startsWith('name-pin') && employee.loginName && employee.branchId) {
      batch.delete(await directoryRefForLogin(employee.loginName, employee.branchId, STORE_ID));
    }
    await batch.commit();

    if (authUser) {
      try {
        await deleteUser(authUser);
        authDeleted = true;
        authCleanupWarning = '';
      } catch (error) {
        authCleanupWarning = 'Akses POS sudah dicabut, tetapi identitas Firebase lama belum dapat dihapus dan telah diisolasi.';
      }
    }
    return { id, authDeleted, authCleanupWarning };
  } finally {
    if (secondaryApp && secondaryAuth) await closeSecondaryAuth(secondaryApp, secondaryAuth);
  }
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
