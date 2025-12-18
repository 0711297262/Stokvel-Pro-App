// netlify/functions/send-reminders.js
const admin = require("firebase-admin");

let initialized = false;
function initAdmin() {
  if (initialized) return;

  const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(svc)
  });

  initialized = true;
}

exports.handler = async (event) => {
  try {
    initAdmin();
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Firebase init failed" })
    };
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let uid;
  try {
    const token = event.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new Error("Missing token");
    const decoded = await admin.auth().verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid token" }) };
  }

  const { gid } = JSON.parse(event.body || "{}");
  if (!gid) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing gid" }) };
  }

  const db = admin.firestore();

  // Verify admin access
  const adminDoc = await db.doc(`groups/${gid}/members/${uid}`).get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    return { statusCode: 403, body: JSON.stringify({ error: "Admin only" }) };
  }

  // Load group & members
  const groupSnap = await db.doc(`groups/${gid}`).get();
  const group = groupSnap.data() || {};
  const monthlyTarget = group.monthlyTarget || 0;

  // Define month range
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const startTs = admin.firestore.Timestamp.fromDate(start);
  const endTs = admin.firestore.Timestamp.fromDate(end);

  // Load monthly transactions
  const txnSnap = await db.collection(`groups/${gid}/transactions`)
    .where("timestamp", ">=", startTs)
    .where("timestamp", "<", endTs)
    .get();

  const totals = {};
  txnSnap.forEach(t => {
    if (t.data().type === "payout") return;
    const u = t.data().uid;
    const amt = Number(t.data().amount || 0);
    totals[u] = (totals[u] || 0) + amt;
  });

  // Load members
  const members = await db.collection(`groups/${gid}/members`).get();

  const reminders = [];

  members.forEach(m => {
    const u = m.data().uid;
    const name = m.data().name;
    const phone = m.data().phone;

    const paid = totals[u] || 0;

    if (paid < monthlyTarget) {
      reminders.push({ uid: u, name, phone, paid });
    }
  });

  // For now: store reminders in Firestore (in-app notifications)
  const notifRef = db.collection(`groups/${gid}/notifications`);

  for (const r of reminders) {
    await notifRef.add({
      uid: r.uid,
      title: "Monthly Contribution Reminder",
      message: `Hi ${r.name || "member"}, please make your monthly contribution. Paid: R${r.paid}.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: true, count: reminders.length })
  };
};
