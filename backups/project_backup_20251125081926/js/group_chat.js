// --------------------------------------------
// group_chat.js — Real-time chat for StokvelPro
// --------------------------------------------

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";


// --------------------------------------------
// FIREBASE CONFIG
// --------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAUIOcaIXcVRPBCG_95-TttwYD32yoJSG8",
  authDomain: "stokvelpro.firebaseapp.com",
  projectId: "stokvelpro",
  storageBucket: "stokvelpro.firebasestorage.app",
  messagingSenderId: "655524343942",
  appId: "1:655524343942:web:03d5ca1374a794e3ee6107",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --------------------------------------------
// GET GROUP ID
// --------------------------------------------
function getGroupId() {
  return new URLSearchParams(window.location.search).get("id");
}

// --------------------------------------------
// LOAD GROUP NAME
// --------------------------------------------
async function loadGroupName(id) {
  const snap = await getDoc(doc(db, "groups", id));
  if (snap.exists()) {
    document.getElementById("groupName").textContent =
      snap.data().groupName + " — Chat";
  }
}


// --------------------------------------------
// REAL-TIME MESSAGE LISTENER
// --------------------------------------------
function listenMessages(groupId, uid) {
  const msgBox = document.getElementById("messages");

  const q = query(
    collection(db, "groups", groupId, "messages"),
    orderBy("timestamp", "asc")
  );

  onSnapshot(q, (snap) => {
    msgBox.innerHTML = "";

    snap.forEach(doc => {
      const m = doc.data();

      const div = document.createElement("div");
      div.className = "bubble " + (m.uid === uid ? "me" : "them");
      div.innerHTML = `
        <div>${m.text}</div>
        <small style="opacity:0.6;font-size:11px;">
          ${new Date(m.timestamp?.seconds * 1000).toLocaleTimeString()}
        </small>
      `;
      msgBox.appendChild(div);
    });

    msgBox.scrollTop = msgBox.scrollHeight;
  });
}


// --------------------------------------------
// SEND MESSAGE
// --------------------------------------------
window.sendMessage = async function () {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  const groupId = getGroupId();

  await addDoc(collection(db, "groups", groupId, "messages"), {
    uid: user.uid,
    text: text,
    timestamp: serverTimestamp()
  });

  input.value = "";
};


// --------------------------------------------
// AUTH + INIT
// --------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const groupId = getGroupId();
  loadGroupName(groupId);
  listenMessages(groupId, user.uid);
});
