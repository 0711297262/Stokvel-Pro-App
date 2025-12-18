import { supabase } from "./supabase.js";

/**
 * Redirects based on auth state
 * @param {"login" | "protected"} mode
 */
export async function guard(mode) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // LOGIN PAGE → user already logged in
  if (mode === "login" && user) {
    window.location.replace("./dashboard.html");
    return;
  }

  // PROTECTED PAGE → user not logged in
  if (mode === "protected" && !user) {
    window.location.replace("./index.html");
    return;
  }
}
