// netlify/functions/join-group.js
// Node 18+ (Netlify functions). Requires FIREBASE_SERVICE_ACCOUNT env var (stringified JSON).
const admin = require('firebase-admin');

let appInitialized = false;
function initFirebase() {
  if (appInitialized) return;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var is required (stringified JSON).');
  }
  const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(svc),
    // projectId from service account is used automatically
  });
  appInitialized = true;
}

exports.handler = async function (event, context) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: ''
    };
  }

  try {
    initFirebase();
  } catch (err) {
    console.error('init error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Firebase init error: ' + err.message })
    };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // parse JSON body
  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const groupCode = (payload.groupCode || '').toString().trim().toUpperCase();
  const name = payload.name || null;
  const phone = payload.phone || null;

  if (!groupCode) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'groupCode required' })
    };
  }

  // Expect ID token in Authorization Bearer header
  const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!idToken) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Authorization token required' })
    };
  }

  try {
    // Verify ID token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const firestore = admin.firestore();

    // Lookup group by groupCode (codes should be unique)
    const groupsQ = await firestore.collection('groups')
      .where('groupCode', '==', groupCode)
      .limit(1)
      .get();

    if (groupsQ.empty) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Group code not found' })
      };
    }

    const groupDoc = groupsQ.docs[0];
    const groupRef = groupDoc.ref;
    const gid = groupRef.id;

    // Run atomic transaction: ensure user not already member, then create member doc and update group
    const result = await firestore.runTransaction(async (tx) => {
      // Re-fetch inside transaction
      const gSnap = await tx.get(groupRef);
      if (!gSnap.exists) throw new Error('Group disappeared');

      const gData = gSnap.data();
      const membersUIDs = Array.isArray(gData.membersUIDs) ? gData.membersUIDs : [];

      // if member already exists, return early
      if (membersUIDs.includes(uid)) {
        return { alreadyMember: true, gid };
      }

      // member doc ref
      const memberRef = groupRef.collection('members').doc(uid);

      // create member document
      tx.set(memberRef, {
        uid: uid,
        name: name || null,
        phone: phone || null,
        role: 'member',
        joinedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // update group document: arrayUnion + increment
      tx.update(groupRef, {
        membersUIDs: admin.firestore.FieldValue.arrayUnion(uid),
        membersCount: admin.firestore.FieldValue.increment(1)
      });

      return { joined: true, gid };
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true, result })
    };

  } catch (err) {
    console.error('join-group error', err);
    // Friendly messages for client
    const message = err && err.message ? err.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: message })
    };
  }
};
