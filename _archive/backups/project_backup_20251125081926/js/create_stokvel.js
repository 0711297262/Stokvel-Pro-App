import {
  getFirestore, 
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// !!! CRITICAL: Must import the initialized 'app' object !!!
import { app } from "./firebase-config.js"; 

// Helper to generate a unique code
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ----------------------------------------------------
// Core function to handle group creation
// ----------------------------------------------------
async function handleCreateStokvel() {
    // 1. Get Authentication and Firestore instances using the imported 'app'
    const auth = getAuth(app); 
    const db = getFirestore(app); 

    // 2. Check User State
    const user = auth.currentUser;
    if (!user) {
        alert("Not logged in. Redirecting to login.");
        window.location.href = "index.html";
        return;
    }

    // 3. Collect and Validate Inputs
    const name = document.getElementById("groupName").value.trim();
    const amount = document.getElementById("contribution").value.trim(); 
    const description = document.getElementById("description").value.trim();
    const monthlyDue = document.getElementById("monthlyDueInput").value.trim();

    if (!name || !amount || !monthlyDue) {
        alert("Please fill in the Group Name, Contribution Amount, and Due Date.");
        return;
    }
    
    const groupCode = generateCode();

    try {
        // 4. Create main group document 
        const groupRef = await addDoc(collection(db, "groups"), {
            groupName: name,
            groupCode: groupCode,
            contributionAmount: Number(amount),
            monthlyDueDate: Number(monthlyDue),
            description: description,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            adminId: user.uid,
            membersCount: 1, 
            balance: 0, 
            status: "active",
            payoutSchedule: [user.uid] 
        });

        // 5. Add user to members subcollection 
        await setDoc(doc(db, "groups", groupRef.id, "members", user.uid), {
            uid: user.uid,
            name: user.displayName || user.phoneNumber || 'User', 
            phone: user.phoneNumber || null,
            role: "admin",
            joinedAt: serverTimestamp(),
            contributionsTotal: 0, 
            payoutsReceived: 0
        });

        // 6. Update user's profile with new group ID
        await setDoc(
            doc(db, "users", user.uid),
            {
                groups: [groupRef.id]
            },
            { merge: true }
        );

        alert(`Stokvel created successfully! Group Code: ${groupCode}`);
        window.location.href = "dashboard.html"; 

    } catch (error) {
        console.error("Error creating stokvel:", error);
        alert("Error creating stokvel: " + (error.message || "Please check console for details."));
    }
}


// ----------------------------------------------------
// DOM READY CHECK - Robustly Attach listener
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const createBtn = document.getElementById("createBtn");
    if (createBtn) {
        createBtn.addEventListener("click", handleCreateStokvel);
    } else {
        console.error("Error: Button with ID 'createBtn' not found.");
    }

    // Redirect unauthenticated users
    const auth = getAuth(app);
    onAuthStateChanged(auth, (user) => {
        if (!user) {
             // window.location.href = "index.html"; 
        }
    });
});