// /js/group_overview.api.js
// Firestore wrapper for group_overview.html (Option 2 - raw + processed)
// Exposes:
//   - getGroupById(gid)
//   - subscribeToGroup(gid, callback)
//   - subscribeToMembers(gid, callback)
//   - subscribeToActivity(gid, callback)
//
// Defensive: will use existing initialized Firestore if available on window (window.db or window.firestore),
// otherwise will try to import the Firebase SDK dynamically and initialize using window.firebaseConfig.
// If neither is available it will degrade gracefully (return null / no-op subscriptions).

const internal = {
  db: null,
  initialized: false
};

async function ensureFirestore() {
  if (internal.initialized && internal.db) return internal.db;

  // common places projects attach an initialized Firestore instance
  if (window.db) { internal.db = window.db; internal.initialized = true; return internal.db; }
  if (window.firestore) { internal.db = window.firestore; internal.initialized = true; return internal.db; }
  if (window.firebase && window.firebase.firestore) {
    internal.db = window.firebase.firestore();
    internal.initialized = true;
    return internal.db;
  }

  // otherwise try dynamic import (CDN). This attempt requires window.firebaseConfig to exist.
  if (!window.firebaseConfig) {
    console.warn('group_overview.api: No Firestore instance found and window.firebaseConfig missing. API will be disabled.');
    return null;
  }

  try {
    // v10 modular SDK dynamic import from Google CDN
    const appModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

    const { initializeApp } = appModule;
    const { getFirestore } = firestoreModule;

    // initialize only if not already present
    if (!window._groupOverviewFirebaseApp) {
      window._groupOverviewFirebaseApp = initializeApp(window.firebaseConfig);
    }
    internal.db = getFirestore(window._groupOverviewFirebaseApp);
    internal.initialized = true;
    return internal.db;
  } catch (err) {
    console.warn('group_overview.api: dynamic import failed', err);
    return null;
  }
}

/* ----------------------
   Utilities
   ---------------------- */
function safeDocRef(db, path) {
  // path like "groups/{gid}"
  const parts = path.split('/');
  const { doc } = (() => {
    try {
      // prefer modular functions from global import if present
      return { doc: window.firebase && window.firebase.firestore ? window.firebase.firestore.doc : null };
    } catch (e) { return { doc: null }; }
  })();

  // If modular SDK present in global scope (unlikely), we can't rely on it; instead we'll import locally when needed.
  // For our code we will use functions from firestore SDK imported inside each function scope.
  return path;
}

function mapTxnToActivity(txn) {
  // input: Firestore transaction document data
  // output: UI-friendly activity item
  if (!txn) return null;
  return {
    id: txn.id || txn.txnId || null,
    title: txn.type === 'payout' ? 'Payout' : (txn.type || 'Transaction'),
    amount: txn.amount || 0,
    type: txn.type || 'transaction',
    when: txn.timestamp ? (txn.timestamp.seconds ? (txn.timestamp.seconds * 1000) : new Date(txn.timestamp).getTime()) : (txn.timestamp || null),
    note: txn.note || '',
    memberName: txn.memberName || null,
    raw: txn
  };
}

/* ----------------------
   getGroupById
   ---------------------- */
