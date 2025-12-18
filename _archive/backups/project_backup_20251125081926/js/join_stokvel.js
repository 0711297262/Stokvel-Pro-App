// /netlify/functions/join-group.js

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase admin (only once)
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);

// Netlify handler
export const handler = async (event, context) => {
  try {
    // Only POST is allowed
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Check auth bearer token
    const authHeader = event.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, body: "Missing token" };
    }

    // Verify Firebase token
    const idToken = authHeader.replace("Bearer ", "");
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(idToken);

    const uid = decoded.uid;
    const name = decoded.name || decoded.email || "Member";
    const phone = decoded.phone_number || null;

    const { groupCode } = JSON.parse(event.body || "{}");

    if (!groupCode) {
      return { statusCode: 400, body: "Missing groupCode" };
    }

    // 1️⃣ Find group by groupCode
    const groupsSnap = await db
      .collection("groups")
      .where("groupCode", "==", groupCode.toUpperCase())
      .limit(1)
      .get();

    if (groupsSnap.empty) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Invalid group code" }),
      };
    }

    const gDoc = groupsSnap.docs[0];
    const gRef = db.collection("groups").doc(gDoc.id);

    // 2️⃣ Atomically add user to group
    await gRef.update({
      // Add member object to the denormalized array
      members: FieldValue.arrayUnion({
        uid,
        name,
        phone,
        role: "member",
        joinedAt: FieldValue.serverTimestamp(),
      }),
      // Add UID to the list of member IDs
      memberUIDs: FieldValue.arrayUnion(uid),
      
      // 🚩 PHASE 2 INTEGRATION: Add to rotation and increment count
      payoutSchedule: FieldValue.arrayUnion(uid),
      membersCount: FieldValue.increment(1)
      // 🚩 END INTEGRATION
    });
    
    // 3️⃣ Update user's profile with the new group ID (for dashboard loading)
    const userRef = db.collection("users").doc(uid);
    await userRef.set({
        groups: FieldValue.arrayUnion(gDoc.id)
    }, { merge: true });


    // 4️⃣ Respond success
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        gid: gDoc.id,
        groupName: gDoc.data().groupName,
      }),
    };
  } catch (err) {
    console.error("JOIN-GROUP ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", details: err.message }),
    };
  }
};