import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  orderBy,
  query,
  onSnapshot,
  serverTimestamp,
  doc, // 🚩 Added doc
  getDoc // 🚩 Added getDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Firebase Config (Must match your project)
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
const auth = getAuth();

// Global State
const url = new URL(window.location.href);
const groupId = url.searchParams.get("gid");
if (!groupId) {
    alert("Missing Group ID for chat.");
    window.location.href = "dashboard.html";
}

const messagesRef = collection(db, `groups/${groupId}/messages`);
let currentUser = null;
let membersMap = {}; // Cache for member names
let currentDrawerUID = null; // Stores UID of the member whose profile is open

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  initChat();
});

// --- Initialization and Real-Time Listener ---

async function initChat() {
    // 1. Load Group Name
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
        const groupName = groupSnap.data().groupName || 'Group Chat';
        document.getElementById("groupTitle").textContent = groupName;
    }

    // 2. Load and Cache Members (from denormalized array for quick name lookup)
    (groupSnap.data().members || []).forEach(m => {
        membersMap[m.uid] = m.name || m.phone || 'Member';
    });
    
    // 3. Start Message Listener
    const q = query(messagesRef, orderBy("timestamp"));

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                renderMessage({ id: change.doc.id, ...change.doc.data() });
            }
        });
    });
}

// --- Rendering ---

function renderMessage(msg) {
  const messagesDiv = document.getElementById("messages");
  const isMine = msg.uid === currentUser.uid;
  const senderName = membersMap[msg.uid] || msg.uid.substring(0, 6);

  const bubble = document.createElement("div");
  bubble.className = "msg " + (isMine ? "mine" : "theirs");
  bubble.innerHTML = `
    <div class="sender">${isMine ? 'You' : senderName}</div>
    <div class="text">${msg.text}</div>
    `;

  // Attach profile view action only if it's not the current user
  if (!isMine) {
      bubble.onclick = () => openProfile(msg.uid);
  } else {
      bubble.style.cursor = 'default';
  }

  messagesDiv.appendChild(bubble);
  // Scroll to bottom
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Profile Drawer Logic ---

async function openProfile(uid) {
  currentDrawerUID = uid; // Store UID for the 'View Full Profile' button

  const drawer = document.getElementById("profileDrawer");
  const nameEl = document.getElementById("drawerName");
  const roleEl = document.getElementById("drawerRole");
  const contribEl = document.getElementById("drawerContribution");
  const viewProfileBtn = document.getElementById("viewProfileBtn");
  
  // 1. Fetch group-specific member data
  const memberRef = doc(db, "groups", groupId, "members", uid); 
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
      nameEl.innerHTML = `<strong>User not found</strong>`;
      roleEl.textContent = 'N/A';
      contribEl.textContent = 'Contributed: N/A';
      viewProfileBtn.style.display = 'none';
      drawer.classList.add("active");
      return;
  }

  const data = memberSnap.data();

  // 2. Populate Drawer
  nameEl.innerHTML = `<strong>${data.name || data.uid}</strong>`;
  roleEl.textContent = `Role: ${data.role || 'Member'}`;
  contribEl.textContent = `Total Contributed: R${(data.contributionsTotal || 0).toFixed(2)}`;
  viewProfileBtn.style.display = 'block';

  drawer.classList.add("active");
}
window.openProfile = openProfile; // Expose for inline use

// Close drawer when clicking outside (e.g., on the background of the drawer container)
document.getElementById("profileDrawer").addEventListener('click', (e) => {
    if(e.target.id === 'profileDrawer') {
        document.getElementById("profileDrawer").classList.remove("active");
    }
});

// Link 'View Full Profile' button
document.getElementById("viewProfileBtn").onclick = () => {
  if (currentDrawerUID) {
    // We haven't created profile.html yet, but we prepare the link
    window.location.href = `profile.html?uid=${currentDrawerUID}&gid=${groupId}`;
  }
};


// --- Sending a message ---

document.getElementById("sendBtn").onclick = sendMessage;

document.getElementById("msgInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
      e.preventDefault(); // Prevent newline in input
      sendMessage();
  }
});

async function sendMessage() {
  const text = document.getElementById("msgInput").value.trim();
  const inputEl = document.getElementById("msgInput");
  if (!text) return;

  try {
    await addDoc(messagesRef, {
      text,
      uid: currentUser.uid,
      timestamp: serverTimestamp(),
      senderName: currentUser.displayName || currentUser.phoneNumber || 'User' // Denormalize name
    });
    inputEl.value = ""; // Clear input on success
  } catch(e) {
      console.error("Error sending message:", e);
      alert("Failed to send message.");
  }
}