// lib/firebase.ts
// ─────────────────────────────────────────────────────────────────
// Firebase project initialisation for CampusBarter.
//
// HOW TO GET YOUR CONFIG:
//   1. Go to https://console.firebase.google.com
//   2. Open your project → Project Settings (gear icon)
//   3. Scroll to "Your apps" → Web app → copy the firebaseConfig object
//   4. Replace the placeholder values below with your real values
// ─────────────────────────────────────────────────────────────────

import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDAz8f9UQsyVRh5YxsPZK1tG5VcMz7FNdU",
    authDomain: "campusbarter-55343.firebaseapp.com",
    projectId: "campusbarter-55343",
    storageBucket: "campusbarter-55343.firebasestorage.app",
    messagingSenderId: "716951171457",
    appId: "1:716951171457:web:605adc4d37ae1972073880",
    measurementId: "G-3DJVZ0ZEKV",
};

// Prevent duplicate initialisation (React Fast Refresh / HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** Firestore database — import this wherever you need to read/write data */
export const db = getFirestore(app);

export default app;
