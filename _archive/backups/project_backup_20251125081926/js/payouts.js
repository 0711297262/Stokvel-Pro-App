/* payouts.js */

import {
    getFirestore,
    doc,
    onSnapshot,
    updateDoc,
    arrayRemove,
    arrayUnion,
    serverTimestamp,
    increment,
    collection,
    addDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// --- Initialization ---
const params = new URLSearchParams(window.location.search);
const groupId = params.get("gid");
if (!groupId) {
    alert("Missing group ID.");
    window.location.href = "dashboard.html";
}

const db = window.db || getFirestore();
const auth = window.auth || getAuth();
const groupRef = doc(db, "groups", groupId);
const currentUid = auth.currentUser?.uid;

let groupData = null;
let membersMap = {};

// --- UI Elements ---
const groupNameEl = document.getElementById('groupName');
const currentBalanceEl = document.getElementById('currentBalance');
const payoutAmountEl = document.getElementById('payoutAmount');
const currentRecipientNameEl = document.getElementById('currentRecipientName');
const rotationScheduleList = document.getElementById('rotationScheduleList');
const payoutBtn = document.getElementById('payoutBtn');
const backLink = document.getElementById('backLink');

// Modal Elements
const payoutModal = document.getElementById('payoutModal');
const modalPayoutAmount = document.getElementById('modalPayoutAmount');
const modalRecipientName = document.getElementById('modalRecipientName');
const confirmPayoutBtn = document.getElementById('confirmPayoutBtn');
const cancelPayoutBtn = document.getElementById('cancelPayoutBtn');

// --- Realtime Listener ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    backLink.href = `group_overview.html?gid=${groupId}`;
    loadPayoutsModule(user.uid);
});

async function loadPayoutsModule(userUid) {
    // 1. Fetch all members once to build the map
    const membersSnap = await getDoc(groupRef);
    const membersData = membersSnap.data().members || [];
    membersData.forEach(m => membersMap[m.uid] = m);

    // 2. Set up real-time listener for the group document
    onSnapshot(groupRef, (docSnap) => {
        if (!docSnap.exists()) return alert("Group not found.");
        groupData = docSnap.data();

        // Check Admin Status (only admin can trigger payout)
        const isAdmin = groupData.adminId === userUid || membersMap[userUid]?.role === 'admin';
        payoutBtn.style.display = isAdmin ? 'block' : 'none';
        
        renderPayoutsUI(isAdmin);
    });

    // 3. Attach Event Listeners
    payoutBtn.onclick = openPayoutConfirmation;
    cancelPayoutBtn.onclick = () => payoutModal.style.display = 'none';
    confirmPayoutBtn.onclick = handlePayoutTransaction;
}

// --- Rendering Logic ---
function renderPayoutsUI(isAdmin) {
    if (!groupData) return;

    groupNameEl.textContent = `${groupData.name} - Payouts`;
    
    const contributionAmount = groupData.contributionAmount || groupData.monthlyAmount || 0;
    const membersCount = groupData.membersCount || 0;
    const requiredPayout = contributionAmount * membersCount;
    
    currentBalanceEl.textContent = `R ${Number(groupData.balance || 0).toFixed(2)}`;
    payoutAmountEl.textContent = `R ${requiredPayout.toFixed(2)}`;

    // Get current recipient
    const schedule = groupData.payoutSchedule || [];
    const currentRecipientUid = schedule[0];
    const currentRecipient = membersMap[currentRecipientUid];
    
    currentRecipientNameEl.textContent = currentRecipient ? currentRecipient.name : 'No Recipient Set';

    // Show/Hide Payout button based on funds and admin status
    if (isAdmin && groupData.balance >= requiredPayout && currentRecipientUid) {
        payoutBtn.disabled = false;
        payoutBtn.textContent = `Initiate Payout to ${currentRecipient ? currentRecipient.name : 'N/A'}`;
    } else {
        payoutBtn.disabled = true;
        if (groupData.balance < requiredPayout) {
            payoutBtn.textContent = 'Insufficient Funds';
        } else if (!currentRecipientUid) {
            payoutBtn.textContent = 'No Recipient in Schedule';
        } else {
            payoutBtn.textContent = 'Admin Only';
        }
    }

    // Render Rotation List
    rotationScheduleList.innerHTML = '';
    if (schedule.length === 0) {
        rotationScheduleList.innerHTML = '<li><div class="name">No members in rotation schedule.</div></li>';
        return;
    }

    schedule.forEach((uid, index) => {
        const member = membersMap[uid];
        const li = document.createElement('li');
        li.className = index === 0 ? 'current' : '';
        li.innerHTML = `
            <div style="display:flex; align-items:center;">
                <span class="index">${index + 1}.</span>
                <div>
                    <div class="name">${member ? member.name : `Unknown Member (${uid})`}</div>
                    <div class="status">${index === 0 ? 'Current Recipient' : 'Next in Line'}</div>
                </div>
            </div>
        `;
        rotationScheduleList.appendChild(li);
    });
}

// --- Payout Transaction Logic ---
function openPayoutConfirmation() {
    const contributionAmount = groupData.contributionAmount || groupData.monthlyAmount || 0;
    const membersCount = groupData.membersCount || 0;
    const requiredPayout = contributionAmount * membersCount;
    const currentRecipientUid = groupData.payoutSchedule[0];
    const recipientName = membersMap[currentRecipientUid]?.name || 'N/A';

    modalPayoutAmount.textContent = `R ${requiredPayout.toFixed(2)}`;
    modalRecipientName.textContent = recipientName;
    payoutModal.style.display = 'flex';
}

async function handlePayoutTransaction() {
    payoutModal.style.display = 'none';
    
    const contributionAmount = groupData.contributionAmount || groupData.monthlyAmount || 0;
    const membersCount = groupData.membersCount || 0;
    const requiredPayout = contributionAmount * membersCount;
    const currentRecipientUid = groupData.payoutSchedule[0];

    if (!currentRecipientUid) {
        return alert("Error: No current recipient in schedule.");
    }

    try {
        // 1. Atomically update Group Document
        await updateDoc(groupRef, {
            // Subtract the payout amount from the balance
            balance: increment(-requiredPayout), 
            // Move the current recipient to the end of the schedule
            payoutSchedule: arrayUnion(...groupData.payoutSchedule.slice(1), currentRecipientUid),
            // Remove the current recipient from the front of the schedule
            payoutSchedule: arrayRemove(currentRecipientUid),
            rotationIndex: increment(1),
            lastPayoutDate: serverTimestamp()
        });
        
        // 2. Atomically update Member Document (Recipient)
        const recipientRef = doc(db, "groups", groupId, "members", currentRecipientUid);
        await updateDoc(recipientRef, {
            payoutsReceived: increment(requiredPayout)
        });

        // 3. Record Payout Transaction
        await addDoc(collection(groupRef, 'contributions'), {
            uid: currentRecipientUid,
            memberName: membersMap[currentRecipientUid]?.name || 'N/A',
            amount: -requiredPayout, // Negative amount for a payout
            type: 'payout',
            createdAt: serverTimestamp(),
            recordedBy: auth.currentUser.uid
        });

        alert(`Payout of R ${requiredPayout.toFixed(2)} recorded and rotation complete!`);

    } catch (error) {
        console.error("Payout transaction failed:", error);
        alert("Error processing payout. See console for details.");
        // Revert UI change if possible or force refresh
        loadPayoutsModule(auth.currentUser.uid); 
    }
}