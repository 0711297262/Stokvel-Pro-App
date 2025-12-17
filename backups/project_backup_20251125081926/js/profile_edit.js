import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAUIOcaIXcVRPBCG_95-TttwYD32yoJSG8",
  authDomain: "stokvelpro.firebaseapp.com",
  projectId: "stokvelpro",
  storageBucket: "stokvelpro.firebasestorage.app",
  messagingSenderId: "655524343942",
  appId: "1:655524343942:web:03d5ca1374a794e3ee6107"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth();

const url = new URL(window.location.href);
const uid = url.searchParams.get("uid");

let selectedFile = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  loadProfile(uid);
});

async function loadProfile(uid) {
  const refDoc = doc(db, "users", uid);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    alert("Profile not found.");
    return;
  }

  const u = snap.data();

  document.getElementById("nameInput").value = u.name || "";
  document.getElementById("profileImgPreview").src =
    u.profileImage || "https://via.placeholder.com/110";
}

// File selection handler
document.getElementById("profileImgInput").addEventListener("change", (e) => {
  selectedFile = e.target.files[0];
  if (selectedFile) {
    document.getElementById("profileImgPreview").src = URL.createObjectURL(selectedFile);
  }
});

async function uploadProfilePhoto(uid) {
  if (!selectedFile) return null;

  const storageRef = ref(storage, `profileImages/${uid}.jpg`);
  await uploadBytes(storageRef, selectedFile);

  return await getDownloadURL(storageRef);
}

window.saveProfile = async function() {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) {
    alert("Name cannot be empty");
    return;
  }

  const photoURL = await uploadProfilePhoto(uid);

  const refDoc = doc(db, "users", uid);
  await updateDoc(refDoc, {
    name: name,
    ...(photoURL && { profileImage: photoURL })
  });

  alert("Profile updated!");
  history.back();
};

window.goBack = function() {
  history.back();
};
groups/{groupId}/members/{uid}
//---------------------------------------------------------
//  ADMIN CONTROL FUNCTIONS
//---------------------------------------------------------

let groupId = null;  // passed into the page via ?group=123
let targetUid = uid; // the user being edited
let currentUser = null; // logged-in user

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";
  currentUser = user;

  // Load groupId from URL
  const params = new URLSearchParams(window.location.search);
  groupId = params.get("group");

  if (groupId) checkIfAdmin(user.uid);
});

// Check if current user is admin of this group
async function checkIfAdmin(myUid) {
  const ref = doc(db, "groups", groupId, "members", myUid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  // Only show admin controls if admin
  if (data.role === "admin" || data.role === "chair") {
    document.getElementById("adminControls").style.display = "block";
  }
}

// Promote to Admin
window.promoteToAdmin = async function () {
  const ref = doc(db, "groups", groupId, "members", targetUid);
  await updateDoc(ref, { role: "admin" });
  alert("User promoted to Admin");
}

// Demote to member
window.demoteToMember = async function () {
  const ref = doc(db, "groups", groupId, "members", targetUid);
  await updateDoc(ref, { role: "member" });
  alert("User demoted");
}

// Set Treasurer / Chair roles
window.setRole = async function (role) {
  const ref = doc(db, "groups", groupId, "members", targetUid);
  await updateDoc(ref, { role });
  alert("Role updated to: " + role);
}

// Remove from group
window.removeFromGroup = async function () {
  if (!confirm("Remove this member from the group?")) return;

  const ref = doc(db, "groups", groupId, "members", targetUid);
  await updateDoc(ref, { removed: true });

  alert("User removed from group");
  window.location.href = "dashboard.html";
};



