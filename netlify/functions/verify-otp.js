import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Missing environment variables" }), {
      status: 500,
      headers: cors,
    });
  }

  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "Missing phone or OTP" }), {
        status: 400,
        headers: cors,
      });
    }

    // Fetch the most recent OTP for this phone number
    const fetchResp = await fetch(
      `${SUPABASE_URL}/rest/v1/otp_requests?phone=eq.${phone}&order=created_at.desc&limit=1`,
      {
        method: "GET",
        headers: {
          "apikey": SERVICE_ROLE,
          "Authorization": `Bearer ${SERVICE_ROLE}`,
        },
      }
    );

    const data = await fetchResp.json();
    const record = data[0];

    if (!record) {
      return new Response(JSON.stringify({ error: "No OTP found for this number" }), {
        status: 400,
        headers: cors,
      });
    }

    // Check if OTP matches
    if (record.otp !== otp) {
      return new Response(JSON.stringify({ error: "Invalid OTP" }), {
        status: 400,
        headers: cors,
      });
    }

    // Check if OTP is already used
    if (record.used === true) {
      return new Response(JSON.stringify({ error: "OTP already used" }), {
        status: 400,
        headers: cors,
      });
    }

    // Check if OTP expired
    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP expired" }), {
        status: 400,
        headers: cors,
      });
    }

    // Mark OTP as used
    await fetch(
      `${SUPABASE_URL}/rest/v1/otp_requests?id=eq.${record.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_ROLE,
          "Authorization": `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ used: true }),
      }
    );

    // SUCCESS
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: cors,
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: cors,
    });
  }
});
