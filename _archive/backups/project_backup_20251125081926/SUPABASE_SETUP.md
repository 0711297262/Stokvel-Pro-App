Supabase setup:
1. Create project at https://app.supabase.com
2. Run SQL to create users table:
   create table users (
     id uuid default gen_random_uuid() primary key,
     phone text unique,
     metadata jsonb,
     last_seen timestamptz
   );
3. Copy SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Netlify env vars.