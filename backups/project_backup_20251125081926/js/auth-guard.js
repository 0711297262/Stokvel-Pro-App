// js/auth-guard.js
import { auth, onAuthStateChanged } from "./firebase-config.js";

// show loading until auth resolved
document.documentElement.classList.add('auth-pending');
document.body.classList.add("loading");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not authenticated -> redirect to login
    window.location.href = "index.html";
    return;
  }
  // Authenticated -> remove loading and signal pages
  document.documentElement.classList.remove('auth-pending');
  document.body.classList.remove("loading");
  // provide simple user object on window for convenience
  window.currentUser = user;
  document.dispatchEvent(new Event("auth-ready"));
});

// after document.dispatchEvent(new Event("auth-ready"));
import('./pin-lock.js').then(m => m && m.initPinLock && m.initPinLock({ autoLockMinutes: 3 }));
document.getElementById('btnDeleteGroup').addEventListener('click', async () => {
  const ok = await window.requirePin();
  if(!ok) return alert('PIN required.');
  // proceed with delete
  deleteGroup();
});
