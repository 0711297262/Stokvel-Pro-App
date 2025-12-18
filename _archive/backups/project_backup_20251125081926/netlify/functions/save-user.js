import { createClient } from "@supabase/supabase-js";

export async function handler(event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    const phone = body.phone;
    if (!phone) return { statusCode:400, body: JSON.stringify({error:'Missing phone'}) };
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode:500, body: JSON.stringify({error:'Supabase not configured'}) };
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('users').upsert({ phone: phone, last_seen: now }, { onConflict: ['phone'] });
    if (error) return { statusCode:500, body: JSON.stringify({ error: error.message }) };
    return { statusCode:200, body: JSON.stringify({ ok:true, data }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ error: err.message }) };
  }
}