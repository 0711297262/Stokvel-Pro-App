const DEMO_MODE = true;

const sendOtpBtn = document.getElementById("sendOtpBtn");

sendOtpBtn.addEventListener("click", async () => {
  if (DEMO_MODE) {
    // 🚀 DEMO BYPASS — no SMS, no API
    window.location.href = "/dashboard.html";
    return;
  }

  // 🔐 REAL OTP FLOW (disabled in demo)
  const phone = document.getElementById("phoneInput").value.trim();

  if (!phone) {
    alert("Enter phone number");
    return;
  }

  try {
    const res = await fetch(
      "https://kmujqhvywyykwaiwalys.supabase.co/functions/v1/sms-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert("Error sending OTP");
      return;
    }

    window.location.href = "otp.html";
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
});
