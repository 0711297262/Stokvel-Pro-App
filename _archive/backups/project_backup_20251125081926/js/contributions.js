// contributions.js
// Pulls contributions for a group, shows totals, allows members to add.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDoc,
  updateDoc, // 🚩 ADDED FOR GROUP BALANCE UPDATE
  increment // 🚩 ADDED FOR ATOMIC GROUP BALANCE UPDATE
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

/* ---------- Firebase config (use your project's config) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAUIOcaIXcVRPBCG_95-TttwYD32yoJSG8",
  authDomain: "stokvelpro.firebaseapp.com",
  projectId: "stokvelpro",
  storageBucket: "stokvelpro.firebasestorage.app",
  messagingSenderId: "655524343942",
  appId: "1:655524343942:web:03d5ca1374a794e3ee6107"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helpers
const urlParams = new URLSearchParams(window.location.search);
const groupId = urlParams.get('gid');

if (!groupId) {
    alert("Group ID missing.");
    window.location.href = "dashboard.html";
}

let currentUser = null;
let membersMap = {}; // uid -> member object
let lastLoaded = [];

// UI Element References
function $(id) { return document.getElementById(id); }

const listEl = $('list');
const totalEl = $('total');
const countEl = $('count');
const groupNameEl = $('groupName');

// Handlers
$('exportBtn').addEventListener('click', exportCSV);
$('openAdd').addEventListener('click', () => $('modal').style.display = 'flex');
$('closeModal').addEventListener('click', () => $('modal').style.display = 'none');
$('saveBtn').addEventListener('click', recordContribution);
$('backBtn').addEventListener('click', () => window.location.href = `group_overview.html?gid=${groupId}`);

// --- Core Functions ---

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;
    init();
});

async function init() {
    // 1. Load Group Details (to get name)
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
        groupNameEl.textContent = groupSnap.data().groupName || groupSnap.data().name || 'Contributions';
    } else {
        groupNameEl.textContent = 'Contributions';
    }

    // 2. Load Members Map (for display names)
    const membersCol = collection(db, 'groups', groupId, 'members');
    const memberSnap = await getDocs(membersCol);
    membersMap = {};
    memberSnap.forEach(d => {
        const data = d.data();
        membersMap[data.uid] = { displayName: data.name || data.uid };
    });
    
    // 3. Set up real-time listener for contributions
    const contribRef = collection(db, 'groups', groupId, 'contributions');
    const q = query(contribRef, orderBy('createdAt', 'desc'));

    onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderList(items);
    });
}

function renderList(items) {
    lastLoaded = items;
    listEl.innerHTML = '';
    let total = 0;

    if (items.length === 0) {
        listEl.innerHTML = '<div class="empty">No contributions recorded yet.</div>';
        totalEl.textContent = 'R 0.00';
        countEl.textContent = '0';
        return;
    }

    items.forEach(item => {
        total += item.amount;
        
        const memberName = membersMap[item.uid] 
            ? membersMap[item.uid].displayName 
            : (item.uid || 'Anonymous');

        const date = item.createdAt?.toDate 
            ? item.createdAt.toDate().toLocaleString() 
            : 'Unknown Date';

        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="meta">
                <div class="name">${memberName}</div>
                <div class="note-text">${item.note || '—'}</div>
            </div>
            <div class="amount">R ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div class="date">${date}</div>
            <button class="delete-btn" onclick="deleteContribution('${item.id}')">X</button>
        `;
        listEl.appendChild(row);
    });

    totalEl.textContent = `R ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    countEl.textContent = items.length;
}

// 🚩 RECORD CONTRIBUTION WITH BALANCE UPDATE
async function recordContribution() {
  const amount = $('amt').value;
  const note = $('note').value.trim();

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) 
    return alert("Please enter a valid amount");

  const numAmount = Number(amount);
  
  // 1. Add contribution document
  try {
    const cRef = collection(db, "groups", groupId, "contributions");
    await addDoc(cRef, {
      uid: currentUser.uid,
      amount: numAmount,
      note: note,
      createdAt: serverTimestamp() // Use serverTimestamp for accuracy
    });
    
    // 2. Atomically update group balance (Phase 2 core logic)
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { 
        balance: increment(numAmount) 
    });

    $('modal').style.display = "none";
    $('amt').value = "";
    $('note').value = "";
    alert("Contribution recorded successfully, group balance updated.");
    
  } catch (err) {
    console.error(err);
    alert("Failed to save: " + err.message);
  }
}

// Attach to window for inline use
window.deleteContribution = async function(id) {
    if (!confirm("Are you sure you want to delete this contribution?")) return;
    try {
        const dRef = doc(db, "groups", groupId, "contributions", id);
        const contribSnap = await getDoc(dRef);
        
        if (contribSnap.exists()) {
            const amount = contribSnap.data().amount;
            
            // 1. Delete the contribution document
            await deleteDoc(dRef);
            
            // 2. Atomically deduct from group balance
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, { 
                balance: increment(-amount) // Deduct the amount
            });
            alert("Contribution deleted and balance updated.");
        }
    } catch (err) {
        console.error(err);
        alert("Delete failed: " + err.message);
    }
}

function exportCSV() {
  if (!lastLoaded || lastLoaded.length === 0) {
    alert("No contributions to export.");
    return;
  }

  let rows = [
    ["Member", "Amount", "Note", "Date", "UID"]
  ];

  lastLoaded.forEach(item => {
    const display =
      (membersMap[item.uid] && membersMap[item.uid].displayName)
      || item.uid;

    const date = item.createdAt?.toDate
      ? item.createdAt.toDate()
      : new Date(item.createdAt);

    rows.push([
      display,
      item.amount,
      item.note || "",
      date.toLocaleString(),
      item.uid
    ]);
  });
  
  // Logic to create and download CSV file
  let csvContent = "data:text/csv;charset=utf-8,";
  rows.forEach(row => {
    csvContent += row.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `contributions_${groupId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}