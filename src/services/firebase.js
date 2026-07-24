import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

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
export const DEFAULT_STORE_CODE = env.VITE_FIREBASE_STORE_CODE || 'BUMIMAKMUR';
export const FUNCTIONS_REGION = env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-southeast2';
export const PUBLIC_APP_URL = (env.VITE_PUBLIC_APP_URL || '').replace(/\/$/, '');

let app = null;
let auth = null;
let firestore = null;
let functions = null;
let storage = null;
let authPersistenceReady = Promise.resolve();

if (firebaseConfigured) {
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };

  app = getApps()[0] || initializeApp(firebaseConfig);
  auth = getAuth(app);
  authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch(error => {
    console.warn('Persistensi sesi Firebase Auth gagal diaktifkan.', error);
  });
  firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false
  });
  functions = getFunctions(app, FUNCTIONS_REGION);
  storage = getStorage(app);
}

export { app, auth, firestore, functions, storage, authPersistenceReady };