export async function getGroupById(gid) {
  const db = await ensureFirestore();
  if (!db) return null;

  // lazy import modular functions we need
  const { doc, getDoc, collection, getDocs, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  try {
    // group doc
    const groupRef = doc(db, 'groups', gid);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return null;
    const rawGroup = { id: groupSnap.id, ...groupSnap.data() };

    // members (small set)
    const membersRef = collection(db, 'groups', gid, 'members');
    const membersQ = query(membersRef);
    const membersSnap = await getDocs(membersQ);
    const rawMembers = [];
    membersSnap.forEach(d => rawMembers.push({ id: d.id, ...d.data() }));

    // transactions (recent 20)
    const txRef = collection(db, 'groups', gid, 'transactions');
    const txQ = query(txRef, orderBy('timestamp', 'desc'), limit(20));
    const txSnap = await getDocs(txQ);
    const rawActivity = [];
    txSnap.forEach(d => rawActivity.push({ id: d.id, ...d.data() }));

    // Processed / UI-friendly fields
    const ui = {
      id: rawGroup.id,
      name: rawGroup.groupName || rawGroup.name || '',
      code: rawGroup.code || rawGroup.groupCode || '',
      membersCount: rawGroup.membersCount ?? rawMembers.length,
      monthly: rawGroup.contributionAmount ?? rawGroup.monthly ?? 0,
      balance: rawGroup.groupBalance ?? rawGroup.balance ?? 0,
      summary: rawGroup.summary ?? rawGroup.description ?? '',
      payoutCycle: rawGroup.payoutCycle ?? null,
      payoutSchedule: rawGroup.payoutSchedule ?? null,
      rotationIndex: rawGroup.rotationIndex ?? null,
      lastPayoutDate: rawGroup.lastPayoutDate ?? null,
      status: rawGroup.status ?? null,
      archivedAt: rawGroup.archivedAt ?? null,
      updatedAt: rawGroup.updatedAt ?? null,
      imageURL: rawGroup.imageURL ?? rawGroup.img ?? null,
      rawGroup,
      rawMembers,
      rawActivity,
      activity: rawActivity.map(a => mapTxnToActivity(a)),
      members: rawMembers
    };

    return ui;
  } catch (err) {
    console.error('group_overview.api.getGroupById error', err);
    return null;
  }
}

/* ----------------------
   subscribeToGroup
   Calls callback with merged object (same shape as getGroupById returns)
   Returns unsubscribe function (or null if unavailable)
   ---------------------- */
export async function subscribeToGroup(gid, callback) {
  const db = await ensureFirestore();
  if (!db) {
    console.warn('subscribeToGroup: no firestore instance');
    return () => {};
  }

  const { doc, onSnapshot, collection, query, orderBy, limit, onSnapshot: onSnapshotColl } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  try {
    const unsubscribes = [];

    // watch group doc
    const groupRef = doc(db, 'groups', gid);
    const groupUnsub = onSnapshot(groupRef, async groupSnap => {
      // fetch members + activity once on group update (we could also subscribe them individually)
      try {
        const [members, activity] = await Promise.all([
          (async () => {
            const membersRef = collection(db, 'groups', gid, 'members');
            const membersQ = query(membersRef);
            const ms = await (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getDocs(membersQ);
            const arr = []; ms.forEach(d => arr.push({ id: d.id, ...d.data() })); return arr;
          })(),
          (async () => {
            const txRef = collection(db, 'groups', gid, 'transactions');
            const txQ = query(txRef, orderBy('timestamp', 'desc'), limit(20));
            const txs = await (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getDocs(txQ);
            const arr = []; txs.forEach(d => arr.push({ id: d.id, ...d.data() })); return arr;
          })()
        ]);

        const rawGroup = groupSnap.exists() ? { id: groupSnap.id, ...groupSnap.data() } : null;
        const ui = {
          id: rawGroup?.id ?? gid,
          name: rawGroup?.groupName ?? rawGroup?.name ?? '',
          code: rawGroup?.code ?? rawGroup?.groupCode ?? '',
          membersCount: rawGroup?.membersCount ?? members.length,
          monthly: rawGroup?.contributionAmount ?? rawGroup?.monthly ?? 0,
          balance: rawGroup?.groupBalance ?? rawGroup?.balance ?? 0,
          summary: rawGroup?.summary ?? '',
          payoutCycle: rawGroup?.payoutCycle ?? null,
          payoutSchedule: rawGroup?.payoutSchedule ?? null,
          rotationIndex: rawGroup?.rotationIndex ?? null,
          lastPayoutDate: rawGroup?.lastPayoutDate ?? null,
          status: rawGroup?.status ?? null,
          archivedAt: rawGroup?.archivedAt ?? null,
          updatedAt: rawGroup?.updatedAt ?? null,
          imageURL: rawGroup?.imageURL ?? null,
          rawGroup,
          rawMembers: members,
          rawActivity: activity,
          activity: activity.map(a => mapTxnToActivity(a)),
          members
        };

        // call callback (defensive)
        try { callback(ui); } catch (e) { console.warn('subscribeToGroup callback error', e); }
      } catch (err) {
        console.warn('subscribeToGroup inner fetch failed', err);
      }
    });

    unsubscribes.push(groupUnsub);

    // subscribe to members live (update callback quickly)
    const membersRef = collection(db, 'groups', gid, 'members');
    const membersQ = query(membersRef);
    const membersUnsub = onSnapshot(membersQ, snapshot => {
      const members = [];
      snapshot.forEach(d => members.push({ id: d.id, ...d.data() }));
      // call callback with just members update
      try { callback({ rawMembers: members, members }); } catch (e) { console.warn('members callback error', e); }
    });
    unsubscribes.push(membersUnsub);

    // subscribe to recent transactions live
    const txRef = collection(db, 'groups', gid, 'transactions');
    const txQ = query(txRef, orderBy('timestamp', 'desc'), limit(20));
    const txUnsub = onSnapshot(txQ, snapshot => {
      const txs = [];
      snapshot.forEach(d => txs.push({ id: d.id, ...d.data() }));
      try { callback({ rawActivity: txs, activity: txs.map(a => mapTxnToActivity(a)) }); } catch (e) { console.warn('tx callback error', e); }
    });
    unsubscribes.push(txUnsub);

    // return combined unsubscribe
    return () => unsubscribes.forEach(u => { try { u(); } catch(e){} });
  } catch (err) {
    console.error('subscribeToGroup error', err);
    return () => {};
  }
}

/* ----------------------
   subscribeToMembers (members-only)
   ---------------------- */
export async function subscribeToMembers(gid, cb) {
  const db = await ensureFirestore();
  if (!db) return () => {};
  const { collection, query, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  try {
    const membersRef = collection(db, 'groups', gid, 'members');
    const membersQ = query(membersRef);
    const unsub = onSnapshot(membersQ, snap => {
      const members = []; snap.forEach(d => members.push({ id: d.id, ...d.data() }));
      try { cb(members); } catch (e) { console.warn('subscribeToMembers callback error', e); }
    });
    return unsub;
  } catch (err) {
    console.warn('subscribeToMembers failed', err);
    return () => {};
  }
}

/* ----------------------
   subscribeToActivity (transactions-only)
   ---------------------- */
export async function subscribeToActivity(gid, cb) {
  const db = await ensureFirestore();
  if (!db) return () => {};
  const { collection, query, orderBy, limit, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  try {
    const txRef = collection(db, 'groups', gid, 'transactions');
    const txQ = query(txRef, orderBy('timestamp', 'desc'), limit(20));
    const unsub = onSnapshot(txQ, snap => {
      const txs = [];
      snap.forEach(d => txs.push({ id: d.id, ...d.data() }));
      try { cb(txs.map(a => mapTxnToActivity(a))); } catch(e) { console.warn('subscribeToActivity cb error', e); }
    });
    return unsub;
  } catch (err) {
    console.warn('subscribeToActivity failed', err);
    return () => {};
  }
}

/* ----------------------
   Attach to window for quick usage
   ---------------------- */
window.getGroupById = window.getGroupById || getGroupById;
window.subscribeToGroup = window.subscribeToGroup || subscribeToGroup;
window.subscribeToMembers = window.subscribeToMembers || subscribeToMembers;
window.subscribeToActivity = window.subscribeToActivity || subscribeToActivity;
