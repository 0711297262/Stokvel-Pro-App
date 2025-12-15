import { supabase } from "./supabase.js";

document.getElementById("continueBtn").addEventListener("click", async () => {
  const phone = document.getElementById("phoneInput").value.trim();

  if (!phone) {
    alert("Enter your phone number");
    return;
  }

  // Force South African format
  const fullPhone = "+27" + phone.replace(/^0/, "").replace(/\s/g, "");

  const { data, error } = await supabase.auth.signInWithOtp({
    phone: fullPhone
  });

  if (error) {
    alert("OTP Error: " + error.message);
    return;
  }

  localStorage.setItem("pendingPhone", fullPhone);
  window.location.href = "otp.html";
});
