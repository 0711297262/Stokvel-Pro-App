// remove-member.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const authHeader = event.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return { statusCode: 401, body: "Missing token" };
    const idToken = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { gid, targetUid } = JSON.parse(event.body || "{}");
    if (!gid || !targetUid) return { statusCode: 400, body: "Missing gid or targetUid" };

    const gRef = db.collection("groups").doc(gid);
    const gSnap = await gRef.get();
    if (!gSnap.exists) return { statusCode: 404, body: "Group not found" };

    const g = gSnap.data();
    const isAdmin = (g.createdBy === uid) || (Array.isArray(g.members) && g.members.some(m => m.uid === uid && (m.role === 'admin' || m.role === 'owner')));
    if (!isAdmin) return { statusCode: 403, body: "Not authorized" };

    // Remove member object and memberUID
    const newMembers = (g.members || []).filter(m => m.uid !== targetUid);

    await gRef.update({
      members: newMembers,
      memberUIDs: FieldValue.arrayRemove(targetUid),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
