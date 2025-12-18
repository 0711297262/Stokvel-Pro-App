// create-contribution.js
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

    const { gid, amount } = JSON.parse(event.body || "{}");
    if (!gid || !amount) return { statusCode: 400, body: "Missing gid or amount" };

    const gRef = db.collection("groups").doc(gid);
    const gSnap = await gRef.get();
    if (!gSnap.exists) return { statusCode: 404, body: "Group not found" };

    const g = gSnap.data();
    if (!Array.isArray(g.memberUIDs) || !g.memberUIDs.includes(uid)) return { statusCode: 403, body: "Not a member" };

    const contribRef = gRef.collection('contributions').doc();
    await contribRef.set({
      by: uid,
      byName: decoded.name || null,
      amount: Number(amount),
      createdAt: FieldValue.serverTimestamp()
    });

    // Optionally update group balance atomically
    await gRef.update({
      groupBalance: FieldValue.increment(Number(amount)),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { statusCode: 200, body: JSON.stringify({ success: true, id: contribRef.id }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
