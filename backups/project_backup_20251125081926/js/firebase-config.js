// firebase-config.js — shared Firebase setup for StokvelPRO

// ----------------------
// FIREBASE IMPORTS
// ----------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPhoneNumber,
  RecaptchaVerifier 
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// ----------------------
// FIREBASE CONFIG
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyAUIOcaIXcVRPBCG_95-TttwYD32yoJSG8",
  authDomain: "stokvelpro.firebaseapp.com",
  projectId: "stokvelpro",
  storageBucket: "stokvelpro.firebasestorage.app",
  messagingSenderId: "655524343942",
  appId: "1:655524343942:web:03d5ca1374a794e3ee6107"
};

// ----------------------
// INITIALIZE APP
// ----------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ----------------------
// EXPORTS TO USE ANYWHERE
// ----------------------
export {
  app, // <--- ADDED THE APP OBJECT HERE
  auth,
  db,
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp
};