// /netlify/functions/send_sms.js
const fetch = require('node-fetch'); // Netlify functions support node-fetch or global fetch in newer runtimes

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { to, message } = body;
    if (!to || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing "to" or "message"' }) };
    }

    const AT_USERNAME = process.env.AT_USERNAME;
    const AT_API_KEY  = process.env.AT_API_KEY;
    const AT_BASE_URL = process.env.AT_BASE_URL || 'https://api.sandbox.africastalking.com';

    // Build form data for SMS request
    const params = new URLSearchParams();
    params.append('username', AT_USERNAME);   // AT API requires username
    params.append('to', to);
    params.append('message', message);
    // optionally: params.append('from', 'YourSenderID');

    // AT expects header 'apiKey' (or 'Authorization' depending on SDK); this header is usually 'apiKey'
    const res = await fetch(`${AT_BASE_URL}/version1/messaging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY,
      },
      body: params.toString()
    });

    const txt = await res.text();
    // normally JSON but some endpoints return plain text — parse if JSON
    let result;
    try { result = JSON.parse(txt); } catch (err) { result = txt; }

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: result }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: result })
    };

  } catch (err) {
    console.error('send_sms error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
