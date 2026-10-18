import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase SDK
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
let db: any = null;
try {
  db = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch (error) {
  try {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (fallbackError) {
    console.warn("Firebase Firestore init failed. This may happen if cookies/indexedDB are blocked in an iframe.", fallbackError);
  }
}

const analytics = null;
export { db, analytics };
