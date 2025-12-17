// add_contribution.js
// Module: Records contributions to groups/{groupId}/contributions
// Ensure you include: <script type="module" src="add_contribution.js"></script> in group_overview.html

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// --- Firebase app is usually initialized elsewhere in your app.
// If you already initialize in group_overview.js or a common file, remove the initializeApp call here.
// For safety, we attempt to reuse existing app — modular SDK will reuse the default app.
const db = getFirestore();
const auth = getAuth();

// helpers
function el(id){ return document.getElementById(id) }
function showToast(msg, type='info'){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position='fixed'; t.style.right='18px'; t.style.bottom='18px';
  t.style.background = type==='success' ? 'linear-gradient(90deg,#16a34a,#059669)' : '#1a365d';
  t.style.color='white'; t.style.padding='10px 14px'; t.style.borderRadius='10px'; t.style.zIndex = 99999;
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),350) }, 2200);
}

// Open / close modal (used by group_overview.html)
window.openRecordContribution = async function(groupId, groupData){
  // populate member dropdown
  const sel = el('rcMember');
  sel.innerHTML = '';
  const members = (groupData && groupData.members) || [];

  if(members.length === 0){
    const opt = document.createElement('option'); opt.value=''; opt.textContent='No members'; sel.appendChild(opt);
  } else {
    members.forEach(m=>{
      const opt = document.createElement('option');
      opt.value = m.uid;
      opt.textContent = `${m.name || m.phone || m.uid} ${m.role === 'admin' ? '· Admin' : ''}`;
      sel.appendChild(opt);
    });
  }

  el('rcAmount').value = '';
  el('rcNote').value = '';
  el('recordContributionModal').style.display = 'flex';
  // store current groupId for submit handler
  window.__rc_groupId = groupId;
};

window.closeRecordContribution = function(){
  el('recordContributionModal').style.display = 'none';
  window.__rc_groupId = null;
};

// Submit handler
window.submitRecordContribution = async function(){
  try{
    const groupId = window.__rc_groupId;
    if(!groupId) { alert('No group selected'); return; }

    const memberUid = el('rcMember').value;
    const amount = Number(el('rcAmount').value);
    const note = el('rcNote').value || '';

    if(!memberUid) { alert('Select a member'); return; }
    if(!amount || amount <= 0) { alert('Enter a valid amount'); return; }

    const user = auth.currentUser;
    if(!user){ alert('Please login'); return window.location='index.html'; }

    showToast('Recording contribution...');

    // 1) Create contribution doc under subcollection
    const contribRef = collection(db, 'groups', groupId, 'contributions');
    const contribDoc = {
      uid: memberUid,
      amount: amount,
      note: note,
      memberName: '', // we'll fill in below if possible
      recordedBy: user.uid,
      createdAt: serverTimestamp()
    };

    // Attempt to get member name from group doc
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if(groupSnap.exists()){
      const g = groupSnap.data();
      const mem = (g.members || []).find(x => x.uid === memberUid);
      if(mem) contribDoc.memberName = mem.name || mem.phone || '';
    }

    await addDoc(contribRef, contribDoc);

    // 2) Update group's aggregate balance using atomic increment (if you maintain balance)
    // Use 'balance' field in group doc; if missing it will be created.
    try {
      await updateDoc(groupRef, { balance: increment(amount) });
    } catch(e){
      // if update fails due to permissions or missing document, ignore — UI will still show contributions list
      console.warn('Failed to update group balance (non-fatal):', e);
    }

    // Done — refresh UI by triggering your group_overview's refresh handler (if exists)
    // Many group_overview implementations expose loadGroup(groupId) or loadContributions(); we call both if available.
    if(typeof window.loadContributions === 'function') {
      window.loadContributions(groupId);
    }
    if(typeof window.loadGroup === 'function') {
      // optional: re-fetch group to get updated balance & members
      try { await window.loadGroup(groupId, user.uid); } catch(e){}
    }

    closeRecordContribution();
    showToast('Contribution recorded', 'success');

  } catch(err){
    console.error(err);
    alert('Failed to record contribution: ' + (err.message || err));
  }
};
