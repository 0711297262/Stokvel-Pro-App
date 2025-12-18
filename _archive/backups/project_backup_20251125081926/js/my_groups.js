import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";

import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

import { getFirestore, collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Firebase config
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

// Check login
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  loadGroups(user.uid);
});

// Load the groups from Firestore
async function loadGroups(userId) {
  const groupsList = document.getElementById("groupsList");
  const emptyMsg = document.getElementById("emptyMsg");

  const groupsRef = collection(db, `users/${userId}/groups`);
  const snapshot = await getDocs(groupsRef);

  if (snapshot.empty) {
    emptyMsg.style.display = "block";
    return;
  }

  snapshot.forEach((doc) => {
    const g = doc.data();

    const card = document.createElement("div");
    card.classList.add("group-card");

    card.innerHTML = `
      <div class="group-title">${g.groupName}</div>

      <div class="group-info">
        Monthly Contribution: R${g.monthlyAmount || "0"} <br>
        Next Meeting: ${g.meetingDate || "Not set"}
      </div>

      <button onclick="openGroup('${doc.id}')">Open Group</button>
    `;

    groupsList.appendChild(card);
  });
}

// Open a group — temporary
window.openGroup = function (groupId) {
  alert("Opening group: " + groupId);
  // Later → window.location = "group_dashboard.html?gid=" + groupId;
}
