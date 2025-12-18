/* ----------------------------
   Record Contribution (Updated)
   ---------------------------- */

window.openAddContribution = function() {
  const sel = document.getElementById('contribMember');
  sel.innerHTML = '';

  if (!groupData || !groupData.members) {
    sel.innerHTML = '<option>No members</option>';
  } else {
    groupData.members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.uid;
      opt.textContent = `${m.name || m.phone} ${m.role === 'admin' ? '· Admin' : ''}`;
      sel.appendChild(opt);
    });
  }

  document.getElementById('contribAmount').value = '';
  document.getElementById('contribNote').value = '';
  document.getElementById('addContributionModal').style.display = 'flex';
};

window.closeAddContribution = function() {
  document.getElementById('addContributionModal').style.display = 'none';
};

/* This replaces the original submitContribution() function in your add_contribution.js file */

async function submitContribution() {
  try {
    const memberUid = document.getElementById('contribMember').value;
    const amount = Number(document.getElementById('contribAmount').value);
    const note = document.getElementById('contribNote').value;

    if (!memberUid) return alert('Select a member');
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    
    // Ensure you have global access to groupData and groupId from group_overview.js
    if (!groupId) return alert('Error: Group ID not available.');

    showTempToast('Recording contribution…');

    const groupRef = doc(db, 'groups', groupId);
    const memberRef = doc(db, 'groups', groupId, 'members', memberUid);
    const contribCollectionRef = collection(groupRef, 'contributions'); 
    
    // Find member name for audit trail/history display
    // NOTE: This assumes 'groupData' is a globally available object set by loadGroup()
    const memberName = groupData.members.find(m => m.uid === memberUid)?.name || 'N/A';
    
    const contribDoc = {
      uid: memberUid,
      memberName: memberName,
      amount: amount,
      note: note || '',
      type: 'contribution', // Use 'contribution' for clear filtering
      createdAt: serverTimestamp(),
      recordedBy: auth.currentUser.uid
    };

    // --- FINANCIAL TRANSACTION (Three Atomic Steps) ---

    // 1. Record the contribution document in the 'contributions' subcollection
    // Note: The previous logic was listening to the 'contributions' subcollection, 
    // so we use this instead of the 'transactions' subcollection.
    await addDoc(contribCollectionRef, contribDoc);

    // 2. Atomically update the group's aggregate balance (CRUCIAL for Payout Phase 2)
    await updateDoc(groupRef, {
      balance: increment(amount)
    });
    
    // 3. Atomically update the member's total contribution count
    await updateDoc(memberRef, {
      contributionsTotal: increment(amount)
    });
    
    // --- END TRANSACTION ---

    closeAddContribution();
    showTempToast('Contribution recorded', 'success');

    // Refresh UI
    // Ensure these functions (loadGroup, loadContributions) are accessible globally
    if (typeof window.loadGroup === 'function') {
        window.loadGroup(groupId, auth.currentUser.uid); 
    }
    if (typeof window.loadContributions === 'function') {
        window.loadContributions(groupId); 
    }

  } catch (err) {
    console.error(err);
    alert('Failed to record contribution. Check console for details.');
  }
}
// group_overview.js (Add/Update these parts)

// 1. Add/Update necessary imports (Ensure these are present at the top)
import { 
    getFirestore,
    doc,
    onSnapshot, // Crucial for real-time balance updates
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getDoc, // For fetching group data
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
// ... other imports (getAuth, onAuthStateChanged)

// 2. Map the new UI elements
const groupBalanceEl = document.getElementById('groupBalance');
const monthlyAmountEl = document.getElementById('monthlyAmount');
const nextRecipientNameEl = document.getElementById('nextRecipientName');
const payoutsLink = document.getElementById('payoutsLink');
const contributionsLink = document.getElementById('contributionsLink');

let membersMap = {}; // A map to quickly find member names by UID

// 3. Update your main group loading function (e.g., loadGroup)
async function loadGroup(groupId, userUid) {
    const groupRef = doc(db, 'groups', groupId);
    
    // Set the links for navigation
    payoutsLink.href = `payouts.html?gid=${groupId}`;
    contributionsLink.href = `contributions.html?gid=${groupId}`;

    // A. Initial Load: Fetch members and set up the membersMap
    // NOTE: This assumes your members are stored as a subcollection or array.
    // Given previous snippets, we'll try to fetch the members from the subcollection.
    try {
        const membersColRef = collection(db, "groups", groupId, "members");
        const membersSnap = await getDocs(membersColRef);
        membersMap = {}; // Reset map
        membersSnap.forEach(memberDoc => {
            const memberData = memberDoc.data();
            membersMap[memberData.uid] = memberData.name || 'Anonymous';
        });
    } catch (e) {
        console.error("Could not fetch member subcollection:", e);
        // Fallback: If your members are stored directly on the group doc, fetch that once.
        const groupSnap = await getDoc(groupRef);
        const groupData = groupSnap.data();
        if (groupData && groupData.members) {
            groupData.members.forEach(member => {
                membersMap[member.uid] = member.name || member.phoneNumber || 'Anonymous';
            });
        }
    }


    // B. Real-time Listener for Group Data
    onSnapshot(groupRef, (docSnap) => {
        if (!docSnap.exists()) return console.error("Group data not found");
        const group = docSnap.data();
        
        // Update basic info (assuming you already do this)
        document.getElementById('groupName').textContent = group.name;

        // Update financial info
        const balance = Number(group.balance || 0).toFixed(2);
        groupBalanceEl.textContent = `R ${balance}`;

        const monthlyAmount = Number(group.monthlyAmount || 0).toFixed(2);
        monthlyAmountEl.textContent = `R ${monthlyAmount}`;

        // Get the next recipient
        const nextRecipientUid = group.payoutSchedule?.[0];
        const nextRecipientName = membersMap[nextRecipientUid] || 'N/A';
        nextRecipientNameEl.textContent = nextRecipientName;
    });

    // ... continue with other group_overview.js logic (e.g., loading chat or members list)
}

// ... ensure loadGroup is called when authenticated