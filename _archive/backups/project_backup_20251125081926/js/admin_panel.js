/* ------------------------------------------
   ADMIN PANEL — STOKVEL PRO
   Phase 3: Payout Logic and Member Cleanup
------------------------------------------- */

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  // 🚩 ADDED FOR PHASE 3
  runTransaction, 
  arrayRemove, 
  arrayUnion, 
  increment,
  collection, 
  deleteDoc, 
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Firebase
const db = getFirestore();
const auth = getAuth();

// Helpers
function el(id) {
  return document.getElementById(id);
}

// Global state
let groupData = null; // Store group data here for reference
const params = new URLSearchParams(window.location.search);
const groupId = params.get("id");

if (!groupId) {
  alert("Missing group ID");
  window.location = "dashboard.html";
}
window.groupId = groupId; // Expose to window for inline HTML calls

// ---------------------------
// Load Group + Members
// ---------------------------
async function loadAdminPanel() {
  const user = auth.currentUser;
  if (!user) return (window.location = "index.html");

  const docRef = doc(db, "groups", groupId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    alert("Group not found");
    window.location = "dashboard.html";
    return;
  }

  groupData = snap.data(); // 🚩 Store globally
  const members = groupData.members || [];
  
  el("groupName").textContent = groupData.groupName || 'Admin Panel';

  // Display current next recipient information
  const nextRecipientUID = groupData.payoutSchedule?.[0];
  const nextRecipient = members.find(m => m.uid === nextRecipientUID);
  const nextRecipientName = nextRecipient ? nextRecipient.name || nextRecipient.uid : 'N/A';
  
  el("groupMeta").innerHTML = `
      Current Balance: <strong>R ${(groupData.balance || 0).toFixed(2)}</strong> 
      | Next Payout to: <strong>${nextRecipientName}</strong>
  `;


  // Display list
  const list = el("memberList"); // Corrected ID reference
  list.innerHTML = "";

  members.forEach((m) => {
    const isSelf = m.uid === user.uid;
    const isCreator = groupData.createdBy === m.uid;
    const isNext = m.uid === nextRecipientUID;

    const row = document.createElement("div");
    row.className = "memberItem";
    row.style.background = isNext ? 'rgba(43, 108, 176, 0.1)' : '';

    row.innerHTML = `
      <div class="left">
        <div class="avatar">${(m.name || m.uid).charAt(0)}</div>
        <div>
          <div class="name">${m.name || m.uid}</div>
          <div class="roleTag">${m.role} ${isNext ? '— Next Payout' : ''}</div>
        </div>
      </div>

      <div class="actions">
        ${
          isCreator
            ? `<span class="creatorTag">Creator</span>`
            : isSelf ? '' : `
          <button class="btnSmall" onclick="promote('${m.uid}')">Promote</button>
          <button class="btnSmall danger" onclick="removeMember('${m.uid}')">Remove</button>`
        }
      </div>
    `;

    list.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", loadAdminPanel);


// ---------------------------
// Show Confirm Sheet 
// ---------------------------
function showConfirm(msg, onConfirm) {
  const sheet = document.querySelector(".confirmSheet"); 
  if (!sheet) return onConfirm(); 
  
  el("confirmMessage").textContent = msg;

  sheet.style.display = "flex";

  el("confirmYes").onclick = () => {
    sheet.style.display = "none";
    onConfirm();
  };
  el("confirmCancel").onclick = () => {
    sheet.style.display = "none";
  };
}
window.showConfirm = showConfirm;

// ---------------------------
// Promote Member (Admin Only)
// ---------------------------
async function promote(uid) {
  showConfirm("Promote this member to admin?", async () => {
    const ref = doc(db, "groups", groupId);
    
    // Find member by UID and update role
    const updated = groupData.members.map((m) =>
      m.uid === uid ? { ...m, role: "admin" } : m
    );

    await updateDoc(ref, { members: updated });

    alert("Member promoted");
    loadAdminPanel();
  });
}
window.promote = promote; 

// ---------------------------
// 🚩 NEW: Trigger Payout (The core financial logic)
// ---------------------------
async function triggerPayout() {
    const docRef = doc(db, "groups", groupId);
    
    // Determine the payout amount
    const membersCount = groupData.membersCount || 0;
    const contributionAmount = groupData.contributionAmount || groupData.monthlyAmount || 0;
    const PAYOUT_AMOUNT = contributionAmount * membersCount; 

    showConfirm(`Trigger a Payout of R${PAYOUT_AMOUNT.toFixed(2)} to the next member? This is an irreversible financial transaction.`, async () => {
        try {
            await runTransaction(db, async (transaction) => {
                const groupSnap = await transaction.get(docRef);
                if (!groupSnap.exists()) {
                    throw "Group does not exist!";
                }
                const group = groupSnap.data();

                const currentBalance = group.balance || 0;
                const payoutSchedule = group.payoutSchedule || [];
                const nextMemberUID = payoutSchedule[0];
                
                if (payoutSchedule.length === 0) {
                    throw "Payout schedule is empty. No one to pay.";
                }

                if (currentBalance < PAYOUT_AMOUNT) {
                    throw `Insufficient funds. Balance is R${currentBalance.toFixed(2)}, but R${PAYOUT_AMOUNT.toFixed(2)} is required.`;
                }

                // 1. Update Group State
                // Rotate the schedule: remove the front, add to the back
                const newSchedule = [...payoutSchedule.slice(1), nextMemberUID];

                transaction.update(docRef, {
                    balance: increment(-PAYOUT_AMOUNT), // Deduct amount
                    payoutSchedule: newSchedule, // Update rotation
                    payoutsCount: increment(1)
                });
                
                // 2. Record Transaction (The 'receipt' for the payout)
                const transactionsRef = collection(db, "groups", groupId, "transactions");
                const newTransactionRef = doc(transactionsRef);
                transaction.set(newTransactionRef, {
                    type: "payout",
                    uid: nextMemberUID,
                    amount: PAYOUT_AMOUNT,
                    timestamp: serverTimestamp(),
                    note: `Paid rotation payout for ${group.groupName}`
                });
            });

            alert(`Payout of R${PAYOUT_AMOUNT.toFixed(2)} successfully processed!`);
            loadAdminPanel(); // Refresh UI to show new balance and schedule
            
        } catch (error) {
            console.error("Payout Failed:", error);
            if (typeof error === 'string') {
                alert(`Payout failed: ${error}`);
            } else {
                alert(`Payout failed: ${error.message}`);
            }
        }
    });
}
window.triggerPayout = triggerPayout; 

// ---------------------------
// 🚩 UPDATED: Remove Member (Includes Payout Schedule cleanup)
// ---------------------------
async function removeMember(uid) {
  showConfirm("Remove this member from the stokvel? This will remove them from the payout rotation.", async () => {
    const ref = doc(db, "groups", groupId);
    
    if (!groupData) return;

    // Filter all relevant arrays
    const updatedMembers = groupData.members.filter((m) => m.uid !== uid);
    const updatedMemberIds = (groupData.memberUIDs || []).filter((id) => id !== uid); 
    
    // 🚩 CRUCIAL PHASE 2 UPDATE: Remove member from the payout rotation
    const updatedPayoutSchedule = (groupData.payoutSchedule || []).filter((id) => id !== uid);

    await updateDoc(ref, {
      members: updatedMembers,
      memberUIDs: updatedMemberIds, 
      payoutSchedule: updatedPayoutSchedule, 
      membersCount: increment(-1) // Atomically decrement
    });
    
    // Also delete the dedicated member document (if used)
    try {
        await deleteDoc(doc(db, "groups", groupId, "members", uid));
    } catch(e) {
        console.warn("Could not delete member sub-document. Continuing.");
    }


    alert("Member removed and group stats updated.");
    loadAdminPanel();
  });
}
window.removeMember = removeMember;