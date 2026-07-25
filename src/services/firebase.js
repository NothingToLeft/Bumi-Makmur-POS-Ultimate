import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

const env = import.meta.env || {};

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID'
];

export const firebaseConfigured = requiredKeys.every(key => Boolean(env[key]));
export const STORE_ID = env.VITE_FIREBASE_STORE_ID || 'bumi-makmur';
export const DEFAULT_STORE_CODE = env.VITE_FIREBASE_STORE_CODE || 'BUMIMAKMUR';
export const PUBLIC_APP_URL = (env.VITE_PUBLIC_APP_URL || '').replace(/\/$/, '');

export const firebaseConfig = firebaseConfigured ? {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
} : null;

let app = null;
let auth = null;
let firestore = null;
let authPersistenceReady = Promise.resolve();

if (firebaseConfigured) {
  app = getApps()[0] || initializeApp(firebaseConfig);
  auth = getAuth(app);
  authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch(error => {
    console.warn('Persistensi sesi Firebase Auth gagal diaktifkan.', error);
  });

  try {
    firestore = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (error) {
    // initializeFirestore hanya boleh dipanggil satu kali per app. Saat hot reload,
    // instance lama tetap dapat digunakan oleh Firebase.
    console.warn('Firestore memakai instance yang sudah aktif.', error);
    firestore = getFirestore(app);
  }
}

export { app, auth, firestore, authPersistenceReady };
