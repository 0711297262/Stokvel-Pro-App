document.getElementById("sendOtpBtn").addEventListener("click", sendOtp);

async function sendOtp() {
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
    console.log("sms-otp response:", data);

    if (!res.ok) {
      alert("Error sending OTP: " + data.error);
      return;
    }

    window.location.href = "otp.html";
  } catch (err) {
    console.error(err);
    alert("Network error sending OTP");
  }
}
