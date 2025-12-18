// public/js/supabase-client.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://kmujqhvywyykwaiwalys.supabase.co"; // <- keep as-is or update
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdWpxaHZ5d3l5a3dhaXdhbHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MjM5NDksImV4cCI6MjA4MDg4Mzk0OX0.S0NgjRyiBOsJzlP1npRgcpzf5cCp5DMIwbfnKbZpmLE";         // <- set your anon key here

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
