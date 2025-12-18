// create-meeting.js
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

    const { gid, whenISO, location, agenda } = JSON.parse(event.body || "{}");
    if (!gid || !whenISO) return { statusCode: 400, body: "Missing gid or whenISO" };

    const gRef = db.collection("groups").doc(gid);
    const gSnap = await gRef.get();
    if (!gSnap.exists) return { statusCode: 404, body: "Group not found" };

    const g = gSnap.data();
    // Only members can schedule meetings (you can tighten to admin only)
    if (!Array.isArray(g.memberUIDs) || !g.memberUIDs.includes(uid)) return { statusCode: 403, body: "Not a group member" };

    const meetingsRef = gRef.collection('meetings');
    const added = await meetingsRef.add({
      when: new Date(whenISO),
      location: location || null,
      agenda: agenda || null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: uid,
      createdByName: decoded.name || null
    });

    // Optionally update group's nextPayoutDate or nextMeeting field
    await gRef.update({ nextPayoutDate: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });

    return { statusCode: 200, body: JSON.stringify({ success: true, id: added.id }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
