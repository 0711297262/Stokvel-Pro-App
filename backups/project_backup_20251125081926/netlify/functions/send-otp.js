import twilio from "twilio";

export async function handler(event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    const phone = body.phone;
    if (!phone) return { statusCode:400, body: JSON.stringify({error:'Missing phone'}) };
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID).verifications.create({ to: phone, channel: "sms" });
    return { statusCode:200, body: JSON.stringify({ status: verification.status }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ error: err.message }) };
  }
}