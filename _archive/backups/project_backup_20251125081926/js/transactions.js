// ---------------------------
// FIREBASE IMPORTS
// ---------------------------
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// ---------------------------
// FIREBASE CONFIG
// ---------------------------
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

// ---------------------------
// UTILS
// ---------------------------
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDate(ts) {
  if (!ts) return "Unknown date";
  const d = ts.toDate();
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

function goBack() {
  const groupId = getParam("id");
  window.location = `group_overview.html?id=${groupId}`;
}

// ---------------------------
// LOAD TRANSACTIONS
// ---------------------------
async function loadTransactions(groupId) {
  const txList = document.getElementById("txList");
  txList.innerHTML = "Loading...";

  const txRef = collection(db, `groups/${groupId}/transactions`);
  const q = query(txRef, orderBy("date", "desc"));

  const snap = await getDocs(q);

  if (snap.empty) {
    txList.innerHTML = "<p>No transactions recorded yet.</p>";
    return;
  }

  let all = [];

  snap.forEach(doc => {
    const d = doc.data();
    all.push({
      id: doc.id,
      ...d,
      dateFormatted: formatDate(d.date),
      amountFormatted: "R " + Number(d.amount).toLocaleString(),
    });
  });

  renderList(all);
  setupFilters(all);
}

// ---------------------------
// RENDER LIST
// ---------------------------
function renderList(arr) {
  const txList = document.getElementById("txList");
  txList.innerHTML = "";

  arr.forEach(tx => {
    const div = document.createElement("div");
    div.className = "transaction";

    div.innerHTML = `
      <div>
        <strong>${tx.type}</strong><br>
        <small>${tx.note || ""}</small>
      </div>
      <div style="text-align:right">
        <strong>${tx.amountFormatted}</strong><br>
        <small>${tx.dateFormatted}</small>
      </div>
    `;

    txList.appendChild(div);
  });
}

// ---------------------------
// FILTERS
// ---------------------------
function setupFilters(allData) {
  const btnAll = document.getElementById("filterAll");
  const btnC = document.getElementById("filterContrib");
  const btnW = document.getElementById("filterWithd");
  const btnA = document.getElementById("filterAdjust");

  function activate(btn) {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  btnAll.onclick = () => {
    activate(btnAll);
    renderList(allData);
  };

  btnC.onclick = () => {
    activate(btnC);
    renderList(allData.filter(t => t.type === "Contribution"));
  };

  btnW.onclick = () => {
    activate(btnW);
    renderList(allData.filter(t => t.type === "Withdrawal"));
  };

  btnA.onclick = () => {
    activate(btnA);
    renderList(allData.filter(t => t.type === "Adjustment"));
  };
}

// ---------------------------
// AUTH CHECK
// ---------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    const groupId = getParam("id");
    loadTransactions(groupId);
  }
});
