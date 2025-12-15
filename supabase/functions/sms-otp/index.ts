import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const AT_API_KEY = Deno.env.get("AT_API_KEY");
  const USERNAME = Deno.env.get("AT_USERNAME"); // Removed sandbox fallback
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!AT_API_KEY || !SUPABASE_URL || !SERVICE_ROLE || !USERNAME) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500,
      headers: cors,
    });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: "Missing phone number" }), {
        status: 400,
        headers: cors,
      });
    }

    // Create OTP + expiry
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins

    // Save OTP to Supabase
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/otp_requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE,
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        phone,
        otp,
        expires_at: expiresAt
      })
    });

    if (!insertResponse.ok) {
      const errText = await insertResponse.text();
      console.error("Supabase Insert Error:", errText);
      return new Response(JSON.stringify({ error: "DB insert failed" }), {
        status: 500,
        headers: cors,
      });
    }

    // ANDROID AUTO-READ SMS FORMAT
    const message = `Your Stokvel PRO OTP is ${otp}

@stokvelpro.com #${otp}`;

    // Prepare SMS payload
    const payload = new URLSearchParams({
      username: USERNAME,
      to: phone,
      message,
    });

    // SEND VIA LIVE AFRICA'S TALKING
    const smsResponse = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "apiKey": AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      }
    );

    const text = await smsResponse.text();

    return new Response(JSON.stringify({ success: true, text }), {
      status: 200,
      headers: cors,
    });

  } catch (err) {
    console.error("ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: cors,
    });
  }
});
