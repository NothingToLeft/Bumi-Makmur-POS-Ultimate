import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged
} from 'firebase/auth';
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
  try {
    // Desktop Electron memakai origin lokal khusus. Persistence didefinisikan
    // eksplisit agar sesi Auth dapat dipulihkan dari IndexedDB, dengan
    // localStorage sebagai fallback pada Web/Android WebView.
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    });
  } catch (error) {
    // Hot reload atau initialisasi kedua memakai instance Auth yang sudah ada.
    auth = getAuth(app);
  }
  authPersistenceReady = typeof auth.authStateReady === 'function'
    ? auth.authStateReady().catch(error => {
        console.warn('Pemulihan sesi Firebase Auth belum selesai.', error);
      })
    : new Promise(resolve => {
        const unsubscribe = onAuthStateChanged(auth, () => {
          unsubscribe();
          resolve();
        }, error => {
          console.warn('Pemulihan sesi Firebase Auth gagal.', error);
          resolve();
        });
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
