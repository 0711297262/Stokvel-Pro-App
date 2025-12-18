// summary.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

/* ---------- change to your config if you use shared init elsewhere ---------- */
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

const $ = id => document.getElementById(id);

// helper: format currency
const fmt = v => {
  const n = Number(v || 0);
  return "R " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// get query param
function qp(name) {
  const p = new URLSearchParams(window.location.search);
  return p.get(name);
}

// month range (start = first day 00:00:00, end = next month's first day 00:00:00)
function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

// convert JS Date to Firestore Timestamp if needed
function toTs(d) {
  if (d instanceof Timestamp) return d;
  return Timestamp.fromDate(d);
}

let currentUser = null;
let groupId = qp("group") || null;
let groupData = null;

// main
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location = "index.html";
    return;
  }
  currentUser = user;

  if (!groupId) {
    alert("Missing group id. Open from group overview.");
    window.location = "dashboard.html";
    return;
  }

  // load group doc
  const gRef = doc(db, "groups", groupId);
  const gSnap = await getDoc(gRef);
  if (!gSnap.exists()) {
    alert("Group not found");
    window.location = "dashboard.html";
    return;
  }
  groupData = gSnap.data();
  $("groupSubtitle").textContent = `Group: ${groupData.groupName || groupData.name || groupId}`;

  // show monthly settings
  const monthlyAmount = Number(groupData.monthlyAmount || groupData.monthlyAmount || 0);
  const monthlyDue = groupData.monthlyDueDay || groupData.monthlyDueDay || '-';
  $("monthlyAmountDisplay").textContent = fmt(monthlyAmount);
  $("dueDayDisplay").textContent = `Due day: ${monthlyDue}`;

  // prepare members list
  // members might be stored as array of objects or object map. we'll support both shapes.
  // finalMembers: array of { uid, name, role }
  const finalMembers = [];
  if (Array.isArray(groupData.members)) {
    groupData.members.forEach(m => finalMembers.push({ uid: m.uid, name: m.name || m.displayName || m.uid, role: m.role || 'member' }));
  } else if (groupData.members && typeof groupData.members === 'object') {
    Object.keys(groupData.members).forEach(uid => {
      const m = groupData.members[uid];
      finalMembers.push({ uid, name: m.name || m.displayName || uid, role: m.role || 'member' });
    });
  } else if (Array.isArray(groupData.memberIds)) {
    groupData.memberIds.forEach(uid => finalMembers.push({ uid, name: uid, role: 'member' }));
  }

  // show members placeholder while loading contributions
  renderMembersPlaceholder(finalMembers);

  // load contributions for this month
  await loadMonthlyContributions(finalMembers, monthlyAmount);
});

// re-run on press
$("refreshBtn").addEventListener("click", async () => {
  if (!groupData) return;
  const monthlyAmount = Number(groupData.monthlyAmount || 0);
  // reconstruct finalMembers
  const finalMembers = [];
  if (Array.isArray(groupData.members)) {
    groupData.members.forEach(m => finalMembers.push({ uid: m.uid, name: m.name || m.displayName || m.uid, role: m.role || 'member' }));
  } else if (groupData.members && typeof groupData.members === 'object') {
    Object.keys(groupData.members).forEach(uid => {
      const m = groupData.members[uid];
      finalMembers.push({ uid, name: m.name || m.displayName || uid, role: m.role || 'member' });
    });
  } else if (Array.isArray(groupData.memberIds)) {
    groupData.memberIds.forEach(uid => finalMembers.push({ uid, name: uid, role: 'member' }));
  }
  await loadMonthlyContributions(finalMembers, monthlyAmount);
});

$("backBtn").addEventListener("click", () => {
  window.location = `group_overview.html?id=${groupId}`;
});

async function loadMonthlyContributions(members, monthlyAmount) {
  // month range
  const { start, end } = getMonthRange(new Date());
  $("monthLabel").textContent = `${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}`;

  // Prepare map uid -> totalPaid
  const paidMap = {};
  members.forEach(m => paidMap[m.uid] = 0);

  // Query contributions between start and end
  const cRef = collection(db, "groups", groupId, "contributions");
  // Firestore requires Timestamp comparisons — convert
  const q = query(cRef, where("createdAt", ">=", toTs(start)), where("createdAt", "<", toTs(end)), orderBy("createdAt", "desc"));

  try {
    const snap = await getDocs(q);
    let totalPaid = 0;
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const uid = d.uid;
      const amount = Number(d.amount || 0);
      if (!isNaN(amount)) {
        if (paidMap[uid] === undefined) paidMap[uid] = amount;
        else paidMap[uid] += amount;
        totalPaid += amount;
      }
    });

    // Now compute status per member
    const rows = members.map(m => {
      const paid = Number(paidMap[m.uid] || 0);
      const expected = Number(monthlyAmount || 0);
      const owes = Math.max(0, expected - paid);
      let status = 'missed';
      if (expected === 0) status = paid > 0 ? 'ok' : 'missed';
      else if (paid >= expected) status = 'ok';
      else if (paid > 0) status = 'partial';
      return {
        uid: m.uid,
        name: m.name || m.uid,
        role: m.role || 'member',
        paid, expected, owes, status
      };
    });

    renderMemberRows(rows);

    // Summary totals
    const expectedTotal = members.length * (monthlyAmount || 0);
    $("expectedTotal").textContent = fmt(expectedTotal);
    $("paidTotal").textContent = fmt(totalPaid);
    $("totalMonth").textContent = fmt(totalPaid);
    const upToDateCount = rows.filter(r => r.status === 'ok').length;
    $("uptodateCount").textContent = String(upToDateCount);

  } catch (err) {
    console.error("Failed to load contributions:", err);
    $("memberRows").innerHTML = `<div class="empty">Failed to load: ${err.message}</div>`;
  }
}

function renderMembersPlaceholder(members) {
  if (!members || members.length === 0) {
    $("memberRows").innerHTML = `<div class="empty">No members found</div>`;
    return;
  }
  const html = members.map(m => {
    return `<div class="member-row">
      <div class="member-left">
        <div class="avatar">${(m.name || m.uid || 'U').charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight:700">${m.name || m.uid}</div>
          <div class="meta-small">${m.role || 'member'}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div class="meta-small">Loading…</div>
      </div>
    </div>`;
  }).join("");
  $("memberRows").innerHTML = html;
}

function renderMemberRows(rows) {
  if (!rows || rows.length === 0) {
    $("memberRows").innerHTML = `<div class="empty">No data</div>`;
    return;
  }
  const html = rows.map(r => {
    const statusClass = r.status === 'ok' ? 'ok' : (r.status === 'partial' ? 'partial' : 'missed');
    return `<div class="member-row">
      <div class="member-left">
        <div class="avatar">${(r.name || r.uid).charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight:700">${r.name}</div>
          <div class="meta-small">${r.role}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${fmt(r.paid)}</div>
        <div class="meta-small">Owes: ${fmt(r.owes)}</div>
        <div style="height:6px"></div>
        <div class="status ${statusClass}">${r.status === 'ok' ? 'Up to date' : (r.status === 'partial' ? 'Partial' : 'Missed')}</div>
      </div>
    </div>`;
  }).join("");
  $("memberRows").innerHTML = html;
}
