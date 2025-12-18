import { supabase } from "./supabase.js";

export async function guard(type) {
  const { data } = await supabase.auth.getUser();

  if (type === "protected" && !data.user) {
    window.location.href = "index.html";
  }
}
