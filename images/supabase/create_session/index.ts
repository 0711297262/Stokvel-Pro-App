// /functions/create_session/index.ts
// Deno – Supabase Edge Function
// Creates a Supabase session token (access_token + refresh_token)
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE
// IMPORTANT: This function must only be called AFTER verify_otp succeeds.

import { serve } from "std/server";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE")!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Missing SUPABASE env vars");
}

// Admin client (server-side only)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

serve(async (req) => {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ ok: false, error: "missing_user_id" }), {
        status: 400
      });
    }

    // 1) Fetch the user (ensure exists)
    const { data: user, error: userErr } = await admin.auth.admin.getUserById(user_id);
    if (userErr || !user) {
      return new Response(JSON.stringify({ ok: false, error: "user_not_found" }), {
        status: 404
      });
    }

    // 2) Create a session for the user using Admin API
    // POST /auth/v1/token?grant_type=pkce
    //
    // Supabase recently changed how custom sessions are minted.
    // The supported server-side method is:
    //   admin.auth.admin.generateLink()
    // OR
    //   POST /auth/v1/token?grant_type=password (with service_role)
    //
    // We will use the official Admin Auth function:
    //      generateLink({ type: "magiclink", email })
    //
    // For phone logins, we use a "magiclink-like" token for the user,
    // then immediately exchange it for a session.

    // If user has an email, use magic link token generation:
    let loginEmail = user.email;
    if (!loginEmail) {
      // For phone-only users, create a dummy internal email
      loginEmail = `${user.id}@session.stokvelpro`;
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: loginEmail
    });

    if (linkErr || !linkData) {
      console.error("generateLink error:", linkErr);
      return new Response(JSON.stringify({ ok: false, error: "magiclink_error" }), {
        status: 500
      });
    }

    const token = linkData.properties?.action_link?.split("token=")[1];
    const type = linkData.properties?.action_link?.split("type=")[1]?.split("&")[0];

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "token_generation_failed" }), {
        status: 500
      });
    }

    // 3) Exchange the token for a session
    const exchangeUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=${type}`;
    const exchangeRes = await fetch(exchangeUrl, {
      method: "POST",
      headers: {
        "apikey": SERVICE_ROLE,
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    if (!exchangeRes.ok) {
      const txt = await exchangeRes.text();
      console.error("token exchange error:", txt);
      return new Response(JSON.stringify({ ok: false, error: "token_exchange_failed" }), {
        status: 500
      });
    }

    const session = await exchangeRes.json();

    // Final output
    return new Response(
      JSON.stringify({
        ok: true,
        user,
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
        token_type: session?.token_type,
        expires_in: session?.expires_in
      }),
      { status: 200 }
    );

  } catch (err) {
    console.error("create_session error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message || String(err) }), {
      status: 500
    });
  }
});
