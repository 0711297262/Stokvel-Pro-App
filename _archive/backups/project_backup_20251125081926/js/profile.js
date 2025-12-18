/* profile.js */

import {
    getFirestore,
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// --- Initialization ---
const db = window.db || getFirestore();
const auth = window.auth || getAuth();

// Get target UID and Group ID from URL
const urlParams = new URLSearchParams(window.location.search);
const targetUID = urlParams.get('uid');
const groupId = urlParams.get('gid');

if (!targetUID || !groupId) {
    alert("Error: Missing member or group identifier.");
    window.location.href = "dashboard.html";
}

let currentUser = null;

// --- DOM Element Refs ---
function $(id) { return document.getElementById(id); }

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html"; // Redirect if not logged in
        return;
    }
    currentUser = user;
    loadProfile();
});


// --- Core Data Loading ---

async function loadProfile() {
    try {
        // 1. Fetch Group Information (for name and context)
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        
        if (!groupSnap.exists()) {
            throw new Error("Group not found.");
        }
        const groupData = groupSnap.data();

        // Update back link and group name label
        $('backLink').href = `group_overview.html?gid=${groupId}`;
        $('groupNameLabel').textContent = `Group: ${groupData.groupName || groupData.name}`;

        
        // 2. Fetch Group-Specific Member Data (financials and role)
        const memberRef = doc(db, "groups", groupId, "members", targetUID);
        const memberSnap = await getDoc(memberRef);
        
        if (!memberSnap.exists()) {
            throw new Error(`Member with UID ${targetUID} not found in this group.`);
        }
        const memberData = memberSnap.data();
        
        // 3. Fetch General User Data (for email/phone - optional)
        // NOTE: This relies on you saving this data in the 'users' top-level collection.
        const userRef = doc(db, 'users', targetUID);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};


        // --- Rendering ---
        
        const memberName = memberData.name || userData.name || targetUID;
        const totalContrib = memberData.contributionsTotal || 0;
        const totalPayouts = memberData.payoutsReceived || 0;

        // Set Title
        $('pageTitle').textContent = `${memberName}'s Profile — Stokvel PRO`;
        
        // Header
        $('memberName').textContent = memberName;
        $('memberRole').textContent = `Role: ${memberData.role || 'Member'}`;
        $('memberAvatar').textContent = memberName.charAt(0).toUpperCase();

        // Financial Summary
        $('totalContributions').textContent = `R ${totalContrib.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        $('totalPayouts').textContent = `R ${totalPayouts.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        
        // Contact Details
        $('memberEmail').textContent = userData.email || 'N/A';
        $('memberPhone').textContent = userData.phone || 'N/A';

    } catch (error) {
        console.error("Failed to load profile:", error);
        $('memberName').textContent = "Profile Load Error";
        $('memberRole').textContent = `Error: ${error.message}`;
    }
}