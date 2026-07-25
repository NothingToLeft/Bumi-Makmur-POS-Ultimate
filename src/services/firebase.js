import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence
} from 'firebase/auth';
import {
  enableMultiTabIndexedDbPersistence,
  initializeFirestore
} from 'firebase/firestore';

const env = import.meta.env || {};

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_APP_ID'
];

export const firebaseConfigured = requiredKeys.every(key => Boolean(env[key]));
export const STORE_ID = env.VITE_FIREBASE_STORE_ID || 'bumi-makmur';
export const DEFAULT_STORE_CODE = env.VITE_FIREBASE_STORE_CODE || 'BM001';
export const PUBLIC_APP_URL = (env.VITE_PUBLIC_APP_URL || '').replace(/\/$/, '');

export const firebaseConfig = firebaseConfigured ? {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
} : null;

let app = null;
let auth = null;
let firestore = null;
let authPersistenceReady = Promise.resolve();
let firestorePersistenceReady = Promise.resolve();

if (firebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch(error => {
    console.warn('Persistensi sesi Firebase Auth gagal diaktifkan.', error);
  });

  firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false
  });

  firestorePersistenceReady = enableMultiTabIndexedDbPersistence(firestore).catch(error => {
    if (!['failed-precondition', 'unimplemented'].includes(error?.code)) {
      console.warn('Persistensi offline Firestore gagal diaktifkan.', error);
    }
  });
}

export {
  app,
  auth,
  firestore,
  authPersistenceReady,
  firestorePersistenceReady
};
