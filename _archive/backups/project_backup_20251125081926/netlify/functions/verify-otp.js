import twilio from "twilio";

export async function handler(event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    const phone = body.phone; const code = body.code;
    if (!phone || !code) return { statusCode:400, body: JSON.stringify({error:'Missing phone or code'}) };
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const check = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID).verificationChecks.create({ to: phone, code });
    return { statusCode:200, body: JSON.stringify({ status: check.status }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ error: err.message }) };
  }
}