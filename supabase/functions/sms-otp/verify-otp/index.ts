import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: cors,
      });
    }

    // Fetch latest OTP for phone
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/otp_requests?phone=eq.${phone}&order=created_at.desc&limit=1`,
      {
        headers: {
          "apikey": SERVICE_ROLE,
          "Authorization": `Bearer ${SERVICE_ROLE}`,
        },
      }
    );

    const data = await resp.json();
    const record = data[0];

    if (!record) {
      return new Response(JSON.stringify({ error: "No OTP found" }), {
        status: 400,
        headers: cors,
      });
    }

    if (record.used) {
      return new Response(JSON.stringify({ error: "OTP already used" }), {
        status: 400,
        headers: cors,
      });
    }

    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP expired" }), {
        status: 400,
        headers: cors,
      });
    }

    if (record.otp !== otp) {
      return new Response(JSON.stringify({ error: "Invalid OTP" }), {
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
        body: JSON.stringify({ used: true })
      }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: cors,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: cors,
    });
  }
});
