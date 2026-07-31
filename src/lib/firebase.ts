import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  "projectId": "trackguinea",
  "appId": "1:870790440395:web:552a79ce5837ca73ed424e",
  "storageBucket": "trackguinea.firebasestorage.app",
  "apiKey": "process.env.NEXT_PUBLIC_MAPBOX_TOKEN!",
  "authDomain": "trackguinea.firebaseapp.com",
  "messagingSenderId": "870790440395"
};

// Initialize Firebase app (singleton guard for Next.js HMR fast-refresh)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Global caching wrapper to prevent duplicate client initialization on Fast Refresh (Next.js HMR)
const g = (typeof window !== 'undefined' ? window : global) as any;

const auth = g.firebase_auth || getAuth(app);

// Firestore: Enable auto-detect long polling and resilient offline fallback
let db: Firestore;
if (g.firebase_db) {
  db = g.firebase_db;
} else {
  try {
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true
    });
  } catch (e) {
    db = getFirestore(app);
  }
}

const storage = g.firebase_storage || getStorage(app);
storage.maxUploadRetryTime = 120000;
storage.maxOperationRetryTime = 120000;
const firestore = db;

if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  g.firebase_auth = auth;
  g.firebase_db = db;
  g.firebase_storage = storage;
}

export { app, auth, db, storage, firestore };
