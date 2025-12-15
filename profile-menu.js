import { auth } from "./firebase-config.js";
import { signOut, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const btn = document.getElementById("profileBtn");
const menu = document.getElementById("profileMenu");

// Load user info
onAuthStateChanged(auth, user => {
  if (!user) return;
  document.getElementById("pmName").textContent = user.displayName || "User";
  document.getElementById("pmPhone").textContent = user.phoneNumber || "—";
});

// Toggle open/close
btn.addEventListener("click", () => {
  menu.classList.toggle("visible");
});

// Close when clicking outside
document.addEventListener("click", e => {
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove("visible");
  }
});

// Expose logout()
window.logout = function() {
  signOut(auth).then(() => {
    location.href = "index.html";
  });
};
