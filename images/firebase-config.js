// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAUIOcaIXcVRPBCG_95-TttwYD32yoJSG8",
  authDomain: "stokvelpro.firebaseapp.com",
  projectId: "stokvelpro",
  storageBucket: "stokvelpro.firebasestorage.app",
  messagingSenderId: "655524343942",
  appId: "1:655524343942:web:03d5ca1374a794e3ee6107",
  measurementId: "G-7GNHSN4KY5"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Force invisible reCAPTCHA
auth.settings.appVerificationDisabledForTesting = true;
